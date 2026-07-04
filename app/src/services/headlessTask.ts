import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { appendPing } from './firestore';
import { format } from 'date-fns';
import type { LocationPing } from '../types';

const BACKGROUND_FETCH_TASK = 'background-location-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[HeadlessTask] Background fetch woke up');
    
    // In a Headless JS context, React state and Zustand memory are often uninitialized.
    // Read directly from the disk-persisted tracking session.
    const sessionStr = await AsyncStorage.getItem('tracking_session');
    if (!sessionStr) {
      console.log('[HeadlessTask] No active tracking session found in AsyncStorage, aborting.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { userId, dateStr } = JSON.parse(sessionStr);

    // ALWAYS act as a backup location tracker (runs ~every 15 mins)
    // This ensures we get a trail even if the user force closes the app
    // and the OS kills the primary foreground location service.
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const ping: LocationPing = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: Number(loc.timestamp),
        accuracy: loc.coords.accuracy ?? 0,
      };
      await appendPing(userId, dateStr, ping);
      console.log('[HeadlessTask] Backup location ping saved');
    } catch (e) {
      console.warn('[HeadlessTask] Failed to get backup location', e);
    }

    // Check if there are any specific on-demand location requests from TLs
    const snapshot = await firestore()
      .collection('locationRequests')
      .where('executiveId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      await docSnap.ref.update({ status: 'processing' });
      // We already grabbed location above, but let's grab a high accuracy one for the request
      const highAccLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      const ping: LocationPing = {
        lat: highAccLoc.coords.latitude,
        lng: highAccLoc.coords.longitude,
        timestamp: Number(highAccLoc.timestamp),
        accuracy: highAccLoc.coords.accuracy ?? 0,
      };

      await appendPing(userId, dateStr, ping);
      await docSnap.ref.update({ status: 'fulfilled' });
      console.log('[HeadlessTask] Successfully processed on-demand background location request!');
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[HeadlessTask] Failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registers the background fetch task with the OS.
 * Call this in App.tsx.
 */
export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false, // Continue running after app is killed (Android)
    startOnBoot: true,      // Start after device reboot (Android)
  });
}
