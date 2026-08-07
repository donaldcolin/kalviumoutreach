import { useState, useRef, useEffect } from 'react';
import { Toast } from '@/components/ui/ToastManager';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import firestore from '@react-native-firebase/firestore';
import * as Network from 'expo-network';
import { uploadRecording as uploadToCloudinary } from '../services/storage';
import { enqueueMeetingAudio } from '../services/audioUploadQueue';

export function useMeetingAudioRecorder(userId: string | undefined) {
  const [isUploading, setIsUploading] = useState(false);

  // Recorder with HIGH_QUALITY preset
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 1000);
  const lastDurationRef = useRef(0);

  // Track live duration while recording
  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis > 0) {
      lastDurationRef.current = recorderState.durationMillis;
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  const uploadRecording = async (uri: string, durationMillis: number) => {
    if (!userId) return;
    setIsUploading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected) {
        const url = await uploadToCloudinary(uri, `note_${Date.now()}`);

        await firestore().collection('meetingRecordings').add({
          executiveId: userId,
          timestamp: firestore.FieldValue.serverTimestamp(),
          storageUrl: url,
          duration: durationMillis,
        });
      } else {
        await enqueueMeetingAudio(uri, durationMillis, userId);
        Toast.show({ title: 'Saved Locally', message: 'Audio note will upload automatically when connected to the internet.', type: 'info' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      Toast.show({ title: 'Upload Failed', message: 'Could not save the note to the cloud.', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recorder.isRecording) {
      const capturedDuration = lastDurationRef.current;
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && capturedDuration > 0) {
        uploadRecording(uri, capturedDuration);
      }
      lastDurationRef.current = 0;
    } else {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.granted) {
        // Request notification permission (required for background recording on Android)
        const notifPerm = await requestNotificationPermissionsAsync();
        const canRecordInBackground = notifPerm.granted;

        // Configure audio mode — fall back to foreground-only if notification perm denied
        await setAudioModeAsync({
          allowsRecording: true,
          shouldPlayInBackground: canRecordInBackground,
          allowsBackgroundRecording: canRecordInBackground,
          interruptionMode: 'doNotMix',
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        recorder.record();
      } else {
        Toast.show({ title: 'Permission needed', message: 'Microphone permission is required to save notes.', type: 'error' });
      }
    }
  };

  return { recorderState, toggleRecording, isUploading };
}
