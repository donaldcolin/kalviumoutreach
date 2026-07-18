import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { uploadRecording as uploadToCloudinary } from '../services/storage';

export function useWalkInAudioRecorder() {
  const [isUploading, setIsUploading] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const lastDurationRef = useRef(0);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis > 0) {
      lastDurationRef.current = recorderState.durationMillis;
    }
  }, [recorderState.durationMillis, recorderState.isRecording]);

  const uploadRecording = async (uri: string) => {
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(uri, `walkin_note_${Date.now()}`);
      setRecordingUrl(url);
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Failed', 'Could not save the audio note.');
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
        uploadRecording(uri);
      }
      lastDurationRef.current = 0;
    } else {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.granted) {
        const notifPerm = await requestNotificationPermissionsAsync();
        const canRecordInBackground = notifPerm.granted;

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
        Alert.alert('Permission needed', 'Microphone permission is required to save notes.');
      }
    }
  };

  return { recorderState, toggleRecording, isUploading, recordingUrl };
}
