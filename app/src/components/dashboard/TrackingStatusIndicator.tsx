import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Square } from 'lucide-react-native';

export interface TrackingStatusIndicatorProps {
  isTracking: boolean;
  onEndDay?: () => void;
}

export function TrackingStatusIndicator({ isTracking, onEndDay }: TrackingStatusIndicatorProps) {
  if (!isTracking) return null; // Minimalist approach: hide when not tracking or show a neutral message

  const handleEndDay = () => {
    Alert.alert(
      'End Day',
      'Are you sure you want to stop tracking for the day?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Day', style: 'destructive', onPress: onEndDay },
      ],
    );
  };

  return (
    <View className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl p-3 mb-6 shadow-sm">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full bg-red-600 mr-3 animate-pulse" />
        <Text className="text-gray-600 text-xs tracking-wide">
          Location tracking active
        </Text>
      </View>
      {onEndDay && (
        <TouchableOpacity
          onPress={handleEndDay}
          className="flex-row items-center bg-gray-100 rounded-lg px-3 py-1.5"
          activeOpacity={0.7}
        >
          <Square size={12} color="#6B7280" strokeWidth={2.5} />
          <Text className="text-gray-500 text-xs font-semibold ml-1.5">End Day</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

