import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

export function usePendingAppointments(userId?: string | null) {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      const unsub = firestore().collection('appointments')
        .where('executiveId', '==', userId)
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
          if (!snapshot) return;
          const apps = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setAppointments(apps);
        });

      return () => unsub();
    }
  }, [userId]);

  const completeTask = async (taskId: string) => {
    try {
      await firestore().collection('appointments').doc(taskId).update({
        status: 'completed',
        completedAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  return { appointments, completeTask };
}
