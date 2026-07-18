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
import { ChevronDownIcon, CalendarIcon, ClockIcon, MapPinIcon, RefreshCwIcon, ChevronLeftIcon, Building2Icon } from 'lucide-react-native';
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
    <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</Text>
    <Select onValueChange={onChange} selectedValue={value}>
      <SelectTrigger variant="outline" size="md" className="bg-white border-slate-200 rounded-xl h-12">
        <SelectInput placeholder={placeholder} className="flex-1 text-sm" />
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

// Compact Input Field
const FormInput = ({ label, value, onChangeText, keyboardType = 'default', placeholder = '', multiline = false }: any) => (
  <VStack space="xs">
    <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</Text>
    <TextInput
      className={`border border-slate-200 bg-white rounded-xl px-4 ${multiline ? 'py-3 min-h-[80px]' : 'py-3 h-12'} text-sm text-slate-900`}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
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
      <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</Text>
      <HStack space="sm">
        <Pressable
          className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-3 h-12 flex-row items-center justify-between"
          onPress={() => setShowDatePicker(true)}
        >
          <Text className={`text-sm ${date ? "text-slate-900" : "text-slate-400"}`}>
            {date ? date.toLocaleDateString() : 'DD/MM/YYYY'}
          </Text>
          <CalendarIcon size={14} color="#94A3B8" />
        </Pressable>

        <Pressable
          className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-3 h-12 flex-row items-center justify-between"
          onPress={() => setShowTimePicker(true)}
        >
          <Text className={`text-sm ${date ? "text-slate-900" : "text-slate-400"}`}>
            {date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'hh:mm'}
          </Text>
          <ClockIcon size={14} color="#94A3B8" />
        </Pressable>
      </HStack>

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
  'Refused Entry - RE': { bg: 'bg-red-50', border: 'border-red-200', titleColor: 'text-red-800', icon: '🚫' },
  'Front Desk Interaction - FDI': { bg: 'bg-blue-50', border: 'border-blue-200', titleColor: 'text-blue-800', icon: '🏢' },
  'PIC Interaction - PCI': { bg: 'bg-purple-50', border: 'border-purple-200', titleColor: 'text-purple-800', icon: '👤' },
  'Principal Interaction - PI': { bg: 'bg-amber-50', border: 'border-amber-200', titleColor: 'text-amber-800', icon: '👨‍💼' },
};

export default function Activity232FormScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { startWalkIn, isSyncing } = useWalkInSync(user?.id, user?.email);
  const { leadId, leadName } = route.params || {};

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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'error' | 'denied'>('fetching');
  const [locationAddress, setLocationAddress] = useState('');

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = async () => {
    setLocationStatus('fetching');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationStatus('denied'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
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
    if (!leadId) return;

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

    const locationPayload = location ? {
      startLocation: location,
      endLocation: null,
      distanceMeters: null,
      isValidWalkIn: null
    } : undefined;

    const success = await startWalkIn(leadId, leadName || 'Unknown', filteredData, locationPayload, extraData);
    if (success) {
      navigation.goBack();
    }
  };

  const statusConfig = walkInStatus ? STATUS_CONFIG[walkInStatus] : null;

  return (
    <ScrollView className="flex-1 bg-slate-50" keyboardShouldPersistTaps="handled">
      <VStack className="pb-12">

        {/* Header */}
        <View className="bg-white px-4 pt-3 pb-4 border-b border-slate-100">
          <Pressable onPress={() => navigation.goBack()} className="flex-row items-center mb-3">
            <ChevronLeftIcon size={20} color="#64748B" />
            <Text className="text-slate-500 text-sm ml-1">Back</Text>
          </Pressable>
          <HStack className="items-center" space="md">
            <View className="w-11 h-11 rounded-xl bg-rose-50 items-center justify-center">
              <Building2Icon size={22} color="#E11D48" />
            </View>
            <VStack>
              <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>{leadName || 'Unknown School'}</Text>
              <Text className="text-xs text-slate-400">Log Activity</Text>
            </VStack>
          </HStack>
        </View>

        {/* Location Banner */}
        <Pressable onPress={locationStatus !== 'fetching' ? fetchLocation : undefined}>
          <HStack space="sm" className={`mx-4 mt-3 px-3 py-2 rounded-xl items-center ${locationStatus === 'success' ? 'bg-emerald-50 border border-emerald-200' :
              locationStatus === 'fetching' ? 'bg-blue-50 border border-blue-200' :
                'bg-red-50 border border-red-200'
            }`}>
            {locationStatus === 'fetching' ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <MapPinIcon size={14} color={locationStatus === 'success' ? '#10B981' : '#EF4444'} />
            )}
            <Text className={`text-xs flex-1 ${locationStatus === 'success' ? 'text-emerald-700' :
                locationStatus === 'fetching' ? 'text-blue-700' : 'text-red-700'
              }`} numberOfLines={1}>
              {locationStatus === 'fetching' ? 'Capturing location...' :
                locationStatus === 'success' ? (locationAddress || `${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}`) :
                  locationStatus === 'denied' ? 'Location denied — tap to retry' : 'Location failed — tap to retry'}
            </Text>
            {(locationStatus === 'error' || locationStatus === 'denied') && (
              <RefreshCwIcon size={12} color="#EF4444" />
            )}
          </HStack>
        </Pressable>

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
                  options={['Did not get permission to enter', 'Security/Front Desk denied entry', 'Other']}
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
            disabled={isSyncing || !typeOfWalkIn || !walkInStatus}
            onPress={handleSubmit}
          >
            {isSyncing ? (
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
    </ScrollView>
  );
}
