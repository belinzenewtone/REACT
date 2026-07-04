import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, Button, TouchableRipple, useTheme } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { animateLayout } from '../../utils/animation';
import { haptic } from '../../services/haptics';

const SEMANTIC = {
  success: '#7BC47B',
  warning: '#F5CB5C',
  danger: '#FF6B6B',
};

const CYCLE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One-time',
};

export function BillsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { bills, loadAll, updateBill, deleteBill } = usePlannerStore();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const activeBills = bills.filter((b) => b.is_active);

  const handleTogglePaid = (id: string) => {
    const bill = bills.find((b) => b.id === id);
    if (!bill) return;
    animateLayout();
    const nextPaidStatus = !bill.paid_status;
    if (nextPaidStatus) {
      const nextDueDate = bill.cycle !== 'one_time' ? advanceDueDate(bill.next_due_date, bill.cycle) : undefined;
      updateBill(db, id, {
        paidStatus: true,
        lastPaidAt: new Date().toISOString(),
        ...(nextDueDate ? { nextDueDate } : {}),
      });
      haptic('success');
      setBanner(`${bill.title} marked as paid`);
    } else {
      updateBill(db, id, {
        paidStatus: false,
        lastPaidAt: undefined,
      });
      haptic('light');
      setBanner(`${bill.title} marked as unpaid`);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete bill', `Remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteBill(db, id);
        },
      },
    ]);
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
              RECURRING OBLIGATIONS
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Bills
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {activeBills.length} active bill{activeBills.length === 1 ? '' : 's'}
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('BillForm')}
          />
        </View>

        {bills.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No bills yet"
            subtitle="Add a recurring obligation to track due dates and payments."
          />
        ) : (
          bills.map((bill) => {
            const isOverdue = !bill.paid_status && new Date(bill.next_due_date) < new Date();
            const dueColor = isOverdue ? SEMANTIC.danger : theme.colors.onSurfaceVariant;
            return (
              <TouchableRipple
                key={bill.id}
                onPress={() => navigation.navigate('BillForm', { billId: bill.id })}
                style={{ marginBottom: spacing.base }}
                rippleColor={theme.colors.primary}
              >
                <GlassCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.contentCol}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                        {bill.title}
                      </Text>
                      <View style={styles.chipRow}>
                        <View style={[styles.chip, { borderColor: dueColor, backgroundColor: `${dueColor}14` }]}>
                          <Text variant="labelSmall" style={{ color: dueColor }}>
                            Due {formatDate(bill.next_due_date, 'dd MMM yyyy')}
                          </Text>
                        </View>
                        <View style={[styles.chip, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {CYCLE_LABELS[bill.cycle] ?? bill.cycle}
                          </Text>
                        </View>
                      </View>
                      {bill.notes ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                          {bill.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.trailingCol}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {formatCurrency(bill.amount)}
                      </Text>
                      <Text variant="bodySmall" style={{ color: bill.paid_status ? SEMANTIC.success : SEMANTIC.warning }}>
                        {bill.paid_status ? 'Paid' : 'Unpaid'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
                    <Button
                      mode="text"
                      compact
                      icon={() => (
                        <Ionicons
                          name={bill.paid_status ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={16}
                          color={bill.paid_status ? SEMANTIC.warning : SEMANTIC.success}
                        />
                      )}
                      onPress={() => handleTogglePaid(bill.id)}
                      textColor={bill.paid_status ? SEMANTIC.warning : SEMANTIC.success}
                      style={{ marginRight: spacing.sm }}
                    >
                      {bill.paid_status ? 'Mark Unpaid' : 'Mark Paid'}
                    </Button>
                    <Button
                      mode="text"
                      compact
                      icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                      onPress={() => handleDelete(bill.id, bill.title)}
                      textColor={theme.colors.error}
                    >
                      Delete
                    </Button>
                  </View>
                </GlassCard>
              </TouchableRipple>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function advanceDueDate(dateStr: string, cycle: string): string {
  const d = new Date(dateStr);
  switch (cycle) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString();
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  card: { padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  trailingCol: { alignItems: 'flex-end' },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
});
