/**
 * Google Places API — stop classification.
 * Called only for stops that don't match a known school.
 */
import { getNearbySchools } from './firestore';
import type { StopClassification, School } from '../types';

// Placeholder — should come from EAS secrets / env vars
const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

/** Google Places Nearby Search result (simplified). */
interface PlaceResult {
  name: string;
  types: string[];
  vicinity: string;
}

/**
 * Classify a detected stop.
 * 1. Check against known schools in Firestore (within 200m).
 * 2. If no match, call Google Places Nearby Search.
 * 3. Map types to classification.
 */
export async function classifyStop(
  lat: number,
  lng: number,
): Promise<{
  classification: StopClassification;
  matchedSchoolId?: string;
  matchedSchoolName?: string;
}> {
  // Step 1: Check known schools
  try {
    const nearbySchools = await getNearbySchools(lat, lng, 200);
    if (nearbySchools.length > 0) {
      const closest = nearbySchools[0];
      return {
        classification: 'school',
        matchedSchoolId: closest.id,
        matchedSchoolName: closest.name,
      };
    }
  } catch (err) {
    console.warn('[Places] Failed to check nearby schools:', err);
  }

  // Step 2: Google Places API
  if (!PLACES_API_KEY) {
    console.warn('[Places] No API key configured — defaulting to unclassified');
    return { classification: 'unclassified' };
  }

  try {
    const places = await nearbySearch(lat, lng, 150);
    const classification = mapPlaceTypesToClassification(places);
    return { classification };
  } catch (err) {
    console.warn('[Places] Nearby search failed:', err);
    return { classification: 'unclassified' };
  }
}

/**
 * Google Places Nearby Search API call.
 */
async function nearbySearch(
  lat: number,
  lng: number,
  radius: number,
): Promise<PlaceResult[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}` +
    `&radius=${radius}` +
    `&key=${PLACES_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }

  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    name: r.name as string,
    types: r.types as string[],
    vicinity: r.vicinity as string,
  }));
}

/**
 * Map Google Places types to our classification.
 */
function mapPlaceTypesToClassification(
  places: PlaceResult[],
): StopClassification {
  const allTypes = new Set(places.flatMap((p) => p.types));

  // School types
  const schoolTypes = ['school', 'university', 'secondary_school', 'primary_school'];
  if (schoolTypes.some((t) => allTypes.has(t))) {
    return 'school';
  }

  // Tea shop / food types
  const foodTypes = [
    'cafe',
    'restaurant',
    'food',
    'bakery',
    'meal_delivery',
    'meal_takeaway',
  ];
  if (foodTypes.some((t) => allTypes.has(t))) {
    return 'teashop';
  }

  // Park types
  const parkTypes = [
    'park',
    'natural_feature',
    'tourist_attraction',
    'campground',
    'amusement_park',
  ];
  if (parkTypes.some((t) => allTypes.has(t))) {
    return 'park';
  }

  return 'unclassified';
}
