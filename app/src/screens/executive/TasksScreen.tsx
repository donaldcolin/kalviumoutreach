import React, { useState, useEffect } from 'react';
import { ScrollView, View, RefreshControl, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useTasksStore } from '../../stores/tasksStore';
import { TaskTabs, TaskList } from '../../components/tasks';
import type { TaskTabValue } from '../../components/tasks/TaskTabs';
import { useFailedSyncs } from '../../hooks/useFailedSyncs';

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
  
  const { failedSyncs, retrySync } = useFailedSyncs(user?.id);

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

        {/* Header removed as requested */}

        {/* ── Tabs Toggle ── */}
        {failedSyncs.length > 0 && (
          <TouchableOpacity 
            className="bg-red-500 rounded-lg p-3 mb-4 flex-row justify-center items-center"
            onPress={() => {
              Alert.alert(
                'Retry Sync', 
                `You have ${failedSyncs.length} failed visits. Tap OK to retry syncing them to LeadSquared.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'OK', onPress: () => {
                    failedSyncs.forEach(doc => retrySync(doc));
                  }}
                ]
              );
            }}
          >
            <Text className="text-white font-semibold text-center">
              {failedSyncs.length} Visit{failedSyncs.length > 1 ? 's' : ''} Failed to Sync - Tap to Retry
            </Text>
          </TouchableOpacity>
        )}
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
