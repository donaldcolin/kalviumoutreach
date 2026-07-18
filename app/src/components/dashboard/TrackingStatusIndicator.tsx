import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export interface TrackingStatusIndicatorProps {
  isTracking: boolean;
}

export function TrackingStatusIndicator({ isTracking }: TrackingStatusIndicatorProps) {
  if (!isTracking) return null; // Minimalist approach: hide when not tracking or show a neutral message

  return (
    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl p-3 mb-6 shadow-sm">
      <View className="w-2 h-2 rounded-full bg-red-600 mr-3 animate-pulse" />
      <Text className="text-gray-600 text-xs tracking-wide">
        Location tracking active
      </Text>
    </View>
  );
}
