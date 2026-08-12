import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Toast } from '@/components/ui/ToastManager';
import firestore from '@react-native-firebase/firestore';
import { locationTracker } from './locationTracker';
import { firestoreSync } from './firestoreSync';
import { School } from '../types';
import { getAllSchools, onDailyTrack } from '../services/firestore';
import { format } from '@/src/utils/safeFormat';
import { logger } from '../utils/logger';
import * as Crypto from 'expo-crypto';
import auth from '@react-native-firebase/auth';

// ─── Stale Session Threshold ─────────────────────────────────────────────────
// If an 'active' session's lastPing is older than this, the session is
// considered stale (user likely force-closed the app without stopping tracking).
const STALE_SESSION_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export function useOutreachTracking(userId: string | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingInitialized, setIsTrackingInitialized] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'none' | 'active' | 'ended' | 'stale'>('none');
  const isTrackingRef = useRef(false);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const [activeSchoolMatch, setActiveSchoolMatch] = useState<School | null>(null);

  const hasResumedRef = useRef(false);
  const hasAutoStoppedRef = useRef(false);
  const locallyEndedRef = useRef(false);

  useEffect(() => {
    // Reset on userId change
    hasResumedRef.current = false;

    let unsubTrack = () => { };
    if (userId) {
      const today = format(new Date(), 'yyyyMMdd');
      unsubTrack = onDailyTrack(userId, today, async (track) => {
        setIsTrackingInitialized(true);
        if (!track) {
          setSessionStatus('none');
          setIsTracking(false);
          return;
        }
        setSessionStatus((track.status || 'none') as any);

        if (track.status === 'active') {
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
        } else if (track.status === 'ended' || track.status === 'stale') {
          hasResumedRef.current = false;
          if (isTrackingRef.current && track.status === 'ended' && !locallyEndedRef.current) {
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
    locallyEndedRef.current = true;
    setIsTracking(false);
    await locationTracker.stopTracking();
    if (userId) {
      await firestoreSync.endSession();
    }
  }, [userId]);

  useEffect(() => {
    if (!isTracking) return;

    let lastCheckedDate = new Date().toDateString();

    // Check time immediately and then every minute
    const checkTime = () => {
      const now = new Date();
      
      // Reset the auto-stop flag if it's a new day
      if (now.toDateString() !== lastCheckedDate) {
        lastCheckedDate = now.toDateString();
        hasAutoStoppedRef.current = false;
        console.log('[useOutreachTracking] New day detected, resetting auto-stop flag.');
      }
      
      const hour = now.getHours();
      // Only auto-stop once per app session (or day).
      if (hour >= 18 && !hasAutoStoppedRef.current) {
        console.log('[useOutreachTracking] 6 PM reached, pausing location tracking but keeping app active.');
        hasAutoStoppedRef.current = true;
        
        Toast.show({ title: 'Location Paused', message: "It's past 6 PM. Background location tracking is paused, but you can continue using the app.", type: 'info', duration: 5000 });
        
        // Only stop location tracking, don't end the session
        locationTracker.stopTracking();
        // Force flush of any remaining unsynced locations
        firestoreSync.syncUnsyncedLocations().catch(console.error);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [isTracking, endDay]);

  const startDay = useCallback(async () => {
    if (!userId || isTracking) return;

    // Users can start their day after 6 PM, but background location will remain disabled
    if (new Date().getHours() >= 18) {
      hasAutoStoppedRef.current = true;
      Toast.show({ title: 'Location Paused', message: 'Location tracking is disabled after 6 PM. You can continue using the app.', type: 'info', duration: 3000 });
    }

    setIsTracking(true);
    locallyEndedRef.current = false;
    await firestoreSync.startSession(userId);
    await locationTracker.startTracking();
  }, [userId, isTracking]);

  useEffect(() => {
    console.log('[useOutreachTracking] state changed:', { isTracking, isTrackingInitialized, sessionStatus, activeSchoolMatch });
  }, [isTracking, isTrackingInitialized, sessionStatus, activeSchoolMatch]);
  return {
    isTracking,
    isTrackingInitialized,
    sessionStatus,
    startDay,
    endDay,
    activeSchoolMatch
  };
}

