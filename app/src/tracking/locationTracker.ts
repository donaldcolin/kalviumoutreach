import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { motionDetector, MotionState } from './motionDetector';

export const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export interface LocationPoint {
  lat: number;
  lng: number;
  ts: number;
  speed: number | null;
  accuracy: number | null;
}

export type LocationBatchListener = (points: LocationPoint[]) => void;

class LocationTracker {
  private isTracking: boolean = false;
  private currentMotionState: MotionState = 'STATIONARY';
  private unsubscribeMotion: (() => void) | null = null;
  
  private buffer: LocationPoint[] = [];
  private listeners: Set<LocationBatchListener> = new Set();
  
  private batchFlushInterval: ReturnType<typeof setTimeout> | null = null;
  private static readonly BATCH_INTERVAL_MS = 60000; // Flush every 60 seconds

  public subscribe(listener: LocationBatchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async startTracking() {
    if (this.isTracking) return;

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      console.warn('Location permissions not granted');
      return;
    }

    this.isTracking = true;

    // Grab an immediate high-accuracy location fix right when they start
    try {
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      this.addPoints([initialLoc]);
      this.flushBuffer();
    } catch (e) {
      console.warn('Failed to get initial location', e);
    }
    
    this.unsubscribeMotion = motionDetector.subscribe((state) => {
      this.currentMotionState = state;
      this.updateLocationTaskConfig();
    });

    motionDetector.start();

    // Start batch flush timer
    this.batchFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, LocationTracker.BATCH_INTERVAL_MS);
  }

  public async stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    if (this.unsubscribeMotion) {
      this.unsubscribeMotion();
      this.unsubscribeMotion = null;
    }
    
    motionDetector.stop();

    if (this.batchFlushInterval) {
      clearInterval(this.batchFlushInterval);
      this.batchFlushInterval = null;
    }

    this.flushBuffer();

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }

  private async updateLocationTaskConfig() {
    // If not tracking, ensure it's stopped
    if (!this.isTracking) return;

    // Define task configuration based on motion state
    let accuracy = Location.Accuracy.Lowest;
    let distanceInterval = 500; // Large distance to save power
    let deferredUpdatesInterval = 60000; // 60s
    let deferredUpdatesDistance = 500;

    if (this.currentMotionState === 'MOVING') {
      accuracy = Location.Accuracy.High;
      distanceInterval = 10; // 10 meters
      deferredUpdatesInterval = 10000; // 10s
      deferredUpdatesDistance = 10;
    } else if (this.currentMotionState === 'POSSIBLY_STOPPED') {
      // Maintain High accuracy during grace period
      accuracy = Location.Accuracy.High;
      distanceInterval = 20;
      deferredUpdatesInterval = 30000;
      deferredUpdatesDistance = 20;
    } else if (this.currentMotionState === 'STATIONARY') {
      // Heartbeat mode: Lowest power, purely to keep foreground service alive for the accelerometer
      accuracy = Location.Accuracy.Lowest;
      distanceInterval = 1000; // 1km
      deferredUpdatesInterval = 300000; // 5 mins
      deferredUpdatesDistance = 1000;
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy,
        distanceInterval,
        deferredUpdatesInterval,
        deferredUpdatesDistance,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Kalvium Outreach',
          notificationBody: 'Tracking active',
          notificationColor: '#ef4444',
        },
      });
    } catch (e) {
      console.warn('Failed to update location task config', e);
    }
  }

  // Called by TaskManager
  public addPoints(locations: Location.LocationObject[]) {
    if (!this.isTracking) return;
    
    for (const loc of locations) {
      this.buffer.push({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        ts: loc.timestamp,
        speed: loc.coords.speed,
        accuracy: loc.coords.accuracy,
      });
    }
  }

  private flushBuffer() {
    if (this.buffer.length > 0) {
      const pointsToEmit = [...this.buffer];
      this.buffer = [];
      this.listeners.forEach(l => l(pointsToEmit));
    }
  }
}

export const locationTracker = new LocationTracker();

import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestoreSync } from './firestoreSync';

// Register the task globally
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Background Location Task Error', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      const sessionStr = await AsyncStorage.getItem('tracking_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const points = locations.map(loc => ({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          ts: loc.timestamp,
          speed: loc.coords.speed,
          accuracy: loc.coords.accuracy,
        }));
        await firestoreSync.appendHeadlessLocations(session.userId, session.dateStr, points);
      }
    } catch (e) {
      console.warn('Failed to process headless location', e);
    }

    // Still add to foreground buffer for UI updates if active
    locationTracker.addPoints(locations);
  }
});
