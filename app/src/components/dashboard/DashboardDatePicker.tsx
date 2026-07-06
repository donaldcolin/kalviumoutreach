import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';

export interface DashboardDatePickerProps {
  dates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  scrollViewRef: React.Ref<ScrollView>;
}

export function DashboardDatePicker({ dates, selectedDate, onSelectDate, scrollViewRef }: DashboardDatePickerProps) {
  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-6 -mx-4 px-4"
      contentContainerStyle={{ paddingRight: 32 }}
    >
      {dates.map((d, i) => {
        const isSelected = d.toDateString() === selectedDate.toDateString();
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onSelectDate(d)}
            className={`px-4 py-3 mr-3 rounded-xl border ${isSelected ? 'bg-red-50 border-red-200' : (isToday ? 'bg-white border-zinc-300' : 'bg-white border-slate-100')} items-center justify-center min-w-[72px]`}
          >
            <Text className={`text-xs font-semibold uppercase mb-1 tracking-wider ${isSelected ? 'text-red-700' : (isToday ? 'text-zinc-800' : 'text-muted-foreground')}`}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text className={`text-xl font-bold ${isSelected ? 'text-red-800' : 'text-foreground'}`}>
              {d.getDate()}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  );
}
