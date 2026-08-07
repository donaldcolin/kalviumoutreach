import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { CrmActivity } from '../types';

interface CrmActivitiesState {
  activities: CrmActivity[];
  isLoading: boolean;
  isRefreshing: boolean;
  _currentUid: string | null;

  initialize: (uid: string) => void;
  refresh: () => Promise<void>;
  cleanup: () => void;
}

async function fetchActivities(uid: string): Promise<CrmActivity[]> {
  const currentUid = auth().currentUser?.uid;
  if (!currentUid) return [];

  const snapshot = await firestore()
    .collection('crmActivities')
    .where('executiveId', '==', uid)
    .get();

  const acts = snapshot.docs.map((d: { id: any; data: () => any; }) => ({ ...d.data(), id: d.id } as CrmActivity));

  acts.sort((a, b) => {
    const ta = new Date(a.walkInDateTime || a.lsqCreatedOn || 0).getTime();
    const tb = new Date(b.walkInDateTime || b.lsqCreatedOn || 0).getTime();
    return tb - ta;
  });

  return acts;
}

export const useCrmActivitiesStore = create<CrmActivitiesState>((set, get) => ({
  activities: [],
  isLoading: true,
  isRefreshing: false,
  _currentUid: null,

  initialize: async (uid: string) => {
    const state = get();

    // Don't re-fetch if already loaded for this user
    if (state._currentUid === uid && state.activities.length > 0) {
      return;
    }

    set({ isLoading: true, _currentUid: uid });

    try {
      const acts = await fetchActivities(uid);
      set({ activities: acts, isLoading: false });
    } catch (err) {
      console.error('CrmActivities fetch error:', err);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const { _currentUid } = get();
    if (!_currentUid) return;

    set({ isRefreshing: true });
    try {
      const acts = await fetchActivities(_currentUid);
      set({ activities: acts, isRefreshing: false });
    } catch (err) {
      console.error('CrmActivities refresh error:', err);
      set({ isRefreshing: false });
    }
  },

  cleanup: () => {
    set({ activities: [], _currentUid: null });
  },
}));
