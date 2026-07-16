/**
 * Executive navigator — bottom tabs + nested visit flow stack.
 */
import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExecutiveTabParamList } from '../types';
import { useLocationPinger } from '../hooks/useLocationPinger';
import { Image, TouchableOpacity, Modal, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { User, Menu, MapPin, FileText, List, Briefcase } from 'lucide-react-native';

import DashboardScreen from '../screens/executive/DashboardScreen';
import MeetingNotesScreen from './../screens/executive/MeetingNotesScreen';
import TasksScreen from '../screens/executive/TasksScreen';
import LeadsScreen from '../screens/executive/LeadsScreen';
import Activity232FormScreen from '../screens/executive/Activity232FormScreen';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';

// (VisitFlowNavigator removed)

import { useAuthStore } from '../stores/authStore';
import { Button, ButtonText } from '@/components/ui/button';

// ─── Profile Placeholder ─────────────────────────────────────────────────────

function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <VStack className="flex-1 justify-center items-center bg-background p-6 space-y-6">
      <VStack className="items-center mb-12">
        <Box className="w-28 h-28 rounded-full bg-slate-50 items-center justify-center mb-6 border border-slate-200">
          <User color="#94A3B8" size={48} strokeWidth={1.5} />
        </Box>
        {user?.name && <Text className="text-foreground text-2xl font-bold">{user.name}</Text>}
        {user?.email && <Text className="text-zinc-500 text-base mt-1">{user.email}</Text>}
      </VStack>
      <View style={{ marginTop: 'auto', width: '100%', alignItems: 'center' }}>
        <Button
          size="lg"
          variant="outline"
          className="w-full max-w-[300px] rounded-2xl border-red-600 bg-transparent py-4 h-14"
          onPress={logout}
        >
          <ButtonText className="text-red-600 font-bold text-lg tracking-wider">Logout</ButtonText>
        </Button>
      </View>
    </VStack>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ─── Header Menu Component ───────────────────────────────────────────────────

function HeaderRightMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{ padding: 8, marginRight: 12, marginTop: 8, borderRadius: 20 }}
      >
        <Menu color="#0F172A" size={28} strokeWidth={1.5} />
      </TouchableOpacity>

      <Modal visible={visible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <TouchableWithoutFeedback>
              <View style={{
                position: 'absolute',
                top: 60,
                right: 16,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
                minWidth: 160
              }}>
                <TouchableOpacity
                  style={{ padding: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 10 }}
                  onPress={() => {
                    setVisible(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <User color="#0F172A" size={20} strokeWidth={1.5} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#0F172A', fontWeight: '500' }}>Profile</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

// ─── Bottom Tabs ─────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<ExecutiveTabParamList>();
const ExecutiveStack = createNativeStackNavigator();

function ExecutiveTabs() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerStyle: {
            backgroundColor: '#F8FAFC',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <Image
              source={require('../../assets/LOGO.png')}
              style={{ width: 140, height: 40, marginLeft: 16, marginTop: 8 }}
              resizeMode="contain"
            />
          ),
          headerRight: () => <HeaderRightMenu />,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: '#E11D48',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Tracking',
            tabBarIcon: ({ color, size }) => (
              <MapPin size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tab.Screen
          name="Notes"
          component={MeetingNotesScreen}
          options={{
            tabBarLabel: 'Notes',
            tabBarIcon: ({ color, size }) => (
              <FileText size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tab.Screen
          name="Leads"
          component={LeadsScreen}
          options={{
            tabBarLabel: 'Leads',
            tabBarIcon: ({ color, size }) => (
              <Briefcase size={size} color={color} strokeWidth={2} />
            ),
          }}
        />

        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            tabBarLabel: 'Tasks',
            tabBarIcon: ({ color, size }) => (
              <List size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

export default function ExecutiveNavigator() {
  // Activate real-time location fetch listener for TL requests
  useLocationPinger();

  return (
    <ExecutiveStack.Navigator screenOptions={{ headerShown: false }}>
      <ExecutiveStack.Screen name="ExecutiveTabs" component={ExecutiveTabs} />
      <ExecutiveStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false
        }}
      />
      <ExecutiveStack.Screen
        name="ActivityForm"
        component={Activity232FormScreen}
        options={{
          headerShown: true,
          title: 'Mark Activity',
          headerStyle: { backgroundColor: '#F8FAFC' },
          headerShadowVisible: false,
          presentation: 'modal'
        }}
      />
    </ExecutiveStack.Navigator>
  );
}
