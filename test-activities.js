import { db } from './webhook-server/config.js';
async function test() {
  const snapshot = await db.collection('crmActivities')
    .where('ownerEmail', '==', 'aditya.narayan@kalvium.com')
    .limit(5)
    .get();
  console.log(`Found ${snapshot.size} activities.`);
  snapshot.forEach(doc => console.log(doc.id));
}
test().catch(console.error);
