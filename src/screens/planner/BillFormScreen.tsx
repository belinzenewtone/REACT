import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { BillRepository } from '../../database/repositories/BillRepository';
import { Dropdown } from '../../components/common/Dropdown';
import { DateField } from '../../components/common/DateField';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { BillCycle } from '../../types';

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
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<BillFormRouteProp>();
  const { createBill, updateBill, deleteBill } = usePlannerStore();

  const billId = route.params?.billId;
  const isEditing = !!billId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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

    const data = {
      title: title.trim(),
      amount: numAmount,
      cycle,
      nextDueDate: new Date(`${nextDueDate}T00:00:00.000Z`).toISOString(),
      notes: notes.trim() || undefined,
      paidStatus,
      isActive,
      lastPaidAt: paidStatus ? new Date().toISOString() : undefined,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && billId) {
        await updateBill(db, billId, data);
        setSuccessMsg('Bill updated');
      } else {
        await createBill(db, data);
        setSuccessMsg('Bill added');
      }
      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} />
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {isEditing ? 'Edit Bill' : 'Add Bill'}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Rent" />
        <Input label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <DateField label="Next due date" value={nextDueDate} onChange={setNextDueDate} />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Notes..." />

        <Dropdown label="Cycle" value={cycle} options={CYCLE_OPTIONS} onChange={(v) => setCycle(v as BillCycle)} />

        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: paidStatus ? colors.success : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setPaidStatus((v) => !v)}
        >
          <Text style={{ color: paidStatus ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            Paid: {paidStatus ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: isActive ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setIsActive((v) => !v)}
        >
          <Text style={{ color: isActive ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            Active: {isActive ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isEditing ? 'Update Bill' : 'Add Bill'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
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
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  content: { padding: spacing.lg },
  inputGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  label: { fontSize: typography.sizes.xs, marginBottom: 2 },
  input: { fontSize: typography.sizes.base, paddingVertical: 4 },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
    alignItems: 'center',
  },
  saveButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
