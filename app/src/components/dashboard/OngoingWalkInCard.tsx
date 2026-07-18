import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import type { OngoingWalkIn } from '../../stores/walkInStore';

interface OngoingWalkInCardProps {
  walkIn: OngoingWalkIn;
  onResume: () => void;
}

export function OngoingWalkInCard({ walkIn, onResume }: OngoingWalkInCardProps) {
  const [elapsed, setElapsed] = useState('');
  const pulseOpacity = useSharedValue(1);

  // Pulsing red dot animation
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Elapsed time ticker
  useEffect(() => {
    const update = () => {
      const startMs = new Date(walkIn.startTime).getTime();
      const diff = Date.now() - startMs;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;

      if (hrs > 0) {
        setElapsed(`${hrs}h ${remainMins}m`);
      } else {
        setElapsed(`${remainMins}m`);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [walkIn.startTime]);

  return (
    <Pressable onPress={onResume} className="mb-6">
      <View className="bg-white border border-gray-200 border-l-4 border-l-red-600 rounded-xl p-4 shadow-sm flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <View className="flex-row items-center mb-1">
            <Animated.View
              style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 6 }, pulseStyle]}
            />
            <Text className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
              Ongoing Walk-In
            </Text>
          </View>
          <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
            {walkIn.leadName || 'Unknown School'}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            Started {elapsed} ago
          </Text>
        </View>

        <View className="w-10 h-10 rounded-full bg-red-600 items-center justify-center shadow-sm shadow-red-200">
          <ChevronRight size={20} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}
