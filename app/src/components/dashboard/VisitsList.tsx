import React from 'react';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

export interface VisitsListProps {
  selectedDate: Date;
  activities: any[];
}

export function VisitsList({ selectedDate, activities }: VisitsListProps) {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateString = isToday ? "Today's Visits" : `Visits on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <>
      <Heading size="lg" className="text-foreground font-bold mb-4 tracking-tight w-full">
        {dateString}
      </Heading>
      {activities.length === 0 ? (
        <VStack className="w-full items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed mb-8">
          <Text className="text-5xl mb-4">🏫</Text>
          <Text className="text-foreground font-semibold text-lg">No schools visited</Text>
          <Text className="text-muted-foreground text-sm mt-1 text-center px-4">Schools logged in LeadSquared will appear here automatically.</Text>
        </VStack>
      ) : (
        <VStack space="md" className="w-full mb-8">
          {activities.map((act) => (
            <Box key={act.id} className="bg-white p-5 rounded-2xl border border-slate-100">
              <Text className="font-bold text-lg text-foreground mb-1">{act.schoolName || 'Unknown School'}</Text>
              <Text className="text-sm text-muted-foreground">
                {act.typeOfWalkIn || act.activityType || 'Visit'} — {act.walkInStatus || 'Logged'}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </>
  );
}
