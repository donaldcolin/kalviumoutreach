import { db } from './webhook-server/config.js';
async function test() {
  const snapshot = await db.collection('appointments').limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
test().catch(console.error);
