const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const acts = await db.collection('crmActivities').orderBy('syncedAt', 'desc').limit(5).get();
  acts.forEach(d => console.log(d.id, d.data().executiveId, d.data().executiveEmail, d.data().walkInDateTime, d.data().notes, d.data().recordingUrl));
}
run().catch(console.error);
