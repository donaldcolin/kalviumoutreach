/**
 * Unit tests for filterLocationPoints
 * Tests the full GPS quality pipeline: Gate 0 (validity), Gate 1 (accuracy),
 * Gate 2 (speed), Gate 3 (distance).
 *
 * We mock expo-location's LocationObject format to test without native modules.
 */

import { describe, expect, test, jest } from '@jest/globals';

// Mock the modules that filterLocationPoints imports indirectly
jest.mock('expo-location', () => ({}), { virtual: true });
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }), { virtual: true });
jest.mock('../tracking/motionDetector', () => ({ motionDetector: { subscribe: jest.fn(), getState: () => 'moving' }, MotionState: {} }), { virtual: true });
jest.mock('../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({}), { virtual: true });
jest.mock('../tracking/firestoreSync', () => ({ firestoreSync: {} }), { virtual: true });

import { filterLocationPoints, LocationPoint } from '../tracking/locationTracker';

// Helper to create a mock expo LocationObject
function mockLocation(lat: number, lng: number, ts: number, accuracy: number | null = 10, speed: number | null = 5): any {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      altitude: null,
      accuracy,
      altitudeAccuracy: null,
      heading: null,
      speed,
    },
    timestamp: ts,
  };
}

describe('filterLocationPoints', () => {
  const baseTs = Date.now();

  // ─── Gate 0: Coordinate Validity ──────────────────────────────────────────

  describe('Gate 0: Coordinate validity', () => {
    test('rejects NaN latitude', () => {
      const result = filterLocationPoints([mockLocation(NaN, 77.59, baseTs)]);
      expect(result).toHaveLength(0);
    });

    test('rejects NaN longitude', () => {
      const result = filterLocationPoints([mockLocation(12.97, NaN, baseTs)]);
      expect(result).toHaveLength(0);
    });

    test('rejects null island (0, 0)', () => {
      const result = filterLocationPoints([mockLocation(0, 0, baseTs)]);
      expect(result).toHaveLength(0);
    });

    test('rejects out-of-range latitude (91)', () => {
      const result = filterLocationPoints([mockLocation(91, 77.59, baseTs)]);
      expect(result).toHaveLength(0);
    });

    test('rejects out-of-range longitude (-181)', () => {
      const result = filterLocationPoints([mockLocation(12.97, -181, baseTs)]);
      expect(result).toHaveLength(0);
    });

    test('accepts valid Bangalore coordinates', () => {
      const result = filterLocationPoints([mockLocation(12.9716, 77.5946, baseTs)]);
      expect(result).toHaveLength(1);
      expect(result[0].lat).toBe(12.9716);
    });
  });

  // ─── Gate 1: Accuracy ────────────────────────────────────────────────────

  describe('Gate 1: Accuracy filter', () => {
    test('accepts ping with accuracy 10m', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10)]);
      expect(result).toHaveLength(1);
    });

    test('accepts ping with accuracy exactly 50m (threshold)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 50)]);
      expect(result).toHaveLength(1);
    });

    test('rejects ping with accuracy 51m (over threshold)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 51)]);
      expect(result).toHaveLength(0);
    });

    test('rejects ping with accuracy 500m', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 500)]);
      expect(result).toHaveLength(0);
    });

    test('rejects ping with null accuracy (defaults to 999)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, null)]);
      expect(result).toHaveLength(0);
    });
  });

  // ─── Gate 2: Speed ──────────────────────────────────────────────────────

  describe('Gate 2: Speed filter', () => {
    test('accepts normal walking speed (1.5 m/s)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10, 1.5)]);
      expect(result).toHaveLength(1);
    });

    test('accepts fast driving (50 m/s = 180 km/h)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10, 50)]);
      expect(result).toHaveLength(1);
    });

    test('rejects glitch speed (56 m/s = 200+ km/h)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10, 56)]);
      expect(result).toHaveLength(0);
    });

    test('accepts null speed (defaults to 0)', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10, null)]);
      expect(result).toHaveLength(1);
    });
  });

  // ─── Gate 3: Distance (stationary drift) ──────────────────────────────

  describe('Gate 3: Distance filter', () => {
    test('accepts first point without distance check', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10)]);
      expect(result).toHaveLength(1);
    });

    test('rejects second point within 5m of first (stationary drift)', () => {
      // Two points ~1m apart (same coordinates with tiny offset)
      const result = filterLocationPoints([
        mockLocation(12.970000, 77.590000, baseTs, 10),
        mockLocation(12.970001, 77.590001, baseTs + 1000, 10),
      ]);
      expect(result).toHaveLength(1); // only first point kept
    });

    test('accepts second point 100m away from first', () => {
      // ~100m offset in latitude
      const result = filterLocationPoints([
        mockLocation(12.970000, 77.590000, baseTs, 10),
        mockLocation(12.971000, 77.590000, baseTs + 1000, 10),
      ]);
      expect(result).toHaveLength(2); // both kept
    });

    test('uses lastKnown parameter for distance check', () => {
      const lastKnown: LocationPoint = { lat: 12.970000, lng: 77.590000, ts: baseTs - 1000, speed: 0, accuracy: 10 };
      // Point is very close to lastKnown → should be rejected
      const result = filterLocationPoints(
        [mockLocation(12.970001, 77.590001, baseTs, 10)],
        lastKnown
      );
      expect(result).toHaveLength(0);
    });
  });

  // ─── Mixed scenarios ─────────────────────────────────────────────────

  describe('Mixed scenarios', () => {
    test('filters a realistic batch with mixed quality pings', () => {
      const locations = [
        mockLocation(12.9716, 77.5946, baseTs, 8, 2),           // ✅ good
        mockLocation(NaN, 77.5946, baseTs + 1000, 10, 1),       // ❌ NaN
        mockLocation(12.9720, 77.5950, baseTs + 2000, 200, 3),  // ❌ low accuracy
        mockLocation(12.9730, 77.5960, baseTs + 3000, 15, 80),  // ❌ impossible speed
        mockLocation(12.9740, 77.5970, baseTs + 4000, 12, 4),   // ✅ good, >5m from first
        mockLocation(0, 0, baseTs + 5000, 5, 0),                // ❌ null island
      ];
      const result = filterLocationPoints(locations);
      expect(result).toHaveLength(2);
      expect(result[0].lat).toBe(12.9716);
      expect(result[1].lat).toBe(12.9740);
    });

    test('returns empty array for empty input', () => {
      expect(filterLocationPoints([])).toHaveLength(0);
    });

    test('handles single valid point', () => {
      const result = filterLocationPoints([mockLocation(12.97, 77.59, baseTs, 10)]);
      expect(result).toHaveLength(1);
    });
  });
});
