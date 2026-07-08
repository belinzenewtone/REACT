import React, { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

type InlineBannerTone = 'warning' | 'success' | 'info';

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

const TONE_COLORS: Record<InlineBannerTone, string> = {
  warning: '#F5CB5C',
  success: '#7BC47B',
  info: '#7FC8F8',
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
  const theme = useTheme();
  const toneColor = TONE_COLORS[tone];

  return (
    <View style={[styles.container, { backgroundColor: `${toneColor}14`, borderColor: `${toneColor}40` }]}>
      <Ionicons name={icon ?? DEFAULT_ICONS[tone]} size={20} color={toneColor} />
      <View style={styles.textCol}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {actionLabel && onAction ? (
        <Button mode="text" compact onPress={onAction} textColor={toneColor}>
          {actionLabel}
        </Button>
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
    borderRadius: 16,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  textCol: {
    flex: 1,
  },
});
