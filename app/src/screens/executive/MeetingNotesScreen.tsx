import React, { useMemo } from 'react';
import { View, TouchableOpacity, SectionList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Mic, Square } from 'lucide-react-native';

import { useAuthStore } from '../../stores/authStore';
import { useCrmActivities } from '../../hooks/useCrmActivities';
import { useMeetingRecordings } from '../../hooks/useMeetingRecordings';
import { usePushToLs } from '../../hooks/usePushToLs';
import { useMeetingAudioRecorder } from '../../hooks/useMeetingAudioRecorder';

import { RecordingItem } from '../../components/meeting-notes/RecordingItem';
import { PushToLsModal } from '../../components/meeting-notes/PushToLsModal';

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function MeetingNotesScreen() {
  const { user } = useAuthStore();

  const { groupedRecordings } = useMeetingRecordings(user?.id);
  const { mappingItem, setMappingItem, isPushing, handlePushToLS } = usePushToLs(user?.id);
  const { recorderState, toggleRecording, isUploading } = useMeetingAudioRecorder(user?.id);

  // CRM activities for Push to LS
  const allActivities = useCrmActivities(user?.email);
  const picPrincipalActivities = useMemo(() => {
    return [...allActivities]
      .filter((a) => {
        const status = (a.walkInStatus || '').toLowerCase();
        // Only PIC and Principal interactions — not "Refused Entry" or "Front Desk"
        return status.includes('pic') || status.includes('principal');
      })
      .sort((a, b) => (b.lsqCreatedOn || '').localeCompare(a.lsqCreatedOn || ''))
      .slice(0, 15);
  }, [allActivities]);

  // ─── Format recording timer ───────────────────────────────────────────────

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <VStack className="flex-1 bg-background pt-2 pb-0 px-4">
        {/* Header */}
        <HStack className="justify-between items-center mb-4 mt-2">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">Voice Notes</Text>
          {isUploading && <ActivityIndicator size="small" color="#6366F1" />}
        </HStack>

        {/* Recordings list */}
        <SectionList
          sections={groupedRecordings}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <RecordingItem item={item} index={index} onPushPress={setMappingItem} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 ml-1">
              {title}
            </Text>
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box className="flex-1 justify-center items-center mt-20">
              <Text className="text-4xl mb-3">🎙️</Text>
              <Text className="text-slate-500 mt-2 text-center px-8">
                No recordings yet. Tap the mic button below to record a voice note.
              </Text>
            </Box>
          }
        />

        {/* Recording button area */}
        <View style={styles.bottomBar}>
          {recorderState.isRecording && (
            <Animated.View entering={FadeInUp.springify()} style={styles.timerContainer}>
              <View style={styles.recordingDot} />
              <Text className="text-rose-600 font-bold text-base ml-2">
                {formatTime(recorderState.durationMillis)}
              </Text>
            </Animated.View>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleRecording}
            style={[styles.micButton, recorderState.isRecording && styles.micButtonRecording]}
          >
            {recorderState.isRecording ? (
              <Square color="#FFFFFF" size={20} strokeWidth={2} fill="#FFFFFF" />
            ) : (
              <Mic color="#FFFFFF" size={22} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </VStack>

      {/* Push to LS modal */}
      <PushToLsModal
        visible={!!mappingItem}
        onClose={() => setMappingItem(null)}
        activities={picPrincipalActivities}
        onPush={handlePushToLS}
        isPushing={isPushing}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  micButtonRecording: {
    backgroundColor: '#E11D48',
  },
});
