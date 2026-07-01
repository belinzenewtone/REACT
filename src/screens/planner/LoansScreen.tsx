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

export function LoansScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { loans, loadAll } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Loans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoanForm')}>
          <Ionicons name="add" size={24} color={colors.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loans.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No loans yet.</Text>
        ) : (
          loans.map((loan) => {
            const remaining = loan.draw_amount_kes - loan.total_repaid_kes;
            return (
              <TouchableOpacity
                key={loan.id}
                onPress={() => navigation.navigate('LoanForm', { loanId: loan.id })}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.contentCol}>
                      <Text style={[styles.loanTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {loan.draw_code || 'Loan'}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        Drawn {formatDate(loan.draw_date, 'dd MMM yyyy')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>
                        {formatCurrency(loan.draw_amount_kes)}
                      </Text>
                      <Text style={[styles.status, { color: loan.status === 'active' ? colors.warning : colors.success }]}>
                        {loan.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.remaining, { color: colors.textSecondary }]}>
                    Remaining: {formatCurrency(remaining)}
                  </Text>
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
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sizes.base },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  loanTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  meta: { fontSize: typography.sizes.sm, marginTop: 2 },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  status: { fontSize: typography.sizes.xs, marginTop: 2, textTransform: 'capitalize' },
  remaining: { fontSize: typography.sizes.sm, marginTop: spacing.sm },
});
