import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { logger } from '../utils/logger';

export interface FailedSync {
  id: string;
  [key: string]: any;
}

export function useFailedSyncs(userId?: string) {
  const [failedSyncs, setFailedSyncs] = useState<FailedSync[]>([]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = firestore()
      .collection('pushQueue')
      .where('executiveId', '==', userId)
      .where('status', '==', 'failed')
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) return;
          const syncs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFailedSyncs(syncs);
        },
        (error) => {
          logger.error('Failed to subscribe to failed syncs', String(error));
        }
      );

    return () => unsubscribe();
  }, [userId]);

  const retrySync = async (failedDoc: FailedSync) => {
    try {
      const { id, ...data } = failedDoc;
      
      const batch = firestore().batch();
      
      // We must create a new document to trigger the onDocumentCreated Cloud Function
      const newDocRef = firestore().collection('pushQueue').doc();
      batch.set(newDocRef, {
        ...data,
        status: 'pending',
        error: firestore.FieldValue.delete(), // remove the error field
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Delete the old failed document
      const oldDocRef = firestore().collection('pushQueue').doc(id);
      batch.delete(oldDocRef);
      
      await batch.commit();
      
      return true;
    } catch (e) {
      logger.error('Failed to retry sync', e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  return { failedSyncs, retrySync };
}
