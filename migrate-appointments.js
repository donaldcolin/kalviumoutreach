import { db } from './webhook-server/config.js';

async function run() {
  console.log("Fetching old activities mapping...");
  const actsSnap = await db.collection('crmActivities').get();
  const oldIdToEmail = {};
  actsSnap.forEach(d => {
    const data = d.data();
    if (data.executiveId && data.executiveEmail) {
      oldIdToEmail[data.executiveId] = data.executiveEmail.toLowerCase();
    }
  });

  console.log("Fetching new users mapping...");
  const usersSnap = await db.collection('users').get();
  const emailToNewId = {};
  usersSnap.forEach(d => {
    const data = d.data();
    if (data.email) {
      emailToNewId[data.email.toLowerCase()] = d.id;
    }
  });

  console.log("Migrating appointments...");
  const apptsSnap = await db.collection('appointments').get();
  const batch = db.batch();
  let count = 0;

  apptsSnap.forEach(d => {
    const data = d.data();
    const oldId = data.executiveId;
    if (oldId && oldIdToEmail[oldId]) {
      const email = oldIdToEmail[oldId];
      const newId = emailToNewId[email];
      if (newId && newId !== oldId) {
        batch.update(d.ref, { executiveId: newId });
        count++;
        console.log(`Will update appointment ${d.id}: ${oldId} -> ${newId} (${email})`);
      }
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} appointments to new user IDs!`);
  } else {
    console.log("No appointments needed migration.");
  }
}
run().catch(console.error);
