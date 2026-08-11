import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Toast } from '@/components/ui/ToastManager';
import { useAuthStore } from '../../stores/authStore';
import { ArrowLeft, MapPin, Phone, BookOpen, School } from 'lucide-react-native';
import * as Location from 'expo-location';

const API_URL = 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';

export default function AddLeadScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    schoolName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    state: '',
    board: ''
  });

  const handleSubmit = async () => {
    if (!form.schoolName.trim()) {
      Toast.show({ title: 'Validation Error', message: 'School Name is required', type: 'error' });
      return;
    }
    if (!form.phone.trim()) {
      Toast.show({ title: 'Validation Error', message: 'Phone Number is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let latitude = '0.0';
      let longitude = '0.0';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = loc.coords.latitude.toString();
          longitude = loc.coords.longitude.toString();
        }
      } catch (locErr) {
        console.warn("Could not get location:", locErr);
      }

      const apiUrl = `${API_URL}/api/leads`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          latitude,
          longitude,
          ...form
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create lead');
      }

      Toast.show({ title: 'Success', message: 'Lead created successfully', type: 'success' });
      
      if (data.lead) {
        navigation.navigate('Leads', { newLead: data.lead });
      } else {
        navigation.goBack();
      }

    } catch (error: any) {
      console.error('Error creating lead:', error);
      Toast.show({ title: 'Error', message: error.message || 'Something went wrong', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100 mt-12">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-2 bg-gray-50 rounded-full">
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-bold text-gray-900 tracking-tight">Add New Lead</Text>
            <Text className="text-xs text-gray-500">Enter school details below</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="xl">

            <VStack space="md">
              <Text className="text-sm font-bold text-gray-800 uppercase tracking-wider ml-1">Basic Info</Text>

              <Box className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <VStack space="lg">
                  <Box>
                    <HStack className="items-center mb-2" space="sm">
                      <School size={16} color="#dc2626" />
                      <Text className="text-sm font-semibold text-gray-700">School Name *</Text>
                    </HStack>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                      placeholder="e.g. Kalvium International School"
                      placeholderTextColor="#9ca3af"
                      value={form.schoolName}
                      onChangeText={(val) => setForm({ ...form, schoolName: val })}
                    />
                  </Box>

                  <Box>
                    <HStack className="items-center mb-2" space="sm">
                      <Phone size={16} color="#dc2626" />
                      <Text className="text-sm font-semibold text-gray-700">Phone *</Text>
                    </HStack>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                      placeholder="e.g. +91 9876543210"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(val) => setForm({ ...form, phone: val })}
                    />
                  </Box>
                </VStack>
              </Box>
            </VStack>

            <VStack space="md">
              <Text className="text-sm font-bold text-gray-800 uppercase tracking-wider ml-1">Location Details</Text>

              <Box className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <VStack space="lg">
                  <Box>
                    <HStack className="items-center mb-2" space="sm">
                      <MapPin size={16} color="#dc2626" />
                      <Text className="text-sm font-semibold text-gray-700">Address / Street</Text>
                    </HStack>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 h-24"
                      placeholder="Enter full address..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      textAlignVertical="top"
                      value={form.address}
                      onChangeText={(val) => setForm({ ...form, address: val })}
                    />
                  </Box>

                  <HStack space="md">
                    <Box className="flex-1">
                      <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">Area</Text>
                      <TextInput
                        className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                        placeholder="e.g. Chennai"
                        placeholderTextColor="#9ca3af"
                        value={form.city}
                        onChangeText={(val) => setForm({ ...form, city: val })}
                      />
                    </Box>

                    <Box className="flex-1">
                      <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">City</Text>
                      <TextInput
                        className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                        placeholder="e.g. Chennai"
                        placeholderTextColor="#9ca3af"
                        value={form.district}
                        onChangeText={(val) => setForm({ ...form, district: val })}
                      />
                    </Box>
                  </HStack>

                  <Box>
                    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">State</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                      placeholder="e.g. Tamil Nadu"
                      placeholderTextColor="#9ca3af"
                      value={form.state}
                      onChangeText={(val) => setForm({ ...form, state: val })}
                    />
                  </Box>
                </VStack>
              </Box>
            </VStack>

            <VStack space="md">
              <Text className="text-sm font-bold text-gray-800 uppercase tracking-wider ml-1">Academic</Text>

              <Box className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Box>
                  <HStack className="items-center mb-2" space="sm">
                    <BookOpen size={16} color="#dc2626" />
                    <Text className="text-sm font-semibold text-gray-700">Board of School</Text>
                  </HStack>
                  <TextInput
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                    placeholder="e.g. CBSE, ICSE, State Board"
                    placeholderTextColor="#9ca3af"
                    value={form.board}
                    onChangeText={(val) => setForm({ ...form, board: val })}
                  />
                </Box>
              </Box>
            </VStack>

          </VStack>
        </ScrollView>

        {/* Footer Submit Button */}
        <View className="p-4 border-t border-gray-100 bg-white mb-6">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`rounded-xl py-4 items-center flex-row justify-center ${loading ? 'bg-red-400' : 'bg-red-600'}`}
          >
            {loading ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-semibold text-base ml-2">Creating...</Text>
              </>
            ) : (
              <Text className="text-white font-bold text-base">Create Lead</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
