import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';

export function useTasks(userId?: string | null, status: 'pending' | 'completed' = 'pending') {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      const unsub = firestore()
        .collection('appointments')
        .where('executiveId', '==', userId)
        .where('status', '==', status)
        .onSnapshot((snapshot) => {
          if (!snapshot) return;
          const fetchedTasks = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          // Sort by date (closest first for pending, most recent completed for completed)
          fetchedTasks.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return status === 'pending' ? dateA - dateB : dateB - dateA;
          });
          setTasks(fetchedTasks);
        });

      return () => unsub();
    }
  }, [userId, status]);

  const completeTask = async (taskId: string) => {
    try {
      await firestore().collection('appointments').doc(taskId).update({
        status: 'completed',
        completedAt: firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to complete task', err);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  return { tasks, completeTask };
}
