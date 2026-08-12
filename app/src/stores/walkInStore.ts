/**
 * Walk-In Store — Manages persistent ongoing walk-in state.
 * Backed by Firestore so TLs can also see ongoing walk-ins.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

export interface OngoingWalkIn {
  leadId: string;
  leadName: string;
  startTime: string; // ISO string
  startLocation: { lat: number; lng: number } | null;
  executiveId: string;
}

interface WalkInState {
  ongoingWalkIn: OngoingWalkIn | null;
  isLoading: boolean;

  /** Load any existing ongoing walk-in from AsyncStorage on app start */
  loadOngoing: (userId: string) => Promise<void>;

  /** Persist a new walk-in session to AsyncStorage and Firestore */
  beginWalkIn: (data: OngoingWalkIn) => Promise<void>;

  /** Clear the ongoing walk-in (on successful push or cancel) */
  clearWalkIn: (userId: string) => Promise<void>;

  /** Subscribe to remote walk-in cancellations */
  subscribeToRemoteCancellations: (userId: string) => void;
  unsubscribeFromRemoteCancellations: () => void;
  _unsubFunc?: () => void;
}

const STORAGE_KEY = 'ongoing_walk_in';

export const useWalkInStore = create<WalkInState>((set, get) => ({
  ongoingWalkIn: null,
  isLoading: true,

  loadOngoing: async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        let existsRemotely = true;
        try {
          // Verify the walk-in still exists in Firestore (manager may have cancelled it)
          // Use a short timeout so we don't hang startup if offline
          const docSnapPromise = firestore().collection('ongoingWalkIns').doc(userId).get();
          const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
          const docSnap = await Promise.race([docSnapPromise, timeoutPromise]) as any;
          
          existsRemotely = docSnap.exists;
        } catch (e) {
          // If network fails or times out, assume it exists so we don't accidentally delete their session while offline
          console.warn('Failed to verify ongoing walk-in remotely, assuming it exists', String(e));
        }

        if (existsRemotely) {
          set({ ongoingWalkIn: JSON.parse(stored) as OngoingWalkIn, isLoading: false });
        } else {
          // Walk-in was cancelled remotely — clear stale local copy
          await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
          set({ ongoingWalkIn: null, isLoading: false });
        }
      } else {
        set({ ongoingWalkIn: null, isLoading: false });
      }
    } catch (err) {
      // If AsyncStorage read fails
      console.error('Failed to load ongoing walk-in from storage:', err);
      set({ ongoingWalkIn: null, isLoading: false });
    }
  },

  subscribeToRemoteCancellations: (userId: string) => {
    const currentUnsub = get()._unsubFunc;
    if (currentUnsub) currentUnsub();

    const unsub = firestore()
      .collection('ongoingWalkIns')
      .doc(userId)
      .onSnapshot((docSnap) => {
        // If the document does not exist remotely, but we have an ongoing walk-in locally,
        // it means a manager cancelled it from the dashboard.
        if (!docSnap.exists && get().ongoingWalkIn) {
          console.log('[WalkInStore] Walk-in was cancelled remotely by a manager.');
          get().clearWalkIn(userId);
        }
      }, (error) => {
        console.error('[WalkInStore] Error listening to remote walk-ins:', error);
      });

    set({ _unsubFunc: unsub });
  },

  unsubscribeFromRemoteCancellations: () => {
    const unsub = get()._unsubFunc;
    if (unsub) {
      unsub();
      set({ _unsubFunc: undefined });
    }
  },

  beginWalkIn: async (data: OngoingWalkIn) => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY}_${data.executiveId}`, JSON.stringify(data));
      // Sync to Firestore for web dashboard
      await firestore().collection('ongoingWalkIns').doc(data.executiveId).set(data);
      
      set({ ongoingWalkIn: data });
    } catch (err) {
      console.error('Failed to persist ongoing walk-in:', err);
    }
  },

  clearWalkIn: async (userId: string) => {
    try {
      // Remove from Firestore first (this resolves immediately in offline cache)
      // If permissions fail, this throws and we don't clear the UI state.
      await firestore().collection('ongoingWalkIns').doc(userId).delete();
      
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      
      // Update local state last so UI stays consistent
      set({ ongoingWalkIn: null });
    } catch (err) {
      console.error('Failed to clear ongoing walk-in:', err);
    }
  },
}));
