import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ClipboardCheck } from 'lucide-react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';

export interface TaskListProps {
  tasks: any[];
  activeTab: 'pending' | 'completed';
  completeTask: (taskId: string) => void;
}

export function TaskList({ tasks, activeTab, completeTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <VStack className="w-full items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 mt-4">
        <ClipboardCheck size={48} color="#CBD5E1" strokeWidth={1.5} className="mb-4" />
        <Text className="text-slate-900 font-semibold text-xl tracking-tight mb-2">All caught up</Text>
        <Text className="text-slate-500 text-sm text-center px-4">
          {activeTab === 'pending' ? "Team Leads can assign tasks here." : "Completed tasks will appear here."}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack space="md" className="w-full">
      {tasks.map((task, index) => (
        <Animated.View key={task.id} entering={FadeInUp.delay(index * 100).springify()}>
          <Box className="p-5 rounded-2xl border bg-white border-slate-100">
            <HStack className="justify-between items-start mb-3">
              <VStack className="flex-1 pr-4">
                <Text className="font-bold text-lg text-slate-900 mb-1">{task.schoolName}</Text>
                <Text className={`text-sm font-medium ${activeTab === 'pending' ? 'text-primary' : 'text-slate-500'}`}>
                  {task.type === 'seminar' ? 'Seminar' : 'Follow-up'} — {task.date ? new Date(task.date).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'No date'}
                </Text>
              </VStack>
              <Box className={`px-2 py-1 rounded-md ${task.type === 'seminar' ? (activeTab === 'pending' ? 'bg-purple-100' : 'bg-slate-100') : (activeTab === 'pending' ? 'bg-blue-100' : 'bg-slate-100')}`}>
                <Text className={`text-[10px] font-bold uppercase tracking-wide ${task.type === 'seminar' ? (activeTab === 'pending' ? 'text-purple-700' : 'text-slate-500') : (activeTab === 'pending' ? 'text-blue-700' : 'text-slate-500')}`}>
                  {task.type === 'seminar' ? 'SEMINAR' : 'FOLLOW-UP'}
                </Text>
              </Box>
            </HStack>
            {activeTab === 'pending' && (
              <Button size="sm" variant="outline" onPress={() => completeTask(task.id)} className="mt-2 rounded-full border-slate-200">
                <ButtonText className="text-slate-900 font-semibold">Mark as Completed</ButtonText>
              </Button>
            )}
          </Box>
        </Animated.View>
      ))}
    </VStack>
  );
}
