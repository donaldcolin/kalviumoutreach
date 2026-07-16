/**
 * Push Queue Processor
 * Triggered automatically when a new document is written to the pushQueue collection.
 * Handles: CREATE_ACTIVITY, UPDATE_ACTIVITY, PUSH_RECORDING
 */
import { db, FieldValue } from './config.js';
import { lsqFetch } from './lsq.js';

export async function handlePushQueue(event) {
  const snapshot = event.data;
  if (!snapshot) return;

  const docId = event.params.docId;
  const data = snapshot.data();
  // action can be CREATE_ACTIVITY, UPDATE_ACTIVITY, or PUSH_RECORDING (legacy default)
  const { action, activityId, leadId, storageUrl, recordingId, notes, activityData } = data;

  const resolvedAction = action || (storageUrl ? 'PUSH_RECORDING' : null);

  if (!resolvedAction) {
    console.warn(`⚠️ pushQueue/${docId}: missing action, skipping.`);
    await snapshot.ref.update({ status: 'failed', error: 'Missing action type' });
    return;
  }

  console.log(`📤 Processing pushQueue/${docId} → [${resolvedAction}] for activity ${activityId || 'NEW'}`);

  try {
    if (resolvedAction === 'CREATE_ACTIVITY') {
      if (!leadId) throw new Error('leadId is required to create an activity');
      
      const createBody = {
        RelatedProspectId: leadId,
        ActivityEvent: 232,
        ActivityNote: notes || 'Walk-in Started',
        ActivityDateTime: new Date().toISOString().replace('T', ' ').split('.')[0],
        // Pass any custom fields provided by the app
        Fields: activityData || []
      };

      const lsqResp = await lsqFetch('/v2/ProspectActivity.svc/Create', 'POST', createBody);
      console.log(`   ✅ LSQ created activity`, lsqResp);
      
      // Update local firestore doc with LSQ ID if we have a local ID
      const newLsqId = lsqResp.Message?.Id || lsqResp.Message; // Depends on LSQ response format
      if (activityId && newLsqId) {
        await db.collection('crmActivities').doc(activityId).update({
          lsqActivityId: newLsqId,
          lsqModifiedOn: new Date().toISOString()
        });
      }

    } else if (resolvedAction === 'UPDATE_ACTIVITY') {
      if (!activityId) throw new Error('activityId is required for UPDATE_ACTIVITY');
      
      const updateBody = {
        ProspectActivityId: activityId,
        ActivityEvent: 232,
        ActivityNote: notes || '',
        Fields: activityData || []
      };

      const lsqResp = await lsqFetch('/v2/ProspectActivity.svc/Update', 'POST', updateBody);
      console.log(`   ✅ LSQ updated for activity ${activityId}`, lsqResp);
      
      await db.collection('crmActivities').doc(activityId).update({
        notes: notes,
        lsqModifiedOn: new Date().toISOString()
      });

    } else if (resolvedAction === 'PUSH_RECORDING') {
      if (!activityId || !storageUrl) throw new Error('activityId and storageUrl are required for PUSH_RECORDING');

      // Fetch existing notes from our Firestore copy to append (not overwrite)
      const activityDoc = await db.collection('crmActivities').doc(activityId).get();
      let existingNote = '';
      if (activityDoc.exists) {
        existingNote = activityDoc.data().notes || '';
      }

      const newNote = existingNote
        ? `${existingNote}\n\nRecording: ${storageUrl}`
        : `Recording: ${storageUrl}`;

      const updateBody = {
        ProspectActivityId: activityId,
        ActivityEvent: 232,
        ActivityNote: newNote,
      };

      const lsqResp = await lsqFetch('/v2/ProspectActivity.svc/Update', 'POST', updateBody);
      console.log(`   ✅ LSQ updated for activity ${activityId}`, lsqResp);

      await db.collection('crmActivities').doc(activityId).update({
        notes: newNote,
        lsqModifiedOn: new Date().toISOString()
      });

      if (recordingId) {
        await db.collection('meetingRecordings').doc(recordingId).update({
          pushedToLS: true,
        });
      }
    }

    // Mark queue item as completed
    await snapshot.ref.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    });

    console.log(`   ✅ pushQueue/${docId} completed successfully.`);

  } catch (err) {
    console.error(`   ❌ pushQueue/${docId} failed:`, err.message);
    await snapshot.ref.update({
      status: 'failed',
      error: err.message,
      failedAt: FieldValue.serverTimestamp(),
    });
  }
}
