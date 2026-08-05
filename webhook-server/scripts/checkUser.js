import { db } from '../config.js';

async function checkExecs() {
  // Get Ayyappan's ID  
  const aySnap = await db.collection('users').where('email', '==', 'ayyappan.j@kalvium.com').get();
  const ayyappanId = aySnap.docs[0]?.id;
  console.log(`Ayyappan ID: ${ayyappanId}`);

  // Get Akshay's ID
  const akSnap = await db.collection('users').where('email', '==', 'akshay.mathew@kalvium.com').get();
  const akshayId = akSnap.docs[0]?.id;
  console.log(`Akshay ID: ${akshayId}`);

  // Check executives whose managerId is one of these
  const execs1 = await db.collection('users').where('managerId', '==', ayyappanId).get();
  console.log(`\nExecutives under Ayyappan (managerId=${ayyappanId}):`);
  execs1.forEach(doc => {
    const d = doc.data();
    console.log(`  ${d.name} (${d.role}) managerId=${d.managerId} seniorManagerId=${d.seniorManagerId || 'none'}`);
  });

  const execs2 = await db.collection('users').where('managerId', '==', akshayId).get();
  console.log(`\nExecutives under Akshay (managerId=${akshayId}):`);
  execs2.forEach(doc => {
    const d = doc.data();
    console.log(`  ${d.name} (${d.role}) managerId=${d.managerId} seniorManagerId=${d.seniorManagerId || 'none'}`);
  });

  process.exit(0);
}
checkExecs();
