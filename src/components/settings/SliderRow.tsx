import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
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
  const widthRef = useRef(0);

  const dots = useMemo(() => {
    const count = Math.round((maximumValue - minimumValue) / step) + 1;
    return Array.from({ length: count }, (_, i) => minimumValue + i * step);
  }, [minimumValue, maximumValue, step]);

  const ratio = (value - minimumValue) / (maximumValue - minimumValue);

  // PanResponder is created once and must stay stable across renders so an in-progress
  // drag never gets interrupted, but that means its callbacks close over whatever props
  // existed on the first render. Routing every read through this ref (updated on every
  // render, not just once) keeps the gesture reading live props instead of stale ones —
  // that mismatch was the source of the janky/"glitchy" drag behavior.
  const liveRef = useRef({ value, minimumValue, maximumValue, step, onValueChange });
  liveRef.current = { value, minimumValue, maximumValue, step, onValueChange };

  const updateFromLocationX = (x: number) => {
    const trackWidth = widthRef.current;
    if (!trackWidth) return;
    const { value: currentValue, minimumValue: min, maximumValue: max, step: s, onValueChange: emit } =
      liveRef.current;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    const raw = min + (clampedX / trackWidth) * (max - min);
    const stepped = Math.max(min, Math.min(max, Math.round(raw / s) * s));
    if (stepped !== currentValue) emit(stepped);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 4,
      onPanResponderGrant: (event) => updateFromLocationX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateFromLocationX(event.nativeEvent.locationX),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

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
        style={[styles.track, { backgroundColor: colors.glassWhite }]}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
        }}
        hitSlop={{ top: 12, bottom: 12 }}
        {...panResponder.panHandlers}
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
        <View style={styles.dotsRow} pointerEvents="none">
          {dots.map((dotValue) => {
            const isActive = dotValue === value;
            const isFilled = dotValue <= value;
            return (
              <View
                key={dotValue}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? colors.textInverse
                      : isFilled
                      ? `${colors.textInverse}99`
                      : colors.textTertiary,
                    transform: [{ scale: isActive ? 1.6 : 1 }],
                  },
                ]}
              />
            );
          })}
        </View>
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
    height: 20,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: borderRadius.full,
  },
  dotsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
  },
});
