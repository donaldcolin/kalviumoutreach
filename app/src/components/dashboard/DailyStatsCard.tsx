import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export interface DailyStatsCardProps {
  selectedDate: Date;
  visitCount: number;
}

export function DailyStatsCard({ selectedDate, visitCount }: DailyStatsCardProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateString = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View className="w-full mb-6 bg-white border border-gray-200 rounded-xl p-5">
      <Text className="text-xs tracking-wider text-gray-500 uppercase font-semibold mb-2">
        Schools Visited {dateString}
      </Text>
      <Text className="text-4xl font-light text-gray-900">
        {visitCount}
      </Text>
    </View>
  );
}
