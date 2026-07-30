import { useState, useRef, useEffect } from 'react';
import { Toast } from '@/components/ui/ToastManager';
import { Alert } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Network from 'expo-network';
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
      const net = await Network.getNetworkStateAsync();
      if (net.type === Network.NetworkStateType.WIFI) {
        const url = await uploadToCloudinary(uri, `walkin_note_${Date.now()}`);
        setRecordingUrl(url);
      } else {
        setRecordingUrl(uri);
        Toast.show({ title: 'Saved Locally', message: 'Audio will upload automatically when connected to Wi-Fi.', type: 'info' });
      }
    } catch (err) {
      console.error('Upload failed:', err);
      Toast.show({ title: 'Upload Failed', message: 'Could not save the audio note.', type: 'error' });
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
        Toast.show({ title: 'Permission needed', message: 'Microphone permission is required to save notes.', type: 'error' });
      }
    }
  };

  return { recorderState, toggleRecording, isUploading, recordingUrl };
}
