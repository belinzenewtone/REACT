import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text, Button, TextInput, useTheme } from 'react-native-paper';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { useBudgetStore } from '../../store';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { haptic } from '../../services/haptics';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, borderRadius } from '../../theme';
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
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} />
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Button
              mode="text"
              compact
              onPress={() => navigation.goBack()}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              {isEditing ? 'Edit Budget' : 'Add Budget'}
            </Text>
            <Button
              mode="text"
              compact
              onPress={handleSave}
              disabled={isSaving}
              textColor={theme.colors.primary}
              loading={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </View>

          <Dropdown label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />

          <TextInput
            mode="outlined"
            dense
            label="Budget Limit"
            value={limit}
            onChangeText={setLimit}
            placeholder="0.00"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="KES" />}
            style={styles.input}
          />

          <Dropdown
            label="Period"
            value={period}
            options={PERIODS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            onChange={(value) => setPeriod(value as (typeof PERIODS)[number])}
          />

          <TextInput
            mode="outlined"
            dense
            label="Alert Threshold (%)"
            value={threshold}
            onChangeText={setThreshold}
            placeholder="80"
            keyboardType="numeric"
            right={<TextInput.Affix text="%" />}
            style={styles.input}
          />

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

          {isEditing && (
            <Button
              mode="outlined"
              icon={() => <Ionicons name="trash-outline" size={18} color={theme.colors.error} />}
              onPress={handleDelete}
              style={[styles.deleteButton, { borderColor: theme.colors.error }]}
              textColor={theme.colors.error}
            >
              Delete Budget
            </Button>
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
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
  },
  input: {
    marginBottom: spacing.base,
    backgroundColor: 'transparent',
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
  },
});
