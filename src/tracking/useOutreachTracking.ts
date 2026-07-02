import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { locationTracker } from './locationTracker';
import { visitTracker, VisitEvent } from './visitTracker';
import { firestoreSync } from './firestoreSync';
import { School, StopClassification } from '../types';
import { getAllSchools, onDailyTrack } from '../services/firestore';
import { format } from 'date-fns';

export function useOutreachTracking(userId: string | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const isTrackingRef = useRef(false);
  
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const [activeSchoolMatch, setActiveSchoolMatch] = useState<School | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<{
    event: VisitEvent;
    resolve: (result: { type: StopClassification; notes?: string }) => void;
  } | null>(null);

  useEffect(() => {
    // Load schools for geofencing
    getAllSchools().then(schools => {
      visitTracker.setSchools(schools);
    });

    visitTracker.setSchoolMatchCallback((school) => {
      setActiveSchoolMatch(school);
    });

    visitTracker.setPromptCallback((event, resolve) => {
      setPendingPrompt({ event, resolve });
    });

    let unsubTrack = () => {};
    if (userId) {
      const today = format(new Date(), 'yyyyMMdd');
      unsubTrack = onDailyTrack(userId, today, (track) => {
        if (track?.status === 'active') {
          setIsTracking(true);
          visitTracker.start();
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
          visitTracker.stop();
          locationTracker.stopTracking();
        }
      });
    }

    return () => {
      unsubTrack();
      // Cleanup on unmount not strictly necessary as these are singletons, 
      // but good practice if hook is remounted
      visitTracker.setSchoolMatchCallback(() => {});
      visitTracker.setPromptCallback(() => {});
    };
  }, [userId]);

  const endDay = useCallback(async () => {
    // If called from the auto-stop timer, we just want to stop everything.
    setIsTracking(false);
    await locationTracker.stopTracking();
    visitTracker.stop();
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
    visitTracker.start();
    await locationTracker.startTracking();
  }, [userId, isTracking]);

  // Removed duplicate endDay definition

  const submitClassification = useCallback((type: StopClassification, notes?: string) => {
    if (pendingPrompt) {
      pendingPrompt.resolve({ type, notes });
      setPendingPrompt(null);
    }
  }, [pendingPrompt]);

  return {
    isTracking,
    startDay,
    endDay,
    activeSchoolMatch,
    pendingPrompt,
    submitClassification
  };
}
