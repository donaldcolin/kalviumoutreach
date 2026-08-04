import { db } from './webhook-server/config.js';
async function test() {
  const snapshot = await db.collection('users').limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
test().catch(console.error);
