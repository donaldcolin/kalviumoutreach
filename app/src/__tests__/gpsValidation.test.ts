/**
 * Unit tests for GPS Validation
 * Tests isValidPoint() and validatePoints() to ensure junk GPS data
 * never reaches Firestore.
 */

import { describe, expect, test } from '@jest/globals';
import { isValidPoint, validatePoints } from '../utils/gpsValidation';

describe('isValidPoint', () => {
  const validPoint = { lat: 12.9716, lng: 77.5946, ts: Date.now(), speed: 5, accuracy: 10 };

  // ─── Should PASS ──────────────────────────────────────────────────────────

  test('accepts a valid Bangalore coordinate', () => {
    expect(isValidPoint(validPoint)).toBe(true);
  });

  test('accepts extreme but valid latitude (+90)', () => {
    expect(isValidPoint({ ...validPoint, lat: 90 })).toBe(true);
  });

  test('accepts extreme but valid latitude (-90)', () => {
    expect(isValidPoint({ ...validPoint, lat: -90 })).toBe(true);
  });

  test('accepts extreme but valid longitude (+180)', () => {
    expect(isValidPoint({ ...validPoint, lng: 180 })).toBe(true);
  });

  test('accepts extreme but valid longitude (-180)', () => {
    expect(isValidPoint({ ...validPoint, lng: -180 })).toBe(true);
  });

  test('accepts point with null speed and accuracy', () => {
    expect(isValidPoint({ lat: 28.6139, lng: 77.2090, ts: Date.now(), speed: null, accuracy: null })).toBe(true);
  });

  // ─── Should REJECT ────────────────────────────────────────────────────────

  test('rejects NaN latitude', () => {
    expect(isValidPoint({ ...validPoint, lat: NaN })).toBe(false);
  });

  test('rejects NaN longitude', () => {
    expect(isValidPoint({ ...validPoint, lng: NaN })).toBe(false);
  });

  test('rejects Infinity latitude', () => {
    expect(isValidPoint({ ...validPoint, lat: Infinity })).toBe(false);
  });

  test('rejects negative Infinity longitude', () => {
    expect(isValidPoint({ ...validPoint, lng: -Infinity })).toBe(false);
  });

  test('rejects null island (0, 0)', () => {
    expect(isValidPoint({ ...validPoint, lat: 0, lng: 0 })).toBe(false);
  });

  test('rejects latitude > 90', () => {
    expect(isValidPoint({ ...validPoint, lat: 91 })).toBe(false);
  });

  test('rejects latitude < -90', () => {
    expect(isValidPoint({ ...validPoint, lat: -91 })).toBe(false);
  });

  test('rejects longitude > 180', () => {
    expect(isValidPoint({ ...validPoint, lng: 181 })).toBe(false);
  });

  test('rejects longitude < -180', () => {
    expect(isValidPoint({ ...validPoint, lng: -181 })).toBe(false);
  });

  test('rejects timestamp before 2020', () => {
    expect(isValidPoint({ ...validPoint, ts: 1000000000000 })).toBe(false); // Sep 2001
  });

  test('rejects timestamp far in the future', () => {
    const twoHoursAhead = Date.now() + 2 * 60 * 60 * 1000;
    expect(isValidPoint({ ...validPoint, ts: twoHoursAhead })).toBe(false);
  });

  test('accepts timestamp slightly in the future (within 1hr buffer)', () => {
    const thirtyMinAhead = Date.now() + 30 * 60 * 1000;
    expect(isValidPoint({ ...validPoint, ts: thirtyMinAhead })).toBe(true);
  });
});

describe('validatePoints', () => {
  test('filters mixed valid/invalid points', () => {
    const points = [
      { lat: 12.9716, lng: 77.5946, ts: Date.now(), speed: 5, accuracy: 10 },
      { lat: NaN, lng: 77.5946, ts: Date.now(), speed: 5, accuracy: 10 },
      { lat: 0, lng: 0, ts: Date.now(), speed: 5, accuracy: 10 },
      { lat: 28.6139, lng: 77.2090, ts: Date.now(), speed: null, accuracy: null },
    ];
    const { valid, rejected } = validatePoints(points);
    expect(valid).toHaveLength(2);
    expect(rejected).toBe(2);
  });

  test('returns all points when all are valid', () => {
    const points = [
      { lat: 12.9716, lng: 77.5946, ts: Date.now(), speed: 5, accuracy: 10 },
      { lat: 13.0827, lng: 80.2707, ts: Date.now(), speed: 3, accuracy: 8 },
    ];
    const { valid, rejected } = validatePoints(points);
    expect(valid).toHaveLength(2);
    expect(rejected).toBe(0);
  });

  test('returns empty when all are invalid', () => {
    const points = [
      { lat: NaN, lng: NaN, ts: Date.now(), speed: null, accuracy: null },
      { lat: 0, lng: 0, ts: Date.now(), speed: null, accuracy: null },
    ];
    const { valid, rejected } = validatePoints(points);
    expect(valid).toHaveLength(0);
    expect(rejected).toBe(2);
  });

  test('handles empty array', () => {
    const { valid, rejected } = validatePoints([]);
    expect(valid).toHaveLength(0);
    expect(rejected).toBe(0);
  });
});
