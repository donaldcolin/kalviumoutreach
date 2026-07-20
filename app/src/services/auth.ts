/**
 * Authentication service — email/password and phone OTP via Firebase Auth.
 * Tokens stored in expo-secure-store (not AsyncStorage).
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';

const SECURE_KEY_USER = 'kalvium_user_profile';

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  await cacheUserProfile(credential.user.uid);
  return credential;
}

/**
 * Start phone OTP sign-in. Returns a confirmation object.
 * The caller must then call confirmPhoneOTP() with the code.
 */
export async function signInWithPhone(
  phoneNumber: string,
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

/**
 * Confirm the OTP code from phone sign-in.
 */
export async function confirmPhoneOTP(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
): Promise<FirebaseAuthTypes.UserCredential | null> {
  const credential = await confirmation.confirm(code);
  if (credential) {
    await cacheUserProfile(credential.user.uid);
  }
  return credential ?? null;
}

/**
 * Sign out and clear cached profile.
 */
export async function signOut(): Promise<void> {
  await auth().signOut();
  await SecureStore.deleteItemAsync(SECURE_KEY_USER);
}

/**
 * Get the current Firebase user (synchronous check).
 */
function getCurrentAuthUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

/**
 * Fetch the user profile document from Firestore.
 * Reads from cache first (offline-first).
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const doc = await firestore().collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as User;
  } catch {
    // Try reading from secure store cache
    return getCachedUserProfile();
  }
}

/**
 * Cache user profile to secure store for offline access.
 */
async function cacheUserProfile(userId: string): Promise<void> {
  try {
    const profile = await getUserProfile(userId);
    if (profile) {
      await SecureStore.setItemAsync(SECURE_KEY_USER, JSON.stringify(profile));
    }
  } catch {
    // Non-critical — profile will be fetched on next online access
  }
}

/**
 * Read cached user profile from secure store.
 */
export async function getCachedUserProfile(): Promise<User | null> {
  try {
    const json = await SecureStore.getItemAsync(SECURE_KEY_USER);
    return json ? (JSON.parse(json) as User) : null;
  } catch {
    return null;
  }
}

/**
 * Listen to auth state changes. Returns unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}
