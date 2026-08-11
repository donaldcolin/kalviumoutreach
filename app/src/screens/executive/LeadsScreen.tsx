import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Toast } from '@/components/ui/ToastManager';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '../../stores/authStore';
import { Search, X, Globe, User, Plus } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useLeadSearch } from '../../hooks/useLeadSearch';
import { LeadCard } from '../../components/leads/LeadCard';
import type { Lead } from '../../types';

type TabMode = 'my' | 'global';
type AccessStatus = 'none' | 'pending' | 'approved';

interface AccessRequest {
  id: string;
  leadId: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function LeadsScreen() {
  const { user } = useAuthStore();
  
  const {
    paginatedLeads,
    filteredLeads,
    globalResults,
    loading,
    globalLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchGlobal,
    loadMoreLeads,
    clearGlobalSearch,
    refresh,
    prependLead,
  } = useLeadSearch(user?.email || '');

  const [tab, setTab] = useState<TabMode>('my');
  const [accessRequests, setAccessRequests] = useState<Record<string, AccessRequest>>({});
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);
  
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  useEffect(() => {
    if (route.params?.newLead) {
      prependLead(route.params.newLead);
      // Clear the param so it doesn't get added again if the screen re-renders
      navigation.setParams({ newLead: undefined });
    }
  }, [route.params?.newLead, prependLead, navigation]);

  // Real-time listener for this user's access requests
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribe = firestore()
      .collection('leadAccessRequests')
      .where('requestedBy', '==', user.id)
      .onSnapshot(
        (snap) => {
          const map: Record<string, AccessRequest> = {};
          snap.forEach((doc: { data: () => any; id: any; }) => {
            const data = doc.data();
            map[data.leadId] = { id: doc.id, leadId: data.leadId, status: data.status };
          });
          setAccessRequests(map);
        },
        (error: any) => {
          console.warn('Failed to fetch access requests:', error);
        }
      );
      
    return () => unsubscribe();
  }, [user?.id]);



  const handleLeadPress = React.useCallback((leadId: string, leadName: string) => {
    navigation.navigate('LeadDetail', { leadId, leadName });
  }, [navigation]);

  const requestAccess = async (lead: Lead) => {
    if (!user?.id || !user?.email || !user?.name) return;
    const leadId = lead.ProspectID;
    const leadName = `${lead.FirstName || ''} ${lead.LastName || ''}`.trim();
    const ownerEmail = lead.OwnerIdEmailAddress || '';

    // Don't request if already pending/approved
    if (accessRequests[leadId]) {
      Toast.show({ title: 'Already Requested', message: `Your request for "${leadName}" is ${accessRequests[leadId].status}.`, type: 'info' });
      return;
    }

    try {
      setRequestingAccess(leadId);
      await firestore().collection('leadAccessRequests').doc(`${user.id}_${leadId}`).set({
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
      Toast.show({ title: 'Error', message: 'Failed to send access request. Please try again.', type: 'error' });
    } finally {
      setRequestingAccess(null);
    }
  };

  const getAccessStatus = (leadId: string): AccessStatus => {
    if (!accessRequests[leadId]) return 'none';
    return accessRequests[leadId].status === 'approved' ? 'approved' : 'pending';
  };



  // Merge approved shared leads into "My Leads" list
  const approvedLeadIds = new Set(
    Object.values(accessRequests)
      .filter(r => r.status === 'approved')
      .map(r => r.leadId)
  );

  // Check if a lead from global results is the user's own
  const isOwnLead = (lead: Lead) => {
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
            <FlashList estimatedItemSize={150}
              data={paginatedLeads}
              keyExtractor={(item) => item.ProspectID}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              onEndReached={loadMoreLeads}
              onEndReachedThreshold={0.5}
              refreshing={isRefreshing}
              onRefresh={refresh}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center mt-20">
                  <Text className="text-4xl mb-3">🏫</Text>
                  <Text className="text-slate-500 mt-2 text-center px-8 text-base">
                    No leads found. Assigned leads will appear here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <LeadCard
                  item={item}
                  type="my"
                  onPress={handleLeadPress}
                />
              )}
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
              <TouchableOpacity onPress={clearGlobalSearch}>
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
            <FlashList estimatedItemSize={150}
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
              renderItem={({ item }) => (
                <LeadCard
                  item={item}
                  type="global"
                  isOwnLead={isOwnLead(item)}
                  accessStatus={getAccessStatus(item.ProspectID)}
                  requestingAccess={requestingAccess === item.ProspectID}
                  onRequestAccess={requestAccess}
                  onPress={handleLeadPress}
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}
