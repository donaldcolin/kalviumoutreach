import { getAuth } from 'firebase-admin/auth';
import { db } from '../src/config/config.js';

async function wipeAndCreateAdmin() {
  console.log('Starting DB wipe...');
  const auth = getAuth();
  
  // 1. Fetch all users from Auth
  try {
    const listUsersResult = await auth.listUsers(1000);
    const uids = listUsersResult.users.map(u => u.uid);
    console.log(`Found ${uids.length} users in Auth. Deleting...`);
    
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log('Deleted all users from Auth.');
    }
  } catch (err) {
    console.error('Error deleting auth users:', err.message);
  }

  // 2. Delete all users from Firestore
  try {
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deleted ${usersSnapshot.size} user documents from Firestore.`);
  } catch (err) {
    console.error('Error deleting firestore users:', err.message);
  }

  // 3. Create Default Admin
  try {
    console.log('Creating default admin user...');
    const adminEmail = 'donald.colin@kalvium.com';
    const adminPass = 'Sophia2612#';
    
    const adminRecord = await auth.createUser({
      email: adminEmail,
      password: adminPass,
      displayName: 'Donald colin'
    });

    await db.collection('users').doc(adminRecord.uid).set({
      id: adminRecord.uid,
      email: adminEmail,
      name: 'Donald colin',
      phone: '0000000000',
      role: 'admin',
      active: true,
      regionId: 'global'
    });

    console.log(`✅ Default admin created successfully!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPass}`);
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
}

wipeAndCreateAdmin().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
