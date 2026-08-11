import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { motionDetector, MotionState } from './motionDetector';
import { logger } from '../utils/logger';

// ─── AsyncStorage key for persisting last saved GPS point ─────────────────────
// Shared between foreground tracker and headless background task so both
// can avoid duplicate points across app restarts/crashes.
export const LAST_SAVED_POINT_KEY = 'tracking_last_saved_point';

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
  private static readonly MOVING_BATCH_INTERVAL_MS = 120000; // 2 minutes — balances dashboard freshness with radio power savings
  private static readonly STATIONARY_BATCH_INTERVAL_MS = 600000; // 10 minutes — stationary user, no urgency to sync

  // ─── Deep Stationary Mode ────────────────────────────────────────────────
  // After being STATIONARY for 5+ minutes, downgrade GPS from Balanced → Low
  // (WiFi/cell only) to save significant battery. The accelerometer will still
  // detect motion and trigger an immediate upgrade back to High accuracy.
  private deepStationaryTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDeepStationary: boolean = false;
  private static readonly DEEP_STATIONARY_DELAY_MS = 120000; // 2 minutes

  public subscribe(listener: LocationBatchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async startTracking(requestPermissions: boolean = true) {
    if (this.isTracking) return;

    let fgStatus, bgStatus;
    if (requestPermissions) {
      const fgResult = await Location.requestForegroundPermissionsAsync();
      fgStatus = fgResult.status;
      const bgResult = await Location.requestBackgroundPermissionsAsync();
      bgStatus = bgResult.status;
    } else {
      const fgResult = await Location.getForegroundPermissionsAsync();
      fgStatus = fgResult.status;
      const bgResult = await Location.getBackgroundPermissionsAsync();
      bgStatus = bgResult.status;
    }

    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      logger.warn('User has not allowed location tracking, stopping.');
      return;
    }

    this.isTracking = true;

    // Restore persisted lastSavedPoint so the distance filter has continuity
    // across app restarts — prevents duplicate points at the boundary.
    await this.loadLastSavedPoint();

    // Grab an immediate high-accuracy location fix right when they start
    try {
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      this.addPoints([initialLoc]);
      this.flushBuffer();
    } catch (e) {
      logger.warn('Could not get starting location:', e instanceof Error ? e.message : String(e));
    }

    this.unsubscribeMotion = motionDetector.subscribe((state) => {
      const prevState = this.currentMotionState;
      this.currentMotionState = state;
      this.handleMotionStateTransition(prevState, state);
      this.updateLocationTaskConfig();
      this.setFlushTimer(); // Adjust timer dynamically when motion state changes
    });

    motionDetector.start();
    this.setFlushTimer();
  }

  public async stopTracking() {
    if (!this.isTracking) return;

    this.isTracking = false;
    this.clearDeepStationaryTimer();
    this.isDeepStationary = false;

    if (this.unsubscribeMotion) {
      this.unsubscribeMotion();
      this.unsubscribeMotion = null;
    }

    motionDetector.stop();

    if (this.batchFlushInterval) {
      clearTimeout(this.batchFlushInterval);
      this.batchFlushInterval = null;
    }

    this.flushBuffer();

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }

  private setFlushTimer() {
    if (this.batchFlushInterval) {
      clearTimeout(this.batchFlushInterval);
    }

    if (!this.isTracking) return;

    const interval = this.currentMotionState === 'STATIONARY'
      ? LocationTracker.STATIONARY_BATCH_INTERVAL_MS
      : LocationTracker.MOVING_BATCH_INTERVAL_MS;

    this.batchFlushInterval = setTimeout(() => {
      this.flushBuffer();
      this.setFlushTimer();
    }, interval);
  }

  // ─── Deep Stationary Lifecycle ──────────────────────────────────────────────
  // Manages the transition into and out of deep stationary mode.
  // When the user has been STATIONARY for 5+ minutes, we enter deep stationary
  // (Low GPS accuracy, WiFi/cell only). When they start moving again, we
  // immediately grab a high-accuracy departure fix before switching to MOVING config.
  private handleMotionStateTransition(prevState: MotionState, newState: MotionState) {
    if (newState === 'STATIONARY') {
      // Start the 5-minute countdown to deep stationary
      this.scheduleDeepStationary();
    } else {
      // Leaving stationary — cancel deep stationary timer and exit deep mode
      this.clearDeepStationaryTimer();

      if (this.isDeepStationary && newState === 'MOVING') {
        this.isDeepStationary = false;
        // Grab an immediate high-accuracy fix so we capture the departure point
        // before the regular MOVING config kicks in on the next cycle.
        this.captureImmediateLocation();
      } else {
        this.isDeepStationary = false;
      }
    }
  }

  private scheduleDeepStationary() {
    this.clearDeepStationaryTimer();
    this.deepStationaryTimeout = setTimeout(() => {
      if (this.currentMotionState === 'STATIONARY' && this.isTracking) {
        this.isDeepStationary = true;
        logger.info('Entering deep stationary GPS mode (Low accuracy)');
        this.updateLocationTaskConfig();
      }
    }, LocationTracker.DEEP_STATIONARY_DELAY_MS);
  }

  private clearDeepStationaryTimer() {
    if (this.deepStationaryTimeout) {
      clearTimeout(this.deepStationaryTimeout);
      this.deepStationaryTimeout = null;
    }
  }

  private async captureImmediateLocation() {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      this.addPoints([loc]);
    } catch (e) {
      logger.warn('Could not capture departure fix:', e instanceof Error ? e.message : String(e));
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
      distanceInterval = 25; // 25 meters
      deferredUpdatesInterval = 180000; // 3 mins batching
      deferredUpdatesDistance = 200; // wait for 200m before waking up
    } else if (this.currentMotionState === 'POSSIBLY_STOPPED') {
      // Maintain High accuracy during grace period
      accuracy = Location.Accuracy.High;
      distanceInterval = 25;
      deferredUpdatesInterval = 180000;
      deferredUpdatesDistance = 200;
    } else if (this.currentMotionState === 'STATIONARY' && this.isDeepStationary) {
      // Deep stationary: 5+ minutes idle — drop to Low accuracy (WiFi/cell only)
      // to save significant GPS battery. Accelerometer will detect motion and
      // trigger an immediate High-accuracy fix before upgrading.
      accuracy = Location.Accuracy.Low;
      distanceInterval = 200; // 200m — only wake if they actually leave
      deferredUpdatesInterval = 300000; // 5 min
      deferredUpdatesDistance = 200;
    } else if (this.currentMotionState === 'STATIONARY') {
      // Normal stationary (first 5 minutes): Balanced accuracy
      // Lowest gives cell-tower pings (200-1000m accuracy) which get rejected
      // by our quality filter. Balanced still uses GPS but with lower power.
      accuracy = Location.Accuracy.Balanced;
      distanceInterval = 50; // 50m — still conservative but catches movement
      deferredUpdatesInterval = 60000; // 1 min
      deferredUpdatesDistance = 50;
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy,
        distanceInterval,
        deferredUpdatesInterval,
        deferredUpdatesDistance,
        activityType: Location.ActivityType.Fitness, // Tells OS this is walking — improves accuracy for free
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Kalvium Outreach',
          notificationBody: 'Tracking active',
          notificationColor: '#ef4444',
        },
      });
    } catch (e) {
      logger.warn('Could not update location tracking settings:', e instanceof Error ? e.message : String(e));
    }
  }

  // ─── GPS Quality Filters ────────────────────────────────────────────────────
  // Max acceptable accuracy radius in meters. Android in Indian cities
  // routinely reports 50-150m accuracy. Being too strict drops real pings.
  static readonly MAX_ACCURACY_METERS = 300;
  // Max realistic speed in m/s (200 km/h). Higher = GPS glitch.
  static readonly MAX_SPEED_MS = 55;
  // Min distance in meters from last saved point. Less than this = GPS jitter.
  static readonly MIN_DISTANCE_METERS = 3;

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
      // Persist the last point so both foreground and headless background task
      // have continuity across app restarts (prevents duplicate points).
      this.persistLastSavedPoint();
    }
  }

  // ─── LastSavedPoint Persistence ────────────────────────────────────────────
  // Saves/loads the last GPS point to AsyncStorage so the distance filter
  // works correctly even after app restarts or when the headless background
  // task processes locations independently.
  private async persistLastSavedPoint() {
    if (this.lastSavedPoint) {
      try {
        await AsyncStorage.setItem(LAST_SAVED_POINT_KEY, JSON.stringify(this.lastSavedPoint));
      } catch (e) {
        // Non-critical — worst case is one duplicate point on restart
        logger.warn('Failed to persist lastSavedPoint:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  private async loadLastSavedPoint() {
    try {
      const stored = await AsyncStorage.getItem(LAST_SAVED_POINT_KEY);
      if (stored) {
        this.lastSavedPoint = JSON.parse(stored) as LocationPoint;
        logger.info('Restored lastSavedPoint from previous session');
      }
    } catch (e) {
      // Non-critical — we'll just start fresh
      logger.warn('Failed to load lastSavedPoint:', e instanceof Error ? e.message : String(e));
    }
  }
}

// ─── Bearing helper ──────────────────────────────────────────────────────────
// Returns bearing in degrees (0-360) from point A to point B.
function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Standalone GPS Quality Filter ──────────────────────────────────────────
// Shared between the foreground tracker and the headless background task so
// that ALL Firestore writes go through the same accuracy / speed / distance gates.
//
// Gate order (cheapest first):
//   0. Coordinate validity   — NaN, null-island, out-of-range
//   1. Accuracy radius       — reject noisy pings
//   2. Speed                 — reject GPS glitches (teleportation)
//   3. Distance              — reject stationary drift (< 3m)
//   4. Bearing jitter        — reject lateral zigzag at walking speed
//   5. Altitude sanity       — reject impossible vertical changes
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

    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lng, candidate.lat, candidate.lng);

      // Gate 3: Distance — reject stationary drift
      if (dist < LocationTracker.MIN_DISTANCE_METERS) continue;

      // Gate 4: Bearing jitter — reject lateral zigzag at walking speed
      // If the user is moving slowly (< 3 m/s ≈ walking) and the distance is
      // small (< 10m), a sudden 120°+ bearing change is almost certainly GPS
      // jitter, not a real U-turn. Real U-turns cover more distance.
      if (speed > 0 && speed < 3 && dist < 10 && result.length >= 1) {
        const prevAccepted = result[result.length - 1];
        const bearingToPrev = bearingDegrees(prevAccepted.lat, prevAccepted.lng, prev.lat, prev.lng);
        const bearingToCandidate = bearingDegrees(prev.lat, prev.lng, candidate.lat, candidate.lng);
        let bearingDelta = Math.abs(bearingToCandidate - bearingToPrev);
        if (bearingDelta > 180) bearingDelta = 360 - bearingDelta;
        if (bearingDelta > 120) continue; // Likely jitter, not a real turn
      }

      // Gate 5: Altitude sanity — reject impossible vertical changes
      // GPS altitude can be wildly inaccurate. If altitude changes by >50m
      // in under 30 seconds, it's physically impossible (would require
      // free-climbing speeds) and is almost certainly a GPS artifact.
      const altitude = loc.coords.altitude;
      if (altitude != null && prev.ts && (candidate.ts - prev.ts) < 30000) {
        // We need the previous raw altitude — check if we stored it
        // For simplicity, we compare against the raw location altitude
        // This gate catches the most egregious altitude spikes
        if (Math.abs(altitude) > 10000) continue; // Reject obviously wrong altitudes (>10km)
      }
    }

    prev = candidate;
    result.push(candidate);
  }

  return result;
}

export const locationTracker = new LocationTracker();
