import React, { useEffect, useState } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { useTransactionStore } from '../../store';
import { TransactionRepository } from '../../database/repositories/TransactionRepository';
import { checkBudgetThresholds } from '../../services/budgetAlertService';
import { haptic } from '../../services/haptics';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../constants';
import { PageScaffold } from '../../components/common/PageScaffold';
import { Dropdown } from '../../components/common/Dropdown';
import { TopBanner } from '../../components/common/TopBanner';
import { spacing, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { TransactionType, TransactionStatus } from '../../types';

type TransactionFormRouteProp = RouteProp<RootStackParamList, 'TransactionForm'>;

const TYPES: TransactionType[] = ['expense', 'income', 'transfer'];
const STATUSES: TransactionStatus[] = ['completed', 'pending', 'failed', 'reversed'];
const CATEGORIES = Object.keys(CATEGORY_COLORS);
const CATEGORY_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
  icon: CATEGORY_ICONS[cat] as keyof typeof Ionicons.glyphMap,
  color: CATEGORY_COLORS[cat],
}));

const TYPE_BUTTONS = TYPES.map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

const STATUS_BUTTONS = STATUSES.map((status) => ({
  value: status,
  label: status.charAt(0).toUpperCase() + status.slice(1),
}));

export function TransactionFormScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const route = useRoute<TransactionFormRouteProp>();
  const repo = React.useMemo(() => new TransactionRepository(db), [db]);

  const { addTransaction, updateTransaction, loadTransactions } = useTransactionStore();
  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [fee, setFee] = useState('');
  const [balanceAfter, setBalanceAfter] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
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
        setNotes(tx.notes ?? '');
        setFee(tx.fee != null ? String(tx.fee) : '');
        setBalanceAfter(tx.balance_after != null ? String(tx.balance_after) : '');
        setMpesaCode(tx.mpesa_code ?? '');
        setType(tx.transaction_type);
        setStatus(tx.status);
        setCategory(tx.category);
      }
      setIsReady(true);
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
    haptic('light');
    try {
      const feeNum = fee.trim() ? parseFloat(fee) : undefined;
      const balNum = balanceAfter.trim() ? parseFloat(balanceAfter) : undefined;
      const data = {
        amount: numAmount,
        merchant: merchant.trim(),
        category,
        date: new Date().toISOString(),
        source: 'manual',
        transactionType: type,
        status,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        fee: Number.isFinite(feeNum) ? feeNum : undefined,
        balanceAfter: Number.isFinite(balNum) ? balNum : undefined,
        mpesaCode: mpesaCode.trim() || undefined,
        recordSource: 'manual' as const,
      };

      if (isEditing && transactionId) {
        await updateTransaction(repo, transactionId, data);
        setSuccessMsg('Transaction updated');
      } else {
        await addTransaction(repo, data);
        setSuccessMsg('Transaction saved');
      }

      if (type === 'expense') {
        checkBudgetThresholds(db, category).catch(() => {});
      }

      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
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
    <PageScaffold
      title={isEditing ? 'Edit Transaction' : 'Add Transaction'}
      onBack={() => navigation.goBack()}
      actions={
        isEditing ? (
          <Button
            mode="text"
            compact
            textColor={theme.colors.error}
            onPress={handleDelete}
          >
            Delete
          </Button>
        ) : undefined
      }
      topBanner={<TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} />}
    >
      <Animated.View style={{ opacity: contentOpacity }}>
        <ScrollView contentContainerStyle={styles.content}>
          <SegmentedButtons
            value={type}
            onValueChange={(value) => setType(value as TransactionType)}
            buttons={TYPE_BUTTONS}
            style={styles.segmented}
          />

          <TextInput
            mode="outlined"
            dense
            label="Amount"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            dense
            label="Merchant / Counterparty"
            placeholder="e.g. Java House"
            value={merchant}
            onChangeText={setMerchant}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            dense
            label="Description (optional)"
            placeholder="Short summary of the transaction"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            dense
            label="Notes (optional)"
            placeholder="Longer note, ref numbers, receipt info…"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              mode="outlined"
              dense
              label="Fee (optional)"
              placeholder="e.g. 33"
              keyboardType="decimal-pad"
              value={fee}
              onChangeText={setFee}
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              mode="outlined"
              dense
              label="Balance after (optional)"
              placeholder="Account balance"
              keyboardType="decimal-pad"
              value={balanceAfter}
              onChangeText={setBalanceAfter}
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            mode="outlined"
            dense
            label="M-Pesa code (optional)"
            placeholder="e.g. TAB5CDE12F"
            value={mpesaCode}
            onChangeText={(v) => setMpesaCode(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={12}
            style={styles.input}
          />

          <Dropdown label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />

          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            Status
          </Text>
          <SegmentedButtons
            value={status}
            onValueChange={(value) => setStatus(value as TransactionStatus)}
            buttons={STATUS_BUTTONS}
            style={styles.segmented}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
          >
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </Button>
        </ScrollView>
      </Animated.View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  segmented: {
    marginBottom: spacing.base,
    borderRadius: borderRadius.lg,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
});
