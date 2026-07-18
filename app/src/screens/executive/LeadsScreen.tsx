import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Platform, Alert, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { MapPin, Building2, Search, X, Menu } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const API_BASE = 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';

export default function LeadsScreen() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const navigation = useNavigation<any>();

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

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

  const paginatedLeads = filteredLeads.slice(0, page * PAGE_SIZE);



  return (
    <View className="flex-1 bg-white pt-2 px-4 pb-0">
      <Text className="text-xl font-bold text-gray-900 tracking-tight mb-4">My Leads</Text>

      <Box className="bg-gray-50 rounded-xl px-4 py-3 mb-6 flex-row items-center border border-gray-100">
        <Search color="#9CA3AF" size={20} />
        <TextInput
          className="flex-1 ml-3 text-base text-gray-900"
          placeholder="Search leads..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X color="#9CA3AF" size={20} />
          </TouchableOpacity>
        )}
      </Box>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : (
        <FlatList
          data={paginatedLeads}
          keyExtractor={(item) => item.ProspectID}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReached={() => {
            if (page * PAGE_SIZE < filteredLeads.length) {
              setPage(prev => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
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
                onPress={() => {
                  navigation.navigate('LeadDetail', { leadId: item.ProspectID, leadName: name });
                }}
                className="bg-white p-4 rounded-xl mb-3 border border-gray-200 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-4">
                  <Text className="text-base font-semibold text-gray-900 mb-1">{name || 'Unknown School'}</Text>
                  {item.mx_City ? (
                    <View className="flex-row items-center mt-1">
                      <MapPin size={12} color="#6B7280" />
                      <Text className="text-gray-500 ml-1 text-xs">{item.mx_City}</Text>
                    </View>
                  ) : null}
                </View>
                <View className="rounded-md bg-red-50 p-2 items-center justify-center">
                  <Building2 size={20} color="#DC2626" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}


    </View>
  );
}
