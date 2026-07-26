/**
 * Walk-In Store — Manages persistent ongoing walk-in state.
 * Backed by Firestore so TLs can also see ongoing walk-ins.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  /** Persist a new walk-in session to AsyncStorage */
  beginWalkIn: (data: OngoingWalkIn) => Promise<void>;

  /** Clear the ongoing walk-in (on successful push or cancel) */
  clearWalkIn: (userId: string) => Promise<void>;
}

const STORAGE_KEY = 'ongoing_walk_in';

export const useWalkInStore = create<WalkInState>((set) => ({
  ongoingWalkIn: null,
  isLoading: true,

  loadOngoing: async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        set({ ongoingWalkIn: JSON.parse(stored) as OngoingWalkIn, isLoading: false });
      } else {
        set({ ongoingWalkIn: null, isLoading: false });
      }
    } catch (err) {
      console.error('Failed to load ongoing walk-in from AsyncStorage:', err);
      set({ isLoading: false });
    }
  },

  beginWalkIn: async (data: OngoingWalkIn) => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY}_${data.executiveId}`, JSON.stringify(data));
      set({ ongoingWalkIn: data });
    } catch (err) {
      console.error('Failed to persist ongoing walk-in to AsyncStorage:', err);
    }
  },

  clearWalkIn: async (userId: string) => {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      set({ ongoingWalkIn: null });
    } catch (err) {
      console.error('Failed to clear ongoing walk-in from AsyncStorage:', err);
    }
  },
}));
