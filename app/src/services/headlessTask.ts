import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import { appendPing } from './firestore';
import { logger } from '../utils/logger';
import type { LocationPing } from '../types';

const BACKGROUND_FETCH_TASK = 'background-location-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    logger.info('App checked in from the background');
    
    // In a Headless JS context, React state and Zustand memory are often uninitialized.
    // Read directly from the disk-persisted tracking session.
    const sessionStr = await AsyncStorage.getItem('tracking_session');
    if (!sessionStr) {
      logger.info('User has not started their day yet, skipping background location check.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { userId, dateStr } = JSON.parse(sessionStr);

    // ALWAYS act as a backup location tracker (runs ~every 15 mins)
    // We rely purely on FCM push notifications for live TL ping requests now.
    try {
      // 1. Check if the user turned off their GPS globally
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        logger.warn('User s phone GPS is turned off, skipping location check.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // 2. Check if background permissions are still granted
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('User has not allowed background location, skipping location check.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const accuracy = Location.Accuracy.Balanced;
      
      const locPromise = Location.getCurrentPositionAsync({ accuracy }).catch(e => {
        logger.warn('getCurrentPositionAsync rejected', String(e));
        return null;
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
      
      let loc = await Promise.race([locPromise, timeoutPromise]) as Location.LocationObject | null;
      
      if (!loc) {
        logger.warn('getCurrentPositionAsync failed or timed out. Falling back to getLastKnownPositionAsync.');
        loc = await Location.getLastKnownPositionAsync().catch(e => {
           logger.warn('getLastKnownPositionAsync rejected', String(e));
           return null;
        });
      }
      
      if (!loc) {
         logger.warn('Could not retrieve any location within the time limit.');
         return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      
      const ping: LocationPing = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: Number(loc.timestamp),
        accuracy: loc.coords.accuracy ?? 0,
      };
      await appendPing(userId, dateStr, ping);
      logger.info('Successfully saved background location.');
    } catch (e) {
      logger.warn('Could not get background location:', e instanceof Error ? e.message : String(e));
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logger.error('Background task failed:', error instanceof Error ? error.message : String(error));
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
