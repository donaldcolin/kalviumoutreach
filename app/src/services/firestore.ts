/**
 * Firestore CRUD operations for all collections.
 * All writes go through Firestore offline persistence automatically.
 */
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { School, DailyTrack, LocationPing, } from '../types';
import { isValidPoint } from '../utils/gpsValidation';

// ─── Schools ─────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const schoolsRef = () => firestore().collection('schools');

const SCHOOLS_CACHE_KEY = 'schools_list_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function getAllSchools(): Promise<School[]> {
  try {
    // 1. Check AsyncStorage cache
    const cachedStr = await AsyncStorage.getItem(SCHOOLS_CACHE_KEY);
    let shouldUseNetwork = true;
    let cachedSchools: School[] | null = null;

    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        cachedSchools = cached.data;
        // If cache is less than 24 hours old, don't wait for network
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          shouldUseNetwork = false;
        }
      } catch (e) {}
    }

    // 2. Return cache instantly if fresh
    if (!shouldUseNetwork && cachedSchools) {
      return cachedSchools;
    }

    // 3. Otherwise fetch from Firestore
    const snapshot = await schoolsRef().get();
    const schools = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as School));
    
    // Save new snapshot to cache
    await AsyncStorage.setItem(SCHOOLS_CACHE_KEY, JSON.stringify({
      data: schools,
      timestamp: Date.now()
    }));

    return schools;
  } catch (error) {
    console.warn('[getAllSchools] Failed to fetch schools, attempting to use stale cache', error);
    const cachedStr = await AsyncStorage.getItem(SCHOOLS_CACHE_KEY);
    if (cachedStr) {
      return JSON.parse(cachedStr).data || [];
    }
    return [];
  }
}





// ─── Daily Tracks ────────────────────────────────────────────────────────────

const dailyTracksRef = () => firestore().collection('dailyTracks');

function trackDocId(executiveId: string, date: string): string {
  return `${executiveId}_${date}`;
}

/**
 * Append a GPS ping to the day's track as a doc in the `locations` subcollection.
 * This matches the format used by firestoreSync.ts so the website can read it.
 */
export async function appendPing(
  executiveId: string,
  date: string,
  ping: LocationPing,
): Promise<void> {
  // Validate the ping before writing to Firestore
  const asPoint = { lat: ping.lat, lng: ping.lng, ts: ping.timestamp, speed: null, accuracy: ping.accuracy };
  if (!isValidPoint(asPoint)) {
    console.warn(`[appendPing] Rejected invalid ping: lat=${ping.lat}, lng=${ping.lng}, ts=${ping.timestamp}`);
    return;
  }

  const docId = trackDocId(executiveId, date);
  const ref = dailyTracksRef().doc(docId);

  // Use a batch so all writes succeed or fail together
  const batch = firestore().batch();

  // Ensure the parent dailyTrack doc exists
  batch.set(ref, {
    userId: executiveId,
    date,
    lastPing: firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Write the ping as a subcollection doc (keyed by timestamp) so the website can read it
  batch.set(ref.collection('locations').doc(ping.timestamp.toString()), {
    lat: ping.lat,
    lng: ping.lng,
    ts: ping.timestamp,
    speed: null,
    accuracy: ping.accuracy,
  });

  // Also update the user's lastKnownLocation so the dashboard stays fresh
  // even when only the headless background fetch is running
  batch.update(firestore().collection('users').doc(executiveId), {
    lastKnownLocation: {
      lat: ping.lat,
      lng: ping.lng,
      ts: ping.timestamp,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
  });

  await batch.commit();
}



/** Real-time listener for a daily track. */
export function onDailyTrack(
  executiveId: string,
  date: string,
  callback: (track: DailyTrack | null) => void,
): () => void {
  const docId = trackDocId(executiveId, date);
  return dailyTracksRef()
    .doc(docId)
    .onSnapshot((doc: any) => {
      callback(
        doc.exists ? ({ ...doc.data(), id: doc.id } as DailyTrack) : null,
      );
    });
}



// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine distance in meters between two lat/lng points. */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export { haversineDistance };
