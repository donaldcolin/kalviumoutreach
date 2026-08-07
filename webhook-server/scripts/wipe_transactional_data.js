import { db } from '../src/config/config.js';

async function wipeAll() {
  const collections = [
    'appointments', 
    'dailyTracks', 
    'locationRequests', 
    'meetingRecordings', 
    'ongoingWalkIns', 
    'pushQueue',
    'system_logs'
  ];
  
  for (const col of collections) {
    console.log(`Fetching ${col}...`);
    const snapshot = await db.collection(col).get();
    console.log(`Found ${snapshot.size} in ${col}. Wiping...`);
    
    if (snapshot.size === 0) continue;

    const batches = [];
    let currentBatch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      currentBatch.delete(doc.ref);
      count++;
      if (count === 490) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        count = 0;
      }
    });
    
    if (count > 0) {
      batches.push(currentBatch);
    }
    
    for (const batch of batches) {
      await batch.commit();
    }
    console.log(`Successfully wiped ${col}.`);
  }
}

wipeAll().then(() => process.exit(0)).catch(err => {
  console.error('Error wiping:', err);
  process.exit(1);
});
