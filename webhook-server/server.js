/**
 * LeadSquared → Firestore Cron Sync Server
 *
 * Every 5 minutes, fetches all Outreach Activities (code 232) created/modified
 * in the last 30 minutes via a single LSQ API call, then writes them to
 * Firestore `crmActivities/{activityId}`.
 *
 * The mobile app and website both use onSnapshot on this collection,
 * so they see updates in real-time automatically.
 *
 * Endpoints:
 *   GET /api/health     → server status
 *   GET /api/sync-now   → manually trigger a sync
 *   GET /api/last-sync  → last sync timestamp + result
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import cron from 'node-cron';
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import 'dotenv/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Global Error Handlers ──────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error(`🚨 [CRASH PREVENTED] Uncaught Exception:`, err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`🚨 [CRASH PREVENTED] Unhandled Rejection at:`, promise, 'reason:', reason);
});

// ─── Constants & Config ─────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const LSQ_HOST = 'https://api-in21.leadsquared.com';
const ACCESS_KEY = process.env.LSQ_ACCESS_KEY;
const SECRET_KEY = process.env.LSQ_SECRET_KEY;
const OUTREACH_ACTIVITY_CODE = 232;
const SYNC_INTERVAL_MINUTES = 5;
const SYNC_LOOKBACK_MINUTES = 30; // overlap window for safety

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error("❌ ERROR: LSQ_ACCESS_KEY and LSQ_SECRET_KEY must be set in the environment variables.");
  process.exit(1);
}

// ─── Firebase Admin Setup ───────────────────────────────────────────────────

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("❌ ERROR: Could not parse FIREBASE_SERVICE_ACCOUNT json.");
    process.exit(1);
  }
} else {
  const saPath = resolve(__dirname, '../serviceAccountKey.json');
  try {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Could not read serviceAccountKey.json at ${saPath}`);
    process.exit(1);
  }
}

const fbApp = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(fbApp);

// ─── State ──────────────────────────────────────────────────────────────────

let lastSyncResult = { timestamp: null, activitiesFetched: 0, activitiesWritten: 0, error: null };
let isSyncing = false;

// ─── LSQ API Helper ─────────────────────────────────────────────────────────

async function lsqFetch(path, method = 'GET', body = null) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${LSQ_HOST}${path}${separator}accessKey=${encodeURIComponent(ACCESS_KEY)}&secretKey=${encodeURIComponent(SECRET_KEY)}`;

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LSQ API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Activity Data Parser ───────────────────────────────────────────────────

function parseActivityData(raw) {
  const data = {};

  // The RetrieveByActivityEvent API returns mx_Custom_ fields directly on the object
  for (const key of Object.keys(raw)) {
    if (key.startsWith('mx_Custom_') || key === 'ActivityEvent_Note') {
      data[key] = raw[key] ?? '';
    }
  }

  // Parse ActivityData field (array of {SchemaName, Value} objects) — used by per-lead API
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

  // Also parse Data field (different API versions use different names)
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

  // Also handle Fields (yet another variant)
  if (raw.Fields && typeof raw.Fields === 'object' && !Array.isArray(raw.Fields)) {
    Object.assign(data, raw.Fields);
  }

  return data;
}

// ─── Build Firestore Document ───────────────────────────────────────────────

function buildFirestoreDoc(raw, fields, emailToFirestoreId) {
  // CreatedByEmailAddress is the email; CreatedBy is the UUID in the RetrieveByActivityEvent API
  const ownerEmail = (raw.CreatedByEmailAddress || raw.CreatedBy || raw.Owner || '').toLowerCase();
  const firestoreUserId = emailToFirestoreId[ownerEmail] || '';

  // Parse GPS coordinates
  let lat = null, lng = null;
  let address = raw.Address || '';
  const locationStr = fields.mx_Custom_34 || raw.mx_Custom_34 || address;
  
  if (locationStr) {
    try {
      if (locationStr.includes(',')) {
        const parts = locationStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          lat = parts[0];
          lng = parts[1];
        }
      }
      
      if (lat === null && locationStr.startsWith('{')) {
        const loc = JSON.parse(locationStr);
        lat = loc.Latitude || loc.lat || null;
        lng = loc.Longitude || loc.lng || null;
      }
    } catch { /* ignore parse errors */ }
  }

  // Fallback to standard LeadSquared location fields if available on the activity
  if (lat === null || lng === null) {
    if (raw.Latitude !== undefined && raw.Longitude !== undefined) {
      lat = parseFloat(raw.Latitude) || null;
      lng = parseFloat(raw.Longitude) || null;
    }
  }

  // Helper to ensure UTC strings have a 'Z' for correct JS parsing in the frontend
  const makeUTC = (dtStr) => {
    if (!dtStr) return '';
    return dtStr.endsWith('Z') ? dtStr : `${dtStr}Z`;
  };

  return {
    // Identifiers
    lsqActivityId: raw.ProspectActivityId || raw.Id || raw.ActivityId || '',
    lsqLeadId: raw.RelatedProspectId || '',
    executiveId: firestoreUserId,
    executiveEmail: ownerEmail,

    // School info
    schoolName: raw.LeadName || raw.ProspectName || '',

    // Visit details
    activityType: fields.mx_Custom_2 || '',
    typeOfWalkIn: fields.mx_Custom_36 || '',
    walkInStatus: fields.mx_Custom_4 || '',
    walkInDateTime: makeUTC(fields.mx_Custom_1 || raw.CreatedOn),
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
    followUpDate: makeUTC(fields.mx_Custom_6),
    picAppointmentDate: makeUTC(fields.mx_Custom_17),
    principalAppointmentDate: makeUTC(fields.mx_Custom_27),
    seminarAppointmentDate: makeUTC(fields.mx_Custom_18),
    seminarConductedDate: makeUTC(fields.mx_Custom_32),

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
    lsqCreatedOn: makeUTC(raw.CreatedOn),
    lsqModifiedOn: makeUTC(raw.ModifiedOn),
    syncedAt: FieldValue.serverTimestamp(),
  };
}

