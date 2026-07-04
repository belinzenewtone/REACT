import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, useTheme } from 'react-native-paper';
import { spacing } from '../../theme';

interface QuickActionsProps {
  onAddTransaction?: () => void;
  onAddTask?: () => void;
  onViewFinance?: () => void;
}

export function QuickActions({ onAddTransaction, onAddTask, onViewFinance }: QuickActionsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        icon={() => <Ionicons name="add-circle" size={20} color={theme.colors.onPrimary} />}
        onPress={onAddTransaction}
        style={styles.primaryButton}
        labelStyle={styles.primaryLabel}
      >
        Add Transaction
      </Button>

      <View style={styles.secondaryRow}>
        <Button
          mode="outlined"
          icon={() => <Ionicons name="checkbox-outline" size={18} color={theme.colors.primary} />}
          onPress={onAddTask}
          style={styles.secondaryButton}
          labelStyle={styles.secondaryLabel}
        >
          Add Task
        </Button>
        <Button
          mode="outlined"
          icon={() => <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />}
          onPress={onViewFinance}
          style={styles.secondaryButton}
          labelStyle={styles.secondaryLabel}
        >
          View Finance
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.base,
  },
  primaryButton: {
    borderRadius: spacing.md,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: spacing.md,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
