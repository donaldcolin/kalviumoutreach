import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { School } from '../types';

import { Card } from '@/components/ui/card';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Badge, BadgeText } from '@/components/ui/badge';

interface Props {
  school: School;
  lastVisitDate?: string;
  onPress?: () => void;
}

export default function SchoolCard({ school, lastVisitDate, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Card className="bg-card border-border/50 rounded-xl p-4 mb-3 border">
        <VStack space="sm">
          <HStack className="justify-between items-start">
            <Text className="text-foreground font-semibold text-base flex-1 mr-2" numberOfLines={1}>
              {school.name}
            </Text>
            <Badge variant="default" className="rounded-full bg-primary/10">
              <BadgeText className="text-primary font-bold text-[10px] uppercase">
                {school.type}
              </BadgeText>
            </Badge>
          </HStack>
          
          <Text className="text-muted-foreground text-sm">
            {school.city}, {school.district}
          </Text>
          
          {school.principalName && (
            <Text className="text-muted-foreground text-xs mt-1">
              👤 {school.principalName}
            </Text>
          )}
          
          {lastVisitDate && (
            <Text className="text-muted-foreground/60 text-xs mt-1">
              Last visit: {lastVisitDate}
            </Text>
          )}
        </VStack>
      </Card>
    </TouchableOpacity>
  );
}
