import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getAuth } from 'firebase-admin/auth';
import { db } from "./config.js";

/**
 * Triggered whenever a user document is created or updated.
 * Automatically syncs the user's role and managerId to their Firebase Auth Custom Claims.
 */
export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const snapshot = event.data;

  // Document was deleted
  if (!snapshot.after.exists) {
    // Optionally remove claims if needed, but the user account might be deleted anyway
    return;
  }

  const userData = snapshot.after.data();
  const role = userData.role;
  const managerId = userData.managerId || null;

  try {
    // Get existing custom claims
    const userRecord = await getAuth().getUser(userId);
    const currentClaims = userRecord.customClaims || {};

    // Only update if claims actually changed to avoid infinite loops or unnecessary updates
    if (currentClaims.role !== role || currentClaims.managerId !== managerId) {
      const newClaims = {
        ...currentClaims,
        role: role,
        managerId: managerId
      };
      
      await getAuth().setCustomUserClaims(userId, newClaims);
      console.log(`✅ Synced custom claims for user ${userId} -> role: ${role}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync custom claims for user ${userId}:`, error);
  }
});
