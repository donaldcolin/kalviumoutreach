import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { format } from 'date-fns';
import { locationTracker, LocationPoint } from './locationTracker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { validatePoints } from '../utils/gpsValidation';

// ─── Haversine distance helper (for lastKnownLocation deduplication) ──────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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

class FirestoreSync {
  private userId: string | null = null;
  private dateStr: string | null = null;
  private isStarting = false; // guard against double-tap race condition
  
  private unsubscribeLocation: (() => void) | null = null;

  // ─── lastKnownLocation Deduplication ─────────────────────────────────────
  // Only update the user's lastKnownLocation if the new position is >100m
  // from the last written location, OR 5+ minutes have passed. This avoids
  // unnecessary Firestore user doc writes on every batch flush.
  private lastWrittenLocation: { lat: number; lng: number; ts: number } | null = null;
  private static readonly LAST_KNOWN_MIN_DISTANCE_M = 100; // meters
  private static readonly LAST_KNOWN_MIN_INTERVAL_MS = 300000; // 5 minutes

  public async startSession(userId: string) {
    // Prevent double-tap: if startSession is already running, skip
    if (this.isStarting) {
      logger.info('startSession already in progress, skipping duplicate call');
      return;
    }
    this.isStarting = true;

    try {
      this.userId = userId;
      this.dateStr = format(new Date(), 'yyyyMMdd');

      const docId = `${this.userId}_${this.dateStr}`;
      const docRef = firestore().collection('dailyTracks').doc(docId);
      
      // Save session locally FIRST so background task can resume even if
      // the Firestore write is slow or fails on a flaky network.
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId: this.userId, dateStr: this.dateStr }));

      // Use set+merge instead of a transaction. Transactions require 2 round-trips
      // (read + write) which causes deadline-exceeded on slow mobile networks.
      // set+merge is a single write that creates-or-updates atomically.
      await docRef.set({
        userId: this.userId,
        date: this.dateStr,
        startTime: Date.now(),
        status: 'active',
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Only subscribe if not already subscribed
      if (!this.unsubscribeLocation) {
        this.unsubscribeLocation = locationTracker.subscribe((points) => this.handleLocationBatch(points));
      }
    } catch (e) {
      logger.error('Failed to start tracking session', e instanceof Error ? e.message : String(e));
    } finally {
      this.isStarting = false;
    }
  }

  public async endSession() {
    if (!this.userId || !this.dateStr) return;
    
    const docId = `${this.userId}_${this.dateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);

    try {
      await AsyncStorage.removeItem('tracking_session');

      // Simple update instead of transaction — avoids deadline-exceeded.
      // If the doc doesn't exist (edge case), the update will fail silently
      // which is fine — there's nothing to end.
      await docRef.update({
        endTime: Date.now(),
        status: 'ended',
        lastPing: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.error('Failed to end tracking session', e instanceof Error ? e.message : String(e));
    }

    if (this.unsubscribeLocation) {
      this.unsubscribeLocation();
      this.unsubscribeLocation = null;
    }

    this.userId = null;
    this.dateStr = null;
  }

  public async appendHeadlessLocations(userId: string, dateStr: string, points: LocationPoint[]) {
    if (!userId || !dateStr || points.length === 0) return;

    if (!auth().currentUser) {
      logger.info('User is unauthenticated, skipping headless location push');
      // If the user logged out, clear the tracking session so we don't keep trying
      await AsyncStorage.removeItem('tracking_session');
      return;
    }

    // ─── Midnight Date Rollover ───────────────────────────────────────────
    // If the date has changed since the session started (e.g. tracking
    // crossed midnight), switch to the new day's document so points
    // aren't silently written to yesterday's record.
    const currentDateStr = format(new Date(), 'yyyyMMdd');
    if (currentDateStr !== dateStr) {
      logger.info(`Date rolled over from ${dateStr} to ${currentDateStr}, switching daily doc`);
      dateStr = currentDateStr;
      // Update the persisted session so the background task also uses the new date
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId, dateStr }));
      // Update instance state if this is the foreground path
      if (this.userId === userId) {
        this.dateStr = currentDateStr;
      }
    }

    // Validate all points before writing to Firestore
    const { valid, rejected } = validatePoints(points);
    if (rejected > 0) {
      logger.warn(`GPS validation rejected ${rejected}/${points.length} points (NaN, null-island, or out-of-range)`);
    }
    if (valid.length === 0) return;

    const docId = `${userId}_${dateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);
    const locationsRef = docRef.collection('locations');

    try {
      const batch = firestore().batch();
      
      // Ensure the daily doc exists (creates on first write after midnight rollover)
      batch.set(docRef, {
        userId,
        date: dateStr,
        status: 'active',
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      for (const point of valid) {
        const pointRef = locationsRef.doc(point.ts.toString());
        batch.set(pointRef, point);
      }

      // ─── Deduplicated lastKnownLocation Update ───────────────────────
      // Only update the user's lastKnownLocation if the new position is
      // >100m from the last written location, or 5+ minutes have passed.
      // This avoids redundant Firestore user doc writes.
      const lastPoint = valid[valid.length - 1];
      if (this.shouldUpdateLastKnownLocation(lastPoint)) {
        batch.update(firestore().collection('users').doc(userId), {
          lastKnownLocation: {
            lat: lastPoint.lat,
            lng: lastPoint.lng,
            ts: lastPoint.ts,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
        });
        this.lastWrittenLocation = { lat: lastPoint.lat, lng: lastPoint.lng, ts: lastPoint.ts };
      }

      await batch.commit();
    } catch (e) {
      logger.warn('Failed to write headless location batch to Firestore', e instanceof Error ? e.message : String(e));
    }
  }

  // ─── lastKnownLocation Deduplication Logic ────────────────────────────────
  private shouldUpdateLastKnownLocation(point: LocationPoint): boolean {
    if (!this.lastWrittenLocation) return true; // First write always goes through

    const timeSinceLastWrite = point.ts - this.lastWrittenLocation.ts;
    if (timeSinceLastWrite >= FirestoreSync.LAST_KNOWN_MIN_INTERVAL_MS) return true;

    const distance = haversineMeters(
      this.lastWrittenLocation.lat, this.lastWrittenLocation.lng,
      point.lat, point.lng
    );
    return distance >= FirestoreSync.LAST_KNOWN_MIN_DISTANCE_M;
  }

  private async handleLocationBatch(points: LocationPoint[]) {
    if (!this.userId || !this.dateStr) return;
    await this.appendHeadlessLocations(this.userId, this.dateStr, points);
  }
}

export const firestoreSync = new FirestoreSync();
