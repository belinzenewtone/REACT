import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
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

const CYCLE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One-time',
};

export function BillsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { bills, loadAll, updateBill, deleteBill } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const activeBills = bills.filter((b) => b.is_active);

  const handleMarkPaid = (id: string) => {
    updateBill(db, id, { paidStatus: true, lastPaidAt: new Date().toISOString() });
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete bill', `Remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBill(db, id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Recurring Obligations</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bills</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {activeBills.length} active bill{activeBills.length === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('BillForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {bills.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No bills yet"
            subtitle="Add a recurring obligation to track due dates and payments."
          />
        ) : (
          bills.map((bill) => {
            const isOverdue = !bill.paid_status && new Date(bill.next_due_date) < new Date();
            const dueColor = isOverdue ? colors.danger : colors.textSecondary;
            return (
              <TouchableOpacity
                key={bill.id}
                onPress={() => navigation.navigate('BillForm', { billId: bill.id })}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.contentCol}>
                      <Text style={[styles.billTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {bill.title}
                      </Text>
                      <View style={styles.chipRow}>
                        <View style={[styles.chip, { borderColor: dueColor, backgroundColor: `${dueColor}14` }]}>
                          <Text style={[styles.chipText, { color: dueColor }]}>
                            Due {formatDate(bill.next_due_date, 'dd MMM yyyy')}
                          </Text>
                        </View>
                        <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.glassWhite }]}>
                          <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                            {CYCLE_LABELS[bill.cycle] ?? bill.cycle}
                          </Text>
                        </View>
                      </View>
                      {bill.notes ? (
                        <Text style={[styles.notes, { color: colors.textTertiary }]} numberOfLines={2}>
                          {bill.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.trailingCol}>
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>
                        {formatCurrency(bill.amount)}
                      </Text>
                      <Text style={[styles.status, { color: bill.paid_status ? colors.success : colors.warning }]}>
                        {bill.paid_status ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    {!bill.paid_status && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkPaid(bill.id)}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        <Text style={[styles.actionText, { color: colors.success }]}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(bill.id, bill.title)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerTextCol: { alignItems: 'center' },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, marginTop: 2 },
  subtitle: { fontSize: typography.sizes.xs, marginTop: 2 },
  content: { padding: spacing.lg },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  billTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  notes: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
  trailingCol: { alignItems: 'flex-end' },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  status: { fontSize: typography.sizes.xs, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.lg,
  },
  actionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
});
