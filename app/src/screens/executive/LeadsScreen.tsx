import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { MapPin, Building2, Search, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const API_BASE = 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';

export default function LeadsScreen() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (user?.email) {
      fetchLeads(user.email);
    }
  }, [user?.email]);

  const fetchLeads = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/leads?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const name = `${l.FirstName || ''} ${l.LastName || ''}`.toLowerCase();
    const city = (l.mx_City || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || city.includes(q);
  });



  return (
    <View className="flex-1 bg-background pt-2 px-4 pb-0">
      <HStack className="justify-between items-center mb-4 mt-2">
        <Text className="text-xl font-bold text-slate-900 tracking-tight">My Leads</Text>
      </HStack>

      <Box className="bg-slate-100 rounded-xl px-4 py-3 mb-4 flex-row items-center border border-slate-200">
        <Search color="#94A3B8" size={20} />
        <TextInput
          className="flex-1 ml-3 text-base text-slate-900"
          placeholder="Search leads..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#94A3B8" size={20} />
          </TouchableOpacity>
        )}
      </Box>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.ProspectID}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-4xl mb-3">🏫</Text>
              <Text className="text-slate-500 mt-2 text-center px-8 text-base">
                No leads found. Assigned leads will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = `${item.FirstName || ''} ${item.LastName || ''}`.trim();
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ActivityForm', { leadId: item.ProspectID, leadName: name })}
                className="bg-white p-4 rounded-2xl mb-3 border border-slate-100 shadow-sm"
              >
                <HStack className="items-center justify-between">
                  <VStack className="flex-1 mr-4">
                    <Text className="text-lg font-bold text-slate-900 mb-1">{name || 'Unknown School'}</Text>
                    {item.mx_City ? (
                      <HStack className="items-center mt-1">
                        <MapPin size={14} color="#64748B" />
                        <Text className="text-slate-500 ml-1 text-sm">{item.mx_City}</Text>
                      </HStack>
                    ) : null}
                  </VStack>
                  <Box className="w-10 h-10 rounded-full bg-rose-50 items-center justify-center">
                    <Building2 size={20} color="#E11D48" />
                  </Box>
                </HStack>
              </TouchableOpacity>
            );
          }}
        />
      )}


    </View>
  );
}
