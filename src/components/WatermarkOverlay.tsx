import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

interface Props {
  schoolName: string;
  address: string;
  lat: number;
  lng: number;
  executiveName: string;
  employeeId: string;
}

/** Overlay view for photo watermarking. Used with react-native-view-shot. */
export default function WatermarkOverlay({
  schoolName,
  address,
  lat,
  lng,
  executiveName,
  employeeId,
}: Props) {
  const now = format(new Date(), 'dd MMM yyyy, hh:mm a');

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.topBar}>
        <Text style={styles.schoolName}>{schoolName}</Text>
        <Text style={styles.timestamp}>{now}</Text>
      </View>
      <View style={styles.bottomBar}>
        <Text style={styles.address} numberOfLines={2}>
          📍 {address}
        </Text>
        <Text style={styles.coords}>
          GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>
        <Text style={styles.executive}>
          {executiveName} ({employeeId})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill as any,
    justifyContent: 'space-between',
  },
  topBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    paddingTop: 8,
  },
  bottomBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    paddingBottom: 8,
  },
  schoolName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timestamp: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  address: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  coords: {
    color: '#CBD5E1',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  executive: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
