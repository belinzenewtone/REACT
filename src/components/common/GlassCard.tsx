import React, { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Card, TouchableRipple, useTheme } from 'react-native-paper';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
  onPress?: () => void;
}

export function GlassCard({ children, style, variant = 'default', onPress }: GlassCardProps) {
  const theme = useTheme();

  const backgroundColors = {
    default: theme.colors.surfaceVariant,
    elevated: theme.colors.elevation.level2,
    accent: `${theme.colors.primary}14`, // 8% opacity
  };

  const card = (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: backgroundColors[variant],
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
      mode="elevated"
    >
      {children}
    </Card>
  );

  if (!onPress) return card;

  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={theme.colors.primary}
      style={[styles.card, { borderRadius: 16 }]}
    >
      {card}
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
});
