import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableRipple, useTheme } from 'react-native-paper';
import { borderRadius as br } from '../../theme';

type Glow = 'blue' | 'teal' | 'none';

interface FrostCardProps {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Tinted glow diffusing under the frost film. */
  glow?: Glow;
  onPress?: () => void;
}

/**
 * Simulated frosted-glass surface: gradient backdrop, soft glow blobs built
 * from stacked falloff rings (fakes a gaussian edge), a translucent frost
 * film, and a 1px hairline highlight. Pure RN views — no native blur, so it
 * renders identically (and cheaply) on Android and iOS.
 */
export function FrostCard({ children, style, contentStyle, glow = 'blue', onPress }: FrostCardProps) {
  const theme = useTheme();

  const isDark = theme.dark;

  const gradientColors: [string, string, string] = isDark
    ? (glow === 'teal' ? ['#101014', '#0E1F24', '#101014'] : ['#12304A', '#0E1B2E', '#101014'])
    : (glow === 'teal' ? ['#F0FDFA', '#CCFBF1', '#F8FAFC'] : ['#EFF6FF', '#DBEAFE', '#F8FAFC']);

  const glowRings =
    glow === 'none'
      ? null
      : glow === 'blue'
      ? (
        <>
          <View style={[styles.ring, { top: -110, right: -80, width: 320, height: 320, backgroundColor: isDark ? 'rgba(87,185,255,0.10)' : 'rgba(3,105,161,0.06)' }]} />
          <View style={[styles.ring, { top: -70, right: -45, width: 240, height: 240, backgroundColor: isDark ? 'rgba(87,185,255,0.12)' : 'rgba(3,105,161,0.08)' }]} />
          <View style={[styles.ring, { top: -40, right: -20, width: 175, height: 175, backgroundColor: isDark ? 'rgba(87,185,255,0.14)' : 'rgba(3,105,161,0.10)' }]} />
        </>
      )
      : (
        <>
          <View style={[styles.ring, { bottom: -120, left: -80, width: 320, height: 320, backgroundColor: isDark ? 'rgba(94,234,212,0.07)' : 'rgba(15,118,110,0.05)' }]} />
          <View style={[styles.ring, { bottom: -80, left: -45, width: 240, height: 240, backgroundColor: isDark ? 'rgba(94,234,212,0.09)' : 'rgba(15,118,110,0.07)' }]} />
          <View style={[styles.ring, { bottom: -50, left: -20, width: 175, height: 175, backgroundColor: isDark ? 'rgba(94,234,212,0.11)' : 'rgba(15,118,110,0.09)' }]} />
        </>
      );

  const filmColor = isDark ? 'rgba(20,22,28,0.45)' : 'rgba(255,255,255,0.55)';
  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';

  const surface = (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {glowRings}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: br.lg, backgroundColor: filmColor }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hairline, { borderColor: hairlineColor }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (!onPress) return surface;
  return (
    <TouchableRipple onPress={onPress} rippleColor={`${theme.colors.primary}33`} style={[styles.root, style]} borderless>
      {surface}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: br.lg,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  hairline: {
    borderRadius: br.lg,
    borderWidth: 1,
  },
  content: {
    padding: 16,
  },
});
