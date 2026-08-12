/**
 * Executive navigator — bottom tabs + nested visit flow stack.
 */
import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExecutiveTabParamList } from '../types';
import { TouchableOpacity, Modal, View, StyleSheet, TouchableWithoutFeedback, Animated, Dimensions, Easing } from 'react-native';
import { Image } from 'expo-image';
import { User, Menu, MapPin, FileText, List, Briefcase, Bug, Plus, X } from 'lucide-react-native';
import { useActionSheet, ActionSheetProvider } from '@expo/react-native-action-sheet';

import DashboardScreen from '../screens/executive/DashboardScreen';
import TasksScreen from '../screens/executive/TasksScreen';
import LeadsScreen from '../screens/executive/LeadsScreen';
import LeadDetailScreen from '../screens/executive/LeadDetailScreen';
import WalkInSessionScreen from '../screens/executive/WalkInSessionScreen';
import BugReportScreen from '../screens/executive/BugReportScreen';
import AddLeadScreen from '../screens/executive/AddLeadScreen';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';

// (VisitFlowNavigator removed)

import { useAuthStore } from '../stores/authStore';
import { useTasksStore } from '../stores/tasksStore';
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

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;

function HeaderRightMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();

  const openMenu = () => setVisible(true);

  const closeMenu = (callback?: () => void) => {
    setVisible(false);
    if (callback) callback();
  };

  const navigateTo = (screen: string) => {
    closeMenu(() => navigation.navigate(screen));
  };

  return (
    <>
      <TouchableOpacity
        onPress={openMenu}
        style={{ padding: 8, marginRight: 12, borderRadius: 20 }}
      >
        <Menu color="#0F172A" size={28} strokeWidth={1.5} />
      </TouchableOpacity>

      <Modal transparent visible={visible} onRequestClose={() => closeMenu()} animationType="fade">
        <TouchableWithoutFeedback onPress={() => closeMenu()}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <TouchableWithoutFeedback>
              <View
                style={{
                  position: 'absolute',
                  top: 60,
                  right: 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  width: 200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  elevation: 8,
                  overflow: 'hidden'
                }}
              >
                <TouchableOpacity
                  onPress={() => navigateTo('Profile')}
                  className="px-5 py-4 border-b border-slate-50 flex-row items-center"
                >
                  <User color="#64748B" size={20} />
                  <Text className="text-base font-medium text-slate-700 ml-3">Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateTo('AddLead')}
                  className="px-5 py-4 border-b border-slate-50 flex-row items-center"
                >
                  <Plus color="#64748B" size={20} />
                  <Text className="text-base font-medium text-slate-700 ml-3">Add Lead</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateTo('BugReport')}
                  className="px-5 py-4 flex-row items-center"
                >
                  <Bug color="#64748B" size={20} />
                  <Text className="text-base font-medium text-slate-700 ml-3">Report Bug</Text>
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
  const { overdueCount, todayCount } = useTasksStore();
  const pendingCount = overdueCount + todayCount;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <Image
              source={require('../../assets/logo_small.png')}
              style={{ width: 120, height: 32, marginLeft: 16 }}
              contentFit="contain"
            />
          ),
          headerRight: () => <HeaderRightMenu />,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: '#DC2626',
          tabBarInactiveTintColor: '#9CA3AF',
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
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: 10 },
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
  return (
    <ActionSheetProvider>
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
          name="LeadDetail"
          component={LeadDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <ExecutiveStack.Screen
          name="ActivityForm"
          component={WalkInSessionScreen}
          options={{
            headerShown: false,
          }}
        />
        <ExecutiveStack.Screen
          name="AddLead"
          component={AddLeadScreen}
          options={{
            headerShown: false,
          }}
        />
        <ExecutiveStack.Screen
          name="BugReport"
          component={BugReportScreen}
          options={{
            headerShown: true,
            title: '',
            headerStyle: { backgroundColor: '#F8FAFC' },
            headerShadowVisible: false,
            headerTintColor: '#64748B'
          }}
        />
      </ExecutiveStack.Navigator>
    </ActionSheetProvider>
  );
}
