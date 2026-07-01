import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

export function BillsScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { bills, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bills</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BillForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {bills.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No bills yet.</Text>
        ) : (
          bills.map((bill) => (
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
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      Due {formatDate(bill.next_due_date, 'dd MMM yyyy')} · {bill.cycle}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: colors.textPrimary }]}>
                      {formatCurrency(bill.amount)}
                    </Text>
                    <Text style={[styles.status, { color: bill.paid_status ? colors.success : colors.warning }]}>
                      {bill.paid_status ? 'Paid' : 'Unpaid'}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))
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
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  billTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2, textTransform: 'capitalize' },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  status: { fontSize: typography.sizes.xs, marginTop: 2 },
});
