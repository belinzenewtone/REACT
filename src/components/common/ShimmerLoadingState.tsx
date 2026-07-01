import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, borderRadius } from '../../theme';

interface ShimmerLoadingStateProps {
  rows?: number;
  rowHeight?: number;
}

export function ShimmerLoadingState({ rows = 3, rowHeight = 72 }: ShimmerLoadingStateProps) {
  const colors = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.row,
            { height: rowHeight, backgroundColor: colors.glassWhite, opacity },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.base,
  },
});
