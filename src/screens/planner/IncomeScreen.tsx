import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { animateLayout } from '../../utils/animation';

const SEMANTIC = {
  success: '#7BC47B',
};

export function IncomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { incomes, loadAll, deleteIncome } = usePlannerStore();

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  const handleDelete = (id: string, source: string) => {
    Alert.alert('Delete income', `Remove ${source}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteIncome(db, id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerTextCol}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Income
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {incomes.length} entr{incomes.length === 1 ? 'y' : 'ies'} tracked
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('IncomeForm')}
          />
        </View>

        {incomes.length > 0 && (
          <GlassCard variant="elevated" style={styles.summaryCard}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Total Income</Text>
            <Text variant="headlineMedium" style={{ color: SEMANTIC.success }}>{formatCurrency(totalIncome)}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{incomes.length} source{incomes.length > 1 ? 's' : ''}</Text>
          </GlassCard>
        )}

        {incomes.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Ionicons name="cash-outline" size={32} color={SEMANTIC.success} />
            </View>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>No income yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xs }}>
              Track your salary, side hustles, and other income sources.
            </Text>
          </View>
        ) : (
          incomes.map((income) => (
            <GlassCard key={income.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.contentCol}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                    {income.source}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
                    {formatDate(income.date)}
                    {income.is_recurring ? ` · ${income.frequency}` : ''}
                  </Text>
                  {income.note ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                      {income.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.trailingCol}>
                  <Text variant="titleMedium" style={{ color: SEMANTIC.success }}>
                    {formatCurrency(income.amount)}
                  </Text>
                  <IconButton
                    icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                    size={16}
                    onPress={() => handleDelete(income.id, income.source)}
                    style={{ margin: 0 }}
                  />
                </View>
              </View>
            </GlassCard>
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
    paddingBottom: spacing.sm,
  },
  headerTextCol: { alignItems: 'center' },
  summaryCard: {
    marginBottom: spacing.base,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  card: { marginBottom: spacing.base, padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  trailingCol: { alignItems: 'flex-end' },
});
