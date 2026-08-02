import { registerRootComponent } from 'expo';

import messaging from '@react-native-firebase/messaging';
import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';
import { firestoreSync } from './src/tracking/firestoreSync';
import type { LocationPing } from './src/types';

import App from './App';

messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
  console.log('Message handled in the background!', remoteMessage);
  if (remoteMessage.data?.type === 'LOCATION_PING_REQUEST') {
    try {
      const userId = remoteMessage.data.userId;
      const requestId = remoteMessage.data.requestId;
      
      if (!userId) return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const ping: LocationPing = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: Number(loc.timestamp),
        accuracy: loc.coords.accuracy ?? 0,
      };
      
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      await firestoreSync.appendHeadlessLocations(userId as string, dateStr, [ping as any]);
      
      if (requestId) {
        await firestore().collection('locationRequests').doc(requestId as string).update({ status: 'fulfilled' });
      }
    } catch (e) {
      console.warn('Failed background location fetch from FCM:', e);
      const requestId = remoteMessage.data?.requestId;
      if (requestId) {
        await firestore().collection('locationRequests').doc(requestId as string).update({ status: 'failed' });
      }
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
