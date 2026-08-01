
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';

export type TaskTabValue = 'overdue' | 'today' | 'upcoming' | 'completed';

export interface TaskTabsProps {
  activeTab: TaskTabValue;
  setActiveTab: (tab: TaskTabValue) => void;
  overdueCount?: number;
  todayCount?: number;
  upcomingCount?: number;
  completedCount?: number;
}

export function TaskTabs({ activeTab, setActiveTab, overdueCount = 0, todayCount = 0, upcomingCount = 0, completedCount = 0 }: TaskTabsProps) {
  const tabs: { key: TaskTabValue; label: string; count: number; color: string }[] = [
    { key: 'today', label: 'Today', count: todayCount, color: 'bg-emerald-500' },
    { key: 'overdue', label: 'Overdue', count: overdueCount, color: 'bg-red-500' },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount, color: 'bg-blue-500' },
    { key: 'completed', label: 'Done', count: completedCount, color: 'bg-slate-500' },
  ];

  return (
    <View className="mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              className={`flex-row items-center px-4 py-2.5 rounded-full border ${isActive ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View className={`ml-2 px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : tab.color}`}>
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-white'}`}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
