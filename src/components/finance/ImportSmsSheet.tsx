import React from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import {
  Card,
  Text,
  Button,
  useTheme,
} from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

export type SmsScanPeriod = '24h' | '7d' | '30d' | '90d';

const PERIOD_OPTIONS: { key: SmsScanPeriod; label: string }[] = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

interface ImportSmsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectPeriod: (period: SmsScanPeriod) => void;
  isImporting?: boolean;
}

export function ImportSmsSheet({ visible, onClose, onSelectPeriod, isImporting = false }: ImportSmsSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Card style={[styles.content, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.grabber} />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
              Import M-Pesa SMS
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
              {isImporting ? 'Importing — please wait…' : 'Select the time period to scan'}
            </Text>
            {isImporting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Processing messages…</Text>
              </View>
            ) : (
              PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  mode="outlined"
                  onPress={() => onSelectPeriod(option.key)}
                  style={styles.optionRow}
                  textColor={theme.colors.onSurface}
                >
                  {option.label}
                </Button>
              ))
            )}
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  optionRow: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.base,
  },
});
