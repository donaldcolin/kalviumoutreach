import { useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import * as Crypto from 'expo-crypto';

export function useWalkInSync(userId?: string, executiveEmail?: string) {
  const [isSyncing, setIsSyncing] = useState(false);

  const startWalkIn = async (schoolId: string, schoolName: string, activityData?: any[], location?: { lat: number; lng: number } | null) => {
    if (!userId || !executiveEmail) return null;
    setIsSyncing(true);
    
    try {
      const activityId = Crypto.randomUUID();
      const now = new Date().toISOString();

      // 1. Create local crmActivity
      await firestore().collection('crmActivities').doc(activityId).set({
        id: activityId,
        executiveId: userId,
        executiveEmail: executiveEmail.toLowerCase(),
        lsqLeadId: schoolId,
        schoolName: schoolName,
        walkInDateTime: now,
        notes: 'Walk-in Started',
        source: 'app-push',
        ...(location ? { lat: location.lat, lng: location.lng } : {}),
        syncedAt: firestore.FieldValue.serverTimestamp(),
      });

      // 2. Queue push to LeadSquared
      await firestore().collection('pushQueue').add({
        action: 'CREATE_ACTIVITY',
        activityId: activityId,
        leadId: schoolId,
        executiveId: userId,
        notes: 'Walk-in Started',
        activityData: activityData || [],
        ...(location ? { lat: location.lat, lng: location.lng } : {}),
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      return activityId;
    } catch (err) {
      console.error('Failed to start walk-in:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const endWalkIn = async (activityId: string, additionalNotes: string = '', activityData?: any[]) => {
    if (!userId) return false;
    setIsSyncing(true);

    try {
      // 1. Fetch current local activity to get existing notes
      const activityDoc = await firestore().collection('crmActivities').doc(activityId).get();
      let newNote = additionalNotes;
      
      if (activityDoc.exists) {
        const existingNote = activityDoc.data()?.notes || '';
        newNote = existingNote ? `${existingNote}\n\nWalk-in Ended: ${additionalNotes}` : `Walk-in Ended: ${additionalNotes}`;
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
      console.error('Failed to end walk-in:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return { startWalkIn, endWalkIn, isSyncing };
}
