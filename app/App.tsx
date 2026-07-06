/**
 * Kalvium Outreach — Root Application Component
 *
 * Initializes Firebase, navigation, auth state, sync manager,
 * and orphaned recording detection.
 */
import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
  'expo-background-fetch: This library is deprecated',
]);
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Initialize Firebase (must be imported early)
import './src/services/firebase';

import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { cleanupOldRecordings } from './src/services/recording';
import { registerBackgroundFetchAsync } from './src/services/headlessTask';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import '@/global.css';

export default function App() {
  const initialize = useAuthStore(s => (s as any).initialize);
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const [splashFinished, setSplashFinished] = useState(false);

  const animatedSplashStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  useEffect(() => {
    // Hide the native splash screen as soon as our JS splash animation mounts.
    SplashScreen.hideAsync();

    // Trigger entrance animation
    opacity.value = withTiming(1, { duration: 800 });
    scale.value = withSpring(1, { stiffness: 100, damping: 20 });
    
    // Minimum time to show splash
    const timer = setTimeout(() => {
      setSplashFinished(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!appReady || !fontsLoaded || !splashFinished) {
    return (
      <GluestackUIProvider mode="light">
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Image 
            source={require('./assets/LOGO.png')} 
            style={[{ width: 180, height: 100, resizeMode: 'contain' }, animatedSplashStyle]} 
          />
        </View>
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
