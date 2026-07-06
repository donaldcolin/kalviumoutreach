import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';

export interface GeofenceAlertProps {
  schoolName: string;
  onCheckIn: () => void;
}

export function GeofenceAlert({ schoolName, onCheckIn }: GeofenceAlertProps) {
  return (
    <Box className="w-full mb-8 p-6 bg-white rounded-2xl border border-slate-100">
      <Text className="text-center font-bold text-lg mb-2 text-foreground">Geofence Matched</Text>
      <Text className="text-center text-muted-foreground mb-5 text-base">
        You are currently at {schoolName}.
      </Text>
      <Button size="lg" onPress={onCheckIn} className="rounded-xl bg-primary">
        <ButtonText className="text-primary-foreground font-semibold">Complete Check-In</ButtonText>
      </Button>
    </Box>
  );
}
