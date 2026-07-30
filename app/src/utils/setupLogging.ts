/**
 * setupLogging.ts
 * 
 * Centralized configuration for React Native's LogBox and console outputs.
 * 
 * ARCHITECTURE NOTE (Firebase Namespaced API):
 * We are currently suppressing the deprecation warnings for React Native Firebase 
 * namespaced APIs (e.g., `firestore().collection(...)`). A full migration to the 
 * modular API (`collection(firestore, ...)`) is a large, high-risk refactor that 
 * touches dozens of files. Since the namespaced API is still fully functional in 
 * our current RNFB version, we preserve it and suppress the spam to keep Metro 
 * terminal logs clean and readable for developers.
 */

import { LogBox } from 'react-native';

// Suppress RNFB v22 and expo-background-fetch deprecation spam from Metro terminal output.
// This MUST run globally before any imports in App.tsx.
const _origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (
    args[0].includes('React Native Firebase namespaced API') ||
    args[0].includes('expo-background-fetch')
  )) return;
  _origWarn(...args);
};

export function configureLogging() {
  // Suppress yellow-box UI warnings in the simulator
  LogBox.ignoreLogs([
    'This method is deprecated (as well as all React Native Firebase namespaced API)',
    'expo-background-fetch: This library is deprecated',
    'Require cycle',
  ]);
}
