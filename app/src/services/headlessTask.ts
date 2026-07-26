import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { appendPing } from './firestore';
import { format } from 'date-fns';
import { logger } from '../utils/logger';
import type { LocationPing } from '../types';

const BACKGROUND_FETCH_TASK = 'background-location-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    logger.info('Background fetch woke up');
    
    // In a Headless JS context, React state and Zustand memory are often uninitialized.
    // Read directly from the disk-persisted tracking session.
    const sessionStr = await AsyncStorage.getItem('tracking_session');
    if (!sessionStr) {
      logger.info('No active tracking session found in AsyncStorage, aborting.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { userId, dateStr } = JSON.parse(sessionStr);

    // ALWAYS act as a backup location tracker (runs ~every 15 mins)
    // We rely purely on FCM push notifications for live TL ping requests now.
    try {
      const accuracy = Location.Accuracy.Balanced;
      const loc = await Location.getCurrentPositionAsync({ accuracy });
      const ping: LocationPing = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: Number(loc.timestamp),
        accuracy: loc.coords.accuracy ?? 0,
      };
      await appendPing(userId, dateStr, ping);
      logger.info('Backup location ping saved (Accuracy: Balanced)');
    } catch (e) {
      logger.warn('Failed to get backup location', e instanceof Error ? e.message : String(e));
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logger.error('Background fetch failed', error instanceof Error ? error.message : String(error));
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
