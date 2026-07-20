import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor, Easing, FadeInUp } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInStore } from '../../stores/walkInStore';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useOutreachTracking } from '../../tracking/useOutreachTracking';
import { useCrmActivities } from '../../hooks/useCrmActivities';
import { usePendingAppointments } from '../../hooks/usePendingAppointments';

import {
  DashboardHeader,
  DashboardDatePicker,
  DailyStatsCard,
  TrackingStatusIndicator,
  OngoingWalkInCard,
  UpcomingTasksList,
  StartDayModal,
  ActivityList,
} from '../../components/dashboard';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { isTracking, isTrackingInitialized, startDay, activeSchoolMatch } = useOutreachTracking(user?.id);
  const allActivities = useCrmActivities(user?.email);
  const { appointments, completeTask } = usePendingAppointments(user?.id);
  const { ongoingWalkIn, loadOngoing } = useWalkInStore();

  useEffect(() => {
    if (user?.id) {
      loadOngoing(user.id);
    }
  }, [user?.id]);
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
    return Array.from({ length: 15 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (14 - i));
      return d;
    });
  }, []);

  const dateScrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      dateScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const [isStarting, setIsStarting] = React.useState(false);
  const [startCoords, setStartCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  const buttonWidth = useSharedValue(200);
  const buttonColorProgression = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      buttonColorProgression.value,
      [0, 1],
      ['#E11D48', '#10B981'] // soft crimson to emerald-500
    );

    return {
      width: buttonWidth.value,
      backgroundColor: bgColor,
      transform: [{ scale: buttonScale.value }]
    };
  });

  const handleStartDay = async () => {
    setIsStarting(true);

    // Micro-interaction
    buttonScale.value = withTiming(0.95, { duration: 100 }, () => {
      buttonScale.value = withSpring(1);
    });

    // Morph to circle
    buttonWidth.value = withTiming(56, { duration: 300, easing: Easing.out(Easing.ease) });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsStarting(false);
        buttonWidth.value = withSpring(200);
        startDay(); // fallback
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStartCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // State 3: Located
      buttonWidth.value = withSpring(200, { damping: 15, stiffness: 100 });
      buttonColorProgression.value = withTiming(1, { duration: 500 });

      setTimeout(() => {
        startDay();
        // Reset state after it closes
        setTimeout(() => {
          setIsStarting(false);
          setStartCoords(null);
          buttonWidth.value = 200;
          buttonColorProgression.value = 0;
        }, 500);
      }, 1500);
    } catch (e) {
      setIsStarting(false);
      buttonWidth.value = withSpring(200);
      startDay(); // fallback
    }
  };



  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 }}>
        <DashboardDatePicker
          dates={dates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          scrollViewRef={dateScrollViewRef}
        />

        <DailyStatsCard
          selectedDate={selectedDate}
          visitCount={filteredActivities.length}
        />

        <TrackingStatusIndicator isTracking={isTracking} />

  

        {ongoingWalkIn && (
          <OngoingWalkInCard
            walkIn={ongoingWalkIn}
            onResume={() => navigation.navigate('ActivityForm', {
              leadId: ongoingWalkIn.leadId,
              leadName: ongoingWalkIn.leadName,
              resumeWalkIn: true,
              startLocation: ongoingWalkIn.startLocation,
              startTime: ongoingWalkIn.startTime,
            })}
          />
        )}

        <UpcomingTasksList
          tasks={appointments}
          onCompleteTask={completeTask}
        />
        <ActivityList activities={filteredActivities} />
      </ScrollView>

      <StartDayModal
        isTrackingInitialized={isTrackingInitialized}
        isTracking={isTracking}
        isStarting={isStarting}
        startCoords={startCoords}
        animatedButtonStyle={animatedButtonStyle}
        onStartDay={handleStartDay}
      />
    </View>
  );
}
