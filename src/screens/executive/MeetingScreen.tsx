import React, { useEffect, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useMeetingStore } from '../../stores/meetingStore';
import RecordingTimer from '../../components/RecordingTimer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = NativeStackScreenProps<VisitStackParamList, 'Meeting'>;

export default function MeetingScreen({ navigation, route }: Props) {
  const { visitId } = route.params;
  const { user } = useAuthStore();
  const {
    currentMeeting, isRecording, recordingStartTime, sessionId,
    startMeeting, stopMeeting, error, clearError,
  } = useMeetingStore();
  const [isStopping, setIsStopping] = useState(false);

  // Start recording on mount
  useEffect(() => {
    if (!isRecording && user) {
      startMeeting(visitId, user.id).catch(() => {});
    }
  }, []);

  // Prevent accidental back during recording
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isRecording) {
        Alert.alert('Recording in Progress', 'Please stop the recording before going back.');
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isRecording]);

  const handleStop = async () => {
    Alert.alert('Stop Recording', 'Are you sure you want to stop the recording?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          setIsStopping(true);
          try {
            await stopMeeting();
            if (currentMeeting?.id) {
              navigation.replace('MeetingOutcome', {
                meetingId: currentMeeting.id,
                visitId,
              });
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to stop recording');
          }
          setIsStopping(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <VStack className="flex-1 justify-center items-center p-6" space="2xl">
        <Card className="w-full bg-card border-border/50 rounded-3xl p-8 items-center border">
          <VStack className="items-center" space="md">
            {/* Status Dot & Text */}
            <HStack space="sm" className="items-center">
              <Box className={`w-3 h-3 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
              <Text className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">
                {isRecording ? 'Recording Live' : (isStopping ? 'Processing...' : 'Ready')}
              </Text>
            </HStack>
            
            {/* Timer */}
            <Box className="mt-4 mb-2">
              <RecordingTimer isRecording={isRecording} startTime={recordingStartTime} />
            </Box>
            
            {/* Session ID */}
            <Text className="text-muted-foreground text-sm font-mono mt-2">
              Session ID: {sessionId?.slice(0, 8) ?? '...'}
            </Text>
          </VStack>
        </Card>

        {error && (
          <Box className="w-full bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex-row justify-between items-center">
            <Text className="text-destructive text-sm flex-1">{error}</Text>
            <Button size="sm" variant="link" onPress={clearError} className="p-0 h-auto ml-2">
              <ButtonText className="text-destructive font-semibold">Dismiss</ButtonText>
            </Button>
          </Box>
        )}

        {/* Action Button */}
        <Box className="w-full mt-8">
          {isRecording && (
            <Button
              size="lg"
              className={`w-full rounded-full bg-destructive h-16 shadow-lg shadow-destructive/30 ${isStopping ? 'opacity-60' : ''}`}
              onPress={handleStop}
              disabled={isStopping}
            >
              <Box className="w-4 h-4 bg-white rounded-sm mr-2" />
              <ButtonText className="font-bold text-xl text-white">
                {isStopping ? 'Processing...' : 'Stop Recording'}
              </ButtonText>
            </Button>
          )}
        </Box>
      </VStack>
    </SafeAreaView>
  );
}
