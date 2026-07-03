import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { nowIso } from '../../database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';
import type { FulizaLoanDbRecord } from '../../database/repositories/FulizaLoanRepository';

export function LoansScreen() {
  const colors = useThemeColors();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2500} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Finance Tools</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>Loans &amp; Fuliza</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              Track outstanding draws and repayment history
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('LoanForm')}>
            <Ionicons name="add" size={24} color={colors.accentPrimary} />
          </TouchableOpacity>
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
              <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Net Outstanding</Text>
              <Text
                style={[
                  styles.summaryAmount,
                  { color: netOutstanding > 0 ? colors.warning : colors.success },
                ]}
              >
                {formatCurrency(netOutstanding)}
              </Text>
              <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
                {netOutstanding <= 0
                  ? 'All Fuliza draws are fully repaid.'
                  : `${openLoans.length} open draw${openLoans.length === 1 ? '' : 's'}. Pay to avoid daily interest.`}
              </Text>
            </GlassCard>

            {openLoans.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.warning }]}>Open Draws</Text>
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
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Repaid</Text>
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
          <View style={[styles.modalCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log repayment</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Outstanding: {formatCurrency(
                (() => {
                  const l = loans.find((x) => x.id === payLoanId);
                  return l ? l.draw_amount_kes - l.total_repaid_kes : 0;
                })()
              )}
            </Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="Amount repaid"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border }]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPayLoanId(null)} style={styles.modalBtn}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogRepayment} style={styles.modalBtn}>
                <Text style={{ color: colors.accentPrimary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium }}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  const colors = useThemeColors();
  const outstanding = loan.draw_amount_kes - loan.total_repaid_kes;
  const isClosed = loan.status !== 'active';
  const statusLabel = loan.status.charAt(0).toUpperCase() + loan.status.slice(1);

  return (
    <TouchableOpacity onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.contentCol}>
            <Text style={[styles.loanTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              Draw: {formatCurrency(loan.draw_amount_kes)}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatDate(loan.draw_date, 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: isClosed ? colors.success : colors.warning }]}>
              {isClosed ? 'Repaid' : formatCurrency(outstanding)}
            </Text>
            <Text style={[styles.status, { color: colors.textSecondary }]}>{statusLabel}</Text>
          </View>
        </View>
        {loan.total_repaid_kes > 0 ? (
          <Text style={[styles.repaid, { color: colors.textSecondary }]}>
            Repaid: {formatCurrency(loan.total_repaid_kes)}
          </Text>
        ) : null}
        {!isClosed && (onLogRepayment || onMarkRepaid) ? (
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            {onLogRepayment && (
              <TouchableOpacity style={styles.actionBtn} onPress={onLogRepayment}>
                <Ionicons name="add-circle-outline" size={16} color={colors.accentPrimary} />
                <Text style={[styles.actionText, { color: colors.accentPrimary }]}>Log Repayment</Text>
              </TouchableOpacity>
            )}
            {onMarkRepaid && (
              <TouchableOpacity style={styles.actionBtn} onPress={onMarkRepaid}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Mark Repaid</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
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
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: 2 },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingTop: spacing.sm },
  summaryCard: { marginBottom: spacing.lg },
  summaryLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  summaryAmount: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  summaryMeta: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  divider: { height: 1, marginVertical: spacing.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  loanTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  meta: { fontSize: typography.sizes.xs, marginTop: 2 },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  status: { fontSize: typography.sizes.xs, marginTop: 2 },
  repaid: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  modalSub: { fontSize: typography.sizes.sm },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  modalBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
});
