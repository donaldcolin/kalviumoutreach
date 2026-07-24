import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { format } from 'date-fns';
import { locationTracker, LocationPoint } from './locationTracker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { validatePoints } from '../utils/gpsValidation';

class FirestoreSync {
  private userId: string | null = null;
  private dateStr: string | null = null;
  private isStarting = false; // guard against double-tap race condition
  
  private unsubscribeLocation: (() => void) | null = null;

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
      
      batch.set(docRef, {
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      for (const point of valid) {
        const pointRef = locationsRef.doc(point.ts.toString());
        batch.set(pointRef, point);
      }

      // Also update the user's lastKnownLocation for quick dashboard loading
      const lastPoint = valid[valid.length - 1];
      batch.update(firestore().collection('users').doc(userId), {
        lastKnownLocation: {
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          ts: lastPoint.ts,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      });

      await batch.commit();
    } catch (e) {
      logger.warn('Failed to write headless location batch to Firestore', e instanceof Error ? e.message : String(e));
    }
  }

  private async handleLocationBatch(points: LocationPoint[]) {
    if (!this.userId || !this.dateStr) return;
    await this.appendHeadlessLocations(this.userId, this.dateStr, points);
  }
}

export const firestoreSync = new FirestoreSync();
