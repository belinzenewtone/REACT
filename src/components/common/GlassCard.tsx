import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, spacing } from '../../theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
}

export function GlassCard({ children, style, variant = 'default' }: GlassCardProps) {
  const colors = useThemeColors();

  const backgroundColors = {
    default: colors.glassWhite,
    elevated: colors.bgElevated,
    accent: `${colors.accentPrimary}14`, // 8% opacity
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: backgroundColors[variant],
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
