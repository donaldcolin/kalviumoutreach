import { db } from './webhook-server/config.js';

async function run() {
  const actsSnap = await db.collection('crmActivities').get();
  const idToEmail = {};
  actsSnap.forEach(d => {
    const data = d.data();
    if (data.executiveId && data.executiveEmail) {
      idToEmail[data.executiveId] = data.executiveEmail;
    }
  });
  console.log("Mapping from Activities:", idToEmail);
}
run().catch(console.error);
