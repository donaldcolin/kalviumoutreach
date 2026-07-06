import React from 'react';
import { View, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MapPin } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

export interface StartDayModalProps {
  isTrackingInitialized: boolean;
  isTracking: boolean;
  isStarting: boolean;
  startCoords: { lat: number; lng: number } | null;
  animatedButtonStyle: any;
  onStartDay: () => void;
}

export function StartDayModal({
  isTrackingInitialized,
  isTracking,
  isStarting,
  startCoords,
  animatedButtonStyle,
  onStartDay
}: StartDayModalProps) {
  return (
    <Modal visible={isTrackingInitialized && !isTracking} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View className="bg-white p-8 rounded-3xl w-full items-center border border-slate-100">
          <Text className="text-3xl font-bold mb-3 text-center text-slate-900 tracking-tight">Start Your Day</Text>
          <Text className="text-slate-500 mb-8 text-center text-base">
            Begin your day to enable location tracking and log visits.
          </Text>
          
          <TouchableOpacity
            onPress={onStartDay}
            disabled={isStarting}
            activeOpacity={0.9}
          >
            <Animated.View
              className="h-14 rounded-full justify-center items-center flex-row overflow-hidden"
              style={animatedButtonStyle}
            >
              {isStarting && !startCoords ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} className="items-center justify-center w-full h-full">
                  <ActivityIndicator size="small" color="#ffffff" />
                </Animated.View>
              ) : startCoords ? (
                <Animated.View entering={FadeIn} className="flex-row items-center justify-center space-x-2">
                  <MapPin size={24} color="#ffffff" strokeWidth={2.5} />
                  <Text className="text-white text-lg font-bold ml-2">Located!</Text>
                </Animated.View>
              ) : (
                <Animated.Text exiting={FadeOut} className="text-white text-xl font-extrabold tracking-wider">
                  START
                </Animated.Text>
              )}
            </Animated.View>
          </TouchableOpacity>

          {startCoords && (
            <Animated.Text entering={FadeIn} className="text-slate-500 text-xs mt-4 font-mono">
              {startCoords.lat.toFixed(4)}, {startCoords.lng.toFixed(4)}
            </Animated.Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
