import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { IncomeRepository } from '../../database/repositories/IncomeRepository';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { DateField } from '../../components/common/DateField';
import { spacing, typography, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';
import type { IncomeFrequency } from '../../types';

type IncomeFormRouteProp = RouteProp<RootStackParamList, 'IncomeForm'>;
const FREQUENCIES: IncomeFrequency[] = ['once', 'daily', 'weekly', 'monthly', 'yearly'];

export function IncomeFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<IncomeFormRouteProp>();
  const { createIncome, updateIncome, deleteIncome, loadAll } = usePlannerStore();

  const incomeId = route.params?.incomeId;
  const isEditing = !!incomeId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<IncomeFrequency>('once');

  useEffect(() => {
    if (!incomeId) return;
    const repo = new IncomeRepository(db);
    repo.findById(incomeId).then((income) => {
      if (income) {
        setSource(income.source);
        setAmount(income.amount.toString());
        setDate(income.date.split('T')[0]);
        setNote(income.note ?? '');
        setIsRecurring(income.is_recurring === 1);
        setFrequency(income.frequency ?? 'once');
      }
      setIsReady(true);
    });
  }, [incomeId, db]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!source.trim() || !numAmount || numAmount <= 0) {
      Alert.alert('Invalid input', 'Please enter a source and positive amount');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Missing date', 'Please enter a date');
      return;
    }

    setIsSaving(true);
    haptic('light');

    const data = {
      source: source.trim(),
      amount: numAmount,
      date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      note: note.trim() || undefined,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && incomeId) {
        await updateIncome(db, incomeId, data);
        setSuccessMsg('Income updated');
      } else {
        await createIncome(db, data);
        setSuccessMsg('Income added');
      }
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save income:', error);
      Alert.alert('Error', 'Failed to save income');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!incomeId) return;
    Alert.alert('Delete income', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteIncome(db, incomeId);
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
            {isEditing ? 'Edit Income' : 'Add Income'}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <Input label="Source" value={source} onChangeText={setSource} placeholder="e.g. Salary" />
        <Input label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <DateField label="Date" value={date} onChange={setDate} />
        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Notes..." />

        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: isRecurring ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setIsRecurring((v) => !v)}
        >
          <Text style={{ color: isRecurring ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            Recurring: {isRecurring ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>

        {isRecurring && (
          <View style={styles.segmentContainer}>
            {FREQUENCIES.map((f) => {
              const selected = frequency === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.segment, selected && { backgroundColor: colors.accentPrimary }]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.segmentText, { color: selected ? colors.textInverse : colors.textSecondary }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accentPrimary, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isSaving ? 'Saving…' : isEditing ? 'Update Income' : 'Add Income'}
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
    paddingVertical: spacing.sm,
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
  toggle: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  segmentContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segmentText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
