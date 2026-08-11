import React, { useState, useEffect } from 'react';
import { View, RefreshControl, TouchableOpacity, Text, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
      <FlashList estimatedItemSize={150}
        data={activeTab === 'overdue' ? overdueTasks : activeTab === 'today' ? todayTasks : activeTab === 'upcoming' ? upcomingTasks : completedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={['#E11D48']}
            tintColor="#E11D48"
          />
        }
        ListHeaderComponent={
          <>
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
          </>
        }
        ListEmptyComponent={
          <View className="w-full items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 mt-4">
            <Text className="text-slate-900 font-semibold text-xl tracking-tight mb-2">
              {activeTab === 'completed' ? 'No completed tasks' : 'All caught up'}
            </Text>
            <Text className="text-slate-500 text-sm text-center px-4">
              {activeTab === 'completed'
                ? 'Completed tasks will appear here.'
                : 'No active tasks in this section.'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TaskList
            tasks={[item]}
            activeTab={activeTab}
            completeTask={completeTask}
          />
        )}
      />
    </View>
  );
}
