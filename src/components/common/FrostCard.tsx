import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableRipple, useTheme } from 'react-native-paper';

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

  const glowRings =
    glow === 'none'
      ? null
      : glow === 'blue'
      ? (
        <>
          <View style={[styles.ring, { top: -110, right: -80, width: 320, height: 320, backgroundColor: 'rgba(87,185,255,0.10)' }]} />
          <View style={[styles.ring, { top: -70, right: -45, width: 240, height: 240, backgroundColor: 'rgba(87,185,255,0.12)' }]} />
          <View style={[styles.ring, { top: -40, right: -20, width: 175, height: 175, backgroundColor: 'rgba(87,185,255,0.14)' }]} />
        </>
      )
      : (
        <>
          <View style={[styles.ring, { bottom: -120, left: -80, width: 320, height: 320, backgroundColor: 'rgba(94,234,212,0.07)' }]} />
          <View style={[styles.ring, { bottom: -80, left: -45, width: 240, height: 240, backgroundColor: 'rgba(94,234,212,0.09)' }]} />
          <View style={[styles.ring, { bottom: -50, left: -20, width: 175, height: 175, backgroundColor: 'rgba(94,234,212,0.11)' }]} />
        </>
      );

  const surface = (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={glow === 'teal' ? ['#101014', '#0E1F24', '#101014'] : ['#12304A', '#0E1B2E', '#101014']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {glowRings}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.film]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hairline]} />
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  film: {
    borderRadius: 16,
    backgroundColor: 'rgba(20,22,28,0.45)',
  },
  hairline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  content: {
    padding: 16,
  },
});
