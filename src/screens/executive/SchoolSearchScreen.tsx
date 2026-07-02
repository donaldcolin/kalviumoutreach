import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchSchools } from '../../services/firestore';
import type { School, VisitStackParamList } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';


type Props = NativeStackScreenProps<VisitStackParamList, 'SchoolSearch'>;

export default function SchoolSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true);
        try {
          const schools = await searchSchools(query);
          setResults(schools);
        } catch (err) {
          console.warn('Search failed:', err);
        }
        setIsSearching(false);
      } else if (query.length === 0) {
        // Load some schools initially
        try {
          const schools = await searchSchools('');
          setResults(schools.slice(0, 20));
        } catch {}
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (school: School) => {
    navigation.navigate('CheckIn', { schoolId: school.id, schoolName: school.name });
  };

  const renderSchool = ({ item }: { item: School }) => (
    <TouchableOpacity onPress={() => handleSelect(item)} activeOpacity={0.7}>
      <Card className="mb-3 bg-card border-border/50 rounded-xl p-4 flex-row items-center justify-between">
        <VStack space="xs" className="flex-1 mr-4">
          <Text className="text-foreground font-semibold text-base">{item.name}</Text>
          <Text className="text-muted-foreground text-sm">
            {item.city}, {item.district} · {item.state}
          </Text>
          {item.principalName ? (
            <Text className="text-primary text-xs mt-1">👤 {item.principalName}</Text>
          ) : null}
        </VStack>
        <Text className="text-muted-foreground">▶️</Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Box className="p-4">
        <Input className="bg-card rounded-xl border-border/50 h-14">
          <InputSlot className="pl-4">
            <Text className="text-muted-foreground">🔍</Text>
          </InputSlot>
          <InputField
            placeholder="Search by school name, city, or district..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </Input>
      </Box>

      {isSearching && (
        <HStack space="sm" className="justify-center items-center my-2">
          <ActivityIndicator size="small" color="var(--color-primary)" />
          <Text className="text-muted-foreground">Searching...</Text>
        </HStack>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderSchool}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          query.length >= 2 && !isSearching ? (
            <VStack className="items-center py-12">
              <Text className="text-muted-foreground text-base">No schools found</Text>
              <Text className="text-muted-foreground text-sm mt-1">Try a different search or add a new school</Text>
            </VStack>
          ) : null
        }
      />

      <Box className="absolute bottom-6 left-4 right-4 bg-background pt-2">
        <Button
          size="lg"
          className="rounded-xl border border-primary bg-card/80"
          onPress={() => navigation.navigate('AddSchool')}
        >
          <ButtonText className="text-primary font-bold text-base">+ Add New School</ButtonText>
        </Button>
      </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
