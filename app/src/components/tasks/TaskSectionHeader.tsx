import React from 'react';
import { View } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { AlertTriangle, Calendar, Clock } from 'lucide-react-native';

export type TaskSection = 'overdue' | 'today' | 'upcoming';

interface TaskSectionHeaderProps {
  section: TaskSection;
  count: number;
}

const SECTION_CONFIG = {
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    iconColor: '#DC2626',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    badgeBg: 'bg-red-500',
    borderColor: 'border-red-100',
  },
  today: {
    label: "Today's Tasks",
    icon: Clock,
    iconColor: '#E11D48',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    badgeBg: 'bg-rose-500',
    borderColor: 'border-rose-100',
  },
  upcoming: {
    label: 'Upcoming',
    icon: Calendar,
    iconColor: '#6366F1',
    textColor: 'text-indigo-600',
    bgColor: 'bg-slate-50',
    badgeBg: 'bg-indigo-500',
    borderColor: 'border-slate-100',
  },
} as const;

export function TaskSectionHeader({ section, count }: TaskSectionHeaderProps) {
  const config = SECTION_CONFIG[section];
  const Icon = config.icon;

  return (
    <View className={`px-4 py-3 ${config.bgColor} border ${config.borderColor} rounded-xl mb-3 mt-4`}>
      <HStack className="items-center" space="sm">
        <Icon size={18} color={config.iconColor} strokeWidth={2.5} />
        <Text className={`font-bold text-base ${config.textColor} tracking-tight flex-1`}>
          {config.label}
        </Text>
        <View className={`${config.badgeBg} rounded-full px-2.5 py-0.5 min-w-[24px] items-center`}>
          <Text className="text-white text-xs font-bold">{count}</Text>
        </View>
      </HStack>
    </View>
  );
}
