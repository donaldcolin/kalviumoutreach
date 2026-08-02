import { create } from 'zustand';
import { auth, secondaryAuth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, documentId } from 'firebase/firestore';

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
    let usersUnsub: (() => void) | null = null;

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure Custom Claims are fresh
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (!tokenResult.claims.role) {
          await firebaseUser.getIdToken(true); // Force refresh
        }

        const docRef = doc(db, 'users', firebaseUser.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (err: any) {
          console.error("Firestore getDoc error on user profile:", err);
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'Permission denied fetching user profile.' });
          if (usersUnsub) { usersUnsub(); usersUnsub = null; }
          set({ users: {} });
          return;
        }

        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          set({ user: userData, isAuthenticated: true, isLoading: false });

          if (usersUnsub) usersUnsub();

          let q;
          if (userData.role === 'admin') {
            q = collection(db, 'users');
          } else if (userData.role === 'regionalManager') {
            q = query(collection(db, 'users'), where('regionId', '==', userData.regionId));
          } else if (userData.role === 'teamLead') {
            q = query(collection(db, 'users'), where('managerId', '==', userData.id));
          } else {
            q = query(collection(db, 'users'), where(documentId(), '==', userData.id));
          }

          usersUnsub = onSnapshot(q, (snapshot) => {
            const users: Record<string, User> = {};
            snapshot.forEach(d => {
              users[d.id] = d.data() as User;
            });
            set({ users });
          }, (err) => {
            console.error("Firestore onSnapshot error on users collection:", err);
          });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'User profile not found.' });
          if (usersUnsub) { usersUnsub(); usersUnsub = null; }
          set({ users: {} });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        if (usersUnsub) { usersUnsub(); usersUnsub = null; }
        set({ users: {} });
      }
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
