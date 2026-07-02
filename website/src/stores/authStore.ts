import { create } from 'zustand';
import { auth, secondaryAuth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';

export type UserRole = 'executive' | 'teamLead' | 'regionalManager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId: string;
  regionId: string;
  managerId?: string;
  active: boolean;
}

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
          set({ user: docSnap.data() as User, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: 'User profile not found.' });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    // Subscribe to all users (in a real app you'd paginate or filter, but for now we fetch all for the admin)
    onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: Record<string, User> = {};
      snapshot.forEach(doc => {
        users[doc.id] = doc.data() as User;
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
