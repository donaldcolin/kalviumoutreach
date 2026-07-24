import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { MapPin, Building2, Search, X, Globe, User, Send, CheckCircle, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

const API_BASE = 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';

type TabMode = 'my' | 'global';
type AccessStatus = 'none' | 'pending' | 'approved';

interface AccessRequest {
  id: string;
  leadId: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function LeadsScreen() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabMode>('my');
  const [accessRequests, setAccessRequests] = useState<Record<string, AccessRequest>>({});
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const navigation = useNavigation<any>();

  // Fetch user's own leads
  useEffect(() => {
    if (user?.email) {
      fetchLeads(user.email);
    }
  }, [user?.email]);

  // Listen to this user's access requests in real-time
  useEffect(() => {
    if (!user?.id) return;
    const unsub = firestore()
      .collection('leadAccessRequests')
      .where('requestedBy', '==', user.id)
      .onSnapshot((snap) => {
        const map: Record<string, AccessRequest> = {};
        snap.forEach((doc) => {
          const data = doc.data();
          map[data.leadId] = { id: doc.id, leadId: data.leadId, status: data.status };
        });
        setAccessRequests(map);
      });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

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

  const searchGlobal = useCallback(async () => {
    const q = globalSearchQuery.trim();
    if (q.length < 2) return;
    try {
      setGlobalLoading(true);
      const res = await fetch(`${API_BASE}/api/leads/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setGlobalResults(data.leads || []);
      }
    } catch (err) {
      console.error('Global search failed:', err);
    } finally {
      setGlobalLoading(false);
    }
  }, [globalSearchQuery]);

  const requestAccess = async (lead: any) => {
    if (!user?.id || !user?.email || !user?.name) return;
    const leadId = lead.ProspectID;
    const leadName = `${lead.FirstName || ''} ${lead.LastName || ''}`.trim();
    const ownerEmail = lead.OwnerIdEmailAddress || '';

    // Don't request if already pending/approved
    if (accessRequests[leadId]) {
      Alert.alert('Already Requested', `Your request for "${leadName}" is ${accessRequests[leadId].status}.`);
      return;
    }

    try {
      setRequestingAccess(leadId);
      await firestore().collection('leadAccessRequests').add({
        leadId,
        leadName,
        ownerEmail,
        requestedBy: user.id,
        requestedByName: user.name,
        requestedByEmail: user.email,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to request access:', err);
      Alert.alert('Error', 'Failed to send access request. Please try again.');
    } finally {
      setRequestingAccess(null);
    }
  };

  const getAccessStatus = (leadId: string): AccessStatus => {
    if (!accessRequests[leadId]) return 'none';
    return accessRequests[leadId].status === 'approved' ? 'approved' : 'pending';
  };

  // Filter my leads
  const filteredLeads = leads.filter(l => {
    const name = `${l.FirstName || ''} ${l.LastName || ''}`.toLowerCase();
    const city = (l.mx_City || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || city.includes(q);
  });

  const paginatedLeads = filteredLeads.slice(0, page * PAGE_SIZE);

  // Merge approved shared leads into "My Leads" list
  const approvedLeadIds = new Set(
    Object.values(accessRequests)
      .filter(r => r.status === 'approved')
      .map(r => r.leadId)
  );

  // Check if a lead from global results is the user's own
  const isOwnLead = (lead: any) => {
    return (lead.OwnerIdEmailAddress || '').toLowerCase() === (user?.email || '').toLowerCase();
  };

  return (
    <View className="flex-1 bg-white pt-2 px-4 pb-0">
      {/* Tab Switcher */}
      <HStack className="mb-4 bg-gray-100 rounded-xl p-1">
        <TouchableOpacity
          onPress={() => setTab('my')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${tab === 'my' ? 'bg-white shadow-sm' : ''}`}
        >
          <User size={16} color={tab === 'my' ? '#DC2626' : '#9CA3AF'} />
          <Text className={`ml-2 font-semibold text-sm ${tab === 'my' ? 'text-red-600' : 'text-gray-400'}`}>
            My Leads
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('global')}
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${tab === 'global' ? 'bg-white shadow-sm' : ''}`}
        >
          <Globe size={16} color={tab === 'global' ? '#DC2626' : '#9CA3AF'} />
          <Text className={`ml-2 font-semibold text-sm ${tab === 'global' ? 'text-red-600' : 'text-gray-400'}`}>
            Global Search
          </Text>
        </TouchableOpacity>
      </HStack>

      {/* ─── My Leads Tab ──────────────────────────────────────────── */}
      {tab === 'my' && (
        <>
          <Box className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex-row items-center border border-gray-100">
            <Search color="#9CA3AF" size={20} />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Search my leads..."
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
        </>
      )}

      {/* ─── Global Search Tab ─────────────────────────────────────── */}
      {tab === 'global' && (
        <>
          <Box className="bg-gray-50 rounded-xl px-4 py-3 mb-2 flex-row items-center border border-gray-100">
            <Search color="#9CA3AF" size={20} />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Search all schools..."
              placeholderTextColor="#9CA3AF"
              value={globalSearchQuery}
              onChangeText={setGlobalSearchQuery}
              onSubmitEditing={searchGlobal}
              returnKeyType="search"
            />
            {globalSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setGlobalSearchQuery(''); setGlobalResults([]); }}>
                <X color="#9CA3AF" size={20} />
              </TouchableOpacity>
            )}
          </Box>
          <TouchableOpacity
            onPress={searchGlobal}
            className="bg-red-600 rounded-xl py-3 mb-4 items-center"
            disabled={globalSearchQuery.trim().length < 2}
          >
            <Text className="text-white font-semibold text-sm">Search All Leads</Text>
          </TouchableOpacity>

          {globalLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#E11D48" />
            </View>
          ) : (
            <FlatList
              data={globalResults}
              keyExtractor={(item) => item.ProspectID}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                globalSearchQuery.trim().length > 0 ? (
                  <View className="flex-1 justify-center items-center mt-20">
                    <Text className="text-4xl mb-3">🔍</Text>
                    <Text className="text-slate-500 mt-2 text-center px-8 text-base">
                      {globalResults.length === 0 && !globalLoading ? 'No results. Try a different search.' : 'Search for a school name across all leads.'}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-1 justify-center items-center mt-20">
                    <Text className="text-4xl mb-3">🌐</Text>
                    <Text className="text-slate-500 mt-2 text-center px-8 text-base">
                      Search for any school across all associates' leads.
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => {
                const name = `${item.FirstName || ''} ${item.LastName || ''}`.trim();
                const ownerEmail = item.OwnerIdEmailAddress || 'Unknown';
                const own = isOwnLead(item);
                const status = getAccessStatus(item.ProspectID);

                return (
                  <View className="bg-white p-4 rounded-xl mb-3 border border-gray-200">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        if (own || status === 'approved') {
                          navigation.navigate('LeadDetail', { leadId: item.ProspectID, leadName: name });
                        }
                      }}
                      disabled={!own && status !== 'approved'}
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-4">
                          <Text className="text-base font-semibold text-gray-900 mb-1">{name || 'Unknown School'}</Text>
                          {item.mx_City ? (
                            <View className="flex-row items-center mt-1">
                              <MapPin size={12} color="#6B7280" />
                              <Text className="text-gray-500 ml-1 text-xs">{item.mx_City}</Text>
                            </View>
                          ) : null}
                          <Text className="text-xs text-gray-400 mt-1.5">
                            Owner: {own ? 'You' : ownerEmail}
                          </Text>
                        </View>
                        <View className={`rounded-md p-2 items-center justify-center ${own ? 'bg-red-50' : 'bg-blue-50'}`}>
                          {own ? <Building2 size={20} color="#DC2626" /> : <Globe size={20} color="#3B82F6" />}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Action Row */}
                    {!own && (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        {status === 'none' && (
                          <TouchableOpacity
                            onPress={() => requestAccess(item)}
                            disabled={requestingAccess === item.ProspectID}
                            className="flex-row items-center justify-center bg-blue-600 py-2.5 rounded-lg"
                          >
                            {requestingAccess === item.ProspectID ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Send size={14} color="#fff" />
                                <Text className="text-white font-semibold text-sm ml-2">Request Access</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        {status === 'pending' && (
                          <View className="flex-row items-center justify-center bg-amber-50 py-2.5 rounded-lg">
                            <Clock size={14} color="#D97706" />
                            <Text className="text-amber-700 font-semibold text-sm ml-2">Pending Approval</Text>
                          </View>
                        )}
                        {status === 'approved' && (
                          <TouchableOpacity
                            onPress={() => navigation.navigate('LeadDetail', { leadId: item.ProspectID, leadName: name })}
                            className="flex-row items-center justify-center bg-emerald-50 py-2.5 rounded-lg"
                          >
                            <CheckCircle size={14} color="#059669" />
                            <Text className="text-emerald-700 font-semibold text-sm ml-2">Access Granted — View Lead</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}
