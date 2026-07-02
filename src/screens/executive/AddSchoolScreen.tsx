import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addSchool } from '../../services/firestore';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button'


type Props = NativeStackScreenProps<VisitStackParamList, 'AddSchool'>;

export default function AddSchoolScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    name: '', type: 'School', address: '', district: '', city: '', state: '',
    principalName: '', principalPhone: '', alternateContact: '',
    grade12Count: '', totalStrength: '', streamsOffered: '',
    lat: 0, lng: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const autoFillGPS = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm((prev) => ({
        ...prev,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      }));
    } catch (err) {
      Alert.alert('GPS Error', err instanceof Error ? err.message : 'Could not get location');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'School name is required');
      return;
    }
    setIsSaving(true);
    try {
      const schoolId = await addSchool({
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        district: form.district.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        lat: form.lat,
        lng: form.lng,
        principalName: form.principalName.trim(),
        principalPhone: form.principalPhone.trim(),
        alternateContact: form.alternateContact.trim(),
        grade12Count: parseInt(form.grade12Count) || 0,
        totalStrength: parseInt(form.totalStrength) || 0,
        streamsOffered: form.streamsOffered.split(',').map((s) => s.trim()).filter(Boolean),
      });
      navigation.replace('CheckIn', { schoolId, schoolName: form.name.trim() });
    } catch (err) {
      Alert.alert('Error', 'Failed to save school');
    }
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <VStack space="2xl">
          <Box>
            <Heading size="lg" className="text-foreground font-semibold mb-3">School Details</Heading>
            <VStack space="md">
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="School Name *" value={form.name} onChangeText={(v) => updateField('name', v)} />
              </Input>
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="School Type (e.g. CBSE, ICSE)" value={form.type} onChangeText={(v) => updateField('type', v)} />
              </Input>
              <Input className="bg-card rounded-xl border-border/50 min-h-[80px]">
                <InputField placeholder="Address" value={form.address} onChangeText={(v) => updateField('address', v)} multiline textAlignVertical="top" />
              </Input>
              <HStack space="md">
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="District" value={form.district} onChangeText={(v) => updateField('district', v)} />
                </Input>
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="City" value={form.city} onChangeText={(v) => updateField('city', v)} />
                </Input>
              </HStack>
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="State" value={form.state} onChangeText={(v) => updateField('state', v)} />
              </Input>

              <Button variant="outline" size="lg" className="rounded-xl border-border mt-2" onPress={autoFillGPS}>
               
                <ButtonText className="text-primary font-semibold">Auto-fill GPS Location</ButtonText>
              </Button>
              {form.lat !== 0 && (
                <Text className="text-muted-foreground text-xs text-center mt-1">
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </Text>
              )}
            </VStack>
          </Box>

          <Box>
            <Heading size="lg" className="text-foreground font-semibold mb-3">Principal Details</Heading>
            <VStack space="md">
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Principal Name" value={form.principalName} onChangeText={(v) => updateField('principalName', v)} />
              </Input>
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Principal Phone" value={form.principalPhone} onChangeText={(v) => updateField('principalPhone', v)} keyboardType="phone-pad" />
              </Input>
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Alternate Contact" value={form.alternateContact} onChangeText={(v) => updateField('alternateContact', v)} keyboardType="phone-pad" />
              </Input>
            </VStack>
          </Box>

          <Box>
            <Heading size="lg" className="text-foreground font-semibold mb-3">Student Details</Heading>
            <VStack space="md">
              <HStack space="md">
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="Grade 12 Count" value={form.grade12Count} onChangeText={(v) => updateField('grade12Count', v)} keyboardType="numeric" />
                </Input>
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="Total Strength" value={form.totalStrength} onChangeText={(v) => updateField('totalStrength', v)} keyboardType="numeric" />
                </Input>
              </HStack>
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Streams (e.g. Science, Commerce)" value={form.streamsOffered} onChangeText={(v) => updateField('streamsOffered', v)} />
              </Input>
            </VStack>
          </Box>

          <Button
            size="lg"
            variant="default"
            className="rounded-2xl mt-4 shadow-sm"
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <ButtonSpinner /> : <ButtonText className="font-bold text-lg">Save & Check In</ButtonText>}
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
