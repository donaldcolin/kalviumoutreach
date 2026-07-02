import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { ExecutiveStatus } from '../types';

import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Divider } from '@/components/ui/divider';

interface Props {
  name: string;
  employeeId: string;
  status: ExecutiveStatus;
  lastActiveTime: number;
  visitsToday: number;
  meetingsToday: number;
  appointmentsToday: number;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<ExecutiveStatus, { label: string }> = {
  idle: { label: 'Idle' },
  inVisit: { label: 'In Visit' },
  inMeeting: { label: 'In Meeting' },
};

export default function ExecutiveStatusCard({
  name,
  employeeId,
  status,
  lastActiveTime,
  visitsToday,
  meetingsToday,
  appointmentsToday,
  onPress,
}: Props) {
  const config = STATUS_CONFIG[status];
  const lastActive = lastActiveTime
    ? new Date(lastActiveTime).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Card className="bg-card border-border/50 rounded-xl p-4 mb-3 border">
        <VStack space="md">
          {/* Header */}
          <HStack className="justify-between items-center">
            <HStack space="md" className="items-center">
              <Box className={`w-3 h-3 rounded-full ${status === 'inVisit' ? 'bg-[#22C55E]' : status === 'inMeeting' ? 'bg-[#E11D48]' : 'bg-muted-foreground'}`} />
              <VStack>
                <Text className="text-foreground font-semibold text-base">{name}</Text>
                <Text className="text-muted-foreground text-xs">{employeeId}</Text>
              </VStack>
            </HStack>
            
            <Badge variant="outline" className="rounded-full">
              <BadgeText className="text-muted-foreground">{config.label}</BadgeText>
            </Badge>
          </HStack>
          
          <Divider className="my-1 bg-border/50" />
          
          {/* Stats */}
          <HStack className="justify-around items-center">
            <StatItem label="Visits" value={visitsToday} />
            <StatItem label="Meetings" value={meetingsToday} />
            <StatItem label="Appts" value={appointmentsToday} />
          </HStack>

          <Text className="text-muted-foreground text-xs mt-1">
            Last active: {lastActive}
          </Text>
        </VStack>
      </Card>
    </TouchableOpacity>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <VStack className="items-center">
      <Text className="text-foreground text-xl font-bold">{value}</Text>
      <Text className="text-muted-foreground text-xs mt-0.5">{label}</Text>
    </VStack>
  );
}
