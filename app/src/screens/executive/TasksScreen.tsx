import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { useAuthStore } from '../../stores/authStore';
import { useTasks } from '../../hooks/useTasks';
import { TaskTabs, TaskList } from '../../components/tasks';

export default function TasksScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const { tasks, completeTask } = useTasks(user?.id, activeTab);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100 }}>
        {/* Header Section */}
        <HStack className="w-full justify-between items-center mb-6">
          <Heading size="2xl" className="text-slate-900 font-bold tracking-tight">Tasks</Heading>
        </HStack>

        <TaskTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <TaskList tasks={tasks} activeTab={activeTab} completeTask={completeTask} />
      </ScrollView>
    </View>
  );
}
