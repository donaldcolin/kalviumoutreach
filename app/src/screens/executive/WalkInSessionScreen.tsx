import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, ActivityIndicator, Platform, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInSync } from '../../hooks/useWalkInSync';
import { useWalkInAudioRecorder } from '../../hooks/useWalkInAudioRecorder';
import { useWalkInStore } from '../../stores/walkInStore';
import { calculateDistanceMeters } from '../../utils/distance';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDownIcon, CalendarIcon, ClockIcon, MapPinIcon, RefreshCwIcon, ChevronLeftIcon, Building2Icon, Mic, Square } from 'lucide-react-native';

import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem
} from '@/components/ui/select';

// Custom Select Component
const CustomSelect = ({ label, options, value, onChange, placeholder = "Select option" }: { label: string, options: string[], value: string, onChange: (val: string) => void, placeholder?: string }) => (
  <VStack space="xs">
    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</Text>
    <Select onValueChange={onChange} selectedValue={value}>
      <SelectTrigger variant="outline" size="md" className="bg-white border-gray-200 rounded-lg h-12">
        <SelectInput placeholder={placeholder} className="flex-1 text-sm text-gray-900" />
        <SelectIcon as={ChevronDownIcon} className="mr-3 text-gray-400" />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent>
          <SelectDragIndicatorWrapper>
            <SelectDragIndicator />
          </SelectDragIndicatorWrapper>
          {options.map((opt) => (
            <SelectItem key={opt} label={opt} value={opt} />
          ))}
        </SelectContent>
      </SelectPortal>
    </Select>
  </VStack>
);

// Compact Input Field
const FormInput = ({ label, value, onChangeText, keyboardType = 'default', placeholder = '', multiline = false }: any) => (
  <VStack space="xs">
    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</Text>
    <TextInput
      className={`border border-gray-200 bg-white rounded-lg px-4 ${multiline ? 'py-3 min-h-[100px]' : 'py-3 h-12'} text-sm text-gray-900`}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </VStack>
);

// DateTime Picker
const CustomDateTimePicker = ({ label, date, setDate }: { label: string, date: Date | null, setDate: (d: Date) => void }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = date || new Date();
      currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(new Date(currentDate));
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = date || new Date();
      currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setDate(new Date(currentDate));
    }
  };

  return (
    <VStack space="xs">
      <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</Text>
      <View className="flex-row gap-4">
        <Pressable 
          className="flex-1 border border-gray-200 bg-white rounded-lg px-4 py-3 h-12 flex-row items-center justify-between"
          onPress={() => setShowDatePicker(true)}
        >
          <Text className={`text-sm ${date ? "text-gray-900" : "text-gray-400"}`}>
            {date ? date.toLocaleDateString() : 'DD/MM/YYYY'}
          </Text>
          <CalendarIcon size={14} color="#9CA3AF" />
        </Pressable>
        
        <Pressable 
          className="flex-1 border border-gray-200 bg-white rounded-lg px-4 py-3 h-12 flex-row items-center justify-between"
          onPress={() => setShowTimePicker(true)}
        >
          <Text className={`text-sm ${date ? "text-gray-900" : "text-gray-400"}`}>
            {date ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'hh:mm'}
          </Text>
          <ClockIcon size={14} color="#9CA3AF" />
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker value={date || new Date()} mode="date" display="default" onChange={handleDateChange} />
      )}
      {showTimePicker && (
        <DateTimePicker value={date || new Date()} mode="time" display="default" onChange={handleTimeChange} />
      )}
    </VStack>
  );
};

