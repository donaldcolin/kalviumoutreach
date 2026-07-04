/**
 * LeadSquared → Firestore Sync Script
 * 
 * Run this script on a schedule (e.g., every 15 min via cron) to pull
 * Outreach Activities from LeadSquared and sync them into Firestore.
 * 
 * Usage: node sync_leadsquared.js
 * 
 * Environment: Requires Node.js 18+ (for native fetch).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Firebase Admin Init ────────────────────────────────────────────────
// Uses Application Default Credentials or a service account key file.
// Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON path.
const fbApp = initializeApp({
  projectId: 'kalvium-outreach-53f54',
});
const db = getFirestore(fbApp);

// ─── LeadSquared Config ─────────────────────────────────────────────────
const LSQ_HOST = 'https://api-in21.leadsquared.com';
const ACCESS_KEY = process.env.LSQ_ACCESS_KEY || 'u$r52f97f7d830410c0b7c9191072313559';
const SECRET_KEY = process.env.LSQ_SECRET_KEY || '4f263d85fa1ef33374ae16f7f05bcc6f49874f86';
const OUTREACH_ACTIVITY_CODE = 232;

// ─── LSQ API Helpers ────────────────────────────────────────────────────
async function lsqFetch(path, method = 'GET', body = null) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${LSQ_HOST}${path}${separator}accessKey=${encodeURIComponent(ACCESS_KEY)}&secretKey=${encodeURIComponent(SECRET_KEY)}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`LSQ API ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseActivityData(raw) {
  const data = {};
  if (raw.ActivityData) {
    let arr;
    if (typeof raw.ActivityData === 'string') {
      try { arr = JSON.parse(raw.ActivityData); } catch { arr = []; }
    } else { arr = raw.ActivityData; }
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (item.SchemaName || item.Key) {
          data[item.SchemaName || item.Key] = item.Value ?? item.Attribute ?? '';
        }
      });
    }
  }
  // Also try Data field (different API versions use different names)
  if (raw.Data) {
    let arr;
    if (typeof raw.Data === 'string') {
      try { arr = JSON.parse(raw.Data); } catch { arr = []; }
    } else { arr = raw.Data; }
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (item.Key) data[item.Key] = item.Value ?? '';
      });
    }
  }
  return data;
}

// ─── Main Sync Logic ────────────────────────────────────────────────────
async function syncActivities() {
  console.log(`[${new Date().toISOString()}] Starting LeadSquared sync...`);

  // Determine sync window: last 24 hours (with overlap for safety)
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - 24);
  const fromDate = sinceDate.toISOString().split('.')[0];
  const toDate = new Date().toISOString().split('.')[0];

  // 1. Fetch Outreach Activities from LSQ (by iterating over leads)
  let allActivities = [];
  let leads = [];

  try {
    const body = {
      Parameter: {
        LookupName: "LeadStage", // arbitrary field
        LookupValue: "",
        SqlOperator: "<>"
      },
      Paging: { PageIndex: 1, PageSize: 100 } // Get first 100 leads for now
    };
    leads = await lsqFetch('/v2/LeadManagement.svc/Leads.Get', 'POST', body);
  } catch (err) {
    console.error('  Error fetching leads:', err.message);
  }

  for (const lead of leads) {
    if (!lead.ProspectID) continue;
    
    // Add a 800ms delay to avoid exceeding LSQ rate limits (15 requests / 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 800));

    const actBody = {
      Parameter: { ActivityEvent: OUTREACH_ACTIVITY_CODE },
      Paging: { Offset: '0', RowCount: '100' },
    };

    try {
      const resp = await lsqFetch(`/v2/ProspectActivity.svc/Retrieve?leadId=${lead.ProspectID}`, 'POST', actBody);
      // API returns { RecordCount, ProspectActivities: [...] }
      const data = resp?.ProspectActivities || (Array.isArray(resp) ? resp : []);
      if (data.length > 0) {
        // Filter by sinceDate
        const recentData = data.filter(act => {
          const actDate = new Date(act.CreatedOn || act.ModifiedOn);
          return actDate >= sinceDate;
        });
        allActivities.push(...recentData);
      }
    } catch (err) {
      console.error(`  Error fetching activities for lead ${lead.ProspectID}:`, err.message);
    }
  }

  console.log(`  Fetched ${allActivities.length} outreach activities from LSQ.`);
  if (allActivities.length === 0) {
    console.log('  Nothing to sync.');
    return;
  }

  // 2. Fetch LSQ Users to build email→userId mapping
  let lsqUsers = [];
  try {
    lsqUsers = await lsqFetch('/v2/UserManagement.svc/Users.Get');
  } catch (err) {
    console.error('  Error fetching LSQ users:', err.message);
  }
  
  const emailToLSQUser = {};
  if (Array.isArray(lsqUsers)) {
    lsqUsers.forEach(u => {
      if (u.EmailAddress) {
        emailToLSQUser[u.EmailAddress.toLowerCase()] = u;
      }
    });
  }

  // 3. Build Firestore email→docId mapping from our users collection
  const usersSnap = await db.collection('users').get();
  const emailToFirestoreId = {};
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      emailToFirestoreId[data.email.toLowerCase()] = doc.id;
    }
  });

  // 4. Process each activity and write to Firestore
  let synced = 0;
  let skipped = 0;
  const batch = db.batch();

  for (const raw of allActivities) {
    const fields = parseActivityData(raw);
    const activityId = raw.Id || raw.ActivityId;
    
    if (!activityId) {
      skipped++;
      continue;
    }

    // Match owner email to our Firestore user
    const ownerEmail = (raw.CreatedBy || raw.Owner || '').toLowerCase();
    const firestoreUserId = emailToFirestoreId[ownerEmail];

    // Parse GPS coordinates from the Location field
    let lat = null, lng = null;
    const locationStr = fields.mx_Custom_34 || '';
    if (locationStr) {
      // Location can be in various formats: "lat,lng" or JSON object
      try {
        if (locationStr.includes(',')) {
          const parts = locationStr.split(',').map(s => parseFloat(s.trim()));
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0];
            lng = parts[1];
          }
        } else {
          const loc = JSON.parse(locationStr);
          lat = loc.Latitude || loc.lat;
          lng = loc.Longitude || loc.lng;
        }
      } catch { /* ignore parse errors */ }
    }

    // Determine the lead/school name
    let schoolName = fields.mx_Custom_1 || ''; // Sometimes school name is in activity
    if (!schoolName && raw.RelatedProspectId) {
      // We'll fetch the lead name separately if needed
      schoolName = raw.LeadName || raw.ProspectName || '';
    }

    // Build the Firestore document
    const doc = {
      // Identifiers
      lsqActivityId: activityId,
      lsqLeadId: raw.RelatedProspectId || '',
      executiveId: firestoreUserId || '',
      executiveEmail: ownerEmail,
      
      // School info
      schoolName: raw.LeadName || raw.ProspectName || schoolName,
      
      // Visit details
      activityType: fields.mx_Custom_2 || '',        // Walk-in or Seminar
      typeOfWalkIn: fields.mx_Custom_36 || '',        // First Visit / Follow-Up / Seminar
      walkInStatus: fields.mx_Custom_4 || '',         // RE / FDI / PCI / PI
      walkInDateTime: fields.mx_Custom_1 || raw.CreatedOn || '',
      notes: fields.ActivityEvent_Note || '',
      
      // Stage outcomes
      refusedEntryReason: fields.mx_Custom_5 || fields.mx_Custom_10 || '',
      statusFrontDesk: fields.mx_Custom_7 || '',
      statusPIC: fields.mx_Custom_8 || '',
      statusPrincipal: fields.mx_Custom_9 || '',
      
      // Contact info
      picName: fields.mx_Custom_13 || '',
      picPhone: fields.mx_Custom_15 || '',
      picDesignation: fields.mx_Custom_16 || '',
      principalName: fields.mx_Custom_21 || '',
      principalPhone: fields.mx_Custom_23 || '',
      
      // Location & evidence
      lat,
      lng,
      livePhotoUrl: fields.mx_Custom_3 || '',
      
      // Proposals
      proposalSentToSchool: fields.mx_Custom_12 || '',
      proposalSentToPIC: fields.mx_Custom_25 || '',
      proposalSentToPrincipal: fields.mx_Custom_26 || '',
      
      // Follow-ups & appointments
      followUpDate: fields.mx_Custom_6 || '',
      picAppointmentDate: fields.mx_Custom_17 || '',
      principalAppointmentDate: fields.mx_Custom_27 || '',
      seminarAppointmentDate: fields.mx_Custom_18 || '',
      seminarConductedDate: fields.mx_Custom_32 || '',
      
      // School details
      boardOfSchool: fields.mx_Custom_37 || '',
      studentStrength: fields.mx_Custom_35 || '',
      schoolFees: fields.mx_Custom_33 || '',
      
      // Leads generated
      leadsGenerated: fields.mx_Custom_19 || '',
      batch2025Leads: fields.mx_Custom_28 || '',
      batch2026Leads: fields.mx_Custom_29 || '',
      batch2027Leads: fields.mx_Custom_30 || '',
      batch2028Leads: fields.mx_Custom_31 || '',
      
      // Metadata
      source: 'leadsquared',
      lsqCreatedOn: raw.CreatedOn || '',
      lsqModifiedOn: raw.ModifiedOn || '',
      syncedAt: FieldValue.serverTimestamp(),
    };

    // Use lsqActivityId as the Firestore document ID to prevent duplicates
    const docRef = db.collection('crmActivities').doc(activityId);
    batch.set(docRef, doc, { merge: true });
    synced++;
  }

  if (synced > 0) {
    await batch.commit();
  }

  console.log(`  Synced: ${synced}, Skipped: ${skipped}`);
  console.log(`[${new Date().toISOString()}] Sync complete.`);
}

// ─── Run ────────────────────────────────────────────────────────────────
syncActivities().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
