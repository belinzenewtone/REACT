import React, { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

interface HeroSurfaceProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
}

export function HeroSurface({ eyebrow, title, subtitle, leading, action, footer }: HeroSurfaceProps) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[`${theme.colors.primary}26`, theme.colors.background]}
      style={styles.surface}
    >
      <View style={styles.topRow}>
        {leading ? <View style={styles.leadingSlot}>{leading}</View> : null}
        <View style={styles.textCol}>
          {eyebrow ? (
            <Text variant="labelSmall" style={{ color: theme.colors.primary }} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
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
  footer: {
    marginTop: spacing.lg,
  },
});
