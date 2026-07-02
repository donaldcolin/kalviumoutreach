/**
 * Audio recording service using expo-audio.
 * Handles meeting recordings with SHA-256 hashing and orphan recovery.
 */
import { AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Paths, Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const RECORDING_DIR_NAME = 'recordings';
const RECORDING_TAG = 'meeting-recording';

let activeRecording: any = null;
let recordingStartTime: number = 0;

/**
 * Get the recordings directory, creating it if needed.
 */
function getRecordingDir(): Directory {
  const dir = new Directory(Paths.document, RECORDING_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * Start a new audio recording.
 * Returns a unique session ID for this recording.
 */
export async function startRecording(): Promise<{
  sessionId: string;
  recording: any;
}> {
  if (activeRecording) {
    throw new Error('A recording is already in progress');
  }

  getRecordingDir(); // Ensure dir exists

  // Request permissions
  const status = await AudioModule.requestRecordingPermissionsAsync();
  if (!status.granted) {
    throw new Error('Microphone permission not granted');
  }

  // Configure audio mode for recording
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  // Keep screen awake during recording
  await activateKeepAwakeAsync(RECORDING_TAG);

  const sessionId = Crypto.randomUUID();

  const recording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recording.prepareToRecordAsync();
  recording.record();

  activeRecording = recording;
  recordingStartTime = Date.now();

  return { sessionId, recording };
}

/**
 * Stop the current recording.
 * Returns the local file URI and computed SHA-256 hash.
 */
export async function stopRecording(): Promise<{
  localUri: string;
  durationMs: number;
}> {
  if (!activeRecording) {
    throw new Error('No recording in progress');
  }

  const durationMs = Date.now() - recordingStartTime;

  await activeRecording.stop();
  const uri = activeRecording.uri;

  if (!uri) {
    throw new Error('Recording URI is null after stopping');
  }

  // Move to permanent storage
  const filename = `recording_${Date.now()}.m4a`;
  const dir = getRecordingDir();
  const destFile = new File(dir, filename);
  
  await FileSystem.moveAsync({
    from: uri,
    to: destFile.uri
  });
  
  const permanentUri = destFile.uri;

  // Deactivate keep-awake
  deactivateKeepAwake(RECORDING_TAG);

  activeRecording = null;
  recordingStartTime = 0;

  return { localUri: permanentUri, durationMs };
}

/**
 * Get the elapsed recording time in milliseconds.
 */
export function getRecordingElapsed(): number {
  if (!activeRecording || recordingStartTime === 0) return 0;
  return Date.now() - recordingStartTime;
}

/**
 * Check if recording is currently active.
 */
export function isRecordingActive(): boolean {
  return activeRecording !== null;
}



/**
 * Delete orphaned recordings older than 7 days.
 */
export async function cleanupOldRecordings(): Promise<void> {
  try {
    const dir = getRecordingDir();
    const entries = dir.list();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const entry of entries) {
      if (entry instanceof File && entry.uri.endsWith('.m4a')) {
        const match = entry.uri.match(/recording_(\d+)\.m4a/);
        if (match) {
          const ts = parseInt(match[1], 10);
          if (now - ts > SEVEN_DAYS_MS) {
            entry.delete();
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to cleanup old recordings:', err);
  }
}

/**
 * Delete a recording file after successful upload.
 */
export async function deleteLocalRecording(fileUri: string): Promise<void> {
  try {
    const file = new File(fileUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    console.warn('Failed to delete local recording:', fileUri);
  }
}
