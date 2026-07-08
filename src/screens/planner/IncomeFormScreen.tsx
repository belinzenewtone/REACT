import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text, IconButton, Button, TextInput, useTheme } from 'react-native-paper';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { IncomeRepository } from '../../database/repositories/IncomeRepository';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { DateField } from '../../components/common/DateField';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';
import type { IncomeFrequency } from '../../types';

type IncomeFormRouteProp = RouteProp<RootStackParamList, 'IncomeForm'>;
const FREQUENCIES: IncomeFrequency[] = ['once', 'daily', 'weekly', 'monthly', 'yearly'];
const FREQUENCY_OPTIONS = FREQUENCIES.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }));

export function IncomeFormScreen() {
  const theme = useTheme();
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
              {isEditing ? 'Edit Income' : 'Add Income'}
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
            label="Source"
            value={source}
            onChangeText={setSource}
            placeholder="e.g. Salary"
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
          <DateField label="Date" value={date} onChange={setDate} />
          <TextInput
            mode="outlined"
            dense
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Notes..."
            style={styles.input}
            multiline
          />

          <Button
            mode="outlined"
            onPress={() => setIsRecurring((v) => !v)}
            style={[
              styles.toggle,
              {
                backgroundColor: isRecurring ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
              },
            ]}
            textColor={isRecurring ? theme.colors.onPrimary : theme.colors.onSurface}
          >
            Recurring: {isRecurring ? 'Yes' : 'No'}
          </Button>

          {isRecurring && (
            <Dropdown
              label="Frequency"
              value={frequency}
              options={FREQUENCY_OPTIONS}
              onChange={(value) => setFrequency(value as IncomeFrequency)}
            />
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Update Income' : 'Add Income'}
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
    paddingVertical: spacing.sm,
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
