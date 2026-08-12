const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const acts = await db.collection('crmActivities').where('executiveEmail', '==', 'donald.colin@kalvium.com').get();
  console.log("Found by email: ", acts.size);
}
run().catch(console.error);
