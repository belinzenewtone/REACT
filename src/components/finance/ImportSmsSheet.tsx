import React, { useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, ScrollView } from 'react-native';
import {
  Card,
  Text,
  Button,
  useTheme,
  Divider,
  Chip,
} from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';
import type { InstitutionFilter, DetectedInstitution } from '../../../modules/lifeos-sms';

export type SmsScanPeriod = '1m' | '3m' | '6m';

export type ImportMode = 'mpesa_only' | 'banks_only' | 'all';

const PERIOD_OPTIONS: { key: SmsScanPeriod; label: string; months: number }[] = [
  { key: '1m', label: '1 Month', months: 1 },
  { key: '3m', label: '3 Months', months: 3 },
  { key: '6m', label: '6 Months', months: 6 },
];

const INSTITUTION_DISPLAY: Record<string, string> = {
  mpesa: 'M-Pesa',
  kcb: 'KCB Bank',
  equity: 'Equity Bank',
  coopbank: 'Co-op Bank',
  ncba: 'NCBA Bank',
  absa: 'Absa Bank',
  stanchart: 'Standard Chartered',
  dtb: 'DTB Bank',
  family: 'Family Bank',
  im: 'I&M Bank',
  stanbic: 'Stanbic Bank',
  airtel: 'Airtel Money',
  tkash: 'T-Kash',
};

function institutionLabel(id: string): string {
  return INSTITUTION_DISPLAY[id] ?? id.toUpperCase();
}

export function periodToMs(period: SmsScanPeriod): number {
  const days = period === '1m' ? 30 : period === '3m' ? 90 : 180;
  return days * 24 * 60 * 60 * 1000;
}

interface ImportSmsSheetProps {
  visible: boolean;
  onClose: () => void;
  onMpesaImport: (period: SmsScanPeriod) => void;
  onBankImport: (period: SmsScanPeriod, mode: ImportMode) => void;
  isImporting?: boolean;
  isDetecting?: boolean;
  detectedInstitutions?: DetectedInstitution[];
  onConfirmBankImport?: () => void;
  onCancelDetection?: () => void;
  showDetectionResult?: boolean;
}

export function ImportSmsSheet({
  visible,
  onClose,
  onMpesaImport,
  onBankImport,
  isImporting = false,
  isDetecting = false,
  detectedInstitutions,
  onConfirmBankImport,
  onCancelDetection,
  showDetectionResult = false,
}: ImportSmsSheetProps) {
  const theme = useTheme();
  const [pendingMode, setPendingMode] = useState<ImportMode | null>(null);

  const handleBankModeSelect = (mode: ImportMode) => {
    setPendingMode(mode);
  };

  const handlePeriodForBank = (period: SmsScanPeriod) => {
    if (pendingMode) {
      onBankImport(period, pendingMode);
      setPendingMode(null);
    }
  };

  const handleClose = () => {
    setPendingMode(null);
    onClose();
  };

  const bankInstitutions = detectedInstitutions?.filter((d) => d.institutionId !== 'mpesa') ?? [];
  const mpesaDetected = detectedInstitutions?.find((d) => d.institutionId === 'mpesa');
  const totalMessages = detectedInstitutions?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Card style={[styles.content, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.grabber} />

            {/* Detection result popup */}
            {showDetectionResult && detectedInstitutions && !isImporting ? (
              <View>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>
                  Banks Detected
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
                  We found {totalMessages} financial messages from:
                </Text>

                <ScrollView style={styles.detectionList}>
                  {mpesaDetected ? (
                    <View style={[styles.detectionRow, { borderColor: theme.colors.outlineVariant }]}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
                        {institutionLabel('mpesa')}
                      </Text>
                      <Chip compact textStyle={{ fontSize: 12 }}>
                        {mpesaDetected.count} msgs
                      </Chip>
                    </View>
                  ) : null}
                  {bankInstitutions.map((inst) => (
                    <View key={inst.institutionId} style={[styles.detectionRow, { borderColor: theme.colors.outlineVariant }]}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
                        {institutionLabel(inst.institutionId)}
                      </Text>
                      <Chip compact textStyle={{ fontSize: 12 }}>
                        {inst.count} msgs
                      </Chip>
                    </View>
                  ))}
                </ScrollView>

                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: spacing.lg }}>
                  Confirm all your banks are listed above. Missing banks will be supported in future updates.
                </Text>

                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={onCancelDetection}
                    style={styles.halfButton}
                    textColor={theme.colors.onSurface}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={onConfirmBankImport}
                    style={styles.halfButton}
                  >
                    Import All
                  </Button>
                </View>
              </View>
            ) : isImporting || isDetecting ? (
              /* Loading state */
              <View>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
                  {isDetecting ? 'Scanning Messages' : 'Importing'}
                </Text>
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {isDetecting ? 'Detecting banks in your inbox...' : 'Processing messages...'}
                  </Text>
                </View>
              </View>
            ) : pendingMode ? (
              /* Time period selection for bank imports */
              <View>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>
                  Select Time Period
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg }}>
                  How far back should we scan?
                </Text>
                {PERIOD_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    mode="outlined"
                    onPress={() => handlePeriodForBank(option.key)}
                    style={styles.optionRow}
                    textColor={theme.colors.onSurface}
                  >
                    Last {option.label}
                  </Button>
                ))}
                <Button
                  mode="text"
                  onPress={() => setPendingMode(null)}
                  style={{ marginTop: spacing.xs }}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  Back
                </Button>
              </View>
            ) : (
              /* Main segmented view */
              <View>
                {/* Segment 1: M-Pesa Only */}
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.sm }}>
                  M-Pesa Only
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>
                  Import M-Pesa transactions
                </Text>
                <View style={styles.mpesaRow}>
                  {PERIOD_OPTIONS.map((option) => (
                    <Button
                      key={option.key}
                      mode="outlined"
                      onPress={() => onMpesaImport(option.key)}
                      style={styles.mpesaButton}
                      textColor={theme.colors.onSurface}
                      compact
                    >
                      {option.label}
                    </Button>
                  ))}
                </View>

                <Divider style={{ marginVertical: spacing.lg }} />

                {/* Segment 2: Banks Only */}
                <Button
                  mode="outlined"
                  onPress={() => handleBankModeSelect('banks_only')}
                  style={styles.optionRow}
                  textColor={theme.colors.onSurface}
                  icon="bank-outline"
                >
                  Banks Only
                </Button>

                {/* Segment 3: M-Pesa + Banks */}
                <Button
                  mode="contained"
                  onPress={() => handleBankModeSelect('all')}
                  style={styles.optionRow}
                  icon="bank-transfer"
                >
                  M-Pesa + Banks
                </Button>
              </View>
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
  mpesaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mpesaButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.base,
  },
  detectionList: {
    maxHeight: 280,
  },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
});
