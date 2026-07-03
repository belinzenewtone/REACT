import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.glassBlack }]}>
        <View style={[styles.content, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.grabber} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Import M-Pesa SMS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isImporting ? 'Importing — please wait…' : 'Select the time period to scan'}
          </Text>
          {isImporting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accentPrimary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Processing messages…</Text>
            </View>
          ) : (
            PERIOD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionRow, { backgroundColor: colors.glassWhite }]}
                onPress={() => onSelectPeriod(option.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{option.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  optionRow: {
    width: '100%',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.base,
  },
  loadingText: {
    fontSize: typography.sizes.base,
  },
});
