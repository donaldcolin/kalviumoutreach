const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const users = await db.collection('users').get();
  users.forEach(u => console.log(u.id, u.data().email, u.data().name));
}
run().catch(console.error);
