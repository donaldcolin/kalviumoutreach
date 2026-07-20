import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';

export interface ActivityListProps {
  activities: any[];
  onViewDetails?: (activity: any) => void;
}

export function ActivityList({ activities, onViewDetails }: ActivityListProps) {
  if (activities.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Today's Visits</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{activities.length}</Text>
        </View>
      </View>

      {activities.map((activity) => {
        const dt = activity.walkInDateTime || activity.lsqCreatedOn;
        const time = dt ? format(new Date(dt), 'h:mm a') : '';
        const schoolName = activity.schoolName || activity.leadName || 'Unknown School';

        const isFirstVisit = activity.typeOfWalkIn === 'First Visit';
        const walkInStatus = activity.walkInStatus || '';
        const isRefusedEntry = walkInStatus.includes('Refused Entry');
        const isPICInteraction = walkInStatus.includes('PIC Interaction');
        const isPrincipalInteraction = walkInStatus.includes('Principal');
        const isFrontDesk = walkInStatus.includes('Front Desk');

        // Status Badge UI
        let statusColor = '#6b7280';
        let statusBg = '#f3f4f6';
        let statusText = walkInStatus.split(' - ')[0] || 'Logged';

        if (isRefusedEntry) {
          statusColor = '#ef4444';
          statusBg = '#fef2f2';
        } else if (isPICInteraction) {
          statusColor = '#10b981'; // green-500
          statusBg = '#ecfdf5'; // emerald-50
        } else if (isPrincipalInteraction) {
          statusColor = '#10b981'; // green-500
          statusBg = '#ecfdf5'; // emerald-50
        } else if (isFrontDesk) {
          statusColor = '#3b82f6';
          statusBg = '#eff6ff';
        }

        // Determine specific outcome text based on the active status interaction
        let outcomeText = '';
        if (isPICInteraction) {
          outcomeText = activity.statusPIC;
        } else if (isPrincipalInteraction) {
          outcomeText = activity.statusPrincipal;
        } else if (isFrontDesk) {
          outcomeText = activity.statusFrontDesk;
        }

        // Appointment box logic
        const hasAppointment = outcomeText?.includes('Fixed meeting') || outcomeText?.includes('Appointment fixed');
        let appointmentDateStr = '';
        if (hasAppointment) {
          const apptDate = activity.seminarAppointmentDate || activity.picAppointmentDate || activity.principalAppointmentDate;
          if (apptDate) {
            try {
              appointmentDateStr = format(new Date(apptDate), 'MMM d, h:mm a');
            } catch {
              appointmentDateStr = apptDate;
            }
          }
        }

        return (
          <TouchableOpacity
            key={activity.id}
            style={styles.card}
            onPress={() => onViewDetails?.(activity)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.schoolName} numberOfLines={1}>{schoolName}</Text>
              <Text style={styles.time}>{time}</Text>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>{isFirstVisit ? 'First Visit' : 'Follow-up'}</Text>
              </View>
              {walkInStatus ? (
                <View style={[styles.badgeDynamic, { backgroundColor: statusBg }]}>
                  <Text style={[styles.badgeDynamicText, { color: statusColor }]}>
                    {statusText}
                  </Text>
                </View>
              ) : null}
            </View>

            {isRefusedEntry && activity.refusedEntryReason ? (
              <Text style={styles.reasonText}>Reason: {activity.refusedEntryReason}</Text>
            ) : null}

            {hasAppointment ? (
              <View style={styles.appointmentBox}>
                <Text style={styles.appointmentTitle}>{outcomeText || 'Appointment fixed'}</Text>
                {appointmentDateStr ? (
                  <Text style={styles.appointmentDate}>Appointment: {appointmentDateStr}</Text>
                ) : null}
              </View>
            ) : null}

            {!hasAppointment && outcomeText ? (
              <Text style={styles.outcomeText}>Outcome: {outcomeText}</Text>
            ) : null}

            {activity.followUpDate ? (
              <Text style={styles.followUpText}>
                Follow-up: {format(new Date(activity.followUpDate), 'MMM d')}
              </Text>
            ) : null}

          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeNeutral: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeNeutralText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  badgeDynamic: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDynamicText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 8,
    fontWeight: '500',
  },
  outcomeText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
  },
  appointmentBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  appointmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  followUpText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
});
