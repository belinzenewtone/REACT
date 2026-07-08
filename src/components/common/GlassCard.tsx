import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, TouchableRipple, useTheme } from 'react-native-paper';
import { borderRadius as br } from '../../theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
  intensity?: number;
  onPress?: () => void;
}

/** Rebuilt on FrostCard technique: gradient + glow rings + frost film + hairline. No native blur dependency. */
export function GlassCard({ children, style, variant = 'default', intensity, onPress }: GlassCardProps) {
  const theme = useTheme();

  const isElevated = variant === 'elevated';
  const isDark = theme.dark;

  const gradientColors: [string, string, string] = isDark
    ? ['#101014', '#0E1B2E', '#101014']
    : ['#FFFFFF', '#EFF6FF', '#FFFFFF'];
  const tint = variant === 'accent'
    ? `${theme.colors.primary}22`
    : isElevated
      ? isDark ? 'rgba(40,47,60,0.60)' : 'rgba(226,232,240,0.60)'
      : isDark ? 'rgba(30,35,45,0.55)' : 'rgba(241,245,249,0.55)';
  const borderColor = variant === 'accent'
    ? `${theme.colors.primary}33`
    : isElevated
      ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
      : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const filmColor = isDark ? 'rgba(20,22,28,0.45)' : 'rgba(248,250,252,0.50)';

  const inner = (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { ...StyleSheet.absoluteFillObject, borderRadius: br.lg, backgroundColor: filmColor }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hairline, { borderColor }]} />
      <Card style={styles.transparentCard} contentStyle={styles.cardContent}>
        {children}
      </Card>
    </View>
  );

  if (!onPress) return inner;
  return (
    <TouchableRipple onPress={onPress} rippleColor={`${theme.colors.primary}33`} style={[styles.root, style]} borderless>
      {inner}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: br.lg,
    overflow: 'hidden',
  },
  hairline: {
    borderRadius: br.lg,
    borderWidth: 1,
  },
  transparentCard: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  cardContent: {
    padding: 12,
  },
});
