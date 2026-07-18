/**
 * LSQ → Firestore Sync Engine
 * Fetches Outreach Activities (code 232) from LeadSquared and writes them to Firestore.
 */
import { db, LSQ_HOST, ACCESS_KEY, SECRET_KEY, SYNC_LOOKBACK_MINUTES, fetch } from './config.js';
import { lsqFetch, parseActivityData, buildFirestoreDoc } from './lsq.js';

// ─── State ──────────────────────────────────────────────────────────────────

export let lastSyncResult = { timestamp: null, activitiesFetched: 0, activitiesWritten: 0, error: null };
let isSyncing = false;

// ─── Main Sync Function ─────────────────────────────────────────────────────

export async function syncActivities(hours = SYNC_LOOKBACK_MINUTES / 60) {
  if (isSyncing) {
    console.log('⏳ Sync already in progress, skipping...');
    return lastSyncResult;
  }

  isSyncing = true;
  const startTime = Date.now();
  console.log(`\n🔄 [${new Date().toISOString()}] Starting sync...`);

  try {
    // 1. Calculate date range (using hours param)
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - hours * 60 * 60 * 1000);

    const formatLSQDate = (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;

    // 2. Fetch ALL outreach activities in one API call
    let allActivities = [];
    let pageIndex = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(`   📡 Fetching page ${pageIndex} (${formatLSQDate(fromDate)} → ${formatLSQDate(toDate)})...`);

      // Fetch 5-minute bulk activities
      const response = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent?accessKey=${ACCESS_KEY}&secretKey=${SECRET_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Parameter: {
            ActivityEvent: 232,
            FromDate: formatLSQDate(fromDate),
            ToDate: formatLSQDate(toDate),
          },
          Paging: { PageIndex: pageIndex, PageSize: pageSize },
          Sorting: { ColumnName: 'ModifiedOn', Direction: 1 }
        })
      });
      let data = await response.json();
      let batch = Array.isArray(data) ? data : (data.List || data.ProspectActivities || []);
      console.log(`   📦 Fetched ${batch.length} activities from bulk API.`);

      // For each activity found, we must fetch the FULL payload via the 1-on-1 Retrieve API 
      // because the bulk API strips out Latitude, Longitude, and Address fields.
      for (const slimAct of batch) {
        if (!slimAct.RelatedProspectId) continue;
        try {
          const fullRes = await fetch(`${LSQ_HOST}/v2/ProspectActivity.svc/Retrieve?accessKey=${ACCESS_KEY}&secretKey=${SECRET_KEY}&leadId=${slimAct.RelatedProspectId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Parameter: { ActivityEvent: 232 },
              Paging: { Offset: 0, RowCount: 10 } // recent ones for this lead
            })
          });
          const fullData = await fullRes.json();
          const fullList = fullData.ProspectActivities || [];
          const fullAct = fullList.find(a => a.Id === slimAct.ProspectActivityId || a.ActivityId === slimAct.ProspectActivityId);

          if (fullAct) {
            // Merge the full activity data (Lat, Lng, Address) into the slim activity
            slimAct.Latitude = fullAct.Latitude;
            slimAct.Longitude = fullAct.Longitude;
            slimAct.Address = fullAct.Address;

            // ActivityFields (mx_Custom_34) is inside ActivityFields if we need it
            if (fullAct.ActivityFields) {
              slimAct.mx_Custom_34 = fullAct.ActivityFields.mx_Custom_34;
            }
          }
        } catch (e) {
          console.warn(`   ⚠️ Failed to fetch full activity for lead ${slimAct.RelatedProspectId}`, e.message);
        }
        allActivities.push(slimAct);
      }

      // Check if there are more pages
      if (batch.length < pageSize) {
        hasMore = false;
      } else {
        pageIndex++;
      }
    }

    console.log(`   📦 Fetched ${allActivities.length} activities from LSQ.`);

    if (allActivities.length === 0) {
      lastSyncResult = {
        timestamp: new Date().toISOString(),
        activitiesFetched: 0,
        activitiesWritten: 0,
        durationMs: Date.now() - startTime,
        error: null,
      };
      console.log('   ✅ Nothing new to sync.');
      return lastSyncResult;
    }

    // 3. Build email → Firestore user ID mapping
    const usersSnap = await db.collection('users').get();
    const emailToFirestoreId = {};
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        emailToFirestoreId[data.email.toLowerCase()] = doc.id;
      }
    });

    // 4. Fetch missing Lead Names from LeadSquared
    const uniqueLeadIds = [...new Set(allActivities.map(a => a.RelatedProspectId).filter(Boolean))];
    const leadIdToName = {};

    if (uniqueLeadIds.length > 0) {
      console.log(`   📡 Fetching names for ${uniqueLeadIds.length} leads...`);
      for (const leadId of uniqueLeadIds) {
        try {
          const resp = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${leadId}`, 'GET');
          if (Array.isArray(resp) && resp.length > 0) {
            const lead = resp[0];
            // LSQ stores the school name in FirstName + LastName
            leadIdToName[leadId] = `${lead.FirstName || ''} ${lead.LastName || ''}`.trim();
          }
        } catch (e) {
          console.error(`   ⚠️ Failed to fetch lead ${leadId}:`, e.message);
        }
      }
    }

    // 5. Write to Firestore in batches of 500 (Firestore batch limit)
    let written = 0;
    let skipped = 0;
    const BATCH_LIMIT = 500;

    for (let i = 0; i < allActivities.length; i += BATCH_LIMIT) {
      const chunk = allActivities.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();

      // Find local documents that might have been created by the app (UUID as doc ID, but lsqActivityId set)
      const chunkIds = chunk.map(r => String(r.ProspectActivityId || r.Id || r.ActivityId || '')).filter(Boolean);
      const mappedDocs = {};
      
      if (chunkIds.length > 0) {
        // Firestore 'in' queries are limited to 30 items
        for (let j = 0; j < chunkIds.length; j += 30) {
          const subChunk = chunkIds.slice(j, j + 30);
          const snap = await db.collection('crmActivities').where('lsqActivityId', 'in', subChunk).get();
          snap.forEach(d => {
            mappedDocs[d.data().lsqActivityId] = d.ref;
          });
        }
      }

      for (const raw of chunk) {
        const activityId = String(raw.ProspectActivityId || raw.Id || raw.ActivityId || '');
        if (!activityId) {
          skipped++;
          continue;
        }

        const fields = parseActivityData(raw);
        // Inject the fetched lead name so buildFirestoreDoc uses it
        if (leadIdToName[raw.RelatedProspectId]) {
          raw.LeadName = leadIdToName[raw.RelatedProspectId];
        }
        const doc = buildFirestoreDoc(raw, fields, emailToFirestoreId);
        
        // If we found a mapped local doc, update it. Otherwise, use the LSQ ID as the doc ID.
        const docRef = mappedDocs[activityId] || db.collection('crmActivities').doc(activityId);
        
        batch.set(docRef, doc, { merge: true });
        written++;
      }

      await batch.commit();
    }

    lastSyncResult = {
      timestamp: new Date().toISOString(),
      activitiesFetched: allActivities.length,
      activitiesWritten: written,
      activitiesSkipped: skipped,
      durationMs: Date.now() - startTime,
      error: null,
    };

    console.log(`   ✅ Synced: ${written}, Skipped: ${skipped} (${Date.now() - startTime}ms)`);
    return lastSyncResult;

  } catch (err) {
    lastSyncResult = {
      timestamp: new Date().toISOString(),
      activitiesFetched: 0,
      activitiesWritten: 0,
      durationMs: Date.now() - startTime,
      error: err.message,
    };
    console.error(`   ❌ Sync failed: ${err.message}`);
    return lastSyncResult;

  } finally {
    isSyncing = false;
  }
}
