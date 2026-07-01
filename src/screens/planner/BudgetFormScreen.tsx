import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useBudgetStore } from '../../store';
import { BudgetRepository } from '../../database/repositories/BudgetRepository';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type BudgetFormRouteProp = RouteProp<RootStackParamList, 'BudgetForm'>;

const CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== 'income' && c !== 'uncategorized');
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export function BudgetFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<BudgetFormRouteProp>();
  const { createBudget, updateBudget, loadBudgets } = useBudgetStore();

  const budgetId = route.params?.budgetId;
  const isEditing = !!budgetId;

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('monthly');
  const [threshold, setThreshold] = useState('80');

  useEffect(() => {
    if (!budgetId) return;
    const repo = new BudgetRepository(db);
    repo.findById(budgetId).then((budget) => {
      if (budget) {
        setCategory(budget.category);
        setLimit(budget.limit_amount.toString());
        setPeriod(budget.period);
        setThreshold(((budget.alert_threshold ?? 0.8) * 100).toString());
      }
    });
  }, [budgetId, db]);

  const handleSave = async () => {
    const limitAmount = parseFloat(limit);
    if (!limitAmount || limitAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive budget limit');
      return;
    }

    const thresholdValue = parseFloat(threshold) / 100;

    const data = {
      category,
      limitAmount,
      period,
      alertThreshold: thresholdValue,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && budgetId) {
        await updateBudget(db, budgetId, data);
      } else {
        await createBudget(db, data);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save budget:', error);
      Alert.alert('Error', 'Failed to save budget');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.headerAction, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Budget' : 'Add Budget'}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerAction, { color: colors.accentPrimary, fontWeight: typography.weights.semibold }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            const catColor = CATEGORY_COLORS[cat];
            const iconName = CATEGORY_ICONS[cat] ?? 'help-circle';

            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? `${catColor}30` : colors.glassWhite,
                    borderColor: isSelected ? catColor : colors.border,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Ionicons
                  name={iconName as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={isSelected ? catColor : colors.textTertiary}
                  style={{ marginRight: spacing.xs }}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isSelected ? colors.textPrimary : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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

        {isEditing && (
          <TouchableOpacity style={[styles.deleteButton, { borderColor: colors.danger }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Budget</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerAction: {
    fontSize: typography.sizes.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
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
