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
  /**
   * Called with the final value when the drag ENDS (or on tap). During the
   * drag the slider renders from internal state, so consumers can safely do
   * heavy work here (persist settings, DB scans) without causing drag jank.
   */
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
  // pageX of the track's left edge, captured at gesture start so moves can be
  // computed from gesture.moveX — event.locationX is unreliable mid-drag on
  // Android (it's relative to whichever child view the finger is over).
  const trackPageXRef = useRef(0);

  // Internal value shown while dragging. Null when idle → render the prop.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragValueRef = useRef<number | null>(null);

  const dots = useMemo(() => {
    const count = Math.round((maximumValue - minimumValue) / step) + 1;
    return Array.from({ length: count }, (_, i) => minimumValue + i * step);
  }, [minimumValue, maximumValue, step]);

  // Live props for the stable PanResponder callbacks.
  const liveRef = useRef({ value, minimumValue, maximumValue, step, onValueChange });
  liveRef.current = { value, minimumValue, maximumValue, step, onValueChange };

  const valueFromPageX = (pageX: number): number => {
    const trackWidth = widthRef.current;
    const { minimumValue: min, maximumValue: max, step: s } = liveRef.current;
    if (!trackWidth) return min;
    const x = Math.max(0, Math.min(trackWidth, pageX - trackPageXRef.current));
    const raw = min + (x / trackWidth) * (max - min);
    return Math.max(min, Math.min(max, Math.round(raw / s) * s));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (event) => {
        // locationX is reliable for the initial touch (it's relative to the
        // view owning the responder). Derive the track's pageX from it once.
        trackPageXRef.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        const v = valueFromPageX(event.nativeEvent.pageX);
        dragValueRef.current = v;
        setDragValue(v);
      },
      onPanResponderMove: (_event, gesture) => {
        const v = valueFromPageX(gesture.moveX);
        if (v !== dragValueRef.current) {
          dragValueRef.current = v;
          setDragValue(v); // local state only — cheap re-render of this row
        }
      },
      onPanResponderRelease: () => {
        const v = dragValueRef.current;
        dragValueRef.current = null;
        setDragValue(null);
        if (v != null && v !== liveRef.current.value) liveRef.current.onValueChange(v);
      },
      onPanResponderTerminate: () => {
        // Gesture stolen (e.g. parent scroll) — discard without committing.
        dragValueRef.current = null;
        setDragValue(null);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const shownValue = dragValue ?? value;
  const ratio = (shownValue - minimumValue) / (maximumValue - minimumValue);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.accentPrimary }]}>
          {shownValue}
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
          pointerEvents="none"
        />
        <View style={styles.dotsRow} pointerEvents="none">
          {dots.map((dotValue) => {
            const isActive = dotValue === shownValue;
            const isFilled = dotValue <= shownValue;
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
