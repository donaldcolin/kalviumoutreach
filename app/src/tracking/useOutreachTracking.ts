import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Toast } from '@/components/ui/ToastManager';
import firestore from '@react-native-firebase/firestore';
import { locationTracker } from './locationTracker';
import { firestoreSync } from './firestoreSync';
import { School } from '../types';
import { getAllSchools, onDailyTrack } from '../services/firestore';
import { format } from 'date-fns';
import { logger } from '../utils/logger';

// ─── Stale Session Threshold ─────────────────────────────────────────────────
// If an 'active' session's lastPing is older than this, the session is
// considered stale (user likely force-closed the app without stopping tracking).
const STALE_SESSION_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export function useOutreachTracking(userId: string | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingInitialized, setIsTrackingInitialized] = useState(false);
  const isTrackingRef = useRef(false);
  
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const [activeSchoolMatch, setActiveSchoolMatch] = useState<School | null>(null);

  const hasResumedRef = useRef(false);

  useEffect(() => {
    // Reset on userId change
    hasResumedRef.current = false;

    let unsubTrack = () => {};
    if (userId) {
      const today = format(new Date(), 'yyyyMMdd');
      unsubTrack = onDailyTrack(userId, today, async (track) => {
        setIsTrackingInitialized(true);
        if (track?.status === 'active') {
          // ─── Stale Session Watchdog ────────────────────────────────────
          // If the session's lastPing is >15 minutes old and we're not
          // already tracking locally, the user likely force-closed the app.
          // Mark it as 'stale' so team leads don't see ghost active users.
          const lastPing = (track.lastPing as any)?.toDate?.();
          if (lastPing && !isTrackingRef.current && !hasResumedRef.current) {
            const age = Date.now() - lastPing.getTime();
            if (age > STALE_SESSION_THRESHOLD_MS) {
              logger.info(`Stale session detected (lastPing ${Math.round(age / 60000)}min ago), marking as stale`);
              try {
                const docId = `${userId}_${today}`;
                await firestore().collection('dailyTracks').doc(docId).update({
                  status: 'stale',
                  staleDetectedAt: firestore.FieldValue.serverTimestamp(),
                });
              } catch (e) {
                logger.warn('Failed to mark session as stale:', e instanceof Error ? e.message : String(e));
              }
              setIsTracking(false);
              return; // Don't resume a stale session
            }
          }

          setIsTracking(true);
          // Only resume once per mount — don't re-call on every snapshot update
          // (startSession updates lastPing on the same doc, which would retrigger
          // this listener in an infinite loop)
          if (!hasResumedRef.current) {
            hasResumedRef.current = true;
            firestoreSync.startSession(userId).then(() => {
              locationTracker.startTracking(false);
            });
          }
        } else if (track?.status === 'ended') {
          hasResumedRef.current = false;
          if (isTrackingRef.current) {
            Toast.show({ title: 'Tracking Stopped Remotely', message: 'Your Team Lead has stopped your tracking session.', type: 'info', duration: 5000 });
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
      if (new Date().getHours() >= 18) {
        console.log('[useOutreachTracking] 6 PM reached, auto-stopping day.');
        endDay();
      }
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

