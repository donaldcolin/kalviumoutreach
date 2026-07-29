import { db } from './config.js';

async function wipeActivities() {
  console.log('Fetching all CRM activities...');
  const snapshot = await db.collection('crmActivities').get();
  console.log(`Found ${snapshot.size} activities. Wiping...`);
  
  const batch = db.batch();
  let count = 0;
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    count++;
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully wiped ${count} activities.`);
  } else {
    console.log('No activities to wipe.');
  }
}

wipeActivities().then(() => process.exit(0)).catch(err => {
  console.error('Error wiping activities:', err);
  process.exit(1);
});
