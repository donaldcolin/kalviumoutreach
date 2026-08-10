import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Platform, Pressable, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Toast } from '@/components/ui/ToastManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInSync } from '../../hooks/useWalkInSync';
import { useWalkInAudioRecorder } from '../../hooks/useWalkInAudioRecorder';
import { useWalkInStore } from '../../stores/walkInStore';
import { calculateDistanceMeters } from '../../utils/distance';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Building2Icon, Mic, Square, MapPinIcon } from 'lucide-react-native';
import { useWalkInForm } from '../../hooks/useWalkInForm';
import { WalkInForm } from '../../components/walk-in/WalkInForm';
import { buildWalkInActivityData } from '../../utils/lsqMappers';
import { firestoreSync } from '../../tracking/firestoreSync';
import { uploadPhoto } from '../../services/storage';

export default function WalkInSessionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { startWalkIn, isSyncing } = useWalkInSync(user?.id, user?.email);
  const { recorderState, toggleRecording, isUploading, recordingUrl } = useWalkInAudioRecorder();
  
  const { leadId, leadName, resumeWalkIn, startLocation: resumeStartLocation, startTime: resumeStartTime } = route.params || {};
  const insets = useSafeAreaInsets();
  const { beginWalkIn, clearWalkIn } = useWalkInStore();

  // Phase State: pre → active (choose) → recording (optional) → form
  const [phase, setPhase] = useState<'pre' | 'active' | 'recording' | 'form'>(resumeWalkIn ? 'active' : 'pre');

  const { form, updateForm } = useWalkInForm();

  // Location
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'error' | 'denied'>('fetching');
  const [locationAddress, setLocationAddress] = useState('');
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  
  const hasSubmitted = React.useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (phase === 'pre' || hasSubmitted.current) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        'Exit Walk-in?',
        'Are you ok to exit? This walk-in will remain ongoing in the background.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'Exit', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, phase]);

  // Resume walk-in: restore start location from navigation params
  useEffect(() => {
    if (resumeWalkIn && resumeStartLocation) {
      setStartLocation(resumeStartLocation);
      setLocationStatus('success');
    }
  }, []);

  const fetchLocation = async () => {
    setLocationStatus('fetching');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return null;
      }

      // Add a 5 second timeout to prevent hanging on Android emulators
      const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 5000));
      
      let loc: any;
      try {
        loc = await Promise.race([locationPromise, timeoutPromise]);
      } catch (timeoutErr) {
        // Fallback to last known if current takes too long
        loc = await Location.getLastKnownPositionAsync();
        if (!loc) throw new Error('Could not fetch any location data');
      }

      const parsedLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setStartLocation(parsedLoc);
      setLocationStatus('success');

      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (addresses.length > 0) {
          const addr = addresses[0];
          setLocationAddress([addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', '));
        }
      } catch { /* ignore */ }
      
      return parsedLoc;
    } catch { 
      setLocationStatus('error'); 
      return null;
    }
  };

  const handleStartWalkIn = () => {
    Alert.alert(
      'Ready to visit?',
      'Are you ready to start this walk-in?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => {
            // Instantly transition to active phase for snappy UI
            setPhase('active');

            // Fetch location and persist in background
            (async () => {
              const loc = await fetchLocation();
              if (user?.id) {
                beginWalkIn({
                  leadId,
                  leadName: leadName || 'Unknown School',
                  startTime: new Date().toISOString(),
                  startLocation: loc || null,
                  executiveId: user.id,
                });
              }
            })();
          }
        }
      ]
    );
  };


  const handleRecordMeeting = () => {
    setPhase('recording');
  };

  const handleSkipToForm = () => {
    setPhase('form');
  };

  const handleEndWalkIn = () => {
    if (recorderState.isRecording) {
      toggleRecording();
    }
    setPhase('form');
  };

  const handleSubmit = async (finalPhotoUri?: string) => {
    if (!leadId) {
      Toast.show({ title: 'Error', message: 'Missing lead ID', type: 'error' });
      return;
    }
    if (!user?.id || !user?.email) {
      Toast.show({ title: 'Error', message: 'Missing user session', type: 'error' });
      return;
    }

    setIsValidatingLocation(true);
    let endLocation = null;
    let distanceMeters = null;
    let isValidWalkIn = null;

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      endLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      
      if (startLocation) {
        distanceMeters = calculateDistanceMeters(
          startLocation.lat, startLocation.lng,
          endLocation.lat, endLocation.lng
        );
        isValidWalkIn = distanceMeters <= 300;
      }
    } catch (e) {
      console.log('Failed to fetch end location:', e);
    }
    
    // Merge in the final photo URI if provided directly
    const finalFormState = { ...form };
    if (finalPhotoUri) {
      finalFormState.photoUri = finalPhotoUri;
      
      try {
        const rawUrl = await uploadPhoto(finalPhotoUri);
        
        // Add watermarking to the Cloudinary URL using URL Transformations
        const lat = endLocation?.lat || startLocation?.lat;
        const lng = endLocation?.lng || startLocation?.lng;
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
        
        let watermarkedUrl = rawUrl;
        // The user requested to skip the timing/location watermark overlay.
        finalFormState.photoUrl = watermarkedUrl;
      } catch (err) {
        console.error("Photo upload failed:", err);
        Toast.show({ title: 'Warning', message: 'Activity submitted, but photo upload failed.', type: 'error' });
      }
    }

    setIsValidatingLocation(false);

    const { filteredData, extraData } = buildWalkInActivityData(finalFormState);

    const locationPayload = {
      startLocation,
      endLocation,
      distanceMeters,
      isValidWalkIn
    };

    const success = await startWalkIn(leadId, leadName || 'Unknown', filteredData, locationPayload, extraData, recordingUrl);
    if (success) {
      if (user?.id) {
        await clearWalkIn(user.id);
      }
      
      // Piggyback GPS sync onto this network request
      firestoreSync.syncUnsyncedLocations().catch(console.error);

      hasSubmitted.current = true;
      navigation.goBack();
    } else {
      Toast.show({ title: 'Error', message: 'Failed to push to LeadSquared. Please try again.', type: 'error' });
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <VStack className="pb-12">
        
        {/* Header */}
        <View className="bg-white px-4 pt-3 pb-4 border-b border-gray-100">
          <Pressable onPress={() => navigation.goBack()} className="mb-4">
            <Text className="text-gray-600 text-sm font-medium">{'< Back'}</Text>
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mr-4">
              <Building2Icon size={24} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>{leadName || 'Unknown School'}</Text>
              <Text className="text-sm text-gray-400 mt-1">Walk-In Session</Text>
            </View>
          </View>
        </View>

        {/* Phase 1: Pre-Walk-In */}
        {phase === 'pre' && (
          <VStack className="flex-1 items-center justify-center pt-24 px-6">
            <View className="w-24 h-24 rounded-full bg-red-50 items-center justify-center mb-6">
              <MapPinIcon size={40} color="#DC2626" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">Ready to visit?</Text>
            <Text className="text-gray-500 text-center mb-10 leading-relaxed">
              Start the walk-in to capture your location and record meeting notes.
            </Text>
            
            <Pressable
              className={`w-full rounded-xl py-4 items-center justify-center ${isValidatingLocation ? 'bg-rose-400' : 'bg-rose-600'}`}
              onPress={handleStartWalkIn}
              disabled={isValidatingLocation}
            >
              {isValidatingLocation ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-lg">Start Walk-In</Text>
              )}
            </Pressable>
          </VStack>
        )}

        {/* Phase 2: Active Walk-In — Choice Screen */}
        {phase === 'active' && (
          <VStack className="flex-1 items-center justify-center pt-20 px-6">
            <View className="bg-gray-50 border border-gray-200 px-4 py-1 rounded-full mb-8 flex-row items-center gap-2 self-center">
              <View className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <Text className="text-gray-700 font-semibold text-sm">Walk-In Active</Text>
            </View>

            {/* Location banner */}
            <Pressable onPress={locationStatus !== 'fetching' ? fetchLocation : undefined} className="w-full mb-10">
              <View className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-row items-center gap-2">
                {locationStatus === 'fetching' ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <MapPinIcon size={16} color="#6B7280" />
                )}
                <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                  {locationStatus === 'fetching' ? 'Capturing location...' :
                  locationStatus === 'success' ? (locationAddress || `${startLocation?.lat.toFixed(4)}, ${startLocation?.lng.toFixed(4)}`) :
                  'Location failed — tap to retry'}
                </Text>
              </View>
            </Pressable>

            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">What would you like to do?</Text>
            <Text className="text-gray-500 text-sm text-center mb-10">
              Record the meeting if it's a PIC or PI interaction, or skip recording for quick walk-ins.
            </Text>

            <View className="w-full flex-col gap-4">
              <Pressable
                onPress={handleRecordMeeting}
                className="bg-white border border-gray-200 rounded-xl p-6 flex-row items-center gap-4 active:bg-gray-50"
              >
                <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center">
                  <Mic size={28} color="#DC2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 mb-1">Record Meeting</Text>
                  <Text className="text-sm text-gray-500">Record audio, then fill form</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleSkipToForm}
                className="bg-white border border-gray-200 rounded-xl p-6 flex-row items-center gap-4 active:bg-gray-50"
              >
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
                  <Building2Icon size={28} color="#4B5563" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 mb-1">End Walk-In</Text>
                  <Text className="text-sm text-gray-500">Skip recording, go to form</Text>
                </View>
              </Pressable>
            </View>
          </VStack>
        )}

        {/* Phase 2b: Recording */}
        {phase === 'recording' && (
          <VStack className="flex-1 items-center justify-center pt-20 px-6">
            <View className="bg-gray-50 border border-gray-200 px-4 py-1 rounded-full mb-10 flex-row items-center gap-2 self-center">
              <View className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <Text className="text-gray-700 font-semibold text-sm">Walk-In Active</Text>
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-8">Record Meeting Notes</Text>

            <View style={styles.recorderContainer}>
              {recorderState.isRecording && (
                <View style={styles.timerContainer}>
                  <View style={styles.recordingDot} />
                  <Text className="text-red-600 font-bold text-2xl ml-3">
                    {formatTime(recorderState.durationMillis)}
                  </Text>
                </View>
              )}
              {!recorderState.isRecording && recorderState.durationMillis > 0 && (
                <View style={styles.timerContainer}>
                  <Text className="text-gray-500 font-bold text-2xl">
                    {formatTime(recorderState.durationMillis)}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={toggleRecording}
                style={[styles.micButton, recorderState.isRecording && styles.micButtonRecording]}
              >
                {recorderState.isRecording ? (
                  <Square color="#FFFFFF" size={32} strokeWidth={2} fill="#FFFFFF" />
                ) : (
                  <Mic color="#FFFFFF" size={36} strokeWidth={2} />
                )}
              </Pressable>
              
              <Text className="text-slate-400 text-sm mt-6">
                {recorderState.isRecording ? 'Tap to stop recording' : 'Tap mic to start recording'}
              </Text>
            </View>
            
            <View className="w-full mt-auto pt-12">
              <Button
                size="lg"
                className="rounded-full bg-slate-900 h-16 w-full"
                onPress={handleEndWalkIn}
              >
                <ButtonText className="text-white font-bold text-lg">End Walk-In & Proceed</ButtonText>
              </Button>
            </View>
          </VStack>
        )}

        {/* Phase 3: Form */}
        {phase === 'form' && (
          <WalkInForm
            form={form}
            updateForm={updateForm}
            locationStatus={locationStatus}
            locationAddress={locationAddress}
            startLocation={startLocation}
            fetchLocation={fetchLocation}
            isUploading={isUploading}
            recordingUrl={recordingUrl}
            isSyncing={isSyncing}
            isValidatingLocation={isValidatingLocation}
            handleSubmit={handleSubmit}
          />
        )}
      </VStack>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  recorderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E11D48',
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  micButtonRecording: {
    backgroundColor: '#E11D48',
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
