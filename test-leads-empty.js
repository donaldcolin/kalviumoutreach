import { db } from './webhook-server/config.js';
async function test() {
  const snapshot = await db.collection('leads')
    .where('ownerEmail', '==', 'aditya.narayan@kalvium.com')
    .limit(5)
    .get();
  console.log(`Found ${snapshot.size} leads.`);
}
test().catch(console.error);
