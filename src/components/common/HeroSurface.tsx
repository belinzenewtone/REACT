import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface HeroSurfaceProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
}

export function HeroSurface({ eyebrow, title, subtitle, leading, action, footer }: HeroSurfaceProps) {
  const colors = useThemeColors();

  return (
    <LinearGradient
      colors={[`${colors.accentPrimary}26`, colors.bgPrimary]}
      style={styles.surface}
    >
      <View style={styles.topRow}>
        {leading ? <View style={styles.leadingSlot}>{leading}</View> : null}
        <View style={styles.textCol}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.accentPrimary }]} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View style={styles.actionSlot}>{action}</View> : null}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingSlot: {
    marginRight: 12,
  },
  actionSlot: {
    marginLeft: 12,
  },
  textCol: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: typography.weights.semibold,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
