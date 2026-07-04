import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  accuracy: number; // meters
}

export default function GPSAccuracyIndicator({ accuracy }: Props) {
  const getConfig = () => {
    if (accuracy <= 20) return { color: '#22C55E', label: 'Excellent', bars: 4 };
    if (accuracy <= 35) return { color: '#84CC16', label: 'Good', bars: 3 };
    if (accuracy <= 50) return { color: '#F59E0B', label: 'Fair', bars: 2 };
    return { color: '#EF4444', label: 'Poor', bars: 1 };
  };

  const config = getConfig();

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.bar,
              {
                height: 6 + level * 4,
                backgroundColor:
                  level <= config.bars ? config.color : '#E5E7EB',
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: config.color }]}>
        {accuracy < 999 ? `±${accuracy.toFixed(0)}m` : 'Waiting...'} · {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
