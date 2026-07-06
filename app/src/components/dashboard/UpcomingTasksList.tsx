import React from 'react';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';

export interface UpcomingTasksListProps {
  tasks: any[];
  onCompleteTask: (taskId: string) => void;
}

export function UpcomingTasksList({ tasks, onCompleteTask }: UpcomingTasksListProps) {
  if (tasks.length === 0) return null;
  
  return (
    <VStack space="md" className="w-full mb-8">
      <Heading size="lg" className="text-foreground font-bold mb-1 tracking-tight">Upcoming Tasks</Heading>
      {tasks.map((task) => (
        <Box key={task.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <HStack className="justify-between items-start mb-2">
            <VStack className="flex-1 pr-4">
              <Text className="font-bold text-lg text-foreground mb-1">{task.schoolName}</Text>
              <Text className="text-sm text-primary font-medium">
                {task.type === 'seminar' ? 'Seminar' : 'Follow-up'} — {task.date ? new Date(task.date).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'No date'}
              </Text>
            </VStack>
            <Box className={`px-2 py-1 rounded-md ${task.type === 'seminar' ? 'bg-purple-100' : 'bg-blue-100'}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${task.type === 'seminar' ? 'text-purple-700' : 'text-blue-700'}`}>
                {task.type === 'seminar' ? 'SEMINAR' : 'FOLLOW-UP'}
              </Text>
            </Box>
          </HStack>
          <Button size="sm" variant="outline" onPress={() => onCompleteTask(task.id)} className="mt-3 rounded-lg border-primary/30">
            <ButtonText className="text-primary font-semibold">Mark as Completed</ButtonText>
          </Button>
        </Box>
      ))}
    </VStack>
  );
}
