import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

export interface DailyStatsCardProps {
  selectedDate: Date;
  visitCount: number;
}

export function DailyStatsCard({ selectedDate, visitCount }: DailyStatsCardProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateString = isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <VStack space="md" className="w-full mb-6">
      <HStack space="md" className="w-full">
        <Card className="flex-1 bg-white p-5 rounded-2xl border border-slate-100">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
            Schools Visited on {dateString}
          </Text>
          <Heading size="3xl" className="text-foreground font-extrabold">{visitCount}</Heading>
        </Card>
      </HStack>
    </VStack>
  );
}
