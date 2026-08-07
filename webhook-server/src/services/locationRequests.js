import { getMessaging } from 'firebase-admin/messaging';
import { db } from '../config/config.js';

export const handleLocationRequest = async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const data = snapshot.data();
  // Only process if it's a new pending request
  if (data.status !== 'pending') {
    return;
  }

  const executiveId = data.executiveId;
  if (!executiveId) {
    console.error(`[locationRequests] No executiveId found on doc ${snapshot.id}`);
    return;
  }

  try {
    // Lookup the executive's FCM token
    const userDoc = await db.collection('users').doc(executiveId).get();
    if (!userDoc.exists) {
      console.error(`[locationRequests] User ${executiveId} not found`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.error(`[locationRequests] User ${executiveId} has no fcmToken configured`);
      await snapshot.ref.update({ status: 'failed', error: 'No FCM token' });
      return;
    }

    // Send silent push notification via FCM
    const message = {
      token: fcmToken,
      data: {
        type: 'LOCATION_PING_REQUEST',
        userId: executiveId,
        requestId: snapshot.id,
      },
      // Important: For Android, 'android' configuration ensures it wakes up the app
      android: {
        priority: 'high',
      },
      // Important: For iOS, 'apns' configuration ensures it wakes up the app silently
      apns: {
        payload: {
          aps: {
            'content-available': 1,
          }
        }
      }
    };

    const response = await getMessaging().send(message);
    console.log(`[locationRequests] Successfully sent FCM message to ${executiveId} (MessageID: ${response})`);
    
    // We update to 'processing', the mobile app will update to 'fulfilled'
    await snapshot.ref.update({ status: 'processing' });
  } catch (err) {
    console.error(`[locationRequests] Failed to send FCM for ${snapshot.id}:`, err);
    await snapshot.ref.update({ status: 'failed', error: err.message });
  }
};
