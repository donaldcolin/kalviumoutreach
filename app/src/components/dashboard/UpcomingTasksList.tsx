import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { AlertTriangle, Clock, Calendar, ChevronRight, Building2 } from 'lucide-react-native';
import type { Task } from '../../types';

export interface UpcomingTasksListProps {
  tasks: Task[];
  overdueCount?: number;
  todayCount?: number;
  onCompleteTask: (taskId: string) => void;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const taskDate = new Date(d);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return absDays === 1 ? '1d overdue' : `${absDays}d overdue`;
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function UpcomingTasksList({ tasks, overdueCount = 0, todayCount = 0, onCompleteTask }: UpcomingTasksListProps) {
  if (tasks.length === 0) return null;

  // Show at most 3 tasks on the dashboard
  const displayTasks = tasks.slice(0, 3);
  const remaining = tasks.length - displayTasks.length;

  return (
    <VStack className="w-full mb-6">
      <HStack className="justify-between items-center mb-3">
        <Heading size="lg" className="text-foreground font-bold tracking-tight">Tasks</Heading>
        {overdueCount > 0 && (
          <HStack className="bg-red-50 border border-red-100 rounded-full px-2.5 py-1 items-center" space="xs">
            <AlertTriangle size={12} color="#DC2626" strokeWidth={2.5} />
            <Text className="text-red-600 text-xs font-bold">{overdueCount} overdue</Text>
          </HStack>
        )}
      </HStack>

      {displayTasks.map((task, index) => {
        const isOverdue = task.date && new Date(task.date) < new Date(new Date().setHours(0, 0, 0, 0));
        const isToday = task.date && (() => {
          const td = new Date(task.date!);
          const now = new Date();
          return td.getFullYear() === now.getFullYear() && td.getMonth() === now.getMonth() && td.getDate() === now.getDate();
        })();

        return (
          <Animated.View key={task.id} entering={FadeInUp.delay(index * 80).springify()}>
            <Box
              className={`p-4 rounded-xl border mb-2 ${
                isOverdue
                  ? 'bg-red-50/50 border-red-100'
                  : isToday
                    ? 'bg-rose-50/30 border-rose-100'
                    : 'bg-slate-50 border-slate-100'
              }`}
            >
              <HStack className="justify-between items-center">
                <HStack className="flex-1 items-center pr-3" space="sm">
                  <Building2 size={14} color={isOverdue ? '#DC2626' : '#64748B'} strokeWidth={2} />
                  <VStack className="flex-1">
                    <Text className={`font-semibold text-sm ${isOverdue ? 'text-red-800' : 'text-slate-900'}`} numberOfLines={1}>
                      {task.schoolName || 'Untitled'}
                    </Text>
                    <HStack className="items-center mt-0.5" space="xs">
                      {isOverdue ? (
                        <AlertTriangle size={10} color="#DC2626" strokeWidth={2.5} />
                      ) : (
                        <Clock size={10} color="#94A3B8" strokeWidth={2} />
                      )}
                      <Text className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                        {task.date ? formatShortDate(task.date) : 'No date'}
                        {' · '}
                        {task.type === 'seminar' ? 'Seminar' : 'Follow-up'}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>

                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => onCompleteTask(task.id)}
                  className="rounded-full border-slate-200 px-3 h-8"
                >
                  <ButtonText className="text-slate-600 font-semibold text-xs">Done</ButtonText>
                </Button>
              </HStack>
            </Box>
          </Animated.View>
        );
      })}

      {remaining > 0 && (
        <HStack className="justify-center items-center mt-1 py-2">
          <Text className="text-slate-400 text-xs font-medium">
            +{remaining} more in Tasks tab
          </Text>
          <ChevronRight size={12} color="#94A3B8" strokeWidth={2} />
        </HStack>
      )}
    </VStack>
  );
}
