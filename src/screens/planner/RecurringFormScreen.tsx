import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { RecurringRuleRepository } from '../../database/repositories/RecurringRuleRepository';
import { CATEGORY_COLORS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { RecurringCadence } from '../../types';

type RecurringFormRouteProp = RouteProp<RootStackParamList, 'RecurringForm'>;
const TYPES = ['expense', 'income', 'task'] as const;
const CADENCES: RecurringCadence[] = ['hourly', 'daily', 'weekly', 'biweekly', 'mon_fri', 'monthly', 'yearly'];
const CADENCE_LABELS: Record<RecurringCadence, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  mon_fri: 'Mon–Fri',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');

export function RecurringFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<RecurringFormRouteProp>();
  const { createRecurringRule, updateRecurringRule, deleteRecurringRule } = usePlannerStore();

  const ruleId = route.params?.ruleId;
  const isEditing = !!ruleId;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'task'>('expense');
  const [cadence, setCadence] = useState<RecurringCadence>('monthly');
  const [nextRunDate, setNextRunDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!ruleId) return;
    const repo = new RecurringRuleRepository(db);
    repo.findById(ruleId).then((rule) => {
      if (rule) {
        setTitle(rule.title);
        setType(rule.type);
        setCadence(rule.cadence);
        setNextRunDate(rule.next_run_at.split('T')[0]);
        setAmount(rule.amount?.toString() ?? '');
        setCategory(rule.category ?? CATEGORIES[0]);
        setEnabled(rule.enabled === 1);
      }
    });
  }, [ruleId, db]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a rule title');
      return;
    }
    if (!nextRunDate.trim()) {
      Alert.alert('Missing date', 'Please enter a next run date');
      return;
    }

    const numAmount = amount.trim() ? parseFloat(amount) : undefined;
    const data = {
      title: title.trim(),
      type,
      cadence,
      nextRunAt: new Date(`${nextRunDate}T00:00:00.000Z`).toISOString(),
      amount: numAmount,
      category: type === 'expense' ? category : undefined,
      enabled,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && ruleId) {
        await updateRecurringRule(db, ruleId, data);
      } else {
        await createRecurringRule(db, data);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save recurring rule:', error);
      Alert.alert('Error', 'Failed to save recurring rule');
    }
  };

  const handleDelete = () => {
    if (!ruleId) return;
    Alert.alert('Delete rule', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecurringRule(db, ruleId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Recurring Rule' : 'Add Recurring Rule'}
        </Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Netflix subscription" />
        <Input label="Amount (optional)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Next run date" value={nextRunDate} onChangeText={setNextRunDate} placeholder="YYYY-MM-DD" />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Type</Text>
        <View style={styles.segmentContainer}>
          {TYPES.map((t) => {
            const selected = type === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.segment, selected && { backgroundColor: colors.accentPrimary }]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.textInverse : colors.textSecondary }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Cadence</Text>
        <View style={styles.wrapSegmentContainer}>
          {CADENCES.map((c) => {
            const selected = cadence === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.wrapSegment, selected && { backgroundColor: colors.accentPrimary }]}
                onPress={() => setCadence(c)}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.textInverse : colors.textSecondary }]}>
                  {CADENCE_LABELS[c]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {type === 'expense' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                const catColor = CATEGORY_COLORS[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: selected ? `${catColor}30` : colors.glassWhite, borderColor: selected ? catColor : colors.border },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryLabel, { color: selected ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: enabled ? colors.success : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setEnabled((v) => !v)}
        >
          <Text style={{ color: enabled ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            Status: {enabled ? 'Active' : 'Paused'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isEditing ? 'Update Rule' : 'Add Rule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
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
  segmentContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  wrapSegmentContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  wrapSegment: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segmentText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  categoryChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
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
