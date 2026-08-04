import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import firestore from '@react-native-firebase/firestore';
import { uploadRecording as uploadToCloudinary } from './storage';
import { logger } from '../utils/logger';

const QUEUE_KEY = '@audio_upload_queue';

export type AudioQueueItem = 
  | { type: 'meeting'; uri: string; durationMillis: number; userId: string; id: string }
  | { type: 'walkin'; uri: string; activityId: string; userId: string; id: string };

export const enqueueMeetingAudio = async (uri: string, durationMillis: number, userId: string) => {
  try {
    const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: AudioQueueItem[] = queueStr ? JSON.parse(queueStr) : [];
    
    queue.push({
      id: Date.now().toString(),
      type: 'meeting',
      uri,
      durationMillis,
      userId,
    });
    
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    logger.info('Queued meeting audio for internet upload');
  } catch (err) {
    logger.error('Failed to enqueue meeting audio:', String(err));
  }
};

export const enqueueWalkInAudio = async (uri: string, activityId: string, userId: string) => {
  try {
    const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: AudioQueueItem[] = queueStr ? JSON.parse(queueStr) : [];
    
    queue.push({
      id: Date.now().toString(),
      type: 'walkin',
      uri,
      activityId,
      userId,
    });
    
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    logger.info('Queued walk-in audio for internet upload');
  } catch (err) {
    logger.error('Failed to enqueue walk-in audio:', String(err));
  }
};

let isProcessing = false;

export const processAudioQueue = async () => {
  if (isProcessing) return;
  
  try {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      return; // Only upload when connected
    }

    const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueStr) return;
    
    let queue: AudioQueueItem[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    isProcessing = true;
    logger.info(`Processing ${queue.length} queued audio uploads over internet...`);

    const failedItems: AudioQueueItem[] = [];

    for (const item of queue) {
      // Yield to the UI thread so the app doesn't freeze between items
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        const url = await uploadToCloudinary(item.uri, `note_${Date.now()}`);

        if (item.type === 'meeting') {
          await firestore().collection('meetingRecordings').add({
            executiveId: item.userId,
            timestamp: firestore.FieldValue.serverTimestamp(),
            storageUrl: url,
            duration: item.durationMillis,
          });
        } else if (item.type === 'walkin') {
          // Update the local activity
          const activityRef = firestore().collection('crmActivities').doc(item.activityId);
          const doc = await activityRef.get();
          
          if (doc.exists()) {
            const currentNotes = doc.data()?.notes || '';
            const newNotes = currentNotes.replace('[Pending Internet Upload]', url) + (currentNotes.includes('[Pending Internet Upload]') ? '' : `\n\nRecording: ${url}`);
            
            await activityRef.update({
              recordingUrl: url,
              notes: newNotes
            });

            // Trigger an update to LeadSquared
            await firestore().collection('pushQueue').add({
              action: 'UPDATE_ACTIVITY',
              activityId: item.activityId,
              executiveId: item.userId,
              notes: newNotes,
              status: 'pending',
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        logger.info(`Successfully uploaded queued audio item ${item.id}`);
      } catch (err) {
        logger.error(`Failed to upload queued audio item ${item.id}:`, String(err));
        failedItems.push(item);
      }
    }

    // Save any items that failed back to the queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
  } catch (err) {
    logger.error('Error processing audio queue:', String(err));
  } finally {
    isProcessing = false;
  }
};
