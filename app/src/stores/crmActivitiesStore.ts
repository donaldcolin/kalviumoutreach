import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';

export interface CrmActivity {
  id: string;
  executiveEmail?: string;
  walkInDateTime?: string;
  lsqCreatedOn?: string;
  [key: string]: any;
}

interface CrmActivitiesState {
  activities: CrmActivity[];
  isLoading: boolean;
  isRefreshing: boolean;
  _currentEmail: string | null;

  initialize: (email: string) => void;
  refresh: () => Promise<void>;
}

async function fetchActivities(email: string): Promise<CrmActivity[]> {
  const snapshot = await firestore()
    .collection('crmActivities')
    .where('executiveEmail', '==', email)
    .get();

  const acts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CrmActivity));

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
  _currentEmail: null,

  initialize: async (email: string) => {
    const normalizedEmail = email.toLowerCase();
    const state = get();

    // Don't re-fetch if already loaded for this email
    if (state._currentEmail === normalizedEmail && state.activities.length > 0) {
      return;
    }

    set({ isLoading: true, _currentEmail: normalizedEmail });

    try {
      const acts = await fetchActivities(normalizedEmail);
      set({ activities: acts, isLoading: false });
    } catch (err) {
      console.error('CrmActivities fetch error:', err);
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const { _currentEmail } = get();
    if (!_currentEmail) return;

    set({ isRefreshing: true });
    try {
      const acts = await fetchActivities(_currentEmail);
      set({ activities: acts, isRefreshing: false });
    } catch (err) {
      console.error('CrmActivities refresh error:', err);
      set({ isRefreshing: false });
    }
  },
}));
