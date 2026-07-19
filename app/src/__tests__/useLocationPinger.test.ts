import { renderHook, act } from '@testing-library/react-native';
import { useLocationPinger } from '../hooks/useLocationPinger';
import * as Location from 'expo-location';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../services/firestore', () => ({
  appendPing: jest.fn(),
}));

import { appendPing } from '../services/firestore';

describe('useLocationPinger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does nothing if no user is logged in', async () => {
    const { result } = renderHook(() => useLocationPinger(undefined));
    
    // Fast-forward or wait to see if it pings
    // Without user, it shouldn't request permissions
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('requests permission and sends ping if logged in', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 12.0, longitude: 77.0, accuracy: 10, speed: 1 },
      timestamp: 1600000000000
    });

    const { result } = renderHook(() => useLocationPinger('user123')) as any;

    // Use fake timers to advance the interval
    jest.useFakeTimers();
    
    // The hook has a useEffect that runs on mount
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    expect(appendPing).toHaveBeenCalledWith('user123', expect.any(Object));

    jest.useRealTimers();
  });
});
