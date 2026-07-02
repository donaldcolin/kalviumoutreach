/**
 * Meeting store — manages recording state and meeting lifecycle.
 */
import { create } from 'zustand';
import type { Meeting } from '../types';
import { createMeeting, updateMeeting } from '../services/firestore';
import {
  startRecording as startAudioRecording,
  stopRecording as stopAudioRecording,
  getRecordingElapsed,
  isRecordingActive,
} from '../services/recording';
import { enqueueSync } from '../services/sync';
import * as Crypto from 'expo-crypto';

interface MeetingState {
  currentMeeting: Partial<Meeting> | null;
  isRecording: boolean;
  recordingStartTime: number;
  sessionId: string | null;
  error: string | null;

  // Actions
  startMeeting: (visitId: string, executiveId: string) => Promise<void>;
  stopMeeting: () => Promise<{ localUri: string }>;
  saveMeetingOutcome: (
    meetingId: string,
    outcome: {
      outcome: string;
      seminarInterest: boolean;
      interestedStudentCount: number;
      principalFeedback: string;
      followUpDate: string;
      remarks: string;
    },
  ) => Promise<void>;
  getElapsedTime: () => number;
  clearError: () => void;
  reset: () => void;
}

let isStartingMeeting = false;

export const useMeetingStore = create<MeetingState>((set, get) => ({
  currentMeeting: null,
  isRecording: false,
  recordingStartTime: 0,
  sessionId: null,
  error: null,

  startMeeting: async (visitId, executiveId) => {
    if (get().isRecording || isStartingMeeting) return;
    isStartingMeeting = true;

    try {
      const sessionId = Crypto.randomUUID();
      const startTimestamp = Date.now();

      // Start audio recording
      await startAudioRecording();

      // Create meeting document
      const meetingData: Omit<Meeting, 'id'> = {
        visitId,
        executiveId,
        sessionId,
        startTimestamp,
        endTimestamp: 0,
        recordingUrl: '',
        recordingLocalUri: '',
        recordingHash: '',
        outcome: '',
        seminarInterest: false,
        interestedStudentCount: 0,
        principalFeedback: '',
        followUpDate: '',
        remarks: '',
        syncedToCrm: false,
        createdAt: startTimestamp,
        updatedAt: startTimestamp,
      };

      const meetingId = await createMeeting(meetingData);

      set({
        currentMeeting: { ...meetingData, id: meetingId },
        isRecording: true,
        recordingStartTime: startTimestamp,
        sessionId,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to start meeting',
      });
      throw err;
    } finally {
      isStartingMeeting = false;
    }
  },

  stopMeeting: async () => {
    const { currentMeeting } = get();
    if (!currentMeeting?.id) {
      throw new Error('No active meeting');
    }

    try {
      // Stop audio recording
      const { localUri, durationMs } = await stopAudioRecording();
      const endTimestamp = Date.now();

      // Update meeting document
      await updateMeeting(currentMeeting.id, {
        endTimestamp,
        recordingLocalUri: localUri,
      });

      // Queue recording upload
      enqueueSync({
        type: 'recording',
        referenceId: currentMeeting.id,
        localUri,
      });

      set({
        isRecording: false,
        currentMeeting: {
          ...currentMeeting,
          endTimestamp,
          recordingLocalUri: localUri,
        },
      });

      return { localUri };
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to stop meeting',
      });
      throw err;
    }
  },

  saveMeetingOutcome: async (meetingId, outcomeData) => {
    try {
      await updateMeeting(meetingId, outcomeData);

      // Queue CRM sync
      enqueueSync({ type: 'crmMeeting', referenceId: meetingId });

      const { currentMeeting } = get();
      if (currentMeeting?.id === meetingId) {
        set({
          currentMeeting: { ...currentMeeting, ...outcomeData },
        });
      }
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to save meeting outcome',
      });
      throw err;
    }
  },

  getElapsedTime: () => {
    if (isRecordingActive()) {
      return getRecordingElapsed();
    }
    return 0;
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      currentMeeting: null,
      isRecording: false,
      recordingStartTime: 0,
      sessionId: null,
      error: null,
    }),
}));
