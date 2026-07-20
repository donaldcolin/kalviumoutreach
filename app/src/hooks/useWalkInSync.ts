import { useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import * as Crypto from 'expo-crypto';
import { logger } from '../utils/logger';

export function useWalkInSync(userId?: string, executiveEmail?: string) {
  const [isSyncing, setIsSyncing] = useState(false);

  const startWalkIn = async (
    schoolId: string,
    schoolName: string,
    activityData?: any[],
    locationPayload?: {
      startLocation: { lat: number; lng: number } | null;
      endLocation: { lat: number; lng: number } | null;
      distanceMeters: number | null;
      isValidWalkIn: boolean | null;
    },
    extraData?: Record<string, any>,
    storageUrl?: string | null
  ) => {
    if (!userId || !executiveEmail) return null;
    setIsSyncing(true);
    
    try {
      const activityId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const notesWithUrl = storageUrl ? `Walk-in Started\n\nRecording: ${storageUrl}` : 'Walk-in Started';

      // 1. Create local crmActivity with all form data for timeline display
      await firestore().collection('crmActivities').doc(activityId).set({
        id: activityId,
        executiveId: userId,
        executiveEmail: executiveEmail.toLowerCase(),
        lsqLeadId: schoolId,
        schoolName: schoolName,
        walkInDateTime: now,
        notes: notesWithUrl,
        source: 'app-push',
        lsqActivityId: null, // Will be set by pushQueue after LSQ confirms creation
        // Top-level lat/lng for map markers on the website dashboard
        lat: locationPayload?.startLocation?.lat ?? null,
        lng: locationPayload?.startLocation?.lng ?? null,
        ...(locationPayload || {}),
        ...(extraData || {}),
        syncedAt: firestore.FieldValue.serverTimestamp(),
      });

      // 2. Queue push to LeadSquared
      await firestore().collection('pushQueue').add({
        action: 'CREATE_ACTIVITY',
        activityId: activityId,
        leadId: schoolId,
        executiveId: userId,
        notes: notesWithUrl,
        activityData: activityData || [],
        ...(locationPayload || {}),
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      return activityId;
    } catch (err) {
      logger.error('Failed to start walk-in:', err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const endWalkIn = async (activityId: string, additionalNotes: string = '', activityData?: any[], storageUrl?: string | null) => {
    if (!userId) return false;
    setIsSyncing(true);

    try {
      // 1. Fetch current local activity to get existing notes
      const activityDoc = await firestore().collection('crmActivities').doc(activityId).get();
      let newNote = additionalNotes;
      
      if (activityDoc.exists()) {
        const existingNote = activityDoc.data()?.notes || '';
        newNote = existingNote && existingNote !== 'Walk-in Started' 
          ? `${existingNote}\n\nWalk-in Ended: ${additionalNotes}` 
          : `Walk-in Ended: ${additionalNotes}`;
      }

      if (storageUrl) {
        newNote = `${newNote}\n\nRecording: ${storageUrl}`;
      }

      // 2. Update local crmActivity
      await firestore().collection('crmActivities').doc(activityId).update({
        notes: newNote,
      });

      // 3. Queue push to LeadSquared
      await firestore().collection('pushQueue').add({
        action: 'UPDATE_ACTIVITY',
        activityId: activityId,
        executiveId: userId,
        notes: newNote,
        activityData: activityData || [],
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      return true;
    } catch (err) {
      logger.error('Failed to end walk-in:', err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return { startWalkIn, endWalkIn, isSyncing };
}
