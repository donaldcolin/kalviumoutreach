import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';

export interface GroupedRecordings {
  title: string;
  data: any[];
}

export function useMeetingRecordings(userId: string | undefined) {
  const [recordings, setRecordings] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsub = firestore()
      .collection('meetingRecordings')
      .where('executiveId', '==', userId)
      .orderBy('timestamp', 'desc')
      .onSnapshot((snap) => {
        if (!snap) return;
        const recs: any[] = [];
        snap.forEach((doc) => recs.push({ id: doc.id, ...doc.data() }));
        setRecordings(recs);
      });
    return unsub;
  }, [userId]);

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

  return { recordings, groupedRecordings };
}
