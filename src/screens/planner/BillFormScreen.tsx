import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text, IconButton, Button, TextInput, Chip, useTheme } from 'react-native-paper';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { BillRepository } from '../../database/repositories/BillRepository';
import { Dropdown } from '../../components/common/Dropdown';
import { DateField } from '../../components/common/DateField';
import { spacing, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { BillCycle } from '../../types';
import { applyBillPayment } from '../../utils/billCycle';
import { haptic } from '../../services/haptics';

const SEMANTIC = {
  success: '#7BC47B',
};

type BillFormRouteProp = RouteProp<RootStackParamList, 'BillForm'>;
const CYCLE_LABELS: Record<BillCycle, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One-time',
};
const CYCLE_OPTIONS = (Object.keys(CYCLE_LABELS) as BillCycle[]).map((cycle) => ({
  value: cycle,
  label: CYCLE_LABELS[cycle],
}));

export function BillFormScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<BillFormRouteProp>();
  const { createBill, updateBill, deleteBill } = usePlannerStore();

  const billId = route.params?.billId;
  const isEditing = !!billId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillCycle>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paidStatus, setPaidStatus] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!billId) return;
    const repo = new BillRepository(db);
    repo.findById(billId).then((bill) => {
      if (bill) {
        setTitle(bill.title);
        setAmount(bill.amount.toString());
        setCycle(bill.cycle);
        setNextDueDate(bill.next_due_date.split('T')[0]);
        setNotes(bill.notes ?? '');
        setPaidStatus(bill.paid_status === 1);
        setIsActive(bill.is_active === 1);
      }
      setIsReady(true);
    });
  }, [billId, db]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!title.trim() || !numAmount || numAmount <= 0) {
      Alert.alert('Invalid input', 'Please enter a title and positive amount');
      return;
    }
    if (!nextDueDate.trim()) {
      Alert.alert('Missing date', 'Please enter a due date');
      return;
    }

    setIsSaving(true);
    haptic('light');

    // For repeating cycles, "Paid" means "done for THIS cycle" — the due date
    // advances one cycle and paid resets so the next reminder arms. Pure math
    // lives in src/utils/billCycle.ts (unit-tested).
    const dueIso = new Date(`${nextDueDate}T00:00:00.000Z`).toISOString();
    const { nextDueIso, paidStatus: effectivePaid, advanced } = applyBillPayment(dueIso, cycle, paidStatus);

    const data = {
      title: title.trim(),
      amount: numAmount,
      cycle,
      nextDueDate: nextDueIso,
      notes: notes.trim() || undefined,
      paidStatus: effectivePaid,
      isActive,
      lastPaidAt: paidStatus ? new Date().toISOString() : undefined,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && billId) {
        await updateBill(db, billId, data);
        setSuccessMsg(advanced ? 'Paid — next cycle scheduled' : 'Bill updated');
      } else {
        await createBill(db, data);
        setSuccessMsg(advanced ? 'Bill added — next cycle scheduled' : 'Bill added');
      }
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!billId) return;
    Alert.alert('Delete bill', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBill(db, billId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} />
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <IconButton
              icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
              onPress={() => navigation.goBack()}
            />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              {isEditing ? 'Edit Bill' : 'Add Bill'}
            </Text>
            {isEditing ? (
              <IconButton
                icon={() => <Ionicons name="trash-outline" size={22} color={theme.colors.error} />}
                onPress={handleDelete}
              />
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          <TextInput
            mode="outlined"
            dense
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Rent"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <DateField label="Next due date" value={nextDueDate} onChange={setNextDueDate} />
          <TextInput
            mode="outlined"
            dense
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes..."
            style={styles.input}
            multiline
          />

          <Dropdown label="Cycle" value={cycle} options={CYCLE_OPTIONS} onChange={(v) => setCycle(v as BillCycle)} />

          <Button
            mode="outlined"
            onPress={() => setPaidStatus((v) => !v)}
            style={[
              styles.toggle,
              {
                backgroundColor: paidStatus ? SEMANTIC.success : theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
              },
            ]}
            textColor={paidStatus ? theme.colors.onPrimary : theme.colors.onSurface}
          >
            Paid: {paidStatus ? 'Yes' : 'No'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => setIsActive((v) => !v)}
            style={[
              styles.toggle,
              {
                backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
              },
            ]}
            textColor={isActive ? theme.colors.onPrimary : theme.colors.onSurface}
          >
            Active: {isActive ? 'Yes' : 'No'}
          </Button>

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Update Bill' : 'Add Bill'}
          </Button>
        </ScrollView>
      </Animated.View>
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
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg },
  input: {
    marginBottom: spacing.base,
    backgroundColor: 'transparent',
  },
  toggle: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
  },
});
