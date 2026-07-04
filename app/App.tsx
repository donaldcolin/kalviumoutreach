/**
 * Kalvium Outreach — Root Application Component
 *
 * Initializes Firebase, navigation, auth state, sync manager,
 * and orphaned recording detection.
 */
import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
  'expo-background-fetch: This library is deprecated',
]);
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Initialize Firebase (must be imported early)
import './src/services/firebase';

import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { cleanupOldRecordings } from './src/services/recording';
import { registerBackgroundFetchAsync } from './src/services/headlessTask';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import '@/global.css';

export default function App() {
  const initialize = useAuthStore(s => (s as any).initialize);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Initialize auth state listener
    const unsubAuth = initialize();

    // Clean up old orphaned recordings
    cleanupOldRecordings().then(() => {
      console.log('[App] Orphaned recordings cleanup complete');
    });

    // Register headless background task (15-min fallback for location fetching)
    registerBackgroundFetchAsync().then(() => {
      console.log('[App] Background fetch task registered');
    }).catch(err => {
      console.error('[App] Failed to register background fetch:', err);
    });

    setAppReady(true);

    return () => {
      unsubAuth();
    };
  }, []);

  if (!appReady) {
    return (
      <GluestackUIProvider mode="light">
        <VStack className="flex-1 justify-center items-center bg-background">
          <Spinner size="large" color="#E11D48" />
        </VStack>
      </GluestackUIProvider>
    );
  }

  return (
    <GluestackUIProvider mode="light">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer
            theme={{
              ...DefaultTheme,
              colors: {
                ...DefaultTheme.colors,
                primary: '#E11D48',
                background: '#FAF8F5',
                card: '#FFFFFF',
                text: '#1C1917',
                border: '#E7E5E4',
                notification: '#EF4444',
              },
            }}
          >
            <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}
