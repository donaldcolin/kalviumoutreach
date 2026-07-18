/**
 * Walk-In Store — Manages persistent ongoing walk-in state.
 * Backed by Firestore so TLs can also see ongoing walk-ins.
 */
import { create } from 'zustand';
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

  /** Load any existing ongoing walk-in from Firestore on app start */
  loadOngoing: (userId: string) => Promise<void>;

  /** Persist a new walk-in session to Firestore */
  beginWalkIn: (data: OngoingWalkIn) => Promise<void>;

  /** Clear the ongoing walk-in (on successful push or cancel) */
  clearWalkIn: (userId: string) => Promise<void>;
}

export const useWalkInStore = create<WalkInState>((set) => ({
  ongoingWalkIn: null,
  isLoading: true,

  loadOngoing: async (userId: string) => {
    try {
      const doc = await firestore().collection('ongoingWalkIns').doc(userId).get();
      if (doc.exists()) {
        set({ ongoingWalkIn: doc.data() as OngoingWalkIn, isLoading: false });
      } else {
        set({ ongoingWalkIn: null, isLoading: false });
      }
    } catch (err) {
      console.error('Failed to load ongoing walk-in:', err);
      set({ isLoading: false });
    }
  },

  beginWalkIn: async (data: OngoingWalkIn) => {
    try {
      await firestore().collection('ongoingWalkIns').doc(data.executiveId).set(data);
      set({ ongoingWalkIn: data });
    } catch (err) {
      console.error('Failed to persist ongoing walk-in:', err);
    }
  },

  clearWalkIn: async (userId: string) => {
    try {
      await firestore().collection('ongoingWalkIns').doc(userId).delete();
      set({ ongoingWalkIn: null });
    } catch (err) {
      console.error('Failed to clear ongoing walk-in:', err);
    }
  },
}));
