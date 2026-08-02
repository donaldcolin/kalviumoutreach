import { db } from '../config.js';
import { getAuth } from 'firebase-admin/auth';

async function migrateCustomClaims() {
  console.log('Starting Custom Claims Migration...');

  try {
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in Firestore.');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      const role = userData.role;
      const managerId = userData.managerId || null;

      try {
        const userRecord = await getAuth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};

        if (currentClaims.role !== role || currentClaims.managerId !== managerId) {
          const newClaims = {
            ...currentClaims,
            role: role,
            managerId: managerId
          };
          
          await getAuth().setCustomUserClaims(userId, newClaims);
          console.log(`[SUCCESS] Updated claims for ${userData.email} (${userId}) -> role: ${role}`);
          successCount++;
        } else {
          console.log(`[SKIP] Claims already up to date for ${userData.email} (${userId})`);
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`[WARN] User in Firestore but missing in Firebase Auth: ${userId}`);
        } else {
          console.error(`[ERROR] Failed to update ${userId}:`, err.message);
          failCount++;
        }
      }
    }

    console.log(`\nMigration Complete!`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
  } finally {
    process.exit(0);
  }
}

migrateCustomClaims();
