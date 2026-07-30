import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { MapPin, Building2, Globe, Send, CheckCircle, Clock } from 'lucide-react-native';
import type { Lead } from '../../types';

interface LeadCardProps {
  item: Lead;
  type: 'my' | 'global';
  isOwnLead?: boolean;
  accessStatus?: 'none' | 'pending' | 'approved';
  requestingAccess?: boolean;
  onRequestAccess?: (item: Lead) => void;
  onPress: (leadId: string, leadName: string) => void;
}

export const LeadCard = React.memo(function LeadCard({
  item,
  type,
  isOwnLead,
  accessStatus,
  requestingAccess,
  onRequestAccess,
  onPress,
}: LeadCardProps) {
  const name = `${item.FirstName || ''} ${item.LastName || ''}`.trim() || 'Unknown School';
  
  if (type === 'my') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item.ProspectID, name)}
        className="bg-white p-4 rounded-xl mb-3 border border-gray-200 flex-row justify-between items-center"
      >
        <View className="flex-1 mr-4">
          <Text className="text-base font-semibold text-gray-900 mb-1">{name}</Text>
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
  }

  // Global Lead Card
  const ownerEmail = item.OwnerIdEmailAddress || 'Unknown';
  const own = isOwnLead;
  const status = accessStatus;

  return (
    <View className="bg-white p-4 rounded-xl mb-3 border border-gray-200">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (own || status === 'approved') {
            onPress(item.ProspectID, name);
          }
        }}
        disabled={!own && status !== 'approved'}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-4">
            <Text className="text-base font-semibold text-gray-900 mb-1">{name}</Text>
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
          {status === 'none' && onRequestAccess && (
            <TouchableOpacity
              onPress={() => onRequestAccess(item)}
              disabled={requestingAccess}
              className="flex-row items-center justify-center bg-blue-600 py-2.5 rounded-lg"
            >
              {requestingAccess ? (
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
              onPress={() => onPress(item.ProspectID, name)}
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
}, (prevProps, nextProps) => {
  return (
    prevProps.item.ProspectID === nextProps.item.ProspectID &&
    prevProps.type === nextProps.type &&
    prevProps.isOwnLead === nextProps.isOwnLead &&
    prevProps.accessStatus === nextProps.accessStatus &&
    prevProps.requestingAccess === nextProps.requestingAccess
  );
});
