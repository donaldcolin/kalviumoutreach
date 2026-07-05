/**
 * Audio recording service using expo-audio.
 * Handles meeting recordings with SHA-256 hashing and orphan recovery.
 */
import { Paths, Directory, File } from 'expo-file-system';

const RECORDING_DIR_NAME = 'recordings';

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
