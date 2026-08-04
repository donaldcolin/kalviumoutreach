import { db } from './webhook-server/config.js';

async function run() {
  const apptsSnap = await db.collection('appointments').get();
  const execIds = new Set();
  apptsSnap.forEach(d => {
    if (d.data().executiveId) execIds.add(d.data().executiveId);
  });
  console.log(`Found ${execIds.size} unique executiveIds in appointments:`, [...execIds]);
}
run().catch(console.error);
