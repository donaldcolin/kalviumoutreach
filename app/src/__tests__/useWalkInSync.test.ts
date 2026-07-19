/// <reference types="jest" />
import { renderHook, act } from '@testing-library/react-native';
import { useWalkInSync } from '../hooks/useWalkInSync';
import firestore from '@react-native-firebase/firestore';

jest.mock('@react-native-firebase/firestore', () => {
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockAdd = jest.fn();
  const mockGet = jest.fn();
  
  const mockDoc = jest.fn(() => ({
    set: mockSet,
    update: mockUpdate,
    get: mockGet,
  }));
  
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    add: mockAdd,
  }));

  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  // Attach FieldValue to the mocked default export
  (mockFirestore as any).FieldValue = {
    serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
  };

  return mockFirestore;
});

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-1234'),
}));

describe('useWalkInSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null if userId or executiveEmail is not provided', async () => {
    const { result } = renderHook(() => useWalkInSync(undefined, undefined)) as any;
    
    let activityId;
    await act(async () => {
      activityId = await result.current.startWalkIn('school123', 'Test School');
    });

    expect(activityId).toBeNull();
    
    // Check that firestore wasn't called
    const fs = firestore();
    expect(fs.collection).not.toHaveBeenCalled();
  });

  test('startWalkIn writes to crmActivities and pushQueue', async () => {
    const { result } = renderHook(() => useWalkInSync('user123', 'test@example.com')) as any;
    
    let activityId;
    await act(async () => {
      activityId = await result.current.startWalkIn(
        'school123',
        'Test School',
        [],
        { startLocation: { lat: 10, lng: 20 }, endLocation: null, distanceMeters: null, isValidWalkIn: null }
      );
    });

    expect(activityId).toBe('mock-uuid-1234');
    expect(result.current.isSyncing).toBe(false);

    const fs = firestore();
    
    // 1. Verify crmActivities doc creation
    expect(fs.collection).toHaveBeenCalledWith('crmActivities');
    
    // 2. Verify pushQueue addition
    expect(fs.collection).toHaveBeenCalledWith('pushQueue');
    const mockAdd: any = fs.collection('pushQueue').add;
    expect(mockAdd).toHaveBeenCalled();
    const addArgs = mockAdd.mock.calls[0][0];
    expect(addArgs.action).toBe('CREATE_ACTIVITY');
    expect(addArgs.activityId).toBe('mock-uuid-1234');
    expect(addArgs.leadId).toBe('school123');
  });

  test('endWalkIn updates crmActivities and queues update push', async () => {
    const fs = firestore();
    const mockGet = fs.collection('crmActivities').doc('mock-uuid-1234').get as jest.Mock;
    
    // Mock the doc get to return existing notes
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ notes: 'Walk-in Started' }),
    });

    const { result } = renderHook(() => useWalkInSync('user123', 'test@example.com')) as any;
    
    let success;
    await act(async () => {
      success = await result.current.endWalkIn('mock-uuid-1234', 'Met principal');
    });

    expect(success).toBe(true);

    // Verify crmActivities was updated
    const mockUpdate: any = fs.collection('crmActivities').doc('mock-uuid-1234').update;
    expect(mockUpdate).toHaveBeenCalled();
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.notes).toContain('Walk-in Ended: Met principal');

    // Verify pushQueue was added
    const mockAdd: any = fs.collection('pushQueue').add;
    expect(mockAdd).toHaveBeenCalled();
    const addArgs = mockAdd.mock.calls[0][0];
    expect(addArgs.action).toBe('UPDATE_ACTIVITY');
    expect(addArgs.activityId).toBe('mock-uuid-1234');
  });
});
