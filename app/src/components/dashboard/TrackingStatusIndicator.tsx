import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Square } from 'lucide-react-native';

export interface TrackingStatusIndicatorProps {
  isTracking: boolean;
  sessionStatus?: 'none' | 'active' | 'ended' | 'stale';
  onEndDay?: () => void;
  onStartDay?: () => void;
}

export function TrackingStatusIndicator({ isTracking, sessionStatus, onEndDay, onStartDay }: TrackingStatusIndicatorProps) {
  if (!isTracking) {
    if (sessionStatus === 'ended' || sessionStatus === 'stale') {
      return (
        <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 shadow-sm">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-slate-400 mr-3" />
            <Text className="text-slate-500 text-xs tracking-wide">
              Location tracking paused
            </Text>
          </View>
          {onStartDay && (
            <TouchableOpacity
              onPress={onStartDay}
              className="flex-row items-center bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm"
              activeOpacity={0.7}
            >
              <Text className="text-slate-600 text-xs font-semibold">Resume</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  }

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
    <View className="mb-6">
      <View className="flex-row items-center justify-between bg-white border border-gray-200 rounded-t-xl p-3 shadow-sm" style={{ borderBottomWidth: 0 }}>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-red-600 mr-3 animate-pulse" />
          <Text className="text-gray-600 font-medium text-xs tracking-wide">
            Location tracking active
          </Text>
        </View>
      </View>
      <View className="bg-amber-50 border border-amber-200 rounded-b-xl p-3 shadow-sm">
        <Text className="text-amber-800 text-[10px] leading-4">
          ⚠️ Tracking may stop midway if Android puts the app to sleep. For reliable tracking, go to <Text className="font-bold">Settings &gt; Apps &gt; Kalvium Outreach &gt; Battery</Text> and select <Text className="font-bold">Unrestricted</Text>.
        </Text>
      </View>
    </View>
  );
}

