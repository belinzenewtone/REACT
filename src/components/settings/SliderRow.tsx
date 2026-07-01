import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface SliderRowProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  suffix?: string;
}

export function SliderRow({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  suffix = '',
}: SliderRowProps) {
  const colors = useThemeColors();
  const trackRef = useRef<View>(null);
  const [width, setWidth] = useState(0);

  const clamp = (v: number) => Math.max(minimumValue, Math.min(maximumValue, v));
  const ratio = (value - minimumValue) / (maximumValue - minimumValue);

  const handleMove = (event: GestureResponderEvent) => {
    if (!width) return;
    const x = event.nativeEvent.locationX;
    const raw = minimumValue + (x / width) * (maximumValue - minimumValue);
    const stepped = Math.round(raw / step) * step;
    onValueChange(clamp(stepped));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.accentPrimary }]}>
          {value}
          {suffix}
        </Text>
      </View>
      <View
        ref={trackRef}
        style={[styles.track, { backgroundColor: colors.glassWhite }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${ratio * 100}%`,
              backgroundColor: colors.accentPrimary,
            },
          ]}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPressIn={handleMove}
        />
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.textInverse,
              left: `${ratio * 100}%`,
              marginLeft: -10,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  value: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: borderRadius.full,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
