/**
 * Camera & image utility service.
 * Wraps expo-camera helpers, react-native-view-shot watermark capture,
 * and expo-image-manipulator for resizing/compressing photos.
 */
import React from 'react';
import { CameraView } from 'expo-camera';
import { captureRef } from 'react-native-view-shot';
import type { ViewShotRef } from 'react-native-view-shot';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Take a photo from a CameraView ref.
 * Returns the local URI of the captured image.
 */
export async function takePhoto(
  cameraRef: React.RefObject<CameraView | null>,
  options?: { quality?: number },
): Promise<string> {
  if (!cameraRef.current) {
    throw new Error('Camera ref is not available');
  }

  const photo = await cameraRef.current.takePictureAsync({
    quality: options?.quality ?? 0.8,
  });

  if (!photo?.uri) {
    throw new Error('Failed to capture photo — URI is null');
  }

  return photo.uri;
}

/**
 * Capture a watermark overlay as a screenshot using react-native-view-shot.
 * Returns the local URI of the captured watermark image.
 */
export async function captureWatermarkScreenshot(
  viewShotRef: React.RefObject<ViewShotRef | null>,
): Promise<string> {
  if (!viewShotRef.current?.capture) {
    throw new Error('ViewShot ref is not available');
  }

  const uri = await viewShotRef.current.capture();
  return uri;
}

/**
 * Resize and compress an image.
 * Useful for preparing check-in photos before upload.
 */
export async function resizeAndCompress(
  uri: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    compress?: number;
  },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 1280;
  const compress = options?.compress ?? 0.7;

  const result = await ImageManipulator.manipulate(uri)
    .resize({ width: maxWidth })
    .renderAsync();

  const saved = await result.saveAsync({
    format: SaveFormat.JPEG,
    compress,
  });

  return saved.uri;
}

/**
 * Generate a watermarked version of a photo.
 * Combines the original photo with the watermark overlay captured via ViewShot.
 * For v1 we simply return the ViewShot capture since it already contains
 * the photo + watermark overlaid together.
 */
export async function generateWatermarkedPhoto(
  viewShotRef: React.RefObject<ViewShotRef | null>,
): Promise<string> {
  return captureWatermarkScreenshot(viewShotRef);
}
