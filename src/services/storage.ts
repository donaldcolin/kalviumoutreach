import { Platform } from 'react-native';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'sot0ayge';
const CLOUDINARY_UPLOAD_PRESET = 'kalvium_image_and_audio_for_school';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload a file to Cloudinary via REST API.
 * Uses XMLHttpRequest to maintain upload progress tracking.
 */
function uploadToCloudinary(
  localUri: string,
  resourceType: 'image' | 'video' | 'raw',
  onProgress?: UploadProgressCallback,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLOUDINARY_CLOUD_NAME) {
      return reject(new Error('Cloudinary Cloud Name is not set.'));
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    
    // Normalize file URI for React Native
    const fileUri = Platform.OS === 'android' ? localUri : localUri.replace('file://', '');
    
    // Determine mime type based on resource type
    let type = 'application/octet-stream';
    let name = `upload_${Date.now()}`;
    
    if (resourceType === 'image') {
      type = 'image/jpeg';
      name = `${name}.jpg`;
    } else if (resourceType === 'video') {
      // Audio files (.m4a) go to the video endpoint in Cloudinary
      type = 'audio/mp4'; 
      name = `${name}.m4a`;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type,
      name,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // Track upload progress
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({
            bytesTransferred: event.loaded,
            totalBytes: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.send(formData);
  });
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
  // We use the image endpoint for photos
  return uploadToCloudinary(localUri, 'image', onProgress);
}

/**
 * Upload a meeting audio recording.
 */
export async function uploadRecording(
  localUri: string,
  meetingId: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  // Audio files must go to the 'video' endpoint in Cloudinary
  return uploadToCloudinary(localUri, 'video', onProgress);
}
