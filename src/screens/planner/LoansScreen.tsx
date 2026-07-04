import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { nowIso } from '../../database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, Button, Card, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import type { FulizaLoanDbRecord } from '../../database/repositories/FulizaLoanRepository';

const SEMANTIC = {
  success: '#7BC47B',
  warning: '#F5CB5C',
};

export function LoansScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { loans, loadAll, updateLoan } = usePlannerStore();
  const [payLoanId, setPayLoanId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const openLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);
  const closedLoans = useMemo(() => loans.filter((l) => l.status !== 'active').slice(0, 10), [loans]);
  const netOutstanding = useMemo(
    () => openLoans.reduce((sum, l) => sum + (l.draw_amount_kes - l.total_repaid_kes), 0),
    [openLoans]
  );

  const handleLogRepayment = async () => {
    const loan = loans.find((l) => l.id === payLoanId);
    if (!loan) { setPayLoanId(null); return; }
    const delta = parseFloat(payAmount);
    if (!Number.isFinite(delta) || delta <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive repayment amount.');
      return;
    }
    const outstanding = loan.draw_amount_kes - loan.total_repaid_kes;
    const applied = Math.min(delta, outstanding);
    const nextRepaid = loan.total_repaid_kes + applied;
    const fullyPaid = nextRepaid >= loan.draw_amount_kes - 0.005;
    await updateLoan(db, loan.id, {
      totalRepaidKes: nextRepaid,
      lastRepaymentDate: nowIso(),
      ...(fullyPaid ? { status: 'repaid' as const } : {}),
    });
    setBanner(fullyPaid ? 'Loan fully repaid 🎉' : `Logged ${formatCurrency(applied)} repayment`);
    setPayLoanId(null);
    setPayAmount('');
  };

  const handleMarkRepaid = async (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    await updateLoan(db, loanId, {
      totalRepaidKes: loan.draw_amount_kes,
      lastRepaymentDate: nowIso(),
      status: 'repaid',
    });
    setBanner('Loan marked as repaid');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2500} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerTextCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              FINANCE TOOLS
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Loans &amp; Fuliza
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              Track outstanding draws and repayment history
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('LoanForm')}
          />
        </View>

        {loans.length === 0 ? (
          <EmptyState
            icon="cash-outline"
            title="No Fuliza history yet"
            subtitle="Import M-Pesa messages from Finance to track Fuliza draws and repayments automatically."
          />
        ) : (
          <>
            <GlassCard variant="elevated" style={styles.summaryCard}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Net Outstanding</Text>
              <Text
                variant="headlineMedium"
                style={{ color: netOutstanding > 0 ? SEMANTIC.warning : SEMANTIC.success }}
              >
                {formatCurrency(netOutstanding)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {netOutstanding <= 0
                  ? 'All Fuliza draws are fully repaid.'
                  : `${openLoans.length} open draw${openLoans.length === 1 ? '' : 's'}. Pay to avoid daily interest.`}
              </Text>
            </GlassCard>

            {openLoans.length > 0 && (
              <>
                <Text variant="labelLarge" style={{ color: SEMANTIC.warning, marginBottom: spacing.sm, marginTop: spacing.xs }}>
                  Open Draws
                </Text>
                {openLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })}
                    onLogRepayment={() => { setPayLoanId(loan.id); setPayAmount(''); }}
                    onMarkRepaid={() => handleMarkRepaid(loan.id)}
                  />
                ))}
              </>
            )}

            {closedLoans.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm, marginTop: spacing.xs }}>
                  Repaid
                </Text>
                {closedLoans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={payLoanId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPayLoanId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={[styles.modalCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
            <Card.Content style={{ gap: spacing.sm }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Log repayment</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Outstanding: {formatCurrency(
                  (() => {
                    const l = loans.find((x) => x.id === payLoanId);
                    return l ? l.draw_amount_kes - l.total_repaid_kes : 0;
                  })()
                )}
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
                placeholder="Amount repaid"
                style={{ backgroundColor: 'transparent' }}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => setPayLoanId(null)} textColor={theme.colors.onSurfaceVariant}>
                  Cancel
                </Button>
                <Button mode="text" onPress={handleLogRepayment} textColor={theme.colors.primary}>
                  Log
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LoanCard({
  loan,
  onPress,
  onLogRepayment,
  onMarkRepaid,
}: {
  loan: FulizaLoanDbRecord;
  onPress: () => void;
  onLogRepayment?: () => void;
  onMarkRepaid?: () => void;
}) {
  const theme = useTheme();
  const outstanding = loan.draw_amount_kes - loan.total_repaid_kes;
  const isClosed = loan.status !== 'active';
  const statusLabel = loan.status.charAt(0).toUpperCase() + loan.status.slice(1);

  return (
    <TouchableRipple onPress={onPress} style={{ marginBottom: spacing.base }} rippleColor={theme.colors.primary}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.contentCol}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Draw: {formatCurrency(loan.draw_amount_kes)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDate(loan.draw_date, 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleMedium" style={{ color: isClosed ? SEMANTIC.success : SEMANTIC.warning }}>
              {isClosed ? 'Repaid' : formatCurrency(outstanding)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{statusLabel}</Text>
          </View>
        </View>
        {loan.total_repaid_kes > 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Repaid: {formatCurrency(loan.total_repaid_kes)}
          </Text>
        ) : null}
        {!isClosed && (onLogRepayment || onMarkRepaid) ? (
          <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
            {onLogRepayment && (
              <Button
                mode="text"
                compact
                icon={() => <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />}
                onPress={onLogRepayment}
                textColor={theme.colors.primary}
                style={{ marginRight: spacing.sm }}
              >
                Log Repayment
              </Button>
            )}
            {onMarkRepaid && (
              <Button
                mode="text"
                compact
                icon={() => <Ionicons name="checkmark-circle-outline" size={16} color={SEMANTIC.success} />}
                onPress={onMarkRepaid}
                textColor={SEMANTIC.success}
              >
                Mark Repaid
              </Button>
            )}
          </View>
        ) : null}
      </GlassCard>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerTextCol: { flex: 1, alignItems: 'center' },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  summaryCard: { marginBottom: spacing.lg },
  divider: { height: 1, marginVertical: spacing.base },
  card: { padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
