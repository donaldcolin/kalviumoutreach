/**
 * Firestore CRUD operations for all collections.
 * All writes go through Firestore offline persistence automatically.
 */
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type {
  School,
  Visit,
  Meeting,
  Appointment,
  DailyTrack,
  LocationPing,
  DetectedStop,
} from '../types';

// ─── Schools ─────────────────────────────────────────────────────────────────

const schoolsRef = () => firestore().collection('schools');

let schoolsCache: School[] | null = null;
let schoolsCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function searchSchools(query: string): Promise<School[]> {
  // Fetch from cache instead of hitting Firestore on every keystroke
  const allSchools = await getAllSchools();
  const lowerQuery = query.toLowerCase();
  return allSchools.filter(
    (s) =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.city.toLowerCase().includes(lowerQuery) ||
      s.district.toLowerCase().includes(lowerQuery),
  );
}

export async function getAllSchools(): Promise<School[]> {
  if (schoolsCache && Date.now() - schoolsCacheTime < CACHE_TTL) {
    return schoolsCache;
  }
  const snapshot = await schoolsRef().get();
  schoolsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as School));
  schoolsCacheTime = Date.now();
  return schoolsCache;
}

export async function getSchool(schoolId: string): Promise<School | null> {
  const doc = await schoolsRef().doc(schoolId).get();
  return doc.exists() ? ({ id: doc.id, ...doc.data() } as School) : null;
}

export async function addSchool(school: Omit<School, 'id'>): Promise<string> {
  const docRef = await schoolsRef().add(school);
  return docRef.id;
}

export async function getNearbySchools(
  lat: number,
  lng: number,
  radiusMeters: number = 200,
): Promise<School[]> {
  // Simple client-side distance filter.
  // For production, use Geohash-based queries or a Cloud Function.
  const allSchools = await getAllSchools();
  return allSchools.filter((s) => {
    const dist = haversineDistance(lat, lng, s.lat, s.lng);
    return dist <= radiusMeters;
  });
}

// ─── Visits ──────────────────────────────────────────────────────────────────

const visitsRef = () => firestore().collection('visits');

export async function createVisit(visit: Omit<Visit, 'id'>): Promise<string> {
  const docRef = await visitsRef().add({
    ...visit,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateVisit(
  visitId: string,
  data: Partial<Visit>,
): Promise<void> {
  await visitsRef().doc(visitId).update({
    ...data,
    updatedAt: Date.now(),
  });
}

export async function getVisit(visitId: string): Promise<Visit | null> {
  const doc = await visitsRef().doc(visitId).get();
  return doc.exists() ? ({ id: doc.id, ...doc.data() } as Visit) : null;
}

export async function getVisitsForDate(
  executiveId: string,
  dateStart: number,
  dateEnd: number,
): Promise<Visit[]> {
  const snapshot = await visitsRef()
    .where('executiveId', '==', executiveId)
    .where('timestamp', '>=', dateStart)
    .where('timestamp', '<=', dateEnd)
    .orderBy('timestamp', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Visit));
}

/** Real-time listener for an executive's visits today. */
export function onVisitsForDate(
  executiveId: string,
  dateStart: number,
  dateEnd: number,
  callback: (visits: Visit[]) => void,
): () => void {
  return visitsRef()
    .where('executiveId', '==', executiveId)
    .where('timestamp', '>=', dateStart)
    .where('timestamp', '<=', dateEnd)
    .orderBy('timestamp', 'desc')
    .onSnapshot(
      (snapshot) => {
        if (!snapshot) return;
        const visits = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Visit),
        );
        callback(visits);
      },
      (error) => {
        console.error('Firestore onVisitsForDate error:', error);
      }
    );
}

export async function getHistoricalVisitStats(executiveId: string): Promise<{ yesterday: number; allTime: number }> {
  const now = new Date();
  
  // Calculate yesterday's start and end timestamps
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000 - 1;

  try {
    const yesterdaySnapshot = await visitsRef()
      .where('executiveId', '==', executiveId)
      .where('timestamp', '>=', yesterdayStart)
      .where('timestamp', '<=', yesterdayEnd)
      .count()
      .get();
      
    const allTimeSnapshot = await visitsRef()
      .where('executiveId', '==', executiveId)
      .count()
      .get();

    return {
      yesterday: yesterdaySnapshot.data().count,
      allTime: allTimeSnapshot.data().count,
    };
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    return { yesterday: 0, allTime: 0 };
  }
}

// ─── Meetings ────────────────────────────────────────────────────────────────

const meetingsRef = () => firestore().collection('meetings');

export async function createMeeting(
  meeting: Omit<Meeting, 'id'>,
): Promise<string> {
  const docRef = await meetingsRef().add({
    ...meeting,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateMeeting(
  meetingId: string,
  data: Partial<Meeting>,
): Promise<void> {
  await meetingsRef().doc(meetingId).update({
    ...data,
    updatedAt: Date.now(),
  });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const doc = await meetingsRef().doc(meetingId).get();
  return doc.exists() ? ({ id: doc.id, ...doc.data() } as Meeting) : null;
}

export async function getMeetingsForVisit(visitId: string): Promise<Meeting[]> {
  const snapshot = await meetingsRef()
    .where('visitId', '==', visitId)
    .orderBy('startTimestamp', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Meeting));
}

// ─── Appointments ────────────────────────────────────────────────────────────

const appointmentsRef = () => firestore().collection('appointments');

export async function createAppointment(
  appointment: Omit<Appointment, 'id'>,
): Promise<string> {
  const docRef = await appointmentsRef().add({
    ...appointment,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Appointment>,
): Promise<void> {
  await appointmentsRef().doc(appointmentId).update({
    ...data,
    updatedAt: Date.now(),
  });
}

// ─── Daily Tracks ────────────────────────────────────────────────────────────

const dailyTracksRef = () => firestore().collection('dailyTracks');

function trackDocId(executiveId: string, date: string): string {
  return `${executiveId}_${date}`;
}

/**
 * Append a GPS ping to the day's track using arrayUnion.
 * Creates the document if it doesn't exist.
 */
export async function appendPing(
  executiveId: string,
  date: string,
  ping: LocationPing,
): Promise<void> {
  const docId = trackDocId(executiveId, date);
  const ref = dailyTracksRef().doc(docId);
  await ref.set(
    {
      executiveId,
      date,
      pings: firestore.FieldValue.arrayUnion(ping),
    },
    { merge: true }
  );
}

/**
 * Append or update a detected stop.
 */
export async function appendStop(
  executiveId: string,
  date: string,
  stop: DetectedStop,
): Promise<void> {
  const docId = trackDocId(executiveId, date);
  const ref = dailyTracksRef().doc(docId);
  await ref.set(
    {
      executiveId,
      date,
      stops: firestore.FieldValue.arrayUnion(stop),
    },
    { merge: true }
  );
}

export async function getDailyTrack(
  executiveId: string,
  date: string,
): Promise<DailyTrack | null> {
  const docId = trackDocId(executiveId, date);
  const doc = await dailyTracksRef().doc(docId).get();
  return doc.exists() ? ({ id: doc.id, ...doc.data() } as DailyTrack) : null;
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
