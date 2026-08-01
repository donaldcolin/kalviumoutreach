import React, { useState, useEffect } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { ClipboardCheck } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { TaskTabs, TaskList, TaskSectionHeader, TasksHeader, TaskCard } from '../../components/tasks';
import type { TaskTabValue } from '../../components/tasks/TaskTabs';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';

export default function TasksScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TaskTabValue>('today');
  const {
    overdueTasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
    overdueCount,
    todayCount,
    upcomingCount,
    completeTask,
    initialize,
    refresh,
    isRefreshing,
    cleanup,
  } = useTasksStore();

  useEffect(() => {
    if (user?.id) initialize(user.id);
    return () => {
      // Don't cleanup on unmount — the real-time listener should persist
      // across tab switches. Only cleanup on logout.
    };
  }, [user?.id]);

  const totalPending = overdueCount + todayCount + upcomingCount;
  const hasAnyActive = totalPending > 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={['#E11D48']}
            tintColor="#E11D48"
          />
        }
      >
        {/* Summary Header with Stats */}
        <TasksHeader
          overdueCount={overdueCount}
          todayCount={todayCount}
          upcomingCount={upcomingCount}
        />

        {/* ── Tabs Toggle ── */}
        <TaskTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overdueCount={overdueCount}
          todayCount={todayCount}
          upcomingCount={upcomingCount}
          completedCount={completedTasks.length}
        />

        {/* ── Content ── */}
        {activeTab === 'overdue' && (
          <TaskList
            tasks={overdueTasks}
            activeTab="overdue"
            completeTask={completeTask}
          />
        )}

        {activeTab === 'today' && (
          <TaskList
            tasks={todayTasks}
            activeTab="today"
            completeTask={completeTask}
          />
        )}

        {activeTab === 'upcoming' && (
          <TaskList
            tasks={upcomingTasks}
            activeTab="upcoming"
            completeTask={completeTask}
          />
        )}

        {activeTab === 'completed' && (
          <TaskList
            tasks={completedTasks}
            activeTab="completed"
            completeTask={completeTask}
          />
        )}
      </ScrollView>
    </View>
  );
}
