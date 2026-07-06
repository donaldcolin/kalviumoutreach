import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <HStack className="w-full justify-between items-center mb-6">
      <HStack className="items-baseline" space="sm">
        <Text className="text-muted-foreground text-2xl font-normal">Hello,</Text>
        <Heading size="2xl" className="text-foreground font-bold tracking-tight">{userName}</Heading>
      </HStack>
    </HStack>
  );
}
