import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

export interface TrackingStatusIndicatorProps {
  isTracking: boolean;
}

export function TrackingStatusIndicator({ isTracking }: TrackingStatusIndicatorProps) {
  return (
    <HStack className="w-full bg-white rounded-2xl p-4 mb-8 border border-slate-100 items-center justify-between">
      <HStack space="sm" className="items-center">
        <Box className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        <Text className="text-foreground text-sm font-medium">
          {isTracking ? 'Location tracking active' : 'Tracking paused'}
        </Text>
      </HStack>
    </HStack>
  );
}
