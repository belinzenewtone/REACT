import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTransactionStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { TransactionType, TransactionStatus } from '../../types';

type TransactionFormRouteProp = RouteProp<RootStackParamList, 'TransactionForm'>;

const TYPES: TransactionType[] = ['expense', 'income', 'transfer'];
const STATUSES: TransactionStatus[] = ['completed', 'pending', 'failed', 'reversed'];
const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function TransactionFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const route = useRoute<TransactionFormRouteProp>();
  const repo = React.useMemo(() => new TransactionRepository(db), [db]);

  const { addTransaction, updateTransaction, loadTransactions } = useTransactionStore();
  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [category, setCategory] = useState('food');

  useEffect(() => {
    if (!transactionId) return;
    const id = transactionId;

    async function load() {
      const tx = await repo.findById(id);
      if (tx) {
        setAmount(tx.amount.toString());
        setMerchant(tx.merchant);
        setDescription(tx.description ?? '');
        setType(tx.transaction_type);
        setStatus(tx.status);
        setCategory(tx.category);
      }
    }
    load();
  }, [transactionId, repo]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive amount');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing merchant', 'Please enter a merchant or counterparty');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        amount: numAmount,
        merchant: merchant.trim(),
        category,
        date: new Date().toISOString(),
        source: 'manual',
        transactionType: type,
        status,
        description: description.trim() || undefined,
        recordSource: 'manual' as const,
      };

      if (isEditing && transactionId) {
        await updateTransaction(repo, transactionId, data);
      } else {
        await addTransaction(repo, data);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!transactionId) return;
    Alert.alert('Delete transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await repo.softDelete(transactionId);
          await loadTransactions(repo, true);
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
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
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
        <SegmentedControl
          options={TYPES}
          selected={type}
          onSelect={setType}
        />

        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Merchant / Counterparty</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="e.g. Java House"
            placeholderTextColor={colors.textTertiary}
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        <View style={[styles.inputGroup, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Notes..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            const catColor = CATEGORY_COLORS[cat];
            const iconName = CATEGORY_ICONS[cat] as keyof typeof Ionicons.glyphMap;

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
                <Ionicons name={iconName} size={18} color={catColor} />
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

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
        <SegmentedControl
          options={STATUSES}
          selected={status}
          onSelect={setStatus}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: isLoading ? colors.textTertiary : colors.accentPrimary },
          ]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.segmentContainer, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.segment,
              isSelected && { backgroundColor: colors.accentPrimary },
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isSelected ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    padding: spacing.lg,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  inputGroup: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.xs,
    marginBottom: 2,
  },
  input: {
    fontSize: typography.sizes.base,
    paddingVertical: 4,
  },
  amountInput: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
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
    gap: spacing.sm,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  saveButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
