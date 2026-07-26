import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { firestoreSync } from './firestoreSync';
import { filterLocationPoints, LOCATION_TASK_NAME } from './locationTracker';

// Register the task globally
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    logger.warn('Background Location Task Error', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      const sessionStr = await AsyncStorage.getItem('tracking_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);

        // Apply the SAME quality gates used by the foreground tracker
        // so that junk pings never reach Firestore (fixes BUG-03).
        const filteredPoints = filterLocationPoints(locations);

        if (filteredPoints.length > 0) {
          await firestoreSync.appendHeadlessLocations(session.userId, session.dateStr, filteredPoints);
        }
      }
    } catch (e) {
      logger.warn('Failed to process headless location', e instanceof Error ? e.message : String(e));
    }

    // NOTE: We intentionally do NOT call locationTracker.addPoints() here.
    // The filtered data is already written to Firestore above. Calling addPoints()
    // would cause the foreground firestoreSync listener to write the same data
    // a second time (duplicate Firestore writes — fixes BUG-02).
  }
});
