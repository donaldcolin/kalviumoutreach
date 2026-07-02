import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMeetingStore } from '../../stores/meetingStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<VisitStackParamList, 'MeetingOutcome'>;

const OUTCOME_OPTIONS = [
  'Positive - Interested',
  'Positive - Need Follow-up',
  'Neutral - Considering',
  'Negative - Not Interested',
  'Negative - Already Committed Elsewhere',
];

export default function MeetingOutcomeScreen({ navigation, route }: Props) {
  const { meetingId, visitId } = route.params;
  const { saveMeetingOutcome } = useMeetingStore();

  const [outcome, setOutcome] = useState('');
  const [seminarInterest, setSeminarInterest] = useState(false);
  const [studentCount, setStudentCount] = useState('');
  const [feedback, setFeedback] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!outcome) {
      Alert.alert('Required', 'Please select a meeting outcome');
      return;
    }
    setIsSaving(true);
    try {
      await saveMeetingOutcome(meetingId, {
        outcome,
        seminarInterest,
        interestedStudentCount: parseInt(studentCount) || 0,
        principalFeedback: feedback,
        followUpDate,
        remarks,
      });
      navigation.navigate('VisitDetail', { visitId });
    } catch {
      Alert.alert('Error', 'Failed to save outcome');
    }
    setIsSaving(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <VStack space="md" className="mb-6 mt-2">
          <Heading size="2xl" className="text-foreground font-bold">Meeting Outcome</Heading>
          <Text className="text-muted-foreground">Complete this form before proceeding</Text>
        </VStack>

        <VStack space="2xl">
          {/* Outcome Selector */}
          <Box>
            <Text className="text-foreground font-semibold mb-3">Outcome *</Text>
            <VStack space="sm">
              {OUTCOME_OPTIONS.map((opt) => {
                const isActive = outcome === opt;
                return (
                  <Button
                    key={opt}
                    size="lg"
                    variant={isActive ? 'default' : 'outline'}
                    className={`rounded-xl justify-start ${isActive ? 'bg-primary border-primary' : 'border-border/50 bg-card'}`}
                    onPress={() => setOutcome(opt)}
                  >
                    <ButtonText className={isActive ? 'text-primary-foreground font-semibold' : 'text-foreground'}>
                      {opt}
                    </ButtonText>
                  </Button>
                );
              })}
            </VStack>
          </Box>

          <Card className="bg-card border-border/50 rounded-xl p-4">
            <VStack space="md">
              {/* Seminar Interest */}
              <HStack className="justify-between items-center">
                <Text className="text-foreground font-semibold text-base">Seminar Interest</Text>
                <Switch
                  value={seminarInterest}
                  onValueChange={setSeminarInterest}
                  size="md"
                />
              </HStack>

              {seminarInterest && (
                <Input className="bg-background rounded-xl border-border/50 mt-2">
                  <InputField
                    placeholder="Expected interested student count"
                    value={studentCount}
                    onChangeText={setStudentCount}
                    keyboardType="numeric"
                  />
                </Input>
              )}
            </VStack>
          </Card>

          <Box>
            <Text className="text-foreground font-semibold mb-2">Principal Feedback</Text>
            <Input className="bg-card rounded-xl border-border/50 min-h-[100px]">
              <InputField
                placeholder="What did the principal say?"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                textAlignVertical="top"
              />
            </Input>
          </Box>

          <Box>
            <Text className="text-foreground font-semibold mb-2">Follow-up Date</Text>
            <Input className="bg-card rounded-xl border-border h-24">
              <InputField
                placeholder="YYYY-MM-DD"
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </Input>
          </Box>

          <Box>
            <Text className="text-foreground font-semibold mb-2">Additional Remarks</Text>
            <Input className="bg-card rounded-xl border-border/50 min-h-[100px]">
              <InputField
                placeholder="Any other notes..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                textAlignVertical="top"
              />
            </Input>
          </Box>

          <Button
            size="lg"
            variant="default"
            className="rounded-2xl shadow-sm mt-4"
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? <ButtonSpinner /> : <ButtonText className="font-bold text-lg">Save Outcome</ButtonText>}
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
