import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useBudgetStore } from '../../store';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { haptic } from '../../services/haptics';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type BudgetFormRouteProp = RouteProp<RootStackParamList, 'BudgetForm'>;

const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');
const CATEGORY_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
  icon: (CATEGORY_ICONS[cat] ?? 'help-circle') as keyof typeof Ionicons.glyphMap,
  color: CATEGORY_COLORS[cat],
}));
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export function BudgetFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<BudgetFormRouteProp>();
  const { createBudget, updateBudget, loadBudgets } = useBudgetStore();

  const budgetId = route.params?.budgetId;
  const isEditing = !!budgetId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('monthly');
  const [threshold, setThreshold] = useState('80');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!budgetId) return;
    const repo = new BudgetRepository(db);
    repo.findById(budgetId).then((budget) => {
      if (budget) {
        setCategory(budget.category);
        setLimit(budget.limit_amount.toString());
        setPeriod(budget.period);
        setThreshold(((budget.alert_threshold ?? 0.8) * 100).toString());
        setIsActive(budget.is_active !== 0);
      }
      setIsReady(true);
    });
  }, [budgetId, db]);

  const handleSave = async () => {
    const limitAmount = parseFloat(limit);
    if (!limitAmount || limitAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive budget limit');
      return;
    }

    setIsSaving(true);
    haptic('light');

    const thresholdValue = parseFloat(threshold) / 100;

    const data = {
      category,
      limitAmount,
      period,
      alertThreshold: thresholdValue,
      isActive,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && budgetId) {
        await updateBudget(db, budgetId, data);
        setSuccessMsg('Budget updated');
      } else {
        await createBudget(db, data);
        setSuccessMsg('Budget added');
      }
      // Re-evaluate thresholds in the background — don't block the UI from
      // navigating away immediately.
      checkBudgetThresholds(db, category).catch(() => {});
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save budget:', error);
      Alert.alert('Error', 'Failed to save budget');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!budgetId) return;
    Alert.alert('Delete budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const repo = new BudgetRepository(db);
          await repo.softDelete(budgetId);
          await loadBudgets(db);
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
            <Text style={[styles.headerAction, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {isEditing ? 'Edit Budget' : 'Add Budget'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.7}>
            <Text style={[
              styles.headerAction,
              { color: colors.accentPrimary, fontWeight: typography.weights.semibold, opacity: isSaving ? 0.5 : 1 },
            ]}>
              {isSaving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <Dropdown label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Budget Limit</Text>
        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.inputPrefix, { color: colors.textTertiary }]}>KES</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={limit}
            onChangeText={setLimit}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Period</Text>
        <View style={styles.segmentContainer}>
          {PERIODS.map((p) => {
            const isSelected = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.segment,
                  isSelected && { backgroundColor: colors.accentPrimary },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: isSelected ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Alert Threshold (%)</Text>
        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="80"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={threshold}
            onChangeText={setThreshold}
          />
        </View>

        <TouchableOpacity
          style={[styles.toggle, { backgroundColor: isActive ? colors.accentPrimary : colors.glassWhite, borderColor: colors.border }]}
          onPress={() => setIsActive((v) => !v)}
        >
          <Text style={{ color: isActive ? colors.textInverse : colors.textPrimary, fontWeight: '500' }}>
            Active: {isActive ? 'Yes' : 'No'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={[styles.deleteButton, { borderColor: colors.danger }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Budget</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerAction: {
    fontSize: typography.sizes.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  inputPrefix: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segmentText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  toggle: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  deleteText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
