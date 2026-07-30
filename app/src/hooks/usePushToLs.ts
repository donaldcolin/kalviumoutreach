import { useState } from 'react';
import { Toast } from '@/components/ui/ToastManager';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import type { MeetingRecording, CrmActivity } from '../types';

export function usePushToLs(userId: string | undefined) {
  const [mappingItem, setMappingItem] = useState<MeetingRecording | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  const handlePushToLS = async (activity: CrmActivity) => {
    if (!mappingItem || !userId) return;
    setIsPushing(true);
    try {
      await firestore().collection('pushQueue').add({
        action: 'PUSH_RECORDING',
        activityId: activity.lsqActivityId || activity.id,
        storageUrl: mappingItem.storageUrl,
        recordingId: mappingItem.id,
        executiveId: userId,
        schoolName: activity.schoolName || '',
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore().collection('meetingRecordings').doc(mappingItem.id).update({
        pushedToLS: true,
        mappedActivityId: activity.lsqActivityId || activity.id,
        mappedSchoolName: activity.schoolName || '',
      });

      Toast.show({ title: 'Success', message: 'Recording queued for push to LeadSquared!', type: 'success' });
      setMappingItem(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(err);
      Toast.show({ title: 'Push Failed', message, type: 'error' });
    } finally {
      setIsPushing(false);
    }
  };

  return { mappingItem, setMappingItem, isPushing, handlePushToLS };
}
