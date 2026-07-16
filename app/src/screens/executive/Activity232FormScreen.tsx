import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, ActivityIndicator, Platform, Pressable, Alert } from 'react-native';
import * as Location from 'expo-location';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInSync } from '../../hooks/useWalkInSync';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDownIcon, CalendarIcon, ClockIcon, MapPinIcon, RefreshCwIcon } from 'lucide-react-native';
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

// Custom Select Component Wrapper
const CustomSelect = ({ label, options, value, onChange, placeholder = "Select option" }: { label: string, options: string[], value: string, onChange: (val: string) => void, placeholder?: string }) => {
  return (
    <VStack space="xs">
      <Text className="text-slate-600 text-sm font-medium">{label}</Text>
      <Select onValueChange={onChange} selectedValue={value}>
        <SelectTrigger variant="outline" size="md" className="bg-slate-50 border-slate-200">
          <SelectInput placeholder={placeholder} className="flex-1" />
          <SelectIcon as={ChevronDownIcon} className="mr-3 text-slate-400" />
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
};

// Date Time Picker Wrapper
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
      <Text className="text-slate-600 text-sm font-medium">{label}</Text>
      <HStack space="md">
        <Pressable 
          className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
          onPress={() => setShowDatePicker(true)}
        >
          <Text className={date ? "text-slate-900" : "text-slate-400"}>
            {date ? date.toLocaleDateString() : 'DD/MM/YYYY'}
          </Text>
          <CalendarIcon size={16} color="#94A3B8" />
        </Pressable>
        
        <Pressable 
          className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 flex-row items-center justify-between"
          onPress={() => setShowTimePicker(true)}
        >
          <Text className={date ? "text-slate-900" : "text-slate-400"}>
            {date ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'hh:mm AM/PM'}
          </Text>
          <ClockIcon size={16} color="#94A3B8" />
        </Pressable>
      </HStack>

      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </VStack>
  );
};

