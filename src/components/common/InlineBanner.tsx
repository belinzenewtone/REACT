import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

export type InlineBannerTone = 'warning' | 'success' | 'info';

interface InlineBannerProps {
  tone: InlineBannerTone;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: ReactNode;
}

const DEFAULT_ICONS: Record<InlineBannerTone, keyof typeof Ionicons.glyphMap> = {
  warning: 'warning-outline',
  success: 'checkmark-circle-outline',
  info: 'information-circle-outline',
};

export function InlineBanner({
  tone,
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  trailing,
}: InlineBannerProps) {
  const colors = useThemeColors();
  const toneColor = colors[tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'info'];

  return (
    <View style={[styles.container, { backgroundColor: `${toneColor}14`, borderColor: `${toneColor}40` }]}>
      <Ionicons name={icon ?? DEFAULT_ICONS[tone]} size={20} color={toneColor} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.action, { color: toneColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  action: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
