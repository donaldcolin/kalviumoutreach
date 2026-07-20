import { renderHook, act } from '@testing-library/react-native';
import { useLocationPinger } from '../hooks/useLocationPinger';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { appendPing } from '../services/firestore';
import firestore from '@react-native-firebase/firestore';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

jest.mock('../services/firestore', () => ({
  appendPing: jest.fn(),
}));

jest.mock('../stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const onSnapshotMock = jest.fn();
  const whereMock = jest.fn().mockReturnThis();
  const collectionMock = jest.fn().mockReturnThis();
  
  const mockFirestore = () => ({
    collection: collectionMock,
    where: whereMock,
    onSnapshot: onSnapshotMock,
  });
  
  mockFirestore.collection = collectionMock;
  mockFirestore.where = whereMock;
  mockFirestore.onSnapshot = onSnapshotMock;
  
  return mockFirestore;
});

describe('useLocationPinger', () => {
  const mockOnSnapshot = (firestore() as any).onSnapshot;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: null });
  });

  test('does nothing if no user is logged in', async () => {
    const { result } = await renderHook(() => useLocationPinger());
    
    expect(firestore().collection).not.toHaveBeenCalled();
  });

  test('listens to locationRequests if logged in', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user123' } });

    const { result } = await renderHook(() => useLocationPinger());
    
    expect(firestore().collection).toHaveBeenCalledWith('locationRequests');
    expect((firestore() as any).where).toHaveBeenCalledWith('executiveId', '==', 'user123');
    expect((firestore() as any).where).toHaveBeenCalledWith('status', '==', 'pending');
    expect(mockOnSnapshot).toHaveBeenCalled();
  });
});
