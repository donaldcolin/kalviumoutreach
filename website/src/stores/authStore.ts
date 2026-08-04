import { create } from 'zustand';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where, or } from 'firebase/firestore';

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
          const userProfile = { ...docSnap.data(), id: docSnap.id } as User;
          set({ user: userProfile, isAuthenticated: true, isLoading: false });

          // Subscribe to users based on role
          let usersQuery = collection(db, 'users');
          if (userProfile.role === 'teamLead') {
            usersQuery = query(
              collection(db, 'users'), 
              where('managerId', '==', userProfile.id)
            ) as any;
          } else if (userProfile.role === 'seniorManager') {
            usersQuery = query(
              collection(db, 'users'), 
              or(where('managerId', '==', userProfile.id), where('seniorManagerId', '==', userProfile.id))
            ) as any;
          }
          // Admins and Regional Managers (AGMs) fetch all users

          onSnapshot(usersQuery, (snapshot) => {
            const users: Record<string, User> = {};
            // Make sure the logged-in user is always in the map
            users[userProfile.id] = userProfile;
            
            snapshot.forEach(d => {
              users[d.id] = { ...d.data(), id: d.id } as User;
            });
            set({ users });
          });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'User profile not found.' });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, password: pass })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      console.error('Failed to create associate:', err.message);
      throw err;
    }
  }
}));
