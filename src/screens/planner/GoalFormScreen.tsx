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
import { GoalRepository } from '../../database/repositories/GoalRepository';
import { DateField } from '../../components/common/DateField';
import { spacing, typography, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';

type GoalFormRouteProp = RouteProp<RootStackParamList, 'GoalForm'>;
const STATUSES = ['active', 'completed', 'archived'] as const;

export function GoalFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<GoalFormRouteProp>();
  const { createGoal, updateGoal, deleteGoal } = usePlannerStore();

  const goalId = route.params?.goalId;
  const isEditing = !!goalId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');

  useEffect(() => {
    if (!goalId) return;
    const repo = new GoalRepository(db);
    repo.findById(goalId).then((goal) => {
      if (goal) {
        setTitle(goal.title);
        setDescription(goal.description ?? '');
        setTargetValue(goal.target_value.toString());
        setCurrentValue(goal.current_value.toString());
        setUnit(goal.unit ?? '');
        setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
        setStatus(goal.status);
      }
      setIsReady(true);
    });
  }, [goalId, db]);

  const handleSave = async () => {
    const target = parseFloat(targetValue);
    const current = parseFloat(currentValue) || 0;
    if (!title.trim() || !target || target <= 0) {
      Alert.alert('Invalid input', 'Please enter a title and positive target value');
      return;
    }

    setIsSaving(true);
    haptic('light');

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      targetValue: target,
      currentValue: current,
      unit: unit.trim() || undefined,
      deadline: deadline.trim() ? new Date(`${deadline}T00:00:00.000Z`).toISOString() : undefined,
      status,
      recordSource: 'manual' as const,
    };

    try {
      if (isEditing && goalId) {
        await updateGoal(db, goalId, data);
        setSuccessMsg('Goal updated');
      } else {
        await createGoal(db, data);
        setSuccessMsg('Goal added');
      }
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save goal:', error);
      Alert.alert('Error', 'Failed to save goal');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!goalId) return;
    Alert.alert('Delete goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(db, goalId);
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
            {isEditing ? 'Edit Goal' : 'Add Goal'}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Emergency fund" />
        <Input label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Notes..." />
        <Input label="Target value" value={targetValue} onChangeText={setTargetValue} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Current value" value={currentValue} onChangeText={setCurrentValue} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Unit (optional)" value={unit} onChangeText={setUnit} placeholder="e.g. KES, km" />
        <DateField label="Deadline (optional)" value={deadline} onChange={setDeadline} />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
        <View style={styles.segmentContainer}>
          {STATUSES.map((s) => {
            const selected = status === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.segment, selected && { backgroundColor: colors.accentPrimary }]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.segmentText, { color: selected ? colors.textInverse : colors.textSecondary }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accentPrimary, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isSaving ? 'Saving…' : isEditing ? 'Update Goal' : 'Add Goal'}
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
  sectionLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  segmentContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segmentText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
