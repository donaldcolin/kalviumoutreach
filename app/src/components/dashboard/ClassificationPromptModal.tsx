import React from 'react';
import { View, Modal, TextInput } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';

import { StopClassification } from '../../types';

export interface ClassificationPromptModalProps {
  pendingPrompt: any;
  customNote: string;
  setCustomNote: (note: string) => void;
  submitClassification: (type: StopClassification, notes?: string) => void;
}

export function ClassificationPromptModal({
  pendingPrompt,
  customNote,
  setCustomNote,
  submitClassification
}: ClassificationPromptModalProps) {
  return (
    <Modal visible={!!pendingPrompt} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View className="bg-white p-6 rounded-t-3xl border-t border-slate-100 pb-10">
          <Text className="text-2xl font-bold mb-2 text-foreground tracking-tight">Unclassified Stop</Text>
          <Text className="text-muted-foreground mb-6 text-base">
            You've been stopped for a while. What is the reason for this stop?
          </Text>

          <VStack space="md">
            <Button variant="outline" size="lg" onPress={() => submitClassification('break')} className="rounded-xl border-border bg-card">
              <ButtonText className="text-foreground font-semibold">Break / Lunch</ButtonText>
            </Button>
            <Button variant="outline" size="lg" onPress={() => submitClassification('school')} className="rounded-xl border-border bg-card">
              <ButtonText className="text-foreground font-semibold">Unlisted School Visit</ButtonText>
            </Button>

            <Box className="mt-4">
              <Text className="font-semibold mb-3 text-foreground">Other Reason:</Text>
              <TextInput
                className="border border-border bg-background text-foreground rounded-xl p-4 mb-4 text-base"
                placeholder="E.g., Traffic, flat tire..."
                placeholderTextColor="#A1A1AA"
                value={customNote}
                onChangeText={setCustomNote}
              />
              <Button
                size="lg"
                className="rounded-xl bg-primary"
                disabled={!customNote.trim()}
                onPress={() => {
                  submitClassification('unclassified', customNote.trim());
                  setCustomNote('');
                }}
              >
                <ButtonText className="text-primary-foreground font-semibold">Submit Note</ButtonText>
              </Button>
            </Box>
          </VStack>
        </View>
      </View>
    </Modal>
  );
}
