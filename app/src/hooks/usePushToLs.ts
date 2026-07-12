import { useState } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export function usePushToLs(userId: string | undefined) {
  const [mappingItem, setMappingItem] = useState<any | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  const handlePushToLS = async (activity: any) => {
    if (!mappingItem || !userId) return;
    setIsPushing(true);
    try {
      await firestore().collection('pushQueue').add({
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

      Alert.alert('Success', 'Recording queued for push to LeadSquared!');
      setMappingItem(null);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Push Failed', err.message);
    } finally {
      setIsPushing(false);
    }
  };

  return { mappingItem, setMappingItem, isPushing, handlePushToLS };
}
