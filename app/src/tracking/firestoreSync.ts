import firestore from '@react-native-firebase/firestore';
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
      
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId: this.userId, dateStr: this.dateStr }));

      // Use a transaction to prevent race conditions when two
      // callers (manual start + auto-resume) fire simultaneously
      await firestore().runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (doc.exists && doc.data()?.status === 'active') {
          // Session already active — just update lastPing, don't overwrite startTime
          tx.update(docRef, {
            lastPing: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // New session or re-activating an ended one
          tx.set(docRef, {
            userId: this.userId,
            date: this.dateStr,
            startTime: Date.now(),
            status: 'active',
            lastPing: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      });

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

      // Use a transaction to ensure we only end an active session
      await firestore().runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (doc.exists && doc.data()?.status === 'active') {
          tx.update(docRef, {
            endTime: Date.now(),
            status: 'ended',
            lastPing: firestore.FieldValue.serverTimestamp(),
          });
        }
        // If already ended or doesn't exist, no-op
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
      batch.set(firestore().collection('users').doc(userId), {
        lastKnownLocation: {
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          ts: lastPoint.ts,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      }, { merge: true });

      await batch.commit();
    } catch (e) {
      logger.error('Failed to write headless location batch to Firestore', e instanceof Error ? e.message : String(e));
    }
  }

  private async handleLocationBatch(points: LocationPoint[]) {
    if (!this.userId || !this.dateStr) return;
    await this.appendHeadlessLocations(this.userId, this.dateStr, points);
  }
}

export const firestoreSync = new FirestoreSync();
