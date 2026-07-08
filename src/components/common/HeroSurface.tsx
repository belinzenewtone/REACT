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

/** Rebuilt on FrostCard technique: gradient + glow rings + frost film + hairline. No native blur dependency. */
export function HeroSurface({ eyebrow, title, subtitle, leading, action, footer }: HeroSurfaceProps) {
  const theme = useTheme();

  const isDark = theme.dark;
  const filmBg = isDark ? 'rgba(20,22,28,0.45)' : 'rgba(241,245,249,0.40)';
  const hairlineBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.surface}>
      <LinearGradient
        colors={[`${theme.colors.primary}22`, 'transparent']}
        style={[StyleSheet.absoluteFill, styles.surface]}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: filmBg }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hairline, { borderColor: hairlineBorder }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  hairline: {
    borderWidth: 1,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
