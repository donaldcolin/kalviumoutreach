import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Play, Pause, Upload } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export interface RecordingItemProps {
  item: any;
  index: number;
  onPushPress: (item: any) => void;
}

export function RecordingItem({ item, index, onPushPress }: RecordingItemProps) {
  const player = useAudioPlayer(item.storageUrl);
  const status = useAudioPlayerStatus(player);

  const durationSec = item.duration / 1000;
  const progress = durationSec > 0 ? (status.currentTime / durationSec) * 100 : 0;

  const handlePlayPause = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  return (
    <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
      <Box className="p-4 bg-white rounded-2xl mb-3 border border-slate-100">
        <HStack className="justify-between items-center mb-2">
          <Text className="text-slate-900 font-medium text-sm">
            {item.timestamp?.toDate
              ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </Text>
          <HStack className="items-center" space="sm">
            {item.pushedToLS ? (
              <Box className="bg-emerald-50 px-2 py-1 rounded-lg">
                <Text className="text-emerald-600 text-xs font-semibold">✓ Pushed</Text>
              </Box>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPushPress(item)}
                style={styles.pushButton}
              >
                <Upload size={12} color="#6366F1" strokeWidth={2} />
                <Text className="text-indigo-600 text-xs font-semibold ml-1">Push</Text>
              </TouchableOpacity>
            )}
          </HStack>
        </HStack>

        {/* Playback row */}
        <HStack className="items-center" space="sm">
          <TouchableOpacity activeOpacity={0.7} onPress={handlePlayPause} style={styles.playBtn}>
            {status.playing ? (
              <Pause color="#FFFFFF" size={14} strokeWidth={2.5} fill="#FFFFFF" />
            ) : (
              <Play color="#FFFFFF" size={14} strokeWidth={2.5} fill="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack]}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <View
              style={[
                styles.progressThumb,
                { left: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>

          <Text className="text-slate-400 text-xs" style={{ minWidth: 36, textAlign: 'right' }}>
            {durationSec.toFixed(1)}s
          </Text>
        </HStack>
      </Box>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pushButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
    marginLeft: -5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
