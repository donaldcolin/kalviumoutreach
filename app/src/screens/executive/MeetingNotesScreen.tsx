import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, SectionList, KeyboardAvoidingView, Platform, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Play, Pause, Mic } from 'lucide-react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, useAudioPlayer } from 'expo-audio';
import { useAuthStore } from '../../stores/authStore';
import firestore from '@react-native-firebase/firestore';
import { uploadRecording as uploadToCloudinary } from '../../services/storage';

function RecordingItem({ item, index }: { item: any, index: number }) {
  const player = useAudioPlayer(item.storageUrl);
  
  return (
    <Animated.View entering={FadeInUp.delay(index * 100).springify()}>
      <Box className="p-4 bg-white rounded-xl mb-3 border border-slate-100">
        <HStack className="justify-between items-center mb-2">
          <Text className="text-slate-900 font-medium">
            {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => player.playing ? player.pause() : player.play()}>
            {player.playing ? (
              <Pause color="#94A3B8" size={28} strokeWidth={1.5} />
            ) : (
              <Play color="#94A3B8" size={28} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        </HStack>
        <Text className="text-slate-500 text-xs">{(item.duration / 1000).toFixed(1)} seconds</Text>
      <View style={{ height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 16, position: 'relative' }}>
        <View style={{ height: '100%', backgroundColor: '#ef4444', borderRadius: 2, width: `${(player.currentTime / (item.duration / 1000)) * 100}%` }} />
        <View 
          style={{ 
            position: 'absolute', 
            top: -4, 
            left: `${(player.currentTime / (item.duration / 1000)) * 100}%`, 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            backgroundColor: '#ef4444',
            marginLeft: -6,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }} 
        />
      </View>
      </Box>
    </Animated.View>
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

  const groupedRecordings = useMemo(() => {
    const groups: { title: string; data: any[] }[] = [];
    recordings.forEach(rec => {
      const d = rec.timestamp?.toDate ? rec.timestamp.toDate() : new Date();
      let title = d.toLocaleDateString();
      if (d.toDateString() === new Date().toDateString()) title = 'Today';
      else if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) title = 'Yesterday';
      
      let group = groups.find(g => g.title === title);
      if (!group) {
        group = { title, data: [] };
        groups.push(group);
      }
      group.data.push(rec);
    });
    return groups;
  }, [recordings]);

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
          <Text className="text-xl font-bold text-slate-900 tracking-tight">Quick Notes</Text>
          {isUploading && <ActivityIndicator size="small" color="#A1A1AA" />}
        </HStack>

        <SectionList
          sections={groupedRecordings}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => <RecordingItem item={item} index={index} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 ml-1">{title}</Text>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box className="flex-1 justify-center items-center mt-20">
              <Text className="text-slate-500 mt-4 text-center px-8">No notes yet. Start typing or tap the mic icon below to add a quick voice memo.</Text>
            </Box>
          }
        />

        {/* Note input area (disguised UI) */}
        <Box className="bg-white rounded-3xl p-2 flex-row items-end border border-slate-100 mb-6 mx-2">
          <TextInput
            style={styles.input}
            placeholder="Type a note here..."
            placeholderTextColor="#A1A1AA"
            multiline
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={toggleRecording}
            style={styles.recordButton}
          >
            <Mic 
              size={22} 
              color={recorder.isRecording ? "#BE123C" : "#94A3B8"} 
              strokeWidth={1.5}
            />
            {recorder.isRecording && (
              <View style={[styles.recordingIndicator, { backgroundColor: '#BE123C' }]} />
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
