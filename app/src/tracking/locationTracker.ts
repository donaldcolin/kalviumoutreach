import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { motionDetector, MotionState } from './motionDetector';
import { logger } from '../utils/logger';

// ─── Haversine distance helper ────────────────────────────────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
      logger.warn('Location permissions not granted');
      return;
    }

    this.isTracking = true;

    // Grab an immediate high-accuracy location fix right when they start
    try {
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      this.addPoints([initialLoc]);
      this.flushBuffer();
    } catch (e) {
      logger.warn('Failed to get initial location', e instanceof Error ? e.message : String(e));
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
      logger.warn('Failed to update location task config', e instanceof Error ? e.message : String(e));
    }
  }

  // ─── GPS Quality Filters ────────────────────────────────────────────────────
  // Max acceptable accuracy radius in meters. Pings worse than this are noise.
  static readonly MAX_ACCURACY_METERS = 50;
  // Max realistic speed in m/s (200 km/h). Higher = GPS glitch.
  static readonly MAX_SPEED_MS = 55;
  // Min distance in meters from last saved point. Less than this = GPS jitter.
  static readonly MIN_DISTANCE_METERS = 5;
  
  private lastSavedPoint: LocationPoint | null = null;

  // Called by TaskManager
  public addPoints(locations: Location.LocationObject[]) {
    if (!this.isTracking) return;
    
    const filtered = filterLocationPoints(locations, this.lastSavedPoint);
    if (filtered.length > 0) {
      this.lastSavedPoint = filtered[filtered.length - 1];
      this.buffer.push(...filtered);
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

// ─── Standalone GPS Quality Filter ──────────────────────────────────────────
// Shared between the foreground tracker and the headless background task so
// that ALL Firestore writes go through the same accuracy / speed / distance gates.
export function filterLocationPoints(
  locations: Location.LocationObject[],
  lastKnown: LocationPoint | null = null,
): LocationPoint[] {
  const result: LocationPoint[] = [];
  let prev = lastKnown;

  for (const loc of locations) {
    const accuracy = loc.coords.accuracy ?? 999;
    const speed = loc.coords.speed ?? 0;

    // Gate 0: Coordinate validity — reject NaN, null-island, out-of-range
    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    if (lat === 0 && lng === 0) continue; // null island

    // Gate 1: Accuracy — reject noisy pings
    if (accuracy > LocationTracker.MAX_ACCURACY_METERS) continue;

    // Gate 2: Speed — reject GPS glitches
    if (speed > LocationTracker.MAX_SPEED_MS) continue;

    const candidate: LocationPoint = {
      lat,
      lng,
      ts: loc.timestamp,
      speed: loc.coords.speed,
      accuracy: loc.coords.accuracy,
    };

    // Gate 3: Distance — reject stationary drift
    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lng, candidate.lat, candidate.lng);
      if (dist < LocationTracker.MIN_DISTANCE_METERS) continue;
    }

    prev = candidate;
    result.push(candidate);
  }

  return result;
}

export const locationTracker = new LocationTracker();

import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestoreSync } from './firestoreSync';

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
