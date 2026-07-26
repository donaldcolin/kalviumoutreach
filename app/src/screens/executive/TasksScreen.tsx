import React, { useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { useAuthStore } from '../../stores/authStore';
import { useEffect } from 'react';
import { useTasksStore } from '../../stores/tasksStore';
import { TaskTabs, TaskList } from '../../components/tasks';

export default function TasksScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const { pendingTasks, completedTasks, completeTask, initialize, refresh, isRefreshing } = useTasksStore();
  const tasks = activeTab === 'pending' ? pendingTasks : completedTasks;

  useEffect(() => {
    if (user?.id) initialize(user.id);
  }, [user?.id]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={['#E11D48']} tintColor="#E11D48" />
        }
      >
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
