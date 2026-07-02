import React, { useState, useRef, useEffect } from 'react';
import { Alert, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import ViewShot from 'react-native-view-shot';
import { useAuthStore } from '../../stores/authStore';
import { useVisitStore } from '../../stores/visitStore';
import GPSAccuracyIndicator from '../../components/GPSAccuracyIndicator';
import WatermarkOverlay from '../../components/WatermarkOverlay';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList, Visit } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<VisitStackParamList, 'CheckIn'>;

export default function CheckInScreen({ navigation, route }: Props) {
  const { schoolId, schoolName } = route.params;
  const { user } = useAuthStore();
  const { startVisit } = useVisitStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(999);
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLng, setCurrentLng] = useState(0);
  const [address, setAddress] = useState('Fetching address...');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const viewShotRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let locationSub: Location.LocationSubscription | undefined;

    const watchGPS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
          (loc) => {
            if (!isMounted) return;
            setGpsAccuracy(loc.coords.accuracy ?? 999);
            setCurrentLat(loc.coords.latitude);
            setCurrentLng(loc.coords.longitude);
          },
        );
      } catch (err) {
        console.warn('[CheckIn] Failed to watch location', err);
      }
    };

    watchGPS();

    return () => {
      isMounted = false;
      if (locationSub) {
        locationSub.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (currentLat === 0) return;
    Location.reverseGeocodeAsync({ latitude: currentLat, longitude: currentLng })
      .then((results) => {
        if (results.length > 0) {
          const r = results[0];
          setAddress(
            [r.street, r.district, r.city, r.region].filter(Boolean).join(', '),
          );
        }
      })
      .catch(() => setAddress('Address unavailable'));
  }, [currentLat, currentLng]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
        <VStack className="flex-1 justify-center items-center p-6" space="xl">
          <Text className="text-muted-foreground text-center text-lg">Camera permission is required for check-in photos</Text>
          <Button size="lg" onPress={requestPermission} className="rounded-xl">
            <ButtonText className="font-bold text-lg">Grant Permission</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (gpsAccuracy > 50) {
      Alert.alert('GPS Accuracy Too Low', `Current accuracy: ±${gpsAccuracy.toFixed(0)}m. Please wait for a better signal (need <50m).`);
      return;
    }
    if (!cameraRef.current) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setIsMock(loc.mocked ?? false);
        } catch { setIsMock(false); }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo');
    }
    setIsCapturing(false);
  };

  const handleCheckIn = async () => {
    if (!capturedPhoto || !user) return;
    setIsCheckingIn(true);
    try {
      let watermarkedUri = capturedPhoto;
      if (viewShotRef.current) {
        try {
          const uri = await (viewShotRef.current as any).capture();
          if (uri) watermarkedUri = uri;
        } catch {}
      }

      const networkState = await Network.getNetworkStateAsync();
      const batteryLevel = await Battery.getBatteryLevelAsync();

      const visitData: Omit<Visit, 'id'> = {
        executiveId: user.id,
        schoolId,
        schoolName,
        checkInLat: currentLat,
        checkInLng: currentLng,
        gpsAccuracy,
        timestamp: Date.now(),
        deviceId: Device.modelName ?? 'unknown',
        networkType: networkState.type ?? 'unknown',
        batteryPercent: Math.round(batteryLevel * 100),
        mockLocationFlag: isMock,
        rootDetectedFlag: false,
        photoOriginalUrl: '',
        photoWatermarkedUrl: '',
        photoLocalUri: capturedPhoto,
        watermarkedLocalUri: watermarkedUri,
        status: 'inProgress',
        syncedToCrm: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const visitId = await startVisit(visitData);

      navigation.replace('VisitDetail', { visitId });
    } catch (err) {
      Alert.alert('Error', 'Failed to check in');
    }
    setIsCheckingIn(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      {!capturedPhoto ? (
        <Box className="flex-1">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <VStack className="flex-1 justify-between items-center p-5">
              <Box className="self-end bg-black/60 rounded-xl p-2 mt-4">
                <GPSAccuracyIndicator accuracy={gpsAccuracy} />
              </Box>
              
              <Box className="items-center mb-10">
                {gpsAccuracy > 50 && (
                  <Text className="text-[#F59E0B] font-semibold text-sm mb-4">Waiting for better GPS signal...</Text>
                )}
                <TouchableOpacity
                  style={{
                    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF',
                    justifyContent: 'center', alignItems: 'center',
                    opacity: (isCapturing || gpsAccuracy > 50) ? 0.4 : 1
                  }}
                  onPress={handleCapture}
                  disabled={isCapturing || gpsAccuracy > 50}
                >
                  <Box style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' }} />
                </TouchableOpacity>
              </Box>
            </VStack>
          </CameraView>
        </Box>
      ) : (
        <VStack className="flex-1">
          <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ format: 'jpg', quality: 0.9 }}>
            <Image source={{ uri: capturedPhoto }} style={{ flex: 1, resizeMode: 'cover' }} />
            <WatermarkOverlay
              schoolName={schoolName}
              address={address}
              lat={currentLat}
              lng={currentLng}
              executiveName={user?.name ?? ''}
              employeeId={user?.employeeId ?? ''}
            />
          </ViewShot>

          {isMock && (
            <Card className="bg-[#F59E0B]/20 p-3 items-center rounded-none border-0">
              <Text className="text-[#F59E0B] font-semibold text-sm">⚠️ Mock location detected — flagged for review</Text>
            </Card>
          )}

          <HStack space="md" className="p-4 bg-background">
            <Button size="lg" variant="outline" className="flex-1 rounded-xl border-border" onPress={() => setCapturedPhoto(null)}>
              <ButtonText className="text-foreground">Retake</ButtonText>
            </Button>
            <Button
              size="lg"
              className="flex-[2] rounded-xl bg-[#22C55E]"
              onPress={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? <ButtonSpinner /> : <ButtonText className="font-bold">Confirm Check-In</ButtonText>}
            </Button>
          </HStack>
        </VStack>
      )}
    </SafeAreaView>
  );
}
