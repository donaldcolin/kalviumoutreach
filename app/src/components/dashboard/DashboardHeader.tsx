import React from 'react';
import { View, Image } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

export interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <View className="mb-6">
      <View>
        <Text className="text-gray-500 text-2xl font-normal">Hello,</Text>
        <Text className="text-gray-900 text-3xl font-bold tracking-tight">{userName}</Text>
      </View>
    </View>
  );
}
