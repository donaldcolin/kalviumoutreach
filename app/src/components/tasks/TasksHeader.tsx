import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { AlertTriangle } from 'lucide-react-native';

interface TasksHeaderProps {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
}

export function TasksHeader({ overdueCount, todayCount, upcomingCount }: TasksHeaderProps) {
  const totalPending = overdueCount + todayCount + upcomingCount;

  return (
    <VStack className="mb-2">
      <HStack className="w-full justify-between items-center mb-4">
        <VStack>
          <Heading size="2xl" className="text-slate-900 font-bold tracking-tight">Tasks</Heading>
          <Text className="text-slate-500 text-sm mt-0.5">
            {totalPending === 0 ? 'All caught up!' : `${totalPending} pending`}
          </Text>
        </VStack>
      </HStack>

      {/* Quick Stats Row */}
      {totalPending > 0 && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <HStack className="bg-white rounded-2xl border border-slate-100 p-4" space="sm">
            {/* Overdue Stat */}
            <View className="flex-1 items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-1.5 ${overdueCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <Text className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {overdueCount}
                </Text>
              </View>
              <Text className={`text-[11px] font-semibold ${overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                Overdue
              </Text>
            </View>

            {/* Divider */}
            <View className="w-px bg-slate-100 self-stretch" />

            {/* Today Stat */}
            <View className="flex-1 items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-1.5 ${todayCount > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <Text className={`text-lg font-bold ${todayCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {todayCount}
                </Text>
              </View>
              <Text className={`text-[11px] font-semibold ${todayCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                Today
              </Text>
            </View>

            {/* Divider */}
            <View className="w-px bg-slate-100 self-stretch" />

            {/* Upcoming Stat */}
            <View className="flex-1 items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-1.5 ${upcomingCount > 0 ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                <Text className={`text-lg font-bold ${upcomingCount > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {upcomingCount}
                </Text>
              </View>
              <Text className={`text-[11px] font-semibold ${upcomingCount > 0 ? 'text-indigo-500' : 'text-slate-400'}`}>
                Upcoming
              </Text>
            </View>
          </HStack>
        </Animated.View>
      )}

      {/* Overdue Alert Banner */}
      {overdueCount > 0 && (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <HStack className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-3 items-center" space="sm">
            <AlertTriangle size={16} color="#DC2626" strokeWidth={2.5} />
            <Text className="text-red-700 text-sm font-semibold flex-1">
              {overdueCount === 1
                ? 'You have 1 overdue task that needs attention'
                : `You have ${overdueCount} overdue tasks that need attention`}
            </Text>
          </HStack>
        </Animated.View>
      )}
    </VStack>
  );
}
