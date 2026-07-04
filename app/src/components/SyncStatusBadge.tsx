import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { SyncStatus } from '../types';
import { Badge, BadgeText, BadgeIcon } from '@/components/ui/badge';

interface Props {
  status: SyncStatus;
  pendingCount: number;
  failedCount: number;
  onPress?: () => void;
}

const STATUS_CONFIG = {
  synced: { action: 'success' as const, label: 'All synced' },
  pending: { action: 'warning' as const, label: 'Syncing...' },
  failed: { action: 'error' as const, label: 'Sync failed' },
};

export default function SyncStatusBadge({ status, pendingCount, failedCount, onPress }: Props) {
  const config = STATUS_CONFIG[status];

  let displayText = config.label;
  if (status === 'pending' && pendingCount > 0) displayText += ` (${pendingCount})`;
  if (status === 'failed' && failedCount > 0) displayText += ` (${failedCount})`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${config.label}`}
    >
      <Badge variant="outline" className={`rounded-full shadow-sm border-0 ${status === 'synced' ? 'bg-[#10B981]/20' : status === 'pending' ? 'bg-[#F59E0B]/20' : 'bg-[#E11D48]/20'}`}>
        <BadgeText className={`font-semibold ${status === 'synced' ? 'text-[#10B981]' : status === 'pending' ? 'text-[#F59E0B]' : 'text-[#E11D48]'}`}>{displayText}</BadgeText>
      </Badge>
    </TouchableOpacity>
  );
}
