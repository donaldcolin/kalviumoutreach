import React, { useEffect, useCallback } from 'react';
import { ScrollView, View, AppState, RefreshControl, FlatList, InteractionManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor, Easing, FadeInUp } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInStore } from '../../stores/walkInStore';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { useOutreachTracking } from '../../tracking/useOutreachTracking';
import { useCrmActivitiesStore } from '../../stores/crmActivitiesStore';
import { useTasksStore } from '../../stores/tasksStore';
import { processAudioQueue } from '../../services/audioUploadQueue';

import {
  DashboardHeader,
  DashboardDatePicker,
  DailyStatsCard,
  TrackingStatusIndicator,
  OngoingWalkInCard,
  StartDayModal,
  ActivityListHeader,
  ActivityCardItem,
} from '../../components/dashboard';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { isTracking, isTrackingInitialized, sessionStatus, startDay, endDay, activeSchoolMatch } = useOutreachTracking(user?.id);
  const { activities: allActivities, initialize: initCrm, refresh: refreshCrm, isRefreshing: crmRefreshing } = useCrmActivitiesStore();
  const { pendingTasks: appointments, overdueCount, todayCount, completeTask, initialize: initTasks, refresh: refreshTasks, isRefreshing: tasksRefreshing } = useTasksStore();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (user?.email) initCrm(user.email);
      if (user?.id) initTasks(user.id);
    });
    return () => task.cancel();
  }, [user?.email, user?.id]);
  const { ongoingWalkIn, loadOngoing } = useWalkInStore();

  useEffect(() => {
    if (user?.id) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadOngoing(user.id);
      });
      return () => task.cancel();
    }
  }, [user?.id]);

  useEffect(() => {
    // Process on mount
    InteractionManager.runAfterInteractions(() => {
      processAudioQueue();
    });

    // Process on app resume
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        InteractionManager.runAfterInteractions(() => {
          processAudioQueue();
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const isRefreshing = crmRefreshing || tasksRefreshing;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshCrm(),
      refreshTasks(),
      user?.id ? loadOngoing(user.id) : Promise.resolve(),
    ]);
    // Process audio queue without blocking the refresh spinner
    InteractionManager.runAfterInteractions(() => {
      processAudioQueue();
    });
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
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#E11D48']} tintColor="#E11D48" />
        }
        ListHeaderComponent={
          <>
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

            <TrackingStatusIndicator 
              isTracking={isTracking} 
              sessionStatus={sessionStatus}
              onEndDay={endDay} 
              onStartDay={startDay}
            />

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

            <ActivityListHeader count={filteredActivities.length} />
          </>
        }
        renderItem={({ item }) => <ActivityCardItem activity={item} />}
      />

      <StartDayModal
        isTrackingInitialized={isTrackingInitialized}
        sessionStatus={sessionStatus}
        isStarting={isStarting}
        startCoords={startCoords}
        animatedButtonStyle={animatedButtonStyle}
        onStartDay={handleStartDay}
      />
    </View>
  );
}
