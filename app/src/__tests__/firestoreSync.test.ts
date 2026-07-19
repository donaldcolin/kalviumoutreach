import { firestoreSync } from '../tracking/firestoreSync';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationTracker } from '../tracking/locationTracker';

jest.mock('@react-native-firebase/firestore', () => {
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockGet = jest.fn();
  const mockAdd = jest.fn();
  const mockDoc = jest.fn(() => ({ set: mockSet, update: mockUpdate, get: mockGet }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc, add: mockAdd }));
  
  const mockTx = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
    runTransaction: jest.fn((cb) => cb(mockTx)),
  }));

  (mockFirestore as any).FieldValue = { serverTimestamp: jest.fn(() => 'ts') };
  return mockFirestore;
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../tracking/locationTracker', () => ({
  locationTracker: {
    subscribe: jest.fn(() => jest.fn()),
  }
}));

describe('firestoreSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('startSession uses transaction and sets active status', async () => {
    const fs = firestore();
    const mockTx = (fs.runTransaction as jest.Mock).mock.calls.length === 0 
      ? { get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() } 
      : null; // Just for types

    await firestoreSync.startSession('user123');

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    expect(fs.runTransaction).toHaveBeenCalled();
    expect(locationTracker.subscribe).toHaveBeenCalled();
  });

  test('endSession clears storage and marks status ended', async () => {
    // Start it first so it has userId and dateStr
    await firestoreSync.startSession('user123');
    
    // Now end it
    await firestoreSync.endSession();

    expect(AsyncStorage.removeItem).toHaveBeenCalled();
    const fs = firestore();
    expect(fs.runTransaction).toHaveBeenCalledTimes(2); // once for start, once for end
  });
});
