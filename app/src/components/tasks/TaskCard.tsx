import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckCircle, Clock, AlertTriangle, Calendar, Building2 } from 'lucide-react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import type { Task } from '../../types';
import type { TaskSection } from './TaskSectionHeader';

interface TaskCardProps {
  task: Task;
  section: TaskSection;
  index: number;
  onComplete: (taskId: string) => void;
}

function getOverdueDays(dateStr: string): number {
  const taskDate = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
}

function getRelativeDate(dateStr: string): string {
  const taskDate = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return taskDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const SECTION_STYLES = {
  overdue: {
    borderColor: 'border-l-red-500',
    cardBg: 'bg-white',
    chipBg: 'bg-red-50',
    chipText: 'text-red-600',
  },
  today: {
    borderColor: 'border-l-rose-500',
    cardBg: 'bg-white',
    chipBg: 'bg-rose-50',
    chipText: 'text-rose-600',
  },
  upcoming: {
    borderColor: 'border-l-indigo-400',
    cardBg: 'bg-white',
    chipBg: 'bg-indigo-50',
    chipText: 'text-indigo-600',
  },
} as const;

export function TaskCard({ task, section, index, onComplete }: TaskCardProps) {
  const styles = SECTION_STYLES[section];
  const overdueDays = section === 'overdue' && task.date ? getOverdueDays(task.date) : 0;

  const handleComplete = () => {
    Alert.alert(
      'Complete Task',
      `Mark "${task.schoolName}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => onComplete(task.id),
          style: 'default',
        },
      ],
    );
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
      <View
        className={`${styles.cardBg} rounded-2xl border border-slate-100 ${styles.borderColor} border-l-[3px] mb-3 overflow-hidden`}
      >
        <View className="p-4">
          {/* Top Row: School name + Type badge */}
          <HStack className="justify-between items-start mb-2">
            <HStack className="flex-1 items-center pr-3" space="xs">
              <Building2 size={14} color="#64748B" strokeWidth={2} />
              <Text className="font-bold text-base text-slate-900 flex-1" numberOfLines={1}>
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
                  task.type === 'seminar' ? 'text-purple-700' : 'text-blue-700'
                }`}
              >
                {task.type === 'seminar' ? 'SEMINAR' : 'FOLLOW-UP'}
              </Text>
            </Box>
          </HStack>

          {/* Date + Urgency Chip Row */}
          <HStack className="items-center mb-3" space="sm">
            <Clock size={13} color="#94A3B8" strokeWidth={2} />
            <Text className="text-sm text-slate-500 font-medium">
              {task.date ? formatDateTime(task.date) : 'No date set'}
            </Text>

            {/* Urgency chip */}
            {section === 'overdue' && (
              <View className={`${styles.chipBg} rounded-full px-2 py-0.5`}>
                <HStack className="items-center" space="xs">
                  <AlertTriangle size={10} color="#DC2626" strokeWidth={2.5} />
                  <Text className={`text-[10px] font-bold ${styles.chipText}`}>
                    {overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`}
                  </Text>
                </HStack>
              </View>
            )}

            {section === 'today' && (
              <View className={`${styles.chipBg} rounded-full px-2 py-0.5`}>
                <Text className={`text-[10px] font-bold ${styles.chipText}`}>Due today</Text>
              </View>
            )}

            {section === 'upcoming' && task.date && (
              <View className={`${styles.chipBg} rounded-full px-2 py-0.5`}>
                <HStack className="items-center" space="xs">
                  <Calendar size={10} color="#6366F1" strokeWidth={2} />
                  <Text className={`text-[10px] font-bold ${styles.chipText}`}>
                    {getRelativeDate(task.date)}
                  </Text>
                </HStack>
              </View>
            )}
          </HStack>

          {/* Notes (if any) */}
          {task.notes && (
            <Text className="text-sm text-slate-500 mb-3 leading-5" numberOfLines={2}>
              {task.notes}
            </Text>
          )}

          {/* Bottom Row: Complete button */}
          <HStack className="justify-between items-center">
            <TouchableOpacity
              onPress={handleComplete}
              activeOpacity={0.7}
              className="flex-row items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2"
            >
              <CheckCircle size={15} color="#10B981" strokeWidth={2.5} />
              <Text className="text-slate-700 font-semibold text-sm ml-1.5">Mark Complete</Text>
            </TouchableOpacity>
          </HStack>
        </View>
      </View>
    </Animated.View>
  );
}
