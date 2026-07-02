import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, Modal, View, TextInput, Animated, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useVisitStore } from '../../stores/visitStore';
import { useSyncStore } from '../../stores/syncStore';
import { useOutreachTracking } from '../../tracking/useOutreachTracking';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import VisitCard from '../../components/VisitCard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { VisitStackParamList } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { todayVisits, loadTodayVisits, subscribeTodayVisits, yesterdayVisitsCount, allTimeVisitsCount, loadHistoricalStats } = useVisitStore();
  const { overallStatus, pendingCount, failedCount, retryFailed, initialize: initSync } = useSyncStore();
  const navigation = useNavigation<NativeStackNavigationProp<VisitStackParamList>>();
  const { isTracking, startDay, activeSchoolMatch, pendingPrompt, submitClassification } = useOutreachTracking(user?.id);
  const [customNote, setCustomNote] = React.useState('');
  
  const [isStarting, setIsStarting] = React.useState(false);
  const [startCoords, setStartCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleStartDay = async () => {
    setIsStarting(true);
    
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsStarting(false);
        startDay(); // fallback
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStartCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      
      setTimeout(() => {
        startDay();
        // Reset state after it closes
        setTimeout(() => {
          setIsStarting(false);
          setStartCoords(null);
        }, 500);
      }, 1500);
    } catch (e) {
      setIsStarting(false);
      startDay(); // fallback
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTodayVisits(user.id);
      const unsub = subscribeTodayVisits(user.id);
      initSync();
      loadHistoricalStats(user.id);
      return unsub;
    }
  }, [user?.id]);

  const completedVisits = todayVisits.filter((v) => v.status === 'completed').length;
  const inProgressVisits = todayVisits.filter((v) => v.status === 'inProgress').length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 }}>
        {/* Header */}
        <HStack className="w-full justify-between items-center mb-4">
          <VStack>
            <Text className="text-muted-foreground text-sm font-medium mb-1">Hello,</Text>
            <Heading size="2xl" className="text-foreground font-bold tracking-tight">{user?.name ?? 'Executive'}</Heading>
          </VStack>
          <SyncStatusBadge
            status={overallStatus}
            pendingCount={pendingCount}
            failedCount={failedCount}
            onPress={failedCount > 0 ? retryFailed : undefined}
          />
        </HStack>

        {/* Stats Cards */}
        <VStack space="md" className="w-full mb-6">
          <HStack space="md" className="w-full">
            <Card className="flex-1 bg-card p-5 rounded-2xl border border-border/40 shadow-md">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Total Visits</Text>
              <Heading size="3xl" className="text-foreground font-extrabold">{todayVisits.length}</Heading>
            </Card>
            <Card className="flex-1 bg-card p-5 rounded-2xl border border-border/40 shadow-md">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Completed</Text>
              <Heading size="3xl" className="text-foreground font-extrabold">{completedVisits}</Heading>
            </Card>
            <Card className="flex-1 bg-card p-5 rounded-2xl border border-border/40 shadow-md">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">In Progress</Text>
              <Heading size="3xl" className="text-foreground font-extrabold">{inProgressVisits}</Heading>
            </Card>
          </HStack>

        </VStack>

        {/* Tracking Status */}
        <HStack className="w-full bg-card rounded-2xl p-4 mb-8 border border-border/40 shadow-md items-center justify-between">
          <HStack space="sm" className="items-center">
            <Box className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <Text className="text-foreground text-sm font-medium">
              {isTracking ? 'Location tracking active' : 'Tracking paused'}
            </Text>
          </HStack>
        </HStack>

        {activeSchoolMatch && (
          <Box className="w-full mb-8 p-6 bg-card rounded-2xl border border-primary/20 shadow-md">
            <Text className="text-center font-bold text-lg mb-2 text-foreground">Geofence Matched</Text>
            <Text className="text-center text-muted-foreground mb-5 text-base">
              You are currently at {activeSchoolMatch.name}.
            </Text>
            <Button size="lg" onPress={() => navigation.navigate('CheckIn', { schoolId: activeSchoolMatch.id, schoolName: activeSchoolMatch.name })} className="rounded-xl bg-primary">
              <ButtonText className="text-primary-foreground font-semibold">Complete Check-In</ButtonText>
            </Button>
          </Box>
        )}

        <Button
          size="lg"
          className="w-full rounded-2xl mb-10 shadow-md bg-primary border border-primary/10"
          onPress={() => navigation.navigate('Visits' as never)}
        >
          <ButtonText className="font-bold text-lg text-primary-foreground">New Visit</ButtonText>
        </Button>

        {/* Today's Visits */}
        <Heading size="lg" className="text-foreground font-bold mb-4 tracking-tight w-full">Today's Visits</Heading>
        {todayVisits.length === 0 ? (
          <VStack className="w-full items-center justify-center py-12 bg-card rounded-2xl border border-border/40 border-dashed shadow-md">
            <Text className="text-5xl mb-4">🏫</Text>
            <Text className="text-foreground font-semibold text-lg">No visits today</Text>
            <Text className="text-muted-foreground text-sm mt-1">Tap "New Visit" to get started</Text>
          </VStack>
        ) : (
          <VStack space="md" className="w-full">
            {todayVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onPress={() =>
                  (navigation as any).navigate('Visits', {
                    screen: 'VisitDetail',
                    params: { visitId: visit.id },
                  })
                }
              />
            ))}
          </VStack>
        )}
      </ScrollView>

      {/* Start Day Mandatory Modal */}
      <Modal visible={!isTracking} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View className="bg-card p-8 rounded-3xl w-full items-center shadow-xl border border-border/20">
            <Text className="text-3xl font-bold mb-3 text-center text-foreground tracking-tight">Start Your Day</Text>
            <Text className="text-muted-foreground mb-10 text-center text-base">
              Begin your day to enable location tracking and log visits.
            </Text>
            <TouchableOpacity 
              onPress={handleStartDay}
              disabled={isStarting}
              activeOpacity={0.9}
            >
              <Animated.View 
                className={`w-48 h-48 rounded-full ${startCoords ? 'bg-green-500' : 'bg-primary'} justify-center items-center shadow-md`}
                style={{
                  transform: [{ scale: scaleAnim }],
                  elevation: 8,
                  shadowColor: startCoords ? '#22c55e' : '#E11D48',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                }}
              >
                {isStarting && !startCoords ? (
                  <VStack className="items-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white font-medium mt-3 text-sm">Locating you...</Text>
                  </VStack>
                ) : startCoords ? (
                  <VStack className="items-center">
                    <Ionicons name="location" size={40} color="#ffffff" />
                    <Text className="text-white text-lg font-bold mt-2">Located!</Text>
                    <Text className="text-white/90 text-xs mt-1 font-mono">
                      {startCoords.lat.toFixed(4)}, {startCoords.lng.toFixed(4)}
                    </Text>
                  </VStack>
                ) : (
                  <Text className="text-primary-foreground text-3xl font-extrabold tracking-wider">
                    START
                  </Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Classification Prompt Modal */}
      <Modal visible={!!pendingPrompt} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-card p-6 rounded-t-3xl border-t border-border/20 shadow-xl pb-10">
            <Text className="text-2xl font-bold mb-2 text-foreground tracking-tight">Unclassified Stop</Text>
            <Text className="text-muted-foreground mb-6 text-base">
              You've been stopped for a while. What is the reason for this stop?
            </Text>

            <VStack space="md">
              <Button variant="outline" size="lg" onPress={() => submitClassification('break')} className="rounded-xl border-border bg-card">
                <ButtonText className="text-foreground font-semibold">Break / Lunch</ButtonText>
              </Button>
              <Button variant="outline" size="lg" onPress={() => submitClassification('school')} className="rounded-xl border-border bg-card">
                <ButtonText className="text-foreground font-semibold">Unlisted School Visit</ButtonText>
              </Button>

              <Box className="mt-4">
                <Text className="font-semibold mb-3 text-foreground">Other Reason:</Text>
                <TextInput
                  className="border border-border bg-background text-foreground rounded-xl p-4 mb-4 text-base"
                  placeholder="E.g., Traffic, flat tire..."
                  placeholderTextColor="#A1A1AA"
                  value={customNote}
                  onChangeText={setCustomNote}
                />
                <Button 
                  size="lg" 
                  className="rounded-xl bg-primary"
                  disabled={!customNote.trim()}
                  onPress={() => {
                    submitClassification('unclassified', customNote.trim());
                    setCustomNote('');
                  }}
                >
                  <ButtonText className="text-primary-foreground font-semibold">Submit Note</ButtonText>
                </Button>
              </Box>
            </VStack>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
