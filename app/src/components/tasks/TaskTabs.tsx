import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

export interface TaskTabsProps {
  activeTab: 'pending' | 'completed';
  setActiveTab: (tab: 'pending' | 'completed') => void;
}

export function TaskTabs({ activeTab, setActiveTab }: TaskTabsProps) {
  return (
    <View className="bg-slate-50 rounded-full p-1 mb-6 border border-slate-200 flex-row relative">
      <Animated.View 
        layout={Layout.springify()}
        className={`absolute top-1 bottom-1 bg-white rounded-full border border-slate-100`}
        style={{ width: '49%', left: activeTab === 'pending' ? '1%' : '50%' }}
      />
      <TouchableOpacity
        className="flex-1 py-2.5 rounded-full items-center flex-row justify-center z-10"
        activeOpacity={0.7}
        onPress={() => setActiveTab('pending')}
      >
        <Text className={`font-semibold ${activeTab === 'pending' ? 'text-slate-900' : 'text-slate-500'}`}>Active</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-1 py-2.5 rounded-full items-center flex-row justify-center z-10"
        activeOpacity={0.7}
        onPress={() => setActiveTab('completed')}
      >
        <Text className={`font-semibold ${activeTab === 'completed' ? 'text-slate-900' : 'text-slate-500'}`}>Completed</Text>
      </TouchableOpacity>
    </View>
  );
}
