import React, { useMemo, useRef, useState } from 'react';
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
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const stepCount = Math.round((maximumValue - minimumValue) / step) + 1;
  const dots = useMemo(() => Array.from({ length: stepCount }, (_, i) => minimumValue + i * step), [stepCount, minimumValue, step]);

  const clamp = (v: number) => Math.max(minimumValue, Math.min(maximumValue, v));
  const ratio = (value - minimumValue) / (maximumValue - minimumValue);

  const updateFromLocationX = (x: number) => {
    const trackWidth = widthRef.current;
    if (!trackWidth) return;
    const clampedX = Math.max(0, Math.min(trackWidth, x));
    const raw = minimumValue + (clampedX / trackWidth) * (maximumValue - minimumValue);
    const stepped = Math.round(raw / step) * step;
    const next = clamp(stepped);
    if (next !== value) onValueChange(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (event) => updateFromLocationX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateFromLocationX(event.nativeEvent.locationX),
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
          setWidth(e.nativeEvent.layout.width);
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
        {width > 0 &&
          dots.map((dotValue) => {
            const dotRatio = (dotValue - minimumValue) / (maximumValue - minimumValue);
            const isFilled = dotValue <= value;
            const isActive = dotValue === value;
            return (
              <View
                key={dotValue}
                pointerEvents="none"
                style={[
                  styles.dot,
                  {
                    left: dotRatio * width - (isActive ? 5 : 2),
                    width: isActive ? 10 : 4,
                    height: isActive ? 10 : 4,
                    marginTop: isActive ? -5 : -2,
                    borderRadius: isActive ? 5 : 2,
                    backgroundColor: isActive
                      ? colors.textInverse
                      : isFilled
                      ? colors.textInverse + '99'
                      : colors.textTertiary,
                  },
                ]}
              />
            );
          })}
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
  dot: {
    position: 'absolute',
    top: '50%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
});
