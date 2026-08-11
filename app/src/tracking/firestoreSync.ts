import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { format } from '@/src/utils/safeFormat';
import { locationTracker, LocationPoint } from './locationTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { validatePoints } from '../utils/gpsValidation';

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
  private isStarting = false; 
  private unsubscribeLocation: (() => void) | null = null;
  private lastWrittenLocation: { lat: number; lng: number; ts: number } | null = null;
  private static readonly LAST_KNOWN_MIN_DISTANCE_M = 100;
  private static readonly LAST_KNOWN_MIN_INTERVAL_MS = 300000;
  private static readonly UNSYNCED_LOCATIONS_KEY = 'unsynced_locations';

  public async startSession(userId: string) {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      this.userId = userId;
      this.dateStr = format(new Date(), 'yyyyMMdd');

      const docId = `${this.userId}_${this.dateStr}`;
      const docRef = firestore().collection('dailyTracks').doc(docId);
      
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId: this.userId, dateStr: this.dateStr }));

      await docRef.set({
        userId: this.userId,
        date: this.dateStr,
        startTime: Date.now(),
        status: 'active',
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

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
      await this.syncUnsyncedLocations(); // flush on end
      await AsyncStorage.removeItem('tracking_session');
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

  // ─── OFFLINE-FIRST HOARDING ───────────────────────────────────────────
  public async appendHeadlessLocations(userId: string, dateStr: string, points: LocationPoint[]) {
    if (!userId || !dateStr || points.length === 0) return;
    if (!auth().currentUser) {
      await AsyncStorage.removeItem('tracking_session');
      return;
    }

    const { valid } = validatePoints(points);
    if (valid.length === 0) return;

    try {
      const stored = await AsyncStorage.getItem(FirestoreSync.UNSYNCED_LOCATIONS_KEY);
      let current: LocationPoint[] = stored ? JSON.parse(stored) : [];
      current = current.concat(valid);
      await AsyncStorage.setItem(FirestoreSync.UNSYNCED_LOCATIONS_KEY, JSON.stringify(current));
      logger.info(`Hoarded ${valid.length} points locally. Total unsynced: ${current.length}`);
    } catch (e) {
      logger.error('Failed to hoard locations locally', e instanceof Error ? e.message : String(e));
    }
  }

  public async syncUnsyncedLocations() {
    try {
      const sessionStr = await AsyncStorage.getItem('tracking_session');
      if (!sessionStr) return;
      const { userId, dateStr } = JSON.parse(sessionStr);

      const stored = await AsyncStorage.getItem(FirestoreSync.UNSYNCED_LOCATIONS_KEY);
      if (!stored) return;
      
      const points: LocationPoint[] = JSON.parse(stored);
      if (points.length === 0) return;

      await this.pushPointsToFirestore(userId, dateStr, points);

      await AsyncStorage.removeItem(FirestoreSync.UNSYNCED_LOCATIONS_KEY);
      logger.info(`Successfully synced ${points.length} hoarded points to cloud.`);
    } catch (e) {
      logger.error('Failed to sync hoarded locations', e instanceof Error ? e.message : String(e));
    }
  }

  private async pushPointsToFirestore(userId: string, dateStr: string, points: LocationPoint[]) {
    let activeDateStr = dateStr;
    const currentDateStr = format(new Date(), 'yyyyMMdd');
    if (currentDateStr !== dateStr) {
      logger.info(`Date rolled over from ${dateStr} to ${currentDateStr}, switching daily doc`);
      activeDateStr = currentDateStr;
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId, dateStr: currentDateStr }));
      if (this.userId === userId) {
        this.dateStr = currentDateStr;
      }
    }

    const docId = `${userId}_${activeDateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);

    try {
      // Append all points to routeArray on the parent doc (no subcollection writes)
      // ponytail: chunk at 400 to stay within Firestore arrayUnion limits
      const CHUNK = 400;
      for (let i = 0; i < points.length; i += CHUNK) {
        const slice = points.slice(i, i + CHUNK);
        await docRef.set({
          userId,
          date: activeDateStr,
          status: 'active',
          lastPing: firestore.FieldValue.serverTimestamp(),
          routeArray: firestore.FieldValue.arrayUnion(...slice),
        }, { merge: true });
      }

      const lastPoint = points[points.length - 1];
      if (this.shouldUpdateLastKnownLocation(lastPoint)) {
        await firestore().collection('users').doc(userId).update({
          lastKnownLocation: {
            lat: lastPoint.lat,
            lng: lastPoint.lng,
            ts: lastPoint.ts,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
        });
        this.lastWrittenLocation = { lat: lastPoint.lat, lng: lastPoint.lng, ts: lastPoint.ts };
      }
    } catch (e) {
      logger.warn('Failed to write locations to Firestore', e instanceof Error ? e.message : String(e));
      throw e; // throw so syncUnsyncedLocations doesn't delete the local copy on failure
    }
  }

  private shouldUpdateLastKnownLocation(point: LocationPoint): boolean {
    if (!this.lastWrittenLocation) return true;
    const timeSinceLastWrite = point.ts - this.lastWrittenLocation.ts;
    if (timeSinceLastWrite >= FirestoreSync.LAST_KNOWN_MIN_INTERVAL_MS) return true;
    const distance = haversineMeters(this.lastWrittenLocation.lat, this.lastWrittenLocation.lng, point.lat, point.lng);
    return distance >= FirestoreSync.LAST_KNOWN_MIN_DISTANCE_M;
  }

  private async handleLocationBatch(points: LocationPoint[]) {
    if (!this.userId || !this.dateStr) return;
    await this.appendHeadlessLocations(this.userId, this.dateStr, points);
  }
}

export const firestoreSync = new FirestoreSync();
