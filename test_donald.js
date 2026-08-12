const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const acts = await db.collection('crmActivities').where('executiveId', '==', 'EanawGPj1hY3aT1n4AcZFYY1b7U2').get();
  console.log("Found: ", acts.size);
  acts.forEach(d => console.log(d.id, d.data().walkInDateTime));
}
run().catch(console.error);
