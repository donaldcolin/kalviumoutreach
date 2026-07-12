import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, FlatList } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

export interface PushToLsModalProps {
  visible: boolean;
  onClose: () => void;
  activities: any[];
  onPush: (activity: any) => void;
  isPushing: boolean;
}

export function PushToLsModal({ visible, onClose, activities, onPush, isPushing }: PushToLsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <HStack className="justify-between items-center mb-1">
            <Text className="text-lg font-bold text-slate-900">Push to LeadSquared</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-slate-400 font-medium">Cancel</Text>
            </TouchableOpacity>
          </HStack>
          <Text className="text-xs text-slate-400 mb-4">Select a PIC or Principal visit to attach this recording.</Text>

          {activities.length === 0 ? (
            <VStack className="items-center py-8">
              <Text className="text-3xl mb-2">📋</Text>
              <Text className="text-slate-500 text-center px-4">
                No PIC or Principal meetings found. Only PIC and Principal interactions can have recordings pushed.
              </Text>
            </VStack>
          ) : (
            <FlatList
              data={activities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.schoolItem}
                  onPress={() => onPush(item)}
                  disabled={isPushing}
                  activeOpacity={0.7}
                >
                  <VStack>
                    <Text className="font-semibold text-slate-900">{item.schoolName || 'Unknown School'}</Text>
                    <HStack className="items-center mt-1" space="xs">
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: (item.walkInStatus || '').toLowerCase().includes('pic') ? '#EEF2FF' : '#FDF2F8' }
                      ]}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: (item.walkInStatus || '').toLowerCase().includes('pic') ? '#4F46E5' : '#BE185D'
                        }}>
                          {item.walkInStatus || 'Visit'}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-400">
                        {item.lsqCreatedOn ? new Date(item.lsqCreatedOn).toLocaleDateString() : ''}
                      </Text>
                    </HStack>
                  </VStack>
                </TouchableOpacity>
              )}
            />
          )}

          {isPushing && (
            <View style={styles.pushingOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text className="mt-2 font-medium text-slate-700">Pushing to LeadSquared...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 350,
    maxHeight: '75%',
  },
  schoolItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pushingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
});
