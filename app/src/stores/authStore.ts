/**
 * Auth store — manages user authentication state.
 */
import { create } from 'zustand';
import type { User } from '../types';
import {
  signInWithEmail,
  signInWithPhone,
  confirmPhoneOTP,
  signOut as firebaseSignOut,
  getUserProfile,
  onAuthStateChanged,
  getCachedUserProfile,
} from '../services/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firestoreSync } from '../tracking/firestoreSync';
import { locationTracker } from '../tracking/locationTracker';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  phoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null;

  // Actions
  initialize: () => () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  phoneConfirmation: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            profile = await getCachedUserProfile();
          }

          // Fetch FCM Token and update user profile
          try {
            const authStatus = await messaging().requestPermission();
            const enabled =
              authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
              const fcmToken = await messaging().getToken();
              await firestore().collection('users').doc(firebaseUser.uid).update({
                fcmToken,
              });
            }
          } catch (e) {
            console.warn('Failed to get FCM token:', e);
          }

          set({
            firebaseUser,
            user: profile,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // No profile found — don't let user into the app
          set({
            firebaseUser,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          firebaseUser: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });
    return unsubscribe;
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithEmail(email, password);
      // Auth state listener will handle the rest
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
    }
  },

  loginWithPhone: async (phoneNumber) => {
    set({ isLoading: true, error: null });
    try {
      const confirmation = await signInWithPhone(phoneNumber);
      set({ phoneConfirmation: confirmation, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Phone login failed',
      });
    }
  },

  verifyOTP: async (code) => {
    const { phoneConfirmation } = get();
    if (!phoneConfirmation) {
      set({ error: 'No phone confirmation pending' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await confirmPhoneOTP(phoneConfirmation, code);
      set({ phoneConfirmation: null });
      // Auth state listener will handle the rest
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'OTP verification failed',
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Stop tracking and clear session BEFORE signing out
      await locationTracker.stopTracking().catch(e => console.warn('Stop tracking failed during logout', String(e)));
      await firestoreSync.endSession().catch(e => console.warn('End session failed during logout', String(e)));
      
      const { useTasksStore } = require('./tasksStore');
      const { useCrmActivitiesStore } = require('./crmActivitiesStore');
      useTasksStore.getState().cleanup();
      useCrmActivitiesStore.getState().cleanup();
      
      await firebaseSignOut();
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Logout failed',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
