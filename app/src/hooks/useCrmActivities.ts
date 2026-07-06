import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

export function useCrmActivities(email?: string | null) {
  const [allActivities, setAllActivities] = useState<any[]>([]);

  useEffect(() => {
    if (email) {
      const unsub = firestore().collection('crmActivities')
        .where('executiveEmail', '==', email.toLowerCase())
        .onSnapshot((snapshot) => {
          if (!snapshot) return;
          const activities = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setAllActivities(activities);
        });

      return () => unsub();
    }
  }, [email]);

  return allActivities;
}
