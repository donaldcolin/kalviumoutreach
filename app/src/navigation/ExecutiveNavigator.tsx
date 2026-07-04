/**
 * Executive navigator — bottom tabs + nested visit flow stack.
 */
import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExecutiveTabParamList } from '../types';
import { useLocationPinger } from '../hooks/useLocationPinger';
import { Image, TouchableOpacity, Modal, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/executive/DashboardScreen';
import TasksScreen from '../screens/executive/TasksScreen';
import MeetingNotesScreen from './../screens/executive/MeetingNotesScreen';

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
        <Box className="w-28 h-28 rounded-full bg-zinc-200 items-center justify-center mb-6 shadow-sm">
          <Ionicons name="person" size={56} color="#A1A1AA" />
        </Box>
        <Text className="text-foreground text-3xl font-bold mb-2">Profile</Text>
        {user?.name && <Text className="text-zinc-600 text-xl font-medium">{user.name}</Text>}
        {user?.email && <Text className="text-zinc-500 text-base">{user.email}</Text>}
      </VStack>
      <Button
        size="lg"
        variant="default"
        className="w-full max-w-[300px] rounded-2xl bg-primary py-4 h-14 shadow-sm"
        onPress={logout}
      >
        <ButtonText className="text-primary-foreground font-bold text-lg tracking-wider">Logout</ButtonText>
      </Button>
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
        style={{ padding: 8, marginRight: 12, borderRadius: 20 }}
      >
        <Ionicons name="menu" size={28} color="#111827" />
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
                  <Ionicons name="person-outline" size={20} color="#111827" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '500' }}>Profile</Text>
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
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerStyle: {
            backgroundColor: '#FAF8F5',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <Image
              source={require('../../assets/LOGO.png')}
              style={{ width: 140, height: 40, marginLeft: 16 }}
              resizeMode="contain"
            />
          ),
          headerRight: () => <HeaderRightMenu />,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
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
              <Ionicons name="location" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            tabBarLabel: 'Tasks',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Notes"
          component={MeetingNotesScreen}
          options={{
            tabBarLabel: 'Notes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
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
          headerStyle: { backgroundColor: '#FAF8F5' }, 
          headerShadowVisible: false 
        }} 
      />
    </ExecutiveStack.Navigator>
  );
}
