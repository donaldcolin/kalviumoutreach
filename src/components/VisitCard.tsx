import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { Visit } from '../types';

import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Badge, BadgeText } from '@/components/ui/badge';

interface Props {
  visit: Visit;
  onPress?: () => void;
}

export default function VisitCard({ visit, onPress }: Props) {
  const time = new Date(visit.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isCompleted = visit.status === 'completed';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Card className="bg-card border-border/50 rounded-xl p-4 mb-3 border shadow-md">
        <VStack space="sm">
          <HStack className="justify-between items-start">
            <Text className="text-foreground font-semibold text-base flex-1 mr-2" numberOfLines={1}>
              {visit.schoolName || 'School Visit'}
            </Text>
            <Badge variant="default" className={`rounded-full ${isCompleted ? 'bg-[#10B981]/20' : 'bg-[#F59E0B]/20'}`}>
              <BadgeText className={`font-bold text-[10px] uppercase ${isCompleted ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </BadgeText>
            </Badge>
          </HStack>
          
          <Text className="text-muted-foreground text-sm">
            🕐 {time}
          </Text>
          
          {visit.mockLocationFlag && (
            <Text className="text-destructive font-medium text-xs mt-1">
              ⚠️ Mock location detected
            </Text>
          )}
        </VStack>
      </Card>
    </TouchableOpacity>
  );
}
