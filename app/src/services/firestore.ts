/**
 * Firestore CRUD operations for all collections.
 * All writes go through Firestore offline persistence automatically.
 */
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { School, DailyTrack, LocationPing, } from '../types';

// ─── Schools ─────────────────────────────────────────────────────────────────

const schoolsRef = () => firestore().collection('schools');

let schoolsCache: School[] | null = null;
let schoolsCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour



export async function getAllSchools(): Promise<School[]> {
  if (schoolsCache && Date.now() - schoolsCacheTime < CACHE_TTL) {
    return schoolsCache;
  }
  const snapshot = await schoolsRef().get();
  schoolsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as School));
  schoolsCacheTime = Date.now();
  return schoolsCache;
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
  const docId = trackDocId(executiveId, date);
  const ref = dailyTracksRef().doc(docId);

  // Ensure the parent dailyTrack doc exists
  await ref.set(
    {
      executiveId,
      date,
      lastPing: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Write the ping as a subcollection doc (keyed by timestamp) so the website can read it
  await ref.collection('locations').doc(ping.timestamp.toString()).set({
    lat: ping.lat,
    lng: ping.lng,
    ts: ping.timestamp,
    speed: null,
    accuracy: ping.accuracy,
  });
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
    .onSnapshot((doc) => {
      callback(
        doc.exists() ? ({ id: doc.id, ...doc.data() } as DailyTrack) : null,
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
