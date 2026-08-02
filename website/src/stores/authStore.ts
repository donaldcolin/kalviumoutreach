import { create } from 'zustand';
import { auth, secondaryAuth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';

import type { User, UserRole } from '@kalvium-outreach/shared';
export type { User, UserRole };

interface AuthState {
  users: Record<string, User>;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addAssociate: (user: User, pass: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  users: {},
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          set({ user: { ...docSnap.data(), id: docSnap.id } as User, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'User profile not found.' });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    // Subscribe to all users
    onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: Record<string, User> = {};
      snapshot.forEach(d => {
        users[d.id] = { ...d.data(), id: d.id } as User;
      });
      set({ users });
    });
  },

  login: async (email, pass) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  logout: async () => {
    await signOut(auth);
  },
  
  addAssociate: async (newUser, pass) => {
    try {
      // Create user using the secondary auth instance so the primary user doesn't get logged out
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, pass);
      const userToSave = { ...newUser, id: cred.user.uid };
      await setDoc(doc(db, 'users', cred.user.uid), userToSave);
      // Ensure the secondary app signs out to prevent lingering sessions
      await signOut(secondaryAuth);
    } catch (err: any) {
      console.error('Failed to create associate:', err.message);
      throw err;
    }
  }
}));
