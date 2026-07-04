import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, useAudioPlayer } from 'expo-audio';
import { useAuthStore } from '../../stores/authStore';
import firestore from '@react-native-firebase/firestore';
import { uploadRecording as uploadToCloudinary } from '../../services/storage';

function RecordingItem({ item }: { item: any }) {
  const player = useAudioPlayer(item.storageUrl);
  
  return (
    <Box className="p-4 bg-white rounded-xl mb-3 shadow-sm border border-zinc-100">
      <HStack className="justify-between items-center mb-2">
        <Text className="text-zinc-800 font-medium">
          Note - {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleString() : 'Just now'}
        </Text>
        <TouchableOpacity onPress={() => player.playing ? player.pause() : player.play()}>
          <Ionicons name={player.playing ? "pause-circle" : "play-circle"} size={28} color="#E11D48" />
        </TouchableOpacity>
      </HStack>
      <Text className="text-zinc-500 text-xs">{(item.duration / 1000).toFixed(1)} seconds</Text>
      <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 8 }}>
        <View style={{ height: '100%', backgroundColor: '#E11D48', borderRadius: 2, width: `${player.currentTime / (item.duration / 1000) * 100}%` }} />
      </View>
    </Box>
  );
}

export default function MeetingNotesScreen() {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('meetingRecordings')
      .where('executiveId', '==', user.id)
      .orderBy('timestamp', 'desc')
      .onSnapshot((snap) => {
        if (!snap) return;
        const recs: any[] = [];
        snap.forEach(doc => recs.push({ id: doc.id, ...doc.data() }));
        setRecordings(recs);
      });
    return unsub;
  }, [user]);

  const toggleRecording = async () => {
    if (recorder.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        uploadRecording(uri, recorder.currentTime);
      }
    } else {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.granted) {
        await recorder.prepareToRecordAsync();
        recorder.record();
      } else {
        Alert.alert('Permission needed', 'Microphone permission is required to save notes.');
      }
    }
  };

  const uploadRecording = async (uri: string, durationMillis: number) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(uri, `note_${Date.now()}`);
      
      await firestore().collection('meetingRecordings').add({
        executiveId: user.id,
        timestamp: firestore.FieldValue.serverTimestamp(),
        storageUrl: url,
        duration: durationMillis,
      });
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Failed', 'Could not save the note to the cloud.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <VStack className="flex-1 bg-background pt-2 pb-0 px-4">
        {/* Discreet Header */}
        <HStack className="justify-between items-center mb-4 mt-2">
          <Text className="text-xl font-bold text-zinc-800">Quick Notes</Text>
          {isUploading && <ActivityIndicator size="small" color="#A1A1AA" />}
        </HStack>

        <FlatList
          data={recordings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <RecordingItem item={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box className="flex-1 justify-center items-center mt-20">
              <Ionicons name="document-text-outline" size={48} color="#D4D4D8" />
              <Text className="text-zinc-400 mt-4 text-center px-8">No notes yet. Start typing or tap the mic icon below to add a quick voice memo.</Text>
            </Box>
          }
        />

        {/* Note input area (disguised UI) */}
        <Box className="bg-white rounded-3xl p-2 flex-row items-end shadow-lg border border-zinc-100 mb-6 mx-2">
          <TextInput
            style={styles.input}
            placeholder="Type a note here..."
            placeholderTextColor="#A1A1AA"
            multiline
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity 
            onPress={toggleRecording}
            style={styles.recordButton}
          >
            <Ionicons 
              name="mic" 
              size={22} 
              color={recorder.isRecording ? "#E11D48" : "#94A3B8"} 
            />
            {recorder.isRecording && (
              <View style={styles.recordingIndicator} />
            )}
          </TouchableOpacity>
        </Box>
      </VStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#3F3F46',
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  }
});
