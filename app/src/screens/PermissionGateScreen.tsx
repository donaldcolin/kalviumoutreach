/**
 * PermissionGate — Full-screen onboarding that requests all critical
 * permissions before the user enters the app.
 *
 * Permissions requested:
 *  1. Foreground Location
 *  2. Background Location
 *  3. Notifications (FCM push)
 *  4. Microphone (meeting recordings)
 *
 * Once all are granted (or explicitly denied), the gate opens and never
 * shows again for that device (persisted via AsyncStorage).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Linking,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapPin,
  Navigation,
  Bell,
  Mic,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';

const PERMISSION_GATE_KEY = 'permissions_onboarding_complete';

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: PermissionStatus;
}

export function usePermissionGate() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PERMISSION_GATE_KEY).then((val) => {
      setIsComplete(val === 'true');
    });
  }, []);

  const markComplete = useCallback(async () => {
    await AsyncStorage.setItem(PERMISSION_GATE_KEY, 'true');
    setIsComplete(true);
  }, []);

  return { isComplete, markComplete };
}

export default function PermissionGateScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'foregroundLocation',
      label: 'Location Access',
      description: 'Track your route during field visits',
      icon: <MapPin size={22} color="#E11D48" strokeWidth={2} />,
      status: 'pending',
    },
    {
      id: 'backgroundLocation',
      label: 'Background Location',
      description: 'Keep tracking when the app is minimised',
      icon: <Navigation size={22} color="#7C3AED" strokeWidth={2} />,
      status: 'pending',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Receive location pings and task alerts',
      icon: <Bell size={22} color="#F59E0B" strokeWidth={2} />,
      status: 'pending',
    },
    {
      id: 'microphone',
      label: 'Microphone',
      description: 'Record meeting notes during walk-ins',
      icon: <Mic size={22} color="#10B981" strokeWidth={2} />,
      status: 'pending',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const buttonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Check which permissions are already granted
  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    const updates: Record<string, PermissionStatus> = {};

    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status === 'granted') updates.foregroundLocation = 'granted';
    } catch {}

    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (bg.status === 'granted') updates.backgroundLocation = 'granted';
    } catch {}

    try {
      const authStatus = await messaging().hasPermission();
      if (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      ) {
        updates.notifications = 'granted';
      }
    } catch {}

    try {
      const audio = await getRecordingPermissionsAsync();
      if (audio.status === 'granted') updates.microphone = 'granted';
    } catch {}

    if (Object.keys(updates).length > 0) {
      setPermissions((prev) =>
        prev.map((p) => ({
          ...p,
          status: updates[p.id] ?? p.status,
        }))
      );
    }

    // If all already granted, skip the gate
    const allGranted = ['foregroundLocation', 'backgroundLocation', 'notifications', 'microphone']
      .every((id) => updates[id] === 'granted');
    if (allGranted) {
      onComplete();
    }
  };

  const updatePermission = (id: string, status: PermissionStatus) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const requestAllPermissions = async () => {
    setIsRequesting(true);

    // Micro-interaction
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1)
    );

    // 1. Foreground Location
    setCurrentStep(0);
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      updatePermission('foregroundLocation', fg.status === 'granted' ? 'granted' : 'denied');
    } catch {
      updatePermission('foregroundLocation', 'denied');
    }

    // Small delay between prompts so Android doesn't stack them
    await new Promise((r) => setTimeout(r, 500));

    // 2. Background Location (must be requested AFTER foreground on Android)
    setCurrentStep(1);
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      updatePermission('backgroundLocation', bg.status === 'granted' ? 'granted' : 'denied');
    } catch {
      updatePermission('backgroundLocation', 'denied');
    }

    await new Promise((r) => setTimeout(r, 500));

    // 3. Notifications
    setCurrentStep(2);
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      updatePermission('notifications', enabled ? 'granted' : 'denied');
    } catch {
      updatePermission('notifications', 'denied');
    }

    await new Promise((r) => setTimeout(r, 500));

    // 4. Microphone
    setCurrentStep(3);
    try {
      const mic = await requestRecordingPermissionsAsync();
      updatePermission('microphone', mic.status === 'granted' ? 'granted' : 'denied');
    } catch {
      updatePermission('microphone', 'denied');
    }

    setIsRequesting(false);
    setAllDone(true);
  };

  const handleContinue = () => {
    onComplete();
  };

  const grantedCount = permissions.filter((p) => p.status === 'granted').length;
  const deniedCount = permissions.filter((p) => p.status === 'denied').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
        <View style={styles.shieldBadge}>
          <Shield size={28} color="#E11D48" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>App Permissions</Text>
        <Text style={styles.subtitle}>
          We need a few permissions to ensure tracking, notifications, and recording work properly.
        </Text>
      </Animated.View>

      {/* Permission List */}
      <View style={styles.permissionList}>
        {permissions.map((perm, idx) => (
          <Animated.View
            key={perm.id}
            entering={FadeInDown.delay(200 + idx * 100).duration(500)}
            style={[
              styles.permissionRow,
              isRequesting && currentStep === idx && styles.permissionRowActive,
              perm.status === 'granted' && styles.permissionRowGranted,
              perm.status === 'denied' && styles.permissionRowDenied,
            ]}
          >
            <View style={styles.permissionIcon}>{perm.icon}</View>
            <View style={styles.permissionText}>
              <Text style={styles.permissionLabel}>{perm.label}</Text>
              <Text style={styles.permissionDesc}>{perm.description}</Text>
            </View>
            <View style={styles.permissionStatus}>
              {perm.status === 'granted' && (
                <CheckCircle2 size={20} color="#10B981" strokeWidth={2.5} />
              )}
              {perm.status === 'denied' && (
                <XCircle size={20} color="#EF4444" strokeWidth={2.5} />
              )}
              {perm.status === 'pending' && isRequesting && currentStep === idx && (
                <View style={styles.pulseDot} />
              )}
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Action Button */}
      <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.footer}>
        {!allDone ? (
          <TouchableOpacity
            onPress={requestAllPermissions}
            disabled={isRequesting}
            activeOpacity={0.85}
          >
            <Animated.View
              style={[
                styles.primaryButton,
                isRequesting && styles.primaryButtonDisabled,
                animatedButtonStyle,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Grant Permissions'}
              </Text>
              {!isRequesting && (
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <View>
            {deniedCount > 0 && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.deniedBanner}>
                <Text style={styles.deniedBannerText}>
                  {deniedCount} permission{deniedCount > 1 ? 's were' : ' was'} denied. Some features may not work properly.
                  You can enable them later in Settings.
                </Text>
                <TouchableOpacity onPress={() => Linking.openSettings()}>
                  <Text style={styles.settingsLink}>Open Settings</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            <TouchableOpacity onPress={handleContinue} activeOpacity={0.85}>
              <Animated.View
                entering={FadeIn.delay(200).duration(400)}
                style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
              >
                <Text style={styles.primaryButtonText}>
                  {deniedCount > 0 ? 'Continue Anyway' : 'All Set — Continue'}
                </Text>
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footerNote}>
          Your data stays private and is only shared with your team lead.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  permissionList: {
    gap: 10,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  permissionRowActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  permissionRowGranted: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  permissionRowDenied: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionText: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  permissionStatus: {
    width: 28,
    alignItems: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    opacity: 0.8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryButton: {
    backgroundColor: '#E11D48',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deniedBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deniedBannerText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  settingsLink: {
    fontSize: 13,
    color: '#E11D48',
    fontWeight: '600',
    marginTop: 6,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 16,
  },
});
