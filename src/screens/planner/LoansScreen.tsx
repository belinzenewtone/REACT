import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
  const { loans, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const openLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);
  const closedLoans = useMemo(() => loans.filter((l) => l.status !== 'active').slice(0, 10), [loans]);
  const netOutstanding = useMemo(
    () => openLoans.reduce((sum, l) => sum + (l.draw_amount_kes - l.total_repaid_kes), 0),
    [openLoans]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Finance Tools</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Loans &amp; Fuliza</Text>
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
                  <LoanCard key={loan.id} loan={loan} onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })} />
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
    </SafeAreaView>
  );
}

function LoanCard({ loan, onPress }: { loan: FulizaLoanDbRecord; onPress: () => void }) {
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
});
