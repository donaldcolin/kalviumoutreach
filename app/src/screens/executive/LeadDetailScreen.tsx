import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '../../stores/authStore';
import { useWalkInStore } from '../../stores/walkInStore';
import { Building2 } from 'lucide-react-native';

// ─── Status Tags (Red/White/Gray only) ───────────────────────────────────────
const getStatusTag = (status: string) => {
  const isImportant = status.includes('Refused') || status.includes('Principal');
  if (isImportant) {
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  }
  return { bg: 'bg-white', text: 'text-gray-600', border: 'border-gray-200' };
};

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function formatShortDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function getSubStatus(act: any): string | null {
  return act.statusFrontDesk || act.statusPIC || act.statusPrincipal || null;
}

function getContactInfo(act: any): { name: string; phone?: string; label: string } | null {
  if (act.picName) return { name: act.picName, phone: act.picPhone, label: 'PIC' };
  if (act.principalName) return { name: act.principalName, phone: act.principalPhone, label: 'Principal' };
  return null;
}

function getAppointmentDate(act: any): string | null {
  return act.picAppointmentDate || act.principalAppointmentDate || act.seminarAppointmentDate || null;
}

// ─── Activity Card ───────────────────────────────────────────────────────────

function ActivityCard({ act, index }: { act: any; index: number }) {
  const statusTag = act.walkInStatus ? getStatusTag(act.walkInStatus) : null;
  const subStatus = getSubStatus(act);
  const contact = getContactInfo(act);
  const appointmentDate = getAppointmentDate(act);
  const dateStr = act.walkInDateTime || act.lsqCreatedOn;

  return (
    <View className="flex-row mb-4">
      {/* Timeline line + dot */}
      <View className="w-8 items-center mr-3 relative">
        {/* The line goes full height of the card minus the dot offset */}
        <View className="absolute top-2 bottom-[-16px] w-[2px] bg-gray-200" />
        <View className={`w-3 h-3 rounded-full mt-1.5 z-10 ${index === 0 ? 'bg-red-600' : 'bg-gray-300'}`} />
      </View>

      {/* Card */}
      <View className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header: Date + Type */}
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="font-bold text-base text-gray-900 flex-1 mr-3" numberOfLines={1}>
              {act.schoolName || 'Unknown School'}
            </Text>
            {index === 0 && (
              <View className="bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                <Text className="text-[10px] font-bold text-red-600">LATEST</Text>
              </View>
            )}
          </View>
          
          <Text className="text-xs text-gray-400 font-medium mb-3">
            {dateStr ? `${formatDate(dateStr)} • ${formatTime(dateStr)}` : 'Unknown date'}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {act.typeOfWalkIn && (
              <View className="bg-white px-2 py-1 rounded-md border border-gray-200">
                <Text className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">{act.typeOfWalkIn}</Text>
              </View>
            )}
            {statusTag && (
              <View className={`${statusTag.bg} ${statusTag.border} border px-2 py-1 rounded-md`}>
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${statusTag.text}`}>
                  {act.walkInStatus?.split(' - ')[0]}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sub-status + Details */}
        {(subStatus || contact || appointmentDate || act.refusedEntryReason || act.notes) && (
          <View className="px-4 py-3 border-t border-gray-100">
            {subStatus && (
              <Text className="text-xs font-semibold text-gray-700 mb-1">
                {subStatus}
              </Text>
            )}

            {act.refusedEntryReason && (
              <Text className="text-xs text-red-600 font-medium mb-1">
                Reason: {act.refusedEntryReason}
              </Text>
            )}

            {contact && (
              <Text className="text-xs text-gray-500 mb-1">
                {contact.label}: <Text className="font-semibold text-gray-700">{contact.name}</Text>
                {contact.phone && ` • ${contact.phone}`}
              </Text>
            )}

            {appointmentDate && (
              <Text className="text-xs text-gray-500 mb-1">
                Appointment: <Text className="font-semibold text-gray-700">{formatShortDate(appointmentDate)}, {formatTime(appointmentDate)}</Text>
              </Text>
            )}

            {act.boardOfSchool && (
              <View className="flex-row items-center mt-1">
                <Text className="text-xs text-gray-500">Board: <Text className="font-medium text-gray-700">{act.boardOfSchool}</Text></Text>
                {act.studentStrength && <Text className="text-xs text-gray-500 ml-2">• 12th: <Text className="font-medium text-gray-700">{act.studentStrength}</Text></Text>}
              </View>
            )}

            {act.followUpDate && (
              <Text className="text-xs text-gray-500 mt-2 mb-1">
                Follow-up: <Text className="font-semibold text-gray-700">{formatShortDate(act.followUpDate)}</Text>
              </Text>
            )}

            {act.notes && act.notes !== 'Walk-in Started' && (
              <Text className="text-xs text-gray-400 italic mt-1" numberOfLines={2}>
                "{act.notes}"
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LeadDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { leadId, leadName } = route.params || {};
  const { user } = useAuthStore();
  const { beginWalkIn } = useWalkInStore();

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const handleAddWalkIn = async () => {
    setIsStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to start a walk-in.');
        setIsStarting(false);
        return;
      }

      const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));

      let loc: any;
      try {
        loc = await Promise.race([locationPromise, timeoutPromise]);
      } catch {
        loc = await Location.getLastKnownPositionAsync();
        if (!loc) throw new Error('Could not fetch location');
      }

      const startLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      const startTime = new Date().toISOString();

      // Persist ongoing walk-in
      if (user?.id) {
        await beginWalkIn({
          leadId,
          leadName: leadName || 'Unknown School',
          startTime,
          startLocation: startLoc,
          executiveId: user.id,
        });
      }

      // Navigate directly to the choice screen
      navigation.navigate('ActivityForm', {
        leadId,
        leadName,
        resumeWalkIn: true,
        startLocation: startLoc,
        startTime,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to get your location. Please ensure location services are enabled.');
    } finally {
      setIsStarting(false);
    }
  };

  // Real-time listener for activities by this lead
  useEffect(() => {
    if (!leadId) return;

    const unsub = firestore()
      .collection('crmActivities')
      .where('lsqLeadId', '==', leadId)
      .onSnapshot((snapshot) => {
        if (!snapshot) return;
        const acts = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        // Sort newest first
        acts.sort((a, b) => {
          const ta = new Date(a.walkInDateTime || a.lsqCreatedOn || 0).getTime();
          const tb = new Date(b.walkInDateTime || b.lsqCreatedOn || 0).getTime();
          return tb - ta;
        });
        setActivities(acts);
        setLoading(false);
      });

    return () => unsub();
  }, [leadId]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-4 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="mb-4">
          <Text className="text-gray-600 text-sm font-medium">{'< Back to Leads'}</Text>
        </Pressable>
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mr-4">
            <Building2 size={24} color="#DC2626" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
              {leadName || 'Unknown School'}
            </Text>
            <Text className="text-sm text-gray-400 mt-1">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} recorded
            </Text>
          </View>
        </View>
      </View>

      {/* Activity Timeline */}
      <ScrollView className="flex-1 bg-gray-50 px-4 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : activities.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-lg font-bold text-gray-900 mb-2">No activities yet</Text>
            <Text className="text-gray-500 text-center text-sm px-8 leading-relaxed">
              Start your first walk-in visit to this school. Activities will appear here as a timeline.
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">
              Activity Timeline
            </Text>
            <View>
              {activities.map((act, index) => (
                <ActivityCard key={act.id} act={act} index={index} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Walk-In Button */}
      <View
        className="absolute left-0 right-0 px-4 pb-4 bg-gray-50/90"
        style={{ bottom: insets.bottom || 16 }}
      >
        <Pressable
          className={`w-full rounded-xl py-4 items-center justify-center flex-row ${isStarting ? 'bg-red-400' : 'bg-red-600'}`}
          onPress={handleAddWalkIn}
          disabled={isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-lg">+ Add Walk-In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
