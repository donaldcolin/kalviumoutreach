/**
 * Firebase Storage upload service.
 * Handles photo and recording uploads with progress tracking.
 */
import storage from '@react-native-firebase/storage';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload a file to Firebase Storage.
 * Returns the download URL on success.
 */
export async function uploadFile(
  localUri: string,
  remotePath: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const reference = storage().ref(remotePath);
  const task = reference.putFile(localUri);

  if (onProgress) {
    task.on('state_changed', (snapshot) => {
      onProgress({
        bytesTransferred: snapshot.bytesTransferred,
        totalBytes: snapshot.totalBytes,
        percentage:
          snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0,
      });
    });
  }

  await task;
  return reference.getDownloadURL();
}

/**
 * Upload a check-in photo.
 */
export async function uploadPhoto(
  localUri: string,
  visitId: string,
  type: 'original' | 'watermarked',
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const remotePath = `visits/${visitId}/photo_${type}.jpg`;
  return uploadFile(localUri, remotePath, onProgress);
}

/**
 * Upload a meeting audio recording.
 */
export async function uploadRecording(
  localUri: string,
  meetingId: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const remotePath = `meetings/${meetingId}/recording.m4a`;
  return uploadFile(localUri, remotePath, onProgress);
}