// ─── Main Sync Function ─────────────────────────────────────────────────────

async function syncActivities(hours = SYNC_LOOKBACK_MINUTES / 60) {
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

    // 4. Write to Firestore in batches of 500 (Firestore batch limit)
    let written = 0;
    let skipped = 0;
    const BATCH_LIMIT = 500;

    for (let i = 0; i < allActivities.length; i += BATCH_LIMIT) {
      const chunk = allActivities.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();

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
        const docRef = db.collection('crmActivities').doc(activityId);
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

// ─── Express Server ─────────────────────────────────────────────────────────

const app = express();

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    lastSync: lastSyncResult,
  });
});

app.get('/api/sync-now', async (req, res) => {
  console.log('🔔 Manual sync triggered via /api/sync-now (24-hour backfill)');
  // Backfill 24 hours when manually triggered
  const result = await syncActivities(24);
  res.json(result);
});

app.get('/api/last-sync', (req, res) => {
  res.json(lastSyncResult);
});

// ─── Start Server + Cron ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Sync server running on http://localhost:${PORT}`);
  console.log(`   📋 Endpoints:`);
  console.log(`      GET /api/health     → server status`);
  console.log(`      GET /api/sync-now   → trigger sync manually`);
  console.log(`      GET /api/last-sync  → last sync result`);
  console.log(`   ⏰ Cron: syncing every ${SYNC_INTERVAL_MINUTES} minutes\n`);
});

// Schedule cron: every SYNC_INTERVAL_MINUTES minutes
cron.schedule(`*/${SYNC_INTERVAL_MINUTES} * * * *`, () => {
  // Limit automatic sync to IST working hours (08:45 to 18:15) to save API costs
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // UTC + 5:30
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = 8 * 60 + 45; // 08:45
  const endMinutes = 18 * 60 + 15;  // 18:15
  
  if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
    syncActivities();
  } else {
    // Only log once an hour to avoid spamming the console overnight
    if (minutes < 5) {
      console.log(`💤 [${now.toISOString()}] Outside working hours (IST ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}). Auto-sync paused.`);
    }
  }
});

// Run an initial sync on startup
console.log('🏁 Running initial sync on startup...');
syncActivities();