export default function Activity232FormScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { startWalkIn, isSyncing } = useWalkInSync(user?.id, user?.email);
  const { leadId, leadName } = route.params || {};

  // Form State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activityType, setActivityType] = useState('Walk-in Activity');
  const [typeOfWalkIn, setTypeOfWalkIn] = useState('');
  const [walkInDateTime, setWalkInDateTime] = useState<Date | null>(new Date());
  const [walkInStatus, setWalkInStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Sub-sections State
  const [reasonForRefusal, setReasonForRefusal] = useState('');
  
  const [statusFDI, setStatusFDI] = useState('');
  const [strength12th, setStrength12th] = useState('');
  const [schoolFees, setSchoolFees] = useState('');
  const [boardOfSchool, setBoardOfSchool] = useState('');
  const [proposalSentToFD, setProposalSentToFD] = useState('');
  const [picName, setPicName] = useState('');
  const [picDesignation, setPicDesignation] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [picEmail, setPicEmail] = useState('');
  
  const [statusPCI, setStatusPCI] = useState('');
  const [proposalSentToPIC, setProposalSentToPIC] = useState('');
  
  const [statusPI, setStatusPI] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [proposalSentToPrincipal, setProposalSentToPrincipal] = useState('');

  // Shared DateTime fields for sub-sections
  const [picAppointmentDateTime, setPicAppointmentDateTime] = useState<Date | null>(null);
  const [princiAppointmentDateTime, setPrinciAppointmentDateTime] = useState<Date | null>(null);
  const [seminarAppointmentDateTime, setSeminarAppointmentDateTime] = useState<Date | null>(null);

  // Location State
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'error' | 'denied'>('fetching');
  const [locationAddress, setLocationAddress] = useState('');

  // Auto-fetch location on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLocationStatus('fetching');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert('Location Permission', 'Location permission is required to log activities. Please enable it in settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setLocationStatus('success');

      // Reverse geocode for display
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const parts = [addr.name, addr.street, addr.city, addr.region].filter(Boolean);
          setLocationAddress(parts.join(', '));
        }
      } catch { /* ignore geocode errors */ }
    } catch (err) {
      console.error('Location error:', err);
      setLocationStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!leadId) return;

    // Build the payload using actual LeadSquared mx_Custom_* schema names
    const formatDateTime = (d: Date | null) => d ? d.toISOString().replace('T', ' ').split('.')[0] : '';

    const activityData = [
      { SchemaName: 'mx_Custom_2', Value: activityType },           // activityType
      { SchemaName: 'mx_Custom_36', Value: typeOfWalkIn },          // typeOfWalkIn
      { SchemaName: 'mx_Custom_1', Value: formatDateTime(walkInDateTime) }, // walkInDateTime
      { SchemaName: 'mx_Custom_4', Value: walkInStatus },           // walkInStatus
      { SchemaName: 'mx_Custom_6', Value: formatDateTime(followUpDate) },   // followUpDate
      { SchemaName: 'ActivityEvent_Note', Value: notes },
    ];

    if (walkInStatus === 'Refused Entry - RE') {
      activityData.push({ SchemaName: 'mx_Custom_5', Value: reasonForRefusal }); // refusedEntryReason
    }

    if (walkInStatus === 'Front Desk Interaction - FDI') {
      activityData.push(
        { SchemaName: 'mx_Custom_7', Value: statusFDI },           // statusFrontDesk
        { SchemaName: 'mx_Custom_35', Value: strength12th },       // studentStrength
        { SchemaName: 'mx_Custom_33', Value: schoolFees },         // schoolFees
        { SchemaName: 'mx_Custom_37', Value: boardOfSchool }       // boardOfSchool
      );
      if (statusFDI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_12', Value: proposalSentToFD }); // proposalSentToSchool
      if (statusFDI === 'Fixed meeting with PIC') {
        activityData.push(
          { SchemaName: 'mx_Custom_13', Value: picName },             // picName
          { SchemaName: 'mx_Custom_16', Value: picDesignation },      // picDesignation
          { SchemaName: 'mx_Custom_15', Value: picPhone },            // picPhone
          { SchemaName: 'mx_Custom_17', Value: formatDateTime(picAppointmentDateTime) } // picAppointmentDate
        );
      }
    }

    if (walkInStatus === 'PIC Interaction - PCI') {
      activityData.push({ SchemaName: 'mx_Custom_8', Value: statusPCI }); // statusPIC
      if (statusPCI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_25', Value: proposalSentToPIC }); // proposalSentToPIC
      if (statusPCI === 'Appointment fixed with Principal') activityData.push({ SchemaName: 'mx_Custom_27', Value: formatDateTime(princiAppointmentDateTime) }); // principalAppointmentDate
      if (statusPCI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(seminarAppointmentDateTime) }); // seminarAppointmentDate
    }

    if (walkInStatus === 'Principal Interaction - PI') {
      activityData.push(
        { SchemaName: 'mx_Custom_9', Value: statusPI },            // statusPrincipal
        { SchemaName: 'mx_Custom_21', Value: principalName },      // principalName
        { SchemaName: 'mx_Custom_23', Value: principalPhone },     // principalPhone
      );
      if (statusPI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_26', Value: proposalSentToPrincipal }); // proposalSentToPrincipal
      if (statusPI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(seminarAppointmentDateTime) });
    }

    const filteredData = activityData.filter(item => item.Value && item.Value.trim() !== '');

    // Pass location as separate param (not as an LSQ activity field — mx_Custom_34 is not an activity field)
    const success = await startWalkIn(leadId, leadName || 'Unknown', filteredData, location);
    if (success) {
      navigation.goBack();
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <VStack space="xl" className="p-4 pb-12">
        <Text className="text-xl font-bold text-slate-900">Outreach Activity V3</Text>
        
        {/* Location Status */}
        <Pressable onPress={locationStatus !== 'fetching' ? fetchLocation : undefined}>
          <HStack space="sm" className={`p-3 rounded-xl items-center ${
            locationStatus === 'success' ? 'bg-emerald-50 border border-emerald-200' :
            locationStatus === 'fetching' ? 'bg-blue-50 border border-blue-200' :
            'bg-red-50 border border-red-200'
          }`}>
            {locationStatus === 'fetching' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <MapPinIcon size={18} color={locationStatus === 'success' ? '#10B981' : '#EF4444'} />
            )}
            <VStack className="flex-1">
              <Text className={`text-xs font-semibold ${
                locationStatus === 'success' ? 'text-emerald-700' :
                locationStatus === 'fetching' ? 'text-blue-700' :
                'text-red-700'
              }`}>
                {locationStatus === 'fetching' ? 'Capturing location...' :
                 locationStatus === 'success' ? 'Location captured' :
                 locationStatus === 'denied' ? 'Location permission denied' :
                 'Location capture failed'}
              </Text>
              {locationStatus === 'success' && locationAddress ? (
                <Text className="text-xs text-emerald-600" numberOfLines={1}>{locationAddress}</Text>
              ) : null}
              {locationStatus === 'success' && location ? (
                <Text className="text-[10px] text-emerald-500">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</Text>
              ) : null}
            </VStack>
            {(locationStatus === 'error' || locationStatus === 'denied') && (
              <RefreshCwIcon size={16} color="#EF4444" />
            )}
          </HStack>
        </Pressable>
        {/* Walk-in Core Details */}
        <VStack space="md" className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <Text className="font-bold text-slate-900">Walk-In Details</Text>
          
          <VStack space="xs">
            <Text className="text-slate-600 text-sm font-medium">Phone Number</Text>
            <TextInput 
              className="border border-slate-200 bg-white rounded-xl px-4 py-3" 
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              keyboardType="phone-pad"
              placeholder="+91"
            />
          </VStack>

          <CustomSelect 
            label="Activity Type*" 
            options={['Walk-in Activity']} 
            value={activityType} 
            onChange={setActivityType} 
          />

          <CustomSelect 
            label="Type of Walk-In*" 
            options={['First Visit', 'Follow-up Visit']} 
            value={typeOfWalkIn} 
            onChange={setTypeOfWalkIn} 
          />

          <CustomDateTimePicker 
            label="Walk-In Date & Time*" 
            date={walkInDateTime} 
            setDate={setWalkInDateTime} 
          />

          <CustomSelect 
            label="Walk-In Status*" 
            options={[
              'Refused Entry - RE', 
              'Front Desk Interaction - FDI', 
              'PIC Interaction - PCI', 
              'Principal Interaction - PI'
            ]} 
            value={walkInStatus} 
            onChange={setWalkInStatus} 
            placeholder="Type to search"
          />

          <CustomDateTimePicker 
            label="Follow Up Date*" 
            date={followUpDate} 
            setDate={setFollowUpDate} 
          />

          <VStack space="xs">
            <Text className="text-slate-600 text-sm font-medium">Notes</Text>
            <TextInput
              className="border border-slate-200 bg-white rounded-xl p-4 min-h-[80px]"
              multiline
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </VStack>
        </VStack>

        {/* Conditional Sub-Sections */}
        {walkInStatus === 'Refused Entry - RE' && (
          <VStack space="md" className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <Text className="font-bold text-red-900">Refused Entry</Text>
            <CustomSelect 
              label="Reason for Refusal*" 
              options={['Did not get permission to enter', 'Security/Front Desk denied entry', 'Other']} 
              value={reasonForRefusal} 
              onChange={setReasonForRefusal} 
            />
          </VStack>
        )}

        {walkInStatus === 'Front Desk Interaction - FDI' && (
          <VStack space="md" className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <Text className="font-bold text-blue-900">Front Desk Interaction</Text>
            <CustomSelect 
              label="Status Front Desk Interaction*" 
              options={[
                'Asking to sent proposal', 
                'Need prior appointment', 
                'Fixed meeting with PIC', 
                'Not Interested'
              ]} 
              value={statusFDI} 
              onChange={setStatusFDI} 
            />

            {(statusFDI === 'Asking to sent proposal' || statusFDI === 'Need prior appointment' || statusFDI === 'Fixed meeting with PIC' || statusFDI === 'Not Interested') && (
              <>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">Strength of 12th student*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={strength12th} onChangeText={setStrength12th} keyboardType="numeric" />
                </VStack>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">School Fees*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={schoolFees} onChangeText={setSchoolFees} keyboardType="numeric" />
                </VStack>
                <CustomSelect label="Board of School*" options={['STATE', 'CBSE', 'ICSE', 'IB', 'Others']} value={boardOfSchool} onChange={setBoardOfSchool} />
              </>
            )}

            {statusFDI === 'Asking to sent proposal' && (
              <CustomSelect label="Proposal sent to Front Desk*" options={['Yes', 'No']} value={proposalSentToFD} onChange={setProposalSentToFD} />
            )}
            {statusFDI === 'Fixed meeting with PIC' && (
              <>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">PIC Name*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={picName} onChangeText={setPicName} />
                </VStack>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">PIC Designation*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={picDesignation} onChangeText={setPicDesignation} />
                </VStack>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">PIC Phone Number*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={picPhone} onChangeText={setPicPhone} keyboardType="phone-pad" />
                </VStack>
                <VStack space="xs">
                  <Text className="text-slate-600 text-sm font-medium">PIC Email ID*</Text>
                  <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={picEmail} onChangeText={setPicEmail} keyboardType="email-address" />
                </VStack>
                <CustomDateTimePicker label="PIC Appointment Date & Time*" date={picAppointmentDateTime} setDate={setPicAppointmentDateTime} />
              </>
            )}
          </VStack>
        )}

        {walkInStatus === 'PIC Interaction - PCI' && (
          <VStack space="md" className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
            <Text className="font-bold text-purple-900">PIC Interaction</Text>
            <CustomSelect 
              label="Status PIC Interaction*" 
              options={[
                'Asking to sent proposal', 
                'Appointment fixed with Principal', 
                'Appointment fixed for Seminar', 
                'Not Interested'
              ]} 
              value={statusPCI} 
              onChange={setStatusPCI} 
            />

            {statusPCI === 'Asking to sent proposal' && (
              <CustomSelect label="Proposal sent to PIC*" options={['Yes', 'No']} value={proposalSentToPIC} onChange={setProposalSentToPIC} />
            )}
            {statusPCI === 'Appointment fixed with Principal' && (
              <CustomDateTimePicker label="Princi Appointment Date & Time*" date={princiAppointmentDateTime} setDate={setPrinciAppointmentDateTime} />
            )}
            {statusPCI === 'Appointment fixed for Seminar' && (
              <CustomDateTimePicker label="Seminar Appointment Date&Time*" date={seminarAppointmentDateTime} setDate={setSeminarAppointmentDateTime} />
            )}
          </VStack>
        )}

        {walkInStatus === 'Principal Interaction - PI' && (
          <VStack space="md" className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <Text className="font-bold text-orange-900">Principal Interaction</Text>
            <CustomSelect 
              label="Status Principal Interaction*" 
              options={[
                'Asking to sent proposal', 
                'Appointment fixed for Seminar', 
                'Not Interested'
              ]} 
              value={statusPI} 
              onChange={setStatusPI} 
            />

            <VStack space="xs">
              <Text className="text-slate-600 text-sm font-medium">Principal / PIC Name*</Text>
              <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={principalName} onChangeText={setPrincipalName} />
            </VStack>
            <VStack space="xs">
              <Text className="text-slate-600 text-sm font-medium">Principal / PIC Phone Number*</Text>
              <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={principalPhone} onChangeText={setPrincipalPhone} keyboardType="phone-pad" />
            </VStack>
            <VStack space="xs">
              <Text className="text-slate-600 text-sm font-medium">Principal / PIC Email ID*</Text>
              <TextInput className="border border-slate-200 bg-white rounded-xl px-4 py-3" value={principalEmail} onChangeText={setPrincipalEmail} keyboardType="email-address" />
            </VStack>

            {statusPI === 'Asking to sent proposal' && (
              <CustomSelect label="Proposal sent to Principal*" options={['Yes', 'No']} value={proposalSentToPrincipal} onChange={setProposalSentToPrincipal} />
            )}
            {statusPI === 'Appointment fixed for Seminar' && (
              <CustomDateTimePicker label="Seminar Appointment Date&Time*" date={seminarAppointmentDateTime} setDate={setSeminarAppointmentDateTime} />
            )}
          </VStack>
        )}

        <Button
          size="lg"
          className="rounded-xl bg-primary mt-6 h-14"
          disabled={isSyncing}
          onPress={handleSubmit}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <ButtonText className="text-white font-bold text-lg">Push to LeadSquared</ButtonText>
          )}
        </Button>
      </VStack>
    </ScrollView>
  );
}
