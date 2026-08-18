import { create } from 'zustand';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';

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
          }
          // Admins, Regional Managers (AGMs), and Senior Managers fetch all users first
          // Senior Managers will filter them locally to avoid missing seniorManagerId index issues.

          onSnapshot(usersQuery, (snapshot) => {
            const users: Record<string, User> = {};
            // Make sure the logged-in user is always in the map
            users[userProfile.id] = userProfile;
            
            const fetchedUsers = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
            console.log(`[authStore] Fetched ${fetchedUsers.length} users from Firestore (role: ${userProfile.role})`);
            
            if (userProfile.role === 'seniorManager') {
              // Find my teamLeads
              const myTeamLeads = fetchedUsers.filter(u => u.managerId === userProfile.id);
              const myTeamLeadIds = new Set(myTeamLeads.map(t => t.id));
              console.log(`[authStore] Found ${myTeamLeads.length} teamLeads, teamLeadIds:`, [...myTeamLeadIds]);
              
              fetchedUsers.forEach(u => {
                if (u.managerId === userProfile.id || (u.managerId && myTeamLeadIds.has(u.managerId))) {
                  users[u.id] = u;
                }
              });
              console.log(`[authStore] Final users map has ${Object.keys(users).length} entries`);
            } else {
              fetchedUsers.forEach(u => {
                users[u.id] = u;
              });
            }
            
            set({ users });
          }, (error) => {
            console.error('[authStore] onSnapshot error:', error);
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
      const baseUrl = import.meta.env.VITE_API_URL || 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`${baseUrl}/api/create-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
