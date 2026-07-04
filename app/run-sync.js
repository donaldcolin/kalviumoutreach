/**
 * Quick sync: Pull ALL outreach activities from LeadSquared into Firestore crmActivities.
 * Uses CommonJS so it runs directly with `node run-sync.js`.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

try { initializeApp({ credential: cert(serviceAccount) }); } catch(e) {}
const db = getFirestore();

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const ACCESS_KEY = 'u$r52f97f7d830410c0b7c9191072313559';
const SECRET_KEY = '4f263d85fa1ef33374ae16f7f05bcc6f49874f86';
const OUTREACH_ACTIVITY_CODE = 232;

async function lsqFetch(path, method = 'GET', body = null) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${LSQ_HOST}${path}${separator}accessKey=${encodeURIComponent(ACCESS_KEY)}&secretKey=${encodeURIComponent(SECRET_KEY)}`;
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`LSQ ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseActivityData(raw) {
  const data = {};
  
  // ActivityFields is a flat object with mx_Custom_* keys (primary source)
  if (raw.ActivityFields && typeof raw.ActivityFields === 'object') {
    Object.assign(data, raw.ActivityFields);
  }
  
  // Data is a key-value array with metadata like CreatedByName
  if (raw.Data && Array.isArray(raw.Data)) {
    raw.Data.forEach(item => {
      const key = item.SchemaName || item.Key;
      if (key) data[key] = item.Value ?? item.Attribute ?? '';
    });
  }
  
  return data;
}

async function run() {
  console.log('Starting sync...');

  // 1. Fetch leads
  let leads = [];
  try {
    leads = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', {
      Parameter: { LookupName: 'LeadStage', LookupValue: '', SqlOperator: '<>' },
      Paging: { PageIndex: 1, PageSize: 100 }
    });
    console.log(`  Found ${leads.length} leads`);
  } catch (err) {
    console.error('  Failed to fetch leads:', err.message);
    return;
  }

  // 2. Fetch activities for each lead (with rate limiting)
  const allActivities = [];
  let checked = 0;
  for (const lead of leads) {
    if (!lead.ProspectID) continue;
    checked++;
    
    // Rate limit: max ~2 per second
    await new Promise(r => setTimeout(r, 600));
    
    try {
      const resp = await lsqFetch(
        `/v2/ProspectActivity.svc/Retrieve?leadId=${lead.ProspectID}`,
        'POST',
        { Parameter: { ActivityEvent: OUTREACH_ACTIVITY_CODE }, Paging: { Offset: '0', RowCount: '100' } }
      );
      // API returns { RecordCount, ProspectActivities: [...] }
      const acts = resp?.ProspectActivities || (Array.isArray(resp) ? resp : []);
      if (acts.length > 0) {
        // Attach lead name to each activity
        acts.forEach(a => { a.LeadName = lead.FirstName || lead.LastName || ''; });
        allActivities.push(...acts);
        console.log(`  Lead ${checked}/${leads.length}: ${lead.FirstName || lead.ProspectID} → ${acts.length} activities`);
      }
    } catch (err) {
      // Rate limit hit — wait longer and retry once
      if (err.message.includes('429')) {
        console.log(`  Rate limited at lead ${checked}, waiting 5s...`);
        await new Promise(r => setTimeout(r, 5000));
        try {
          const resp = await lsqFetch(
            `/v2/ProspectActivity.svc/Retrieve?leadId=${lead.ProspectID}`,
            'POST',
            { Parameter: { ActivityEvent: OUTREACH_ACTIVITY_CODE }, Paging: { Offset: '0', RowCount: '100' } }
          );
          const acts = resp?.ProspectActivities || (Array.isArray(resp) ? resp : []);
          if (acts.length > 0) {
            acts.forEach(a => { a.LeadName = lead.FirstName || lead.LastName || ''; });
            allActivities.push(...acts);
          }
        } catch (e2) { /* skip */ }
      }
    }
  }

  console.log(`\n  Total activities found: ${allActivities.length}`);
  if (allActivities.length === 0) {
    console.log('  Nothing to sync.');
    return;
  }

  // 3. Build Firestore user mappings (by name AND email)
  const usersSnap = await db.collection('users').get();
  const nameToUser = {};
  const emailToId = {};
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d.email) emailToId[d.email.toLowerCase()] = doc.id;
    if (d.name) nameToUser[d.name.toLowerCase()] = { id: doc.id, email: d.email || '' };
  });

  // 4. Write to Firestore
  let synced = 0;
  const batch = db.batch();
  for (const raw of allActivities) {
    const fields = parseActivityData(raw);
    const activityId = raw.Id || raw.ActivityId;
    if (!activityId) continue;

    // Match executive: CreatedBy in ActivityFields is a UUID, not email.
    // Use CreatedByName from Data array to match against our Firestore users.
    const createdByName = (fields.CreatedByName || '').toLowerCase();
    const matchedUser = nameToUser[createdByName];
    const executiveEmail = matchedUser?.email?.toLowerCase() || '';
    const executiveId = matchedUser?.id || '';

    const doc = {
      lsqActivityId: activityId,
      lsqLeadId: raw.RelatedProspectId || '',
      executiveId,
      executiveEmail,
      schoolName: raw.LeadName || fields.mx_Custom_1 || '',
      activityType: fields.mx_Custom_2 || '',
      typeOfWalkIn: fields.mx_Custom_36 || '',
      walkInStatus: fields.mx_Custom_4 || '',
      walkInDateTime: fields.mx_Custom_1 || raw.CreatedOn || '',
      notes: fields.ActivityEvent_Note || '',
      refusedEntryReason: fields.mx_Custom_5 || fields.mx_Custom_10 || '',
      statusFrontDesk: fields.mx_Custom_7 || '',
      statusPIC: fields.mx_Custom_8 || '',
      statusPrincipal: fields.mx_Custom_9 || '',
      picName: fields.mx_Custom_13 || '',
      picPhone: fields.mx_Custom_15 || '',
      picDesignation: fields.mx_Custom_16 || '',
      principalName: fields.mx_Custom_21 || '',
      principalPhone: fields.mx_Custom_23 || '',
      livePhotoUrl: fields.mx_Custom_3 || '',
      followUpDate: fields.mx_Custom_6 || '',
      boardOfSchool: fields.mx_Custom_37 || '',
      studentStrength: fields.mx_Custom_35 || '',
      schoolFees: fields.mx_Custom_33 || '',
      // Location from API response
      lat: raw.Latitude || null,
      lng: raw.Longitude || null,
      address: raw.Address || '',
      source: 'leadsquared',
      lsqCreatedOn: raw.CreatedOn || '',
      lsqModifiedOn: raw.ModifiedOn || '',
      syncedAt: FieldValue.serverTimestamp(),
    };

    console.log(`  → ${doc.schoolName} | ${doc.activityType} | ${doc.walkInStatus} | by: ${executiveEmail || createdByName}`);
    batch.set(db.collection('crmActivities').doc(activityId), doc, { merge: true });
    synced++;
  }

  if (synced > 0) {
    await batch.commit();
    console.log(`  Synced ${synced} activities to Firestore!`);
  }
}

  if (synced > 0) {
    await batch.commit();
    console.log(`  Synced ${synced} activities to Firestore!`);
  }
}

run().then(() => { console.log('Done.'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
