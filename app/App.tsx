/**
 * Kalvium Outreach — Root Application Component
 *
 * Initializes Firebase, navigation, auth state, sync manager,
 * and orphaned recording detection.
 */
import './src/utils/setupLogging';
import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { configureLogging } from './src/utils/setupLogging';

configureLogging();
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Initialize Firebase (must be imported early)
import './src/services/firebase';
import './src/tracking/taskRegistry';

import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { cleanupOldRecordings } from './src/services/recording';
import { registerBackgroundFetchAsync } from './src/services/headlessTask';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import messaging from '@react-native-firebase/messaging';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { firestoreSync } from './src/tracking/firestoreSync';
import type { LocationPing } from './src/types';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import { ToastManager } from '@/components/ui/ToastManager';
// @ts-ignore
import '@/global.css';



function App() {
  const initialize = useAuthStore(s => s.initialize);
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

    // Handle FCM foreground messages
    const unsubMessaging = messaging().onMessage(async (remoteMessage: any) => {
      console.log('Message handled in the foreground!', remoteMessage);
      if (remoteMessage.data?.type === 'LOCATION_PING_REQUEST') {
        try {
          const userId = remoteMessage.data.userId as string;
          const requestId = remoteMessage.data.requestId as string;
          
          if (!userId) return;

          const servicesEnabled = await Location.hasServicesEnabledAsync();
          if (!servicesEnabled) {
            throw new Error('Location services are disabled');
          }

          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const ping: LocationPing = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            timestamp: Number(loc.timestamp),
            accuracy: loc.coords.accuracy ?? 0,
          };
          
          const dateStr = format(new Date(), 'yyyyMMdd');
          await firestoreSync.appendHeadlessLocations(userId, dateStr, [{
            lat: ping.lat,
            lng: ping.lng,
            ts: ping.timestamp,
            speed: null,
            accuracy: ping.accuracy,
          }]);
          
          if (requestId) {
            await firestore().collection('locationRequests').doc(requestId).update({ status: 'fulfilled' });
          }
        } catch (e) {
          console.warn('Failed foreground location fetch from FCM:', e);
          const requestId = remoteMessage.data?.requestId as string | undefined;
          if (requestId) {
            await firestore().collection('locationRequests').doc(requestId).update({ status: 'failed' });
          }
        }
      }
    });

    return () => {
      unsubAuth();
      unsubMessaging();
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
            <ToastManager />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}

export default App;
