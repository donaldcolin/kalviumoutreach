import React, { useEffect } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSyncStore } from '../../stores/syncStore';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, BadgeText } from '@/components/ui/badge';

export default function SyncQueueScreen() {
  const { items, pendingCount, failedCount, retryFailed, initialize, teardown } = useSyncStore();

  useEffect(() => {
    initialize();
    return () => teardown();
  }, [initialize, teardown]);

  const renderItem = ({ item }: { item: any }) => {
    const isFailed = item.status === 'failed';

    return (
      <Card className={`bg-card rounded-xl p-4 mb-3 border ${isFailed ? 'border-destructive/50' : 'border-border/50'}`}>
        <VStack space="sm">
          <HStack className="justify-between items-center">
            <Badge variant="default" className={`rounded-full ${isFailed ? 'bg-destructive' : 'bg-secondary'}`}>
              <BadgeText className="font-bold text-[10px] uppercase text-white">{item.type}</BadgeText>
            </Badge>
            <Text className="text-xl">{isFailed ? '⚠️' : '⏳'}</Text>
          </HStack>
          
          <Text className="text-muted-foreground text-sm mt-1 font-mono">
            ID: {item.payloadId || item.localUri || 'N/A'}
          </Text>
          
          {item.error && (
            <Text className="text-destructive font-medium text-xs mt-2 bg-destructive/10 p-2 rounded-md">
              {item.error}
            </Text>
          )}
        </VStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <VStack className="flex-1" space="md">
        <HStack className="justify-between items-center p-5 bg-card border-b border-border/50">
          <VStack>
            <Heading size="2xl" className="text-foreground font-bold">Sync Queue</Heading>
            <Text className="text-muted-foreground mt-1">
              {pendingCount} Pending • {failedCount} Failed
            </Text>
          </VStack>
          <Text className="text-3xl">☁️</Text>
        </HStack>

        {items.length === 0 ? (
          <VStack className="flex-1 justify-center items-center p-5">
            <Text className="text-5xl mb-4">✅</Text>
            <Heading size="lg" className="text-foreground font-semibold">All data is synced!</Heading>
            <Text className="text-muted-foreground text-center mt-2">
              Your offline work has been successfully uploaded to the CRM.
            </Text>
          </VStack>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20 }}
            style={{ flex: 1 }}
          />
        )}

        {failedCount > 0 && (
          <Box className="p-5">
            <Button
              size="lg"
              className="rounded-2xl shadow-sm"
              onPress={retryFailed}
            >
              <ButtonText className="font-bold text-lg">🔄 Retry Failed Uploads</ButtonText>
            </Button>
          </Box>
        )}
      </VStack>
    </SafeAreaView>
  );
}
