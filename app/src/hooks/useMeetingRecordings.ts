import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';

export interface GroupedRecordings {
  title: string;
  data: any[];
}

export function useMeetingRecordings(userId: string | undefined) {
  const [recordings, setRecordings] = useState<any[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecordings = async () => {
    if (!userId) return;
    try {
      const snap = await firestore()
        .collection('meetingRecordings')
        .where('executiveId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      const recs: any[] = [];
      snap.forEach((doc) => recs.push({ id: doc.id, ...doc.data() }));
      setRecordings(recs);
    } catch (err) {
      console.warn('Failed to fetch meeting recordings:', err);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [userId]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchRecordings();
    setIsRefreshing(false);
  };

  const groupedRecordings = useMemo(() => {
    const groups: GroupedRecordings[] = [];
    recordings.forEach((rec) => {
      const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date();
      let title = d.toLocaleDateString();
      if (d.toDateString() === new Date().toDateString()) title = 'Today';
      else if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) title = 'Yesterday';

      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, data: [] };
        groups.push(group);
      }
      group.data.push(rec);
    });
    return groups;
  }, [recordings]);

  return { recordings, groupedRecordings, refresh, isRefreshing };
}
