import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

// ─── Global Ref ──────────────────────────────────────────────────────────────

let globalShowToast: (options: ToastOptions) => void = () => {
  console.warn('ToastManager is not mounted yet.');
};

export const Toast = {
  show: (options: ToastOptions) => {
    globalShowToast(options);
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

const TOAST_DURATION = 3000;

export const ToastManager = () => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  
  // Animation state: -150 means hidden above screen, 0 means resting position
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-150, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setToast)(null);
      }
    });
  }, [translateY, opacity]);

  const showToast = useCallback((options: ToastOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast(options);
    
    // Animate in
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 200 });

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      hideToast();
    }, options.duration || TOAST_DURATION);
  }, [hideToast, translateY, opacity]);

  useEffect(() => {
    // Bind the global function when mounted
    globalShowToast = showToast;
    return () => {
      globalShowToast = () => {
        console.warn('ToastManager is unmounted.');
      };
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  let Icon = Info;
  let bgColor = '#eff6ff'; // blue-50
  let borderColor = '#bfdbfe'; // blue-200
  let iconColor = '#3b82f6'; // blue-500

  if (toast.type === 'success') {
    Icon = CheckCircle2;
    bgColor = '#f0fdf4'; // green-50
    borderColor = '#bbf7d0'; // green-200
    iconColor = '#22c55e'; // green-500
  } else if (toast.type === 'error') {
    Icon = AlertCircle;
    bgColor = '#fef2f2'; // red-50
    borderColor = '#fecaca'; // red-200
    iconColor = '#ef4444'; // red-500
  } else if (toast.type === 'warning') {
    Icon = AlertTriangle;
    bgColor = '#fffbeb'; // amber-50
    borderColor = '#fde68a'; // amber-200
    iconColor = '#f59e0b'; // amber-500
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[styles.toastWrapper, animatedStyle, { backgroundColor: bgColor, borderColor }]}>
        <View style={styles.contentRow}>
          <Icon size={22} color={iconColor} style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{toast.title}</Text>
            {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
          </View>
          <TouchableOpacity onPress={hideToast} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastWrapper: {
    width: Dimensions.get('window').width - 32,
    marginTop: Platform.OS === 'ios' ? 10 : 30, // Extra margin for Android status bar
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937', // gray-800
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#4b5563', // gray-600
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
  },
});
