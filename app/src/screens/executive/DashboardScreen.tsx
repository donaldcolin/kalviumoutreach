import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, Modal, View, TextInput, Animated, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useOutreachTracking } from '../../tracking/useOutreachTracking';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { isTracking, startDay, activeSchoolMatch, pendingPrompt, submitClassification } = useOutreachTracking(user?.id);
  const [customNote, setCustomNote] = React.useState('');
  const [allActivities, setAllActivities] = React.useState<any[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const filteredActivities = React.useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return allActivities.filter(a => {
      const dt = a.walkInDateTime || a.lsqCreatedOn;
      if (!dt) return false;
      const ts = new Date(dt).getTime();
      return ts >= start.getTime() && ts <= end.getTime();
    });
  }, [allActivities, selectedDate]);

  const dates = React.useMemo(() => {
    return Array.from({length: 15}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    });
  }, []);

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
    if (user?.email) {
      const unsub = firestore().collection('crmActivities')
        .where('executiveEmail', '==', user.email.toLowerCase())
        .onSnapshot((snapshot) => {
          if (!snapshot) return;
          const activities = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setAllActivities(activities);
        });

      return () => unsub();
    }
  }, [user?.email]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 }}>
        {/* Header */}
        <HStack className="w-full justify-between items-center mb-6">
          <VStack>
            <Text className="text-muted-foreground text-sm font-medium mb-1">Hello,</Text>
            <Heading size="2xl" className="text-foreground font-bold tracking-tight">{user?.name ?? 'Executive'}</Heading>
          </VStack>
        </HStack>

        {/* Date Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-4 px-4" contentContainerStyle={{ paddingRight: 32 }}>
          {dates.map((d, i) => {
            const isSelected = d.toDateString() === selectedDate.toDateString();
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(d)}
                className={`px-4 py-3 mr-3 rounded-xl border ${isSelected ? 'bg-primary border-primary' : 'bg-card border-border/40'} shadow-sm items-center justify-center min-w-[72px]`}
              >
                <Text className={`text-xs font-semibold uppercase mb-1 tracking-wider ${isSelected ? 'text-primary-foreground' : (isToday ? 'text-primary' : 'text-muted-foreground')}`}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text className={`text-xl font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {d.getDate()}
                </Text>
                {isToday && !isSelected && (
                  <Box className="w-1.5 h-1.5 rounded-full bg-primary mt-1 absolute bottom-1" />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <VStack space="md" className="w-full mb-6">
          <HStack space="md" className="w-full">
            <Card className="flex-1 bg-card p-5 rounded-2xl border border-border/40 shadow-md">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Schools Visited on {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Heading size="3xl" className="text-foreground font-extrabold">{filteredActivities.length}</Heading>
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

        {/* Remove New Visit button */}

        {/* Today's Visits */}
        <Heading size="lg" className="text-foreground font-bold mb-4 tracking-tight w-full">
          {selectedDate.toDateString() === new Date().toDateString() ? "Today's Visits" : `Visits on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </Heading>
        {filteredActivities.length === 0 ? (
          <VStack className="w-full items-center justify-center py-12 bg-card rounded-2xl border border-border/40 border-dashed shadow-md mb-8">
            <Text className="text-5xl mb-4">🏫</Text>
            <Text className="text-foreground font-semibold text-lg">No schools visited</Text>
            <Text className="text-muted-foreground text-sm mt-1 text-center px-4">Schools logged in LeadSquared will appear here automatically.</Text>
          </VStack>
        ) : (
          <VStack space="md" className="w-full mb-8">
            {filteredActivities.map((act) => (
              <Box key={act.id} className="bg-card p-5 rounded-2xl border border-border/40 shadow-sm">
                <Text className="font-bold text-lg text-foreground mb-1">{act.schoolName || 'Unknown School'}</Text>
                <Text className="text-sm text-muted-foreground">
                  {act.typeOfWalkIn || act.activityType || 'Visit'} — {act.walkInStatus || 'Logged'}
                </Text>
              </Box>
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
