import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text, IconButton, Button, TextInput, useTheme } from 'react-native-paper';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { RecurringRuleRepository } from '../../database/repositories/RecurringRuleRepository';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { Dropdown } from '../../components/common/Dropdown';
import { DateField } from '../../components/common/DateField';
import { spacing, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';
import type { RecurringCadence } from '../../types';

type RecurringFormRouteProp = RouteProp<RootStackParamList, 'RecurringForm'>;
const TYPES = ['expense', 'income', 'task'] as const;
const TYPE_OPTIONS = TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
const CADENCE_LABELS: Record<RecurringCadence, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  mon_fri: 'Mon–Fri',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
const CADENCE_OPTIONS = (Object.keys(CADENCE_LABELS) as RecurringCadence[]).map((cadence) => ({
  value: cadence,
  label: CADENCE_LABELS[cadence],
}));
const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');
const CATEGORY_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
  icon: CATEGORY_ICONS[cat] as keyof typeof Ionicons.glyphMap,
  color: CATEGORY_COLORS[cat],
}));

const SEMANTIC = {
  success: '#7BC47B',
};

export function RecurringFormScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<RecurringFormRouteProp>();
  const { createRecurringRule, updateRecurringRule, deleteRecurringRule } = usePlannerStore();

  const ruleId = route.params?.ruleId;
  const isEditing = !!ruleId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
      setIsReady(true);
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

    setIsSaving(true);
    haptic('light');

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
        setSuccessMsg('Rule updated');
      } else {
        await createRecurringRule(db, data);
        setSuccessMsg('Rule added');
      }
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save recurring rule:', error);
      Alert.alert('Error', 'Failed to save recurring rule');
      setIsSaving(false);
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
              {isEditing ? 'Edit Recurring Rule' : 'Add Recurring Rule'}
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
            placeholder="e.g. Netflix subscription"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Amount (optional)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <DateField label="Next run date" value={nextRunDate} onChange={setNextRunDate} />

          <Dropdown
            label="Type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => setType(value as 'expense' | 'income' | 'task')}
          />

          <Dropdown
            label="Cadence"
            value={cadence}
            options={CADENCE_OPTIONS}
            onChange={(v) => setCadence(v as RecurringCadence)}
          />

          {type === 'expense' && (
            <Dropdown label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
          )}

          <Button
            mode="outlined"
            onPress={() => setEnabled((v) => !v)}
            style={[
              styles.toggle,
              {
                backgroundColor: enabled ? SEMANTIC.success : theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
              },
            ]}
            textColor={enabled ? theme.colors.onPrimary : theme.colors.onSurface}
          >
            Status: {enabled ? 'Active' : 'Paused'}
          </Button>

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Update Rule' : 'Add Rule'}
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
