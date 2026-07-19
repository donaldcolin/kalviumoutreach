import { useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import * as Location from 'expo-location';
import { appendPing } from '../services/firestore';
import { format } from 'date-fns';
import { logger } from '../utils/logger';
import type { LocationPing } from '../types';

export function useLocationPinger() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Listen to the locationRequests document for this user
    const unsub = firestore()
      .collection('locationRequests')
      .where('executiveId', '==', user.id)
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
        if (!snapshot || snapshot.empty) return;

        for (const docSnap of snapshot.docs) {
          logger.info(`Processing background location request`, { requestId: docSnap.id });

          try {
            // Update to processing to prevent double fetch
            await docSnap.ref.update({ status: 'processing' });

            // Fetch high-accuracy location
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            
            const ping: LocationPing = {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              timestamp: Number(loc.timestamp),
              accuracy: loc.coords.accuracy ?? 0,
            };

            // Use yyyyMMdd format to match the core tracker in location.ts
            const today = format(new Date(), 'yyyyMMdd');
            
            // Append to daily tracks
            await appendPing(user.id, today, ping);
            logger.info(`Successfully appended ping for request`, { requestId: docSnap.id, location: { lat: ping.lat, lng: ping.lng } });

            // Mark as fulfilled
            await docSnap.ref.update({ status: 'fulfilled' });

          } catch (err) {
            logger.error(`Failed to process location request`, { requestId: docSnap.id, error: err instanceof Error ? err.message : String(err) });
            // Even on error, mark it so it doesn't get stuck forever
            await docSnap.ref.update({ status: 'error' });
          }
        }
      });

    return () => unsub();
  }, [user]);
}
