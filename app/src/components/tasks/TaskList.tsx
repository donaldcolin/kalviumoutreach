import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ClipboardCheck, CheckCircle2, Building2, Clock } from 'lucide-react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import type { Task } from '../../types';

import { TaskCard } from './TaskCard';
import { format, parseSafeDate } from '@/src/utils/safeFormat';

export interface TaskListProps {
  tasks: Task[];
  activeTab: 'overdue' | 'today' | 'upcoming' | 'completed';
  completeTask: (taskId: string) => void;
}

function formatCompletedDate(task: Task): string {
  // Use date field as fallback
  const dateStr = task.date;
  if (!dateStr) return '';
  return format(parseSafeDate(dateStr), 'MMM d, yyyy');
}

export function TaskList({ tasks, activeTab, completeTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <VStack className="w-full items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 mt-4">
        <ClipboardCheck size={48} color="#CBD5E1" strokeWidth={1.5} className="mb-4" />
        <Text className="text-slate-900 font-semibold text-xl tracking-tight mb-2">
          {activeTab === 'completed' ? 'No completed tasks' : 'All caught up'}
        </Text>
        <Text className="text-slate-500 text-sm text-center px-4">
          {activeTab === 'completed'
            ? 'Completed tasks will appear here.'
            : 'No active tasks in this section.'}
        </Text>
      </VStack>
    );
  }

  // For the completed tab — simpler card style
  if (activeTab === 'completed') {
    return (
      <VStack space="sm" className="w-full">
        {tasks.map((task, index) => (
          <Animated.View key={task.id} entering={FadeInUp.delay(index * 60).springify()}>
            <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-1">
              <HStack className="items-start" space="sm">
                <View className="w-6 h-6 rounded-full bg-emerald-50 items-center justify-center mt-0.5">
                  <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
                </View>
                <VStack className="flex-1">
                  <HStack className="justify-between items-start mb-1">
                    <HStack className="flex-1 items-center pr-3" space="xs">
                      <Text className="font-semibold text-base text-slate-700" numberOfLines={1}>
                        {task.schoolName || 'Untitled Task'}
                      </Text>
                    </HStack>
                    <Box
                      className={`px-2 py-0.5 rounded-md ${
                        task.type === 'seminar' ? 'bg-purple-50' : 'bg-blue-50'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          task.type === 'seminar' ? 'text-purple-600' : 'text-blue-600'
                        }`}
                      >
                        {task.type === 'seminar' ? 'SEMINAR' : 'FOLLOW-UP'}
                      </Text>
                    </Box>
                  </HStack>
                  <Text className="text-xs text-slate-400 font-medium">
                    {formatCompletedDate(task)}
                  </Text>
                </VStack>
              </HStack>
            </View>
          </Animated.View>
        ))}
      </VStack>
    );
  }
  // For active tabs, use the beautiful TaskCard component
  return (
    <VStack className="w-full mt-2">
      {tasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          section={activeTab}
          index={index}
          onComplete={completeTask}
        />
      ))}
    </VStack>
  );
}
