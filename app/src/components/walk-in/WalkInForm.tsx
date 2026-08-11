import React, { useState } from 'react';
import { View, TextInput, ActivityIndicator, Platform, Pressable } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDownIcon, CalendarIcon, ClockIcon, MapPinIcon, Mic, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { WalkInFormState } from '../../utils/lsqMappers';
import { format, parseSafeDate } from '@/src/utils/safeFormat';

export const CustomSelect = ({ label, options, value, onChange, placeholder = "Select option" }: { label: string, options: string[], value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ zIndex: isOpen ? 50 : 1 }}>
      <VStack space="xs" className="relative">
        <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</Text>
        <Pressable 
          className="bg-white border border-gray-200 rounded-lg h-12 flex-row items-center px-4 justify-between"
          onPress={() => setIsOpen(!isOpen)}
        >
          <Text className={value ? "text-sm text-gray-900" : "text-sm text-gray-400"}>
            {value || placeholder}
          </Text>
          <ChevronDownIcon size={16} color="#9CA3AF" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
        
        {isOpen && (
          <View 
            className="absolute top-[68px] left-0 right-0 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
            style={{ zIndex: 9999, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 }}
          >
            {options.map((opt, idx) => (
              <Pressable
                key={opt}
                className={`p-3.5 ${idx < options.length - 1 ? 'border-b border-slate-200' : ''} ${value === opt ? 'bg-slate-200' : 'bg-transparent'}`}
                onPress={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                <Text className={`text-sm ${value === opt ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </VStack>
    </View>
  );
};

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  placeholder?: string;
  multiline?: boolean;
}

export const FormInput = ({ label, value, onChangeText, keyboardType = 'default', placeholder = '', multiline = false }: FormInputProps) => (
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

export const CustomDateTimePicker = ({ label, date, setDate }: { label: string, date: Date | null, setDate: (d: Date) => void }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = date || new Date();
      currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(parseSafeDate(currentDate));
    }
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = date || new Date();
      currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setDate(parseSafeDate(currentDate));
    }
  };

  return (
    <VStack space="xs">
      <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</Text>
      <View className="flex-row gap-3">
        <Pressable 
          className="flex-1 border border-slate-200 bg-white rounded-md h-11 flex-row items-center px-3 shadow-sm"
          onPress={() => setShowDatePicker(true)}
        >
          <CalendarIcon size={16} color="#64748B" />
          <Text className={`text-sm ml-2 font-medium ${date ? "text-slate-900" : "text-slate-400"}`}>
            {date ? format(date, 'MM/dd/yyyy') : 'Pick a date'}
          </Text>
        </Pressable>
        
        <Pressable 
          className="flex-1 border border-slate-200 bg-white rounded-md h-11 flex-row items-center px-3 shadow-sm"
          onPress={() => setShowTimePicker(true)}
        >
          <ClockIcon size={16} color="#64748B" />
          <Text className={`text-sm ml-2 font-medium ${date ? "text-slate-900" : "text-slate-400"}`}>
            {date ? format(date, 'hh:mm a') : 'Pick time'}
          </Text>
        </Pressable>
      </View>

      {showDatePicker && (
        <DateTimePicker 
          value={date || new Date()} 
          mode="date" 
          display="default" 
          onChange={handleDateChange}
          accentColor="black"
          positiveButton={{ label: 'OK', textColor: 'black' }}
          negativeButton={{ label: 'Cancel', textColor: 'black' }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker 
          value={date || new Date()} 
          mode="time" 
          display="default" 
          onChange={handleTimeChange}
          accentColor="black"
          positiveButton={{ label: 'OK', textColor: 'black' }}
          negativeButton={{ label: 'Cancel', textColor: 'black' }}
        />
      )}
    </VStack>
  );
};

export const STATUS_CONFIG: Record<string, { bg: string; border: string; titleColor: string; icon: string }> = {
  'Refused Entry - RE': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-red-700', icon: '🚫' },
  'Front Desk Interaction - FDI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '🏢' },
  'PIC Interaction - PCI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '👤' },
  'Principal Interaction - PI': { bg: 'bg-white', border: 'border-gray-200', titleColor: 'text-gray-900', icon: '👨‍💼' },
};

interface WalkInFormProps {
  form: WalkInFormState;
  updateForm: (updates: Partial<WalkInFormState>) => void;
  locationStatus: 'fetching' | 'success' | 'error' | 'denied';
  locationAddress: string;
  startLocation: { lat: number; lng: number } | null;
  fetchLocation: () => void;
  isUploading: boolean;
  recordingUrl: string | null;
  isSyncing: boolean;
  isValidatingLocation: boolean;
  handleSubmit: (photoUri?: string) => void;
}

export function WalkInForm({
  form,
  updateForm,
  locationStatus,
  locationAddress,
  startLocation,
  fetchLocation,
  isUploading,
  recordingUrl,
  isSyncing,
  isValidatingLocation,
  handleSubmit,
}: WalkInFormProps) {
  const statusConfig = form.walkInStatus ? STATUS_CONFIG[form.walkInStatus] : null;

  return (
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
          options={['First Visit', 'Follow-Up Visit', 'Seminar Visit']} 
          value={form.typeOfWalkIn} 
          onChange={(v) => updateForm({ typeOfWalkIn: v })} 
        />

        <CustomDateTimePicker label="Walk-In Date & Time" date={form.walkInDateTime} setDate={(d) => updateForm({ walkInDateTime: d })} />

        <CustomSelect 
          label="Walk-In Status" 
          options={[
            'Refused Entry - RE', 
            'Front Desk Interaction - FDI', 
            'PIC Interaction - PCI', 
            'Principal Interaction - PI'
          ]} 
          value={form.walkInStatus} 
          onChange={(v) => updateForm({ walkInStatus: v })} 
          placeholder="Select walk-in status"
        />

        <CustomDateTimePicker label="Follow Up Date" date={form.followUpDate} setDate={(d) => updateForm({ followUpDate: d })} />

        <FormInput label="Notes" value={form.notes} onChangeText={(v: string) => updateForm({ notes: v })} multiline placeholder="Optional notes..." />
      </VStack>

      {/* Dynamic Sub-Section */}
      {form.walkInStatus !== '' && (
        <View className={`mx-4 mt-4 p-4 rounded-2xl ${statusConfig?.bg} border ${statusConfig?.border}`}>
          <Text className={`font-bold text-base mb-3 ${statusConfig?.titleColor}`}>
            {statusConfig?.icon} {form.walkInStatus.split(' - ')[0]}
          </Text>

          <VStack space="md">
            {/* RE Section */}
            {form.walkInStatus === 'Refused Entry - RE' && (
              <CustomSelect 
                label="Reason for Refusal" 
                options={['School Not Interested', 'Need prior appointment', 'Only till 10th STD']} 
                value={form.reasonForRefusal} onChange={(v) => updateForm({ reasonForRefusal: v })} 
              />
            )}

            {/* FDI Section */}
            {form.walkInStatus === 'Front Desk Interaction - FDI' && (
              <>
                <CustomSelect 
                  label="Status Front Desk Interaction" 
                  options={['Asking to sent proposal', 'Need prior appointment', 'Fixed meeting with PIC', 'Not Interested']} 
                  value={form.statusFDI} onChange={(v) => updateForm({ statusFDI: v })} 
                />

                <HStack space="sm">
                  <View className="flex-1">
                    <FormInput label="12th Strength" value={form.strength12th} onChangeText={(v: string) => updateForm({ strength12th: v })} keyboardType="numeric" />
                  </View>
                  <View className="flex-1">
                    <FormInput label="School Fees" value={form.schoolFees} onChangeText={(v: string) => updateForm({ schoolFees: v })} keyboardType="numeric" />
                  </View>
                </HStack>

                <CustomSelect label="Board of School" options={['STATE', 'CBSE', 'ICSE', 'IB', 'Others']} value={form.boardOfSchool} onChange={(v) => updateForm({ boardOfSchool: v })} />

                {form.statusFDI === 'Asking to sent proposal' && (
                  <CustomSelect label="Proposal sent to Front Desk" options={['Yes', 'No']} value={form.proposalSentToFD} onChange={(v) => updateForm({ proposalSentToFD: v })} />
                )}

                {form.statusFDI === 'Fixed meeting with PIC' && (
                  <>
                    <HStack space="sm">
                      <View className="flex-1">
                        <FormInput label="PIC Name" value={form.picName} onChangeText={(v: string) => updateForm({ picName: v })} />
                      </View>
                      <View className="flex-1">
                        <FormInput label="PIC Designation" value={form.picDesignation} onChangeText={(v: string) => updateForm({ picDesignation: v })} />
                      </View>
                    </HStack>
                    <HStack space="sm">
                      <View className="flex-1">
                        <FormInput label="PIC Phone" value={form.picPhone} onChangeText={(v: string) => updateForm({ picPhone: v })} keyboardType="phone-pad" />
                      </View>
                      <View className="flex-1">
                        <FormInput label="PIC Email" value={form.picEmail} onChangeText={(v: string) => updateForm({ picEmail: v })} keyboardType="email-address" />
                      </View>
                    </HStack>
                    <CustomDateTimePicker label="PIC Appointment Date & Time" date={form.picAppointmentDateTime} setDate={(d) => updateForm({ picAppointmentDateTime: d })} />
                  </>
                )}
              </>
            )}

            {/* PCI Section */}
            {form.walkInStatus === 'PIC Interaction - PCI' && (
              <>
                <CustomSelect 
                  label="Status PIC Interaction" 
                  options={['Asking to sent proposal', 'Appointment fixed with Principal', 'Appointment fixed for Seminar', 'Not Interested']} 
                  value={form.statusPCI} onChange={(v) => updateForm({ statusPCI: v })} 
                />
                {form.statusPCI === 'Asking to sent proposal' && (
                  <CustomSelect label="Proposal sent to PIC" options={['Yes', 'No']} value={form.proposalSentToPIC} onChange={(v) => updateForm({ proposalSentToPIC: v })} />
                )}
                {form.statusPCI === 'Appointment fixed with Principal' && (
                  <CustomDateTimePicker label="Principal Appointment" date={form.princiAppointmentDateTime} setDate={(d) => updateForm({ princiAppointmentDateTime: d })} />
                )}
                {form.statusPCI === 'Appointment fixed for Seminar' && (
                  <CustomDateTimePicker label="Seminar Appointment" date={form.seminarAppointmentDateTime} setDate={(d) => updateForm({ seminarAppointmentDateTime: d })} />
                )}
              </>
            )}

            {/* PI Section */}
            {form.walkInStatus === 'Principal Interaction - PI' && (
              <>
                <CustomSelect 
                  label="Status Principal Interaction" 
                  options={['Asking to sent proposal', 'Appointment fixed for Seminar', 'Not Interested']} 
                  value={form.statusPI} onChange={(v) => updateForm({ statusPI: v })} 
                />
                <HStack space="sm">
                  <View className="flex-1">
                    <FormInput label="Principal Name" value={form.principalName} onChangeText={(v: string) => updateForm({ principalName: v })} />
                  </View>
                  <View className="flex-1">
                    <FormInput label="Principal Phone" value={form.principalPhone} onChangeText={(v: string) => updateForm({ principalPhone: v })} keyboardType="phone-pad" />
                  </View>
                </HStack>
                <FormInput label="Principal Email" value={form.principalEmail} onChangeText={(v: string) => updateForm({ principalEmail: v })} keyboardType="email-address" />
                {form.statusPI === 'Asking to sent proposal' && (
                  <CustomSelect label="Proposal sent to Principal" options={['Yes', 'No']} value={form.proposalSentToPrincipal} onChange={(v) => updateForm({ proposalSentToPrincipal: v })} />
                )}
                {form.statusPI === 'Appointment fixed for Seminar' && (
                  <CustomDateTimePicker label="Seminar Appointment" date={form.seminarAppointmentDateTime} setDate={(d) => updateForm({ seminarAppointmentDateTime: d })} />
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
          disabled={isSyncing || isValidatingLocation || !form.typeOfWalkIn || !form.walkInStatus || isUploading}
          onPress={async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              alert('Sorry, we need camera permissions to submit this activity!');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: false, // Don't allow editing to keep original aspect ratio for GPS watermark
              quality: 0.5,
            });
            if (!result.canceled) {
              const uri = result.assets[0].uri;
              updateForm({ photoUri: uri });
              handleSubmit(uri);
            }
          }}
        >
          {isSyncing || isValidatingLocation ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <ButtonText className="text-white font-bold text-base">Push to LeadSquared</ButtonText>
          )}
        </Button>
        {(!form.typeOfWalkIn || !form.walkInStatus) && (
          <Text className="text-xs text-slate-400 text-center mt-2">Select Type of Walk-In and Walk-In Status to submit</Text>
        )}
      </View>
    </VStack>
  );
}
