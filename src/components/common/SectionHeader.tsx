import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <TouchableRipple onPress={onAction} borderless>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }} numberOfLines={1}>
            {actionLabel}
          </Text>
        </TouchableRipple>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
});
