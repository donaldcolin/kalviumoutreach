import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { locationTracker } from './locationTracker';
import { firestoreSync } from './firestoreSync';
import { School } from '../types';
import { getAllSchools, onDailyTrack } from '../services/firestore';
import { format } from 'date-fns';

export function useOutreachTracking(userId: string | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingInitialized, setIsTrackingInitialized] = useState(false);
  const isTrackingRef = useRef(false);
  
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const [activeSchoolMatch, setActiveSchoolMatch] = useState<School | null>(null);

  useEffect(() => {

    let unsubTrack = () => {};
    if (userId) {
      const today = format(new Date(), 'yyyyMMdd');
      unsubTrack = onDailyTrack(userId, today, (track) => {
        setIsTrackingInitialized(true);
        if (track?.status === 'active') {
          setIsTracking(true);
          locationTracker.startTracking();
        } else if (track?.status === 'ended') {
          if (isTrackingRef.current) {
            Alert.alert(
              "Tracking Stopped Remotely",
              "Your Team Lead has stopped your tracking session. Please ensure your location services are enabled and tap 'Start Day' to resume tracking.",
              [{ text: "OK" }]
            );
          }
          setIsTracking(false);
          locationTracker.stopTracking();
        }
      });
    }

    return () => {
      unsubTrack();
    };
  }, [userId]);

  const endDay = useCallback(async () => {
    // If called from the auto-stop timer, we just want to stop everything.
    setIsTracking(false);
    await locationTracker.stopTracking();
    if (userId) {
      await firestoreSync.endSession();
    }
  }, [userId]);

  useEffect(() => {
    if (!isTracking) return;

    // Check time immediately and then every minute
    const checkTime = () => {
      // DISABLED FOR TESTING
      // if (new Date().getHours() >= 18) {
      //   console.log('[useOutreachTracking] 6 PM reached, auto-stopping day.');
      //   endDay();
      // }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [isTracking, endDay]);

  const startDay = useCallback(async () => {
    if (!userId || isTracking) return;
    
    setIsTracking(true);
    await firestoreSync.startSession(userId);
    await locationTracker.startTracking();
  }, [userId, isTracking]);

  return {
    isTracking,
    isTrackingInitialized,
    startDay,
    endDay,
    activeSchoolMatch
  };
}
