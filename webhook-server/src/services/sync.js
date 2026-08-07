/**
 * LSQ → Firestore Sync Engine
 * Fetches Outreach Activities (code 232) from LeadSquared and writes them to Firestore.
 */
import { db, LSQ_HOST, ACCESS_KEY, SECRET_KEY, SYNC_LOOKBACK_MINUTES, fetch } from '../config/config.js';
import { lsqFetch, parseActivityData, buildFirestoreDoc } from './lsq.js';

// ─── State ──────────────────────────────────────────────────────────────────

export let lastSyncResult = { timestamp: null, activitiesFetched: 0, activitiesWritten: 0, error: null };
let isSyncing = false;
const globalLeadNameCache = new Map();

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

      // ── Extract Lat/Lng directly from bulk response ──────────
      // We now inject Lat/Lng into mx_Custom_34 during CREATE_ACTIVITY, so it's included here.
      for (const slimAct of batch) {
        if (slimAct.ActivityFields && slimAct.ActivityFields.mx_Custom_34) {
          slimAct.mx_Custom_34 = slimAct.ActivityFields.mx_Custom_34;
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

    // 4. Fetch missing Lead Names from LeadSquared (Optimized with caching and concurrency)
    // Filter out leads we already have in our global cache
    const uniqueLeadIds = [...new Set(allActivities.map(a => a.RelatedProspectId).filter(Boolean))];
    const missingLeadIds = uniqueLeadIds.filter(id => !globalLeadNameCache.has(id));

    if (missingLeadIds.length > 0) {
      console.log(`   📡 Fetching names for ${missingLeadIds.length} missing leads (concurrently)...`);
      
      const CONCURRENCY = 5;
      for (let i = 0; i < missingLeadIds.length; i += CONCURRENCY) {
        const chunk = missingLeadIds.slice(i, i + CONCURRENCY);
        
        await Promise.allSettled(chunk.map(async (leadId) => {
          try {
            const resp = await lsqFetch(`/v2/LeadManagement.svc/Leads.GetById?id=${leadId}`, 'GET');
            if (Array.isArray(resp) && resp.length > 0) {
              const lead = resp[0];
              const name = `${lead.FirstName || ''} ${lead.LastName || ''}`.trim();
              globalLeadNameCache.set(leadId, name);
            }
          } catch (e) {
            console.error(`   ⚠️ Failed to fetch lead ${leadId}:`, e.message);
          }
        }));
      }
    }

    // Populate the local map from the global cache for this sync run
    const leadIdToName = {};
    for (const id of uniqueLeadIds) {
      if (globalLeadNameCache.has(id)) {
        leadIdToName[id] = globalLeadNameCache.get(id);
      }
    }

    // 5. Write to Firestore in batches of 500 (Firestore batch limit)
    let written = 0;
    let skipped = 0;
    const BATCH_LIMIT = 500;
    const claimedLocalDocs = new Set();

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
        
        // ── Dedup logic ─────────────────────────────────────────────────
        // Priority 1: If we already have a doc with this lsqActivityId, update it.
        let docRef = mappedDocs[activityId];

        // Priority 2: If the app created a doc (source='app-push') for the same
        // lead around the same time, link it instead of creating a duplicate.
        if (!docRef && raw.RelatedProspectId) {
          try {
            const appCreatedSnap = await db.collection('crmActivities')
              .where('lsqLeadId', '==', raw.RelatedProspectId)
              .where('source', '==', 'app-push')
              .where('lsqActivityId', '==', null)
              .limit(5)
              .get();
            
            if (!appCreatedSnap.empty) {
              // Check if any of these are within 1 hour of the LSQ activity
              // (Tightened from 12 hours to 1 hour to prevent merging distinct morning/afternoon visits)
              const lsqTime = new Date(raw.ModifiedOn || raw.CreatedOn || raw.ActivityDateTime || 0).getTime();
              for (const appDoc of appCreatedSnap.docs) {
                if (claimedLocalDocs.has(appDoc.id)) continue;
                
                const appData = appDoc.data();
                const appTime = new Date(appData.walkInDateTime || 0).getTime();
                if (Math.abs(lsqTime - appTime) < 60 * 60 * 1000) {
                  docRef = appDoc.ref;
                  claimedLocalDocs.add(appDoc.id);
                  // Link the app doc to the LSQ activity ID for future syncs
                  doc.lsqActivityId = activityId;
                  break;
                }
              }
            }
          } catch (e) {
            // If the dedup query fails, fall through to normal write
          }
        }

        // Fallback: use the LSQ activity ID as the doc ID
        if (!docRef) {
          docRef = db.collection('crmActivities').doc(activityId);
        } else {
          // DO NOT overwrite the app's executiveEmail or GPS coordinates for existing docs
          // The API user often creates these in LSQ, which overwrites the real associate email.
          delete doc.executiveId;
          delete doc.executiveEmail;
          if (doc.lat === null) delete doc.lat;
          if (doc.lng === null) delete doc.lng;
        }
        
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