// Status color configs
const STATUS_CONFIG: Record<string, { bg: string; border: string; titleColor: string; icon: string }> = {
  'Refused Entry - RE': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-red-700', icon: '🚫' },
  'Front Desk Interaction - FDI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '🏢' },
  'PIC Interaction - PCI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '👤' },
  'Principal Interaction - PI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '👨‍💼' },
};

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

  // Core form state
  const [typeOfWalkIn, setTypeOfWalkIn] = useState('');
  const [walkInDateTime, setWalkInDateTime] = useState<Date | null>(new Date());
  const [walkInStatus, setWalkInStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // RE
  const [reasonForRefusal, setReasonForRefusal] = useState('');
  
  // FDI
  const [statusFDI, setStatusFDI] = useState('');
  const [strength12th, setStrength12th] = useState('');
  const [schoolFees, setSchoolFees] = useState('');
  const [boardOfSchool, setBoardOfSchool] = useState('');
  const [proposalSentToFD, setProposalSentToFD] = useState('');
  const [picName, setPicName] = useState('');
  const [picDesignation, setPicDesignation] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  
  // PCI
  const [statusPCI, setStatusPCI] = useState('');
  const [proposalSentToPIC, setProposalSentToPIC] = useState('');
  
  // PI
  const [statusPI, setStatusPI] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [proposalSentToPrincipal, setProposalSentToPrincipal] = useState('');

  // DateTime fields
  const [picAppointmentDateTime, setPicAppointmentDateTime] = useState<Date | null>(null);
  const [princiAppointmentDateTime, setPrinciAppointmentDateTime] = useState<Date | null>(null);
  const [seminarAppointmentDateTime, setSeminarAppointmentDateTime] = useState<Date | null>(null);

  // Location
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'error' | 'denied'>('fetching');
  const [locationAddress, setLocationAddress] = useState('');
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);

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
        return;
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

      setStartLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setLocationStatus('success');

      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (addresses.length > 0) {
          const addr = addresses[0];
          setLocationAddress([addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', '));
        }
      } catch { /* ignore */ }
    } catch { setLocationStatus('error'); }
  };

  const handleStartWalkIn = async () => {
    setIsValidatingLocation(true);
    await fetchLocation();
    setPhase('active');
    setIsValidatingLocation(false);

    // Persist ongoing walk-in to Firestore
    if (user?.id) {
      beginWalkIn({
        leadId,
        leadName: leadName || 'Unknown School',
        startTime: new Date().toISOString(),
        startLocation: startLocation,
        executiveId: user.id,
      });
    }
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

  // Reset sub-section state when walk-in status changes
  useEffect(() => {
    setReasonForRefusal('');
    setStatusFDI(''); setStrength12th(''); setSchoolFees(''); setBoardOfSchool('');
    setProposalSentToFD(''); setPicName(''); setPicDesignation(''); setPicPhone(''); setPicEmail('');
    setStatusPCI(''); setProposalSentToPIC('');
    setStatusPI(''); setPrincipalName(''); setPrincipalPhone(''); setPrincipalEmail(''); setProposalSentToPrincipal('');
    setPicAppointmentDateTime(null); setPrinciAppointmentDateTime(null); setSeminarAppointmentDateTime(null);
  }, [walkInStatus]);

  const handleSubmit = async () => {
    if (!leadId) {
      Alert.alert('Error', 'Missing lead ID');
      return;
    }
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'Missing user session');
      return;
    }

    setIsValidatingLocation(true);
    let endLocation = null;
    let distanceMeters = null;
    let isValidWalkIn = null;

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
    setIsValidatingLocation(false);

    const formatDateTime = (d: Date | null) => d ? d.toISOString().replace('T', ' ').split('.')[0] : '';

    // LSQ activity fields
    const activityData = [
      { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
      { SchemaName: 'mx_Custom_36', Value: typeOfWalkIn },
      { SchemaName: 'mx_Custom_1', Value: formatDateTime(walkInDateTime) },
      { SchemaName: 'mx_Custom_4', Value: walkInStatus },
      { SchemaName: 'mx_Custom_6', Value: formatDateTime(followUpDate) },
      { SchemaName: 'ActivityEvent_Note', Value: notes },
    ];

    if (walkInStatus === 'Refused Entry - RE') {
      activityData.push({ SchemaName: 'mx_Custom_5', Value: reasonForRefusal });
    }

    if (walkInStatus === 'Front Desk Interaction - FDI') {
      activityData.push(
        { SchemaName: 'mx_Custom_7', Value: statusFDI },
        { SchemaName: 'mx_Custom_35', Value: strength12th },
        { SchemaName: 'mx_Custom_33', Value: schoolFees },
        { SchemaName: 'mx_Custom_37', Value: boardOfSchool }
      );
      if (statusFDI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_12', Value: proposalSentToFD });
      if (statusFDI === 'Fixed meeting with PIC') {
        activityData.push(
          { SchemaName: 'mx_Custom_13', Value: picName },
          { SchemaName: 'mx_Custom_16', Value: picDesignation },
          { SchemaName: 'mx_Custom_15', Value: picPhone },
          { SchemaName: 'mx_Custom_17', Value: formatDateTime(picAppointmentDateTime) }
        );
      }
    }

    if (walkInStatus === 'PIC Interaction - PCI') {
      activityData.push({ SchemaName: 'mx_Custom_8', Value: statusPCI });
      if (statusPCI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_25', Value: proposalSentToPIC });
      if (statusPCI === 'Appointment fixed with Principal') activityData.push({ SchemaName: 'mx_Custom_27', Value: formatDateTime(princiAppointmentDateTime) });
      if (statusPCI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(seminarAppointmentDateTime) });
    }

    if (walkInStatus === 'Principal Interaction - PI') {
      activityData.push(
        { SchemaName: 'mx_Custom_9', Value: statusPI },
        { SchemaName: 'mx_Custom_21', Value: principalName },
        { SchemaName: 'mx_Custom_23', Value: principalPhone },
      );
      if (statusPI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_26', Value: proposalSentToPrincipal });
      if (statusPI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(seminarAppointmentDateTime) });
    }

    const filteredData = activityData.filter(item => item.Value && item.Value.trim() !== '');

    // Build extra data for local Firestore (timeline display)
    const extraData: Record<string, any> = {
      typeOfWalkIn,
      walkInStatus,
      activityType: 'Walk-in Activity',
      followUpDate: followUpDate?.toISOString() || '',
      notes,
    };

    if (walkInStatus === 'Refused Entry - RE') {
      extraData.refusedEntryReason = reasonForRefusal;
    }
    if (walkInStatus === 'Front Desk Interaction - FDI') {
      extraData.statusFrontDesk = statusFDI;
      extraData.studentStrength = strength12th;
      extraData.schoolFees = schoolFees;
      extraData.boardOfSchool = boardOfSchool;
      if (statusFDI === 'Asking to sent proposal') extraData.proposalSentToSchool = proposalSentToFD;
      if (statusFDI === 'Fixed meeting with PIC') {
        extraData.picName = picName;
        extraData.picDesignation = picDesignation;
        extraData.picPhone = picPhone;
        extraData.picEmail = picEmail;
        extraData.picAppointmentDate = picAppointmentDateTime?.toISOString() || '';
      }
    }
    if (walkInStatus === 'PIC Interaction - PCI') {
      extraData.statusPIC = statusPCI;
      if (statusPCI === 'Asking to sent proposal') extraData.proposalSentToPIC = proposalSentToPIC;
      if (statusPCI === 'Appointment fixed with Principal') extraData.principalAppointmentDate = princiAppointmentDateTime?.toISOString() || '';
      if (statusPCI === 'Appointment fixed for Seminar') extraData.seminarAppointmentDate = seminarAppointmentDateTime?.toISOString() || '';
    }
    if (walkInStatus === 'Principal Interaction - PI') {
      extraData.statusPrincipal = statusPI;
      extraData.principalName = principalName;
      extraData.principalPhone = principalPhone;
      if (statusPI === 'Asking to sent proposal') extraData.proposalSentToPrincipal = proposalSentToPrincipal;
      if (statusPI === 'Appointment fixed for Seminar') extraData.seminarAppointmentDate = seminarAppointmentDateTime?.toISOString() || '';
    }

    const locationPayload = {
      startLocation,
      endLocation,
      distanceMeters,
      isValidWalkIn
    };

    const success = await startWalkIn(leadId, leadName || 'Unknown', filteredData, locationPayload, extraData, recordingUrl);
    if (success) {
      // Clear ongoing walk-in from Firestore
      if (user?.id) {
        await clearWalkIn(user.id);
      }
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to push to LeadSquared. Please try again.');
    }
  };

  const statusConfig = walkInStatus ? STATUS_CONFIG[walkInStatus] : null;

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
          <VStack className="pt-4 pb-24">
            {/* Location Banner */}
            <Pressable onPress={locationStatus !== 'fetching' ? fetchLocation : undefined} className="mx-4 mb-4">
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

            {/* Audio Upload Status */}
            {isUploading && (
              <View className="mx-4 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200 flex-row items-center">
                <ActivityIndicator size="small" color="#6B7280" />
                <Text className="text-gray-700 text-xs ml-2 font-semibold">Uploading audio recording...</Text>
              </View>
            )}
            {recordingUrl && (
              <View className="mx-4 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200 flex-row items-center">
                <Mic size={14} color="#6B7280" />
                <Text className="text-gray-700 text-xs ml-2 font-semibold">Audio recording saved</Text>
              </View>
            )}

            {/* Core Fields */}
            <VStack space="md" className="px-4 mt-4">
              <CustomSelect 
                label="Type of Walk-In" 
                options={['First Visit', 'Follow-up Visit']} 
                value={typeOfWalkIn} 
                onChange={setTypeOfWalkIn} 
              />

              <CustomDateTimePicker label="Walk-In Date & Time" date={walkInDateTime} setDate={setWalkInDateTime} />

              <CustomSelect 
                label="Walk-In Status" 
                options={[
                  'Refused Entry - RE', 
                  'Front Desk Interaction - FDI', 
                  'PIC Interaction - PCI', 
                  'Principal Interaction - PI'
                ]} 
                value={walkInStatus} 
                onChange={setWalkInStatus} 
                placeholder="Select walk-in status"
              />

              <CustomDateTimePicker label="Follow Up Date" date={followUpDate} setDate={setFollowUpDate} />

              <FormInput label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional notes..." />
            </VStack>

            {/* Dynamic Sub-Section */}
            {walkInStatus !== '' && (
              <View className={`mx-4 mt-4 p-4 rounded-2xl ${statusConfig?.bg} border ${statusConfig?.border}`}>
                <Text className={`font-bold text-base mb-3 ${statusConfig?.titleColor}`}>
                  {statusConfig?.icon} {walkInStatus.split(' - ')[0]}
                </Text>

                <VStack space="md">
                  {/* RE Section */}
                  {walkInStatus === 'Refused Entry - RE' && (
                    <CustomSelect 
                      label="Reason for Refusal" 
                      options={['Didnot get permission to enter', 'Security /Front Desk denied entry', 'Others']} 
                      value={reasonForRefusal} onChange={setReasonForRefusal} 
                    />
                  )}

                  {/* FDI Section */}
                  {walkInStatus === 'Front Desk Interaction - FDI' && (
                    <>
                      <CustomSelect 
                        label="Status Front Desk Interaction" 
                        options={['Asking to sent proposal', 'Need prior appointment', 'Fixed meeting with PIC', 'Not Interested']} 
                        value={statusFDI} onChange={setStatusFDI} 
                      />

                      <HStack space="sm">
                        <View className="flex-1">
                          <FormInput label="12th Strength" value={strength12th} onChangeText={setStrength12th} keyboardType="numeric" />
                        </View>
                        <View className="flex-1">
                          <FormInput label="School Fees" value={schoolFees} onChangeText={setSchoolFees} keyboardType="numeric" />
                        </View>
                      </HStack>

                      <CustomSelect label="Board of School" options={['STATE', 'CBSE', 'ICSE', 'IB', 'Others']} value={boardOfSchool} onChange={setBoardOfSchool} />

                      {statusFDI === 'Asking to sent proposal' && (
                        <CustomSelect label="Proposal sent to Front Desk" options={['Yes', 'No']} value={proposalSentToFD} onChange={setProposalSentToFD} />
                      )}

                      {statusFDI === 'Fixed meeting with PIC' && (
                        <>
                          <HStack space="sm">
                            <View className="flex-1">
                              <FormInput label="PIC Name" value={picName} onChangeText={setPicName} />
                            </View>
                            <View className="flex-1">
                              <FormInput label="PIC Designation" value={picDesignation} onChangeText={setPicDesignation} />
                            </View>
                          </HStack>
                          <HStack space="sm">
                            <View className="flex-1">
                              <FormInput label="PIC Phone" value={picPhone} onChangeText={setPicPhone} keyboardType="phone-pad" />
                            </View>
                            <View className="flex-1">
                              <FormInput label="PIC Email" value={picEmail} onChangeText={setPicEmail} keyboardType="email-address" />
                            </View>
                          </HStack>
                          <CustomDateTimePicker label="PIC Appointment Date & Time" date={picAppointmentDateTime} setDate={setPicAppointmentDateTime} />
                        </>
                      )}
                    </>
                  )}

                  {/* PCI Section */}
                  {walkInStatus === 'PIC Interaction - PCI' && (
                    <>
                      <CustomSelect 
                        label="Status PIC Interaction" 
                        options={['Asking to sent proposal', 'Appointment fixed with Principal', 'Appointment fixed for Seminar', 'Not Interested']} 
                        value={statusPCI} onChange={setStatusPCI} 
                      />
                      {statusPCI === 'Asking to sent proposal' && (
                        <CustomSelect label="Proposal sent to PIC" options={['Yes', 'No']} value={proposalSentToPIC} onChange={setProposalSentToPIC} />
                      )}
                      {statusPCI === 'Appointment fixed with Principal' && (
                        <CustomDateTimePicker label="Principal Appointment" date={princiAppointmentDateTime} setDate={setPrinciAppointmentDateTime} />
                      )}
                      {statusPCI === 'Appointment fixed for Seminar' && (
                        <CustomDateTimePicker label="Seminar Appointment" date={seminarAppointmentDateTime} setDate={setSeminarAppointmentDateTime} />
                      )}
                    </>
                  )}

                  {/* PI Section */}
                  {walkInStatus === 'Principal Interaction - PI' && (
                    <>
                      <CustomSelect 
                        label="Status Principal Interaction" 
                        options={['Asking to sent proposal', 'Appointment fixed for Seminar', 'Not Interested']} 
                        value={statusPI} onChange={setStatusPI} 
                      />
                      <HStack space="sm">
                        <View className="flex-1">
                          <FormInput label="Principal Name" value={principalName} onChangeText={setPrincipalName} />
                        </View>
                        <View className="flex-1">
                          <FormInput label="Principal Phone" value={principalPhone} onChangeText={setPrincipalPhone} keyboardType="phone-pad" />
                        </View>
                      </HStack>
                      <FormInput label="Principal Email" value={principalEmail} onChangeText={setPrincipalEmail} keyboardType="email-address" />
                      {statusPI === 'Asking to sent proposal' && (
                        <CustomSelect label="Proposal sent to Principal" options={['Yes', 'No']} value={proposalSentToPrincipal} onChange={setProposalSentToPrincipal} />
                      )}
                      {statusPI === 'Appointment fixed for Seminar' && (
                        <CustomDateTimePicker label="Seminar Appointment" date={seminarAppointmentDateTime} setDate={setSeminarAppointmentDateTime} />
                      )}
                    </>
                  )}
                </VStack>
              </View>
            )}

            {/* Submit */}
            <View className="px-4 mt-6">
              <Button
                size="lg"
                className="rounded-xl bg-rose-600 h-14"
                disabled={isSyncing || isValidatingLocation || !typeOfWalkIn || !walkInStatus || isUploading}
                onPress={handleSubmit}
              >
                {isSyncing || isValidatingLocation ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ButtonText className="text-white font-bold text-base">Push to LeadSquared</ButtonText>
                )}
              </Button>
              {(!typeOfWalkIn || !walkInStatus) && (
                <Text className="text-xs text-slate-400 text-center mt-2">Select Type of Walk-In and Walk-In Status to submit</Text>
              )}
            </View>
          </VStack>
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
