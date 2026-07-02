import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyADMJ5b1P0x3XnocjcstqiPGlZI0ydtXCc",
  authDomain: "kalvium-outreach-53f54.firebaseapp.com",
  projectId: "kalvium-outreach-53f54",
  storageBucket: "kalvium-outreach-53f54.firebasestorage.app",
  messagingSenderId: "656712790429",
  appId: "1:656712790429:web:9c06fb7586242a34413f74" // derived from android id format
};

// Initialize the primary Firebase app
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary Firebase app for securely adding associates without logging out the primary user
export const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = getAuth(secondaryApp);
