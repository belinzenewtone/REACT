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
        {leading}
        <View style={styles.textCol}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.accentPrimary }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderBottomLeftRadius: borderRadius['2xl'] + 4,
    borderBottomRightRadius: borderRadius['2xl'] + 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
