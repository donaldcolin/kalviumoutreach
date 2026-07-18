import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { locationTracker, LocationPoint } from './locationTracker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FirestoreSync {
  private userId: string | null = null;
  private dateStr: string | null = null;
  
  private unsubscribeLocation: (() => void) | null = null;

  public async startSession(userId: string) {
    this.userId = userId;
    this.dateStr = format(new Date(), 'yyyyMMdd');

    const docId = `${this.userId}_${this.dateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);
    
    try {
      await AsyncStorage.setItem('tracking_session', JSON.stringify({ userId: this.userId, dateStr: this.dateStr }));
      await docRef.set({
        userId: this.userId,
        date: this.dateStr,
        startTime: Date.now(),
        status: 'active',
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to start tracking session', e);
    }

    this.unsubscribeLocation = locationTracker.subscribe((points) => this.handleLocationBatch(points));
  }

  public async endSession() {
    if (!this.userId || !this.dateStr) return;
    
    const docId = `${this.userId}_${this.dateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);

    try {
      await AsyncStorage.removeItem('tracking_session');
      await docRef.update({
        endTime: Date.now(),
        status: 'ended',
        lastPing: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('Failed to end tracking session', e);
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

    const docId = `${userId}_${dateStr}`;
    const docRef = firestore().collection('dailyTracks').doc(docId);
    const locationsRef = docRef.collection('locations');

    try {
      const batch = firestore().batch();
      
      batch.set(docRef, {
        lastPing: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      for (const point of points) {
        const pointRef = locationsRef.doc(point.ts.toString());
        batch.set(pointRef, point);
      }

      await batch.commit();
    } catch (e) {
      console.warn('Failed to write headless location batch to Firestore', e);
    }
  }

  private async handleLocationBatch(points: LocationPoint[]) {
    if (!this.userId || !this.dateStr) return;
    await this.appendHeadlessLocations(this.userId, this.dateStr, points);
  }
}

export const firestoreSync = new FirestoreSync();
