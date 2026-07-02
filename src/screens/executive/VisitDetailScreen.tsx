import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVisit, getMeetingsForVisit } from '../../services/firestore';
import { useVisitStore } from '../../stores/visitStore';
import { useSyncStore } from '../../stores/syncStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitStackParamList, Visit, Meeting } from '../../types';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

type Props = NativeStackScreenProps<VisitStackParamList, 'VisitDetail'>;

export default function VisitDetailScreen({ navigation, route }: Props) {
  const { visitId } = route.params;
  const { completeVisit } = useVisitStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    loadData();
  }, [visitId]);

  const loadData = async () => {
    const v = await getVisit(visitId);
    setVisit(v);
    const m = await getMeetingsForVisit(visitId);
    setMeetings(m);
  };

  const handleComplete = async () => {
    Alert.alert('Complete Visit', 'Are you sure you want to finish this visit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'default',
        onPress: async () => {
          await completeVisit(visitId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!visit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
        <VStack className="flex-1 justify-center items-center">
          <Spinner size="large" color="#E11D48" />
        </VStack>
      </SafeAreaView>
    );
  }

  const hasSeminarInterest = meetings.some((m) => m.seminarInterest);
  const checkInTime = new Date(visit.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Header Section */}
        <VStack space="md" className="mb-6">
          <HStack className="justify-between items-start">
            <VStack className="flex-1 pr-4">
              <Heading size="2xl" className="text-foreground font-bold">{visit.schoolName}</Heading>
              <Text className="text-muted-foreground mt-1">
                Started at {checkInTime}
              </Text>
            </VStack>
            <Badge variant="default" className="rounded-full bg-primary/10">
              <BadgeText className="text-primary font-bold">{visit.status?.toUpperCase() || 'UNKNOWN'}</BadgeText>
            </Badge>
          </HStack>
        </VStack>

        {/* Visit Information */}
        <Card className="bg-card border-border/50 rounded-xl p-4 mb-6">
          <VStack space="md">
            <HStack className="justify-between">
              <Text className="text-muted-foreground">Network Type</Text>
              <Text className="text-foreground font-medium uppercase">{visit.networkType}</Text>
            </HStack>
            <HStack className="justify-between">
              <Text className="text-muted-foreground">Battery Level</Text>
              <Text className="text-foreground font-medium">{visit.batteryPercent}%</Text>
            </HStack>
            <HStack className="justify-between">
              <Text className="text-muted-foreground">Location Status</Text>
              <Text className={visit.mockLocationFlag ? 'text-destructive font-medium' : 'text-[#22C55E] font-medium'}>
                {visit.mockLocationFlag ? 'MOCK/SPOOFED' : 'Verified'}
              </Text>
            </HStack>
          </VStack>
        </Card>

        {/* Check-in Photo */}
        {(visit.photoLocalUri || visit.watermarkedLocalUri) && (
          <Box className="mb-6">
            <Heading size="lg" className="text-foreground font-semibold mb-3">Check-in Photo</Heading>
            <Image
              source={{ uri: visit.watermarkedLocalUri || visit.photoLocalUri }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              resizeMode="cover"
            />
          </Box>
        )}

        {/* Seminars List */}
        <HStack className="justify-between items-center mb-3">
          <Heading size="lg" className="text-foreground font-semibold">Seminars Conducted</Heading>
          {visit.status === 'inProgress' && (
            <Button size="sm" variant="outline" className="border-primary rounded-lg" onPress={() => navigation.navigate('Meeting', { visitId })}>
              <ButtonText className="text-primary font-bold">+ Record</ButtonText>
            </Button>
          )}
        </HStack>

        {meetings.length > 0 ? (
          <VStack space="md" className="mb-6">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="bg-card border-l-4 border-l-primary border-border/50 rounded-xl p-4">
                <HStack className="justify-between items-start mb-2">
                  <Box className="flex-1">
                    <Text className="text-foreground font-semibold text-base">Session {meeting.sessionId.slice(0, 8)}</Text>
                    <Text className="text-muted-foreground text-sm">
                      {meeting.endTimestamp ? `${Math.round((meeting.endTimestamp - meeting.startTimestamp) / 60000)} min` : 'In Progress'}
                    </Text>
                  </Box>
                  {meeting.outcome && (
                    <Badge variant="default" className="rounded-full bg-success-500">
                      <BadgeText className="text-white">{meeting.outcome}</BadgeText>
                    </Badge>
                  )}
                </HStack>

                {meeting.seminarInterest && (
                  <Badge variant="outline" className="self-start rounded-md border-border mt-2">
                    <BadgeText className="text-foreground">Interest Shown ({meeting.interestedStudentCount} students)</BadgeText>
                  </Badge>
                )}
                
                {meeting.recordingHash && (
                  <Text className="text-muted-foreground text-xs mt-3 font-mono">
                    🔒 {meeting.recordingHash.slice(0, 16)}...
                  </Text>
                )}
              </Card>
            ))}
          </VStack>
        ) : (
          <Box className="bg-card/50 border border-border/50 border-dashed rounded-xl p-6 items-center mb-6">
            <Text className="text-muted-foreground mb-3 text-center">No seminars recorded yet.</Text>
            {visit.status === 'inProgress' && (
              <Button size="default" variant="outline" className="border-border rounded-xl" onPress={() => navigation.navigate('Meeting', { visitId })}>
                <ButtonText className="text-foreground">Record First Seminar</ButtonText>
              </Button>
            )}
          </Box>
        )}

        {/* Action Buttons */}
        {visit.status === 'inProgress' && (
          <VStack space="md" className="mt-4">
            {hasSeminarInterest && (
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-xl border-[#22C55E] h-14"
                onPress={() => navigation.navigate('Appointment', { visitId, schoolId: visit.schoolId })}
              >
                <ButtonText className="font-bold text-lg text-[#22C55E]">📅 Book Appointment</ButtonText>
              </Button>
            )}

            <Button
              size="lg"
              className="flex-1 rounded-xl shadow-sm bg-[#22C55E] h-14"
              onPress={handleComplete}
            >
              <ButtonText className="font-bold text-lg text-white">✓ Complete Visit</ButtonText>
            </Button>
          </VStack>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
