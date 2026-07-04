/**
 * Firebase initialization and configuration.
 * Firestore offline persistence with CACHE_SIZE_UNLIMITED is enabled by default
 * on @react-native-firebase/firestore for React Native.
 */
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Configure Firestore settings — unlimited cache for offline-first
// persistence is enabled by default on React Native Firebase
try {
  firestore().settings({
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
  });
} catch (e) {
  // Settings may have already been applied
  console.warn('[Firebase] Firestore settings error:', e);
}

export { firestore, auth, storage };
export default { firestore, auth, storage };
