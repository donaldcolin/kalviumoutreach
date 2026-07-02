import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAppointment } from '../../services/firestore';
import { useAuthStore } from '../../stores/authStore';
import { enqueueSync } from '../../services/sync';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList, AppointmentMode } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<VisitStackParamList, 'Appointment'>;

const MODE_OPTIONS: AppointmentMode[] = ['offline', 'online', 'hybrid'];
const TIME_SLOTS = ['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM'];

export default function AppointmentScreen({ navigation, route }: Props) {
  const { visitId, schoolId } = route.params;
  const { user } = useAuthStore();

  const [proposedDate, setProposedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [grade, setGrade] = useState('');
  const [stream, setStream] = useState('');
  const [mode, setMode] = useState<AppointmentMode>('offline');
  const [projector, setProjector] = useState(false);
  const [lab, setLab] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!proposedDate || !timeSlot) {
      Alert.alert('Required', 'Date and time slot are required');
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      const appointmentId = await createAppointment({
        visitId,
        executiveId: user.id,
        schoolId,
        proposedDate,
        timeSlot,
        expectedStudentCount: parseInt(studentCount) || 0,
        grade,
        stream,
        mode,
        infrastructure: { projector, lab },
        additionalRequirements: requirements,
        principalConfirmationStatus: 'Pending',
        status: 'Requested',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      enqueueSync({ type: 'crmAppointment', referenceId: appointmentId });
      Alert.alert('Success', 'Appointment booked successfully', [
        { text: 'OK', onPress: () => navigation.navigate('VisitDetail', { visitId }) },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to book appointment');
    }
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Heading size="2xl" className="text-foreground font-bold mb-6 mt-2">Book Seminar Appointment</Heading>

        <VStack space="2xl">
          {/* Schedule */}
          <Box>
            <Heading size="md" className="text-foreground mb-3">Schedule</Heading>
            <VStack space="md">
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Proposed Date (YYYY-MM-DD)" value={proposedDate} onChangeText={setProposedDate} />
              </Input>

              <VStack space="sm">
                <Text className="text-foreground text-sm font-semibold mb-1">Time Slot *</Text>
                {TIME_SLOTS.map((slot) => {
                  const isActive = timeSlot === slot;
                  return (
                    <Button
                      key={slot}
                      size="lg"
                      variant={isActive ? 'default' : 'outline'}
                      className={`rounded-xl justify-start ${isActive ? 'bg-primary border-primary' : 'border-border/50 bg-card'}`}
                      onPress={() => setTimeSlot(slot)}
                    >
                      <ButtonText className={isActive ? 'text-primary-foreground font-semibold' : 'text-foreground'}>
                        {slot}
                      </ButtonText>
                    </Button>
                  );
                })}
              </VStack>
            </VStack>
          </Box>

          {/* Student Details */}
          <Box>
            <Heading size="md" className="text-foreground mb-3">Student Details</Heading>
            <VStack space="md">
              <Input className="bg-card rounded-xl border-border/50">
                <InputField placeholder="Expected Student Count" value={studentCount} onChangeText={setStudentCount} keyboardType="numeric" />
              </Input>

              <HStack space="md">
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="Grade (e.g. 12th)" value={grade} onChangeText={setGrade} />
                </Input>
                <Input className="flex-1 bg-card rounded-xl border-border/50">
                  <InputField placeholder="Stream (e.g. Science)" value={stream} onChangeText={setStream} />
                </Input>
              </HStack>
            </VStack>
          </Box>

          {/* Mode */}
          <Box>
            <Heading size="md" className="text-foreground mb-3">Mode</Heading>
            <HStack space="md">
              {MODE_OPTIONS.map((m) => {
                const isActive = mode === m;
                return (
                  <Button
                    key={m}
                    size="lg"
                    variant={isActive ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl ${isActive ? 'bg-primary border-primary' : 'border-border/50 bg-card'}`}
                    onPress={() => setMode(m)}
                  >
                    <ButtonText className={isActive ? 'text-primary-foreground font-semibold' : 'text-foreground capitalize'}>
                      {m}
                    </ButtonText>
                  </Button>
                );
              })}
            </HStack>
          </Box>

          {/* Infrastructure */}
          <Card className="bg-card border-border/50 rounded-xl p-4">
            <Heading size="sm" className="text-foreground mb-4 uppercase tracking-wider">Infrastructure</Heading>
            <VStack space="lg">
              <HStack className="justify-between items-center">
                <Text className="text-foreground font-medium text-base">Projector Available</Text>
                <Switch value={projector} onValueChange={setProjector} size="md" />
              </HStack>
              <HStack className="justify-between items-center">
                <Text className="text-foreground font-medium text-base">Computer Lab Available</Text>
                <Switch value={lab} onValueChange={setLab} size="md" />
              </HStack>
            </VStack>
          </Card>

          {/* Additional Requirements */}
          <Box>
            <Heading size="md" className="text-foreground mb-3">Additional Requirements</Heading>
            <Input className="bg-card rounded-xl border-border/50 min-h-[100px]">
              <InputField
                placeholder="Any special requirements..."
                value={requirements}
                onChangeText={setRequirements}
                multiline
                textAlignVertical="top"
              />
            </Input>
          </Box>

          <Button
            size="lg"
            className="rounded-2xl bg-[#22C55E] mt-4 shadow-sm"
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? <ButtonSpinner /> : <ButtonText className="font-bold text-lg">Book Appointment</ButtonText>}
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
