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
import { GoalRepository } from '../../database/repositories/GoalRepository';
import { DateField } from '../../components/common/DateField';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';

type GoalFormRouteProp = RouteProp<RootStackParamList, 'GoalForm'>;
const STATUSES = ['active', 'completed', 'archived'] as const;
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

export function GoalFormScreen() {
  const theme = useTheme();
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
              {isEditing ? 'Edit Goal' : 'Add Goal'}
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
            placeholder="e.g. Emergency fund"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Notes..."
            style={styles.input}
            multiline
          />
          <TextInput
            mode="outlined"
            dense
            label="Target value"
            value={targetValue}
            onChangeText={setTargetValue}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Current value"
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Unit (optional)"
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g. KES, km"
            style={styles.input}
          />
          <DateField label="Deadline (optional)" value={deadline} onChange={setDeadline} />

          <Dropdown
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatus(value as 'active' | 'completed' | 'archived')}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Update Goal' : 'Add Goal'}
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
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
  },
});
