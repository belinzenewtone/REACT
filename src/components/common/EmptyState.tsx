import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Card
      style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}
      mode="elevated"
    >
      <Card.Content style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}14` }]}>
          <Ionicons name={icon} size={28} color={theme.colors.primary} />
        </View>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
            {subtitle}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button
            mode="outlined"
            compact
            onPress={onAction}
            style={{ marginTop: spacing.base }}
            textColor={theme.colors.primary}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
});
