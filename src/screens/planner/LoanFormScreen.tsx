import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Text, IconButton, Button, TextInput, useTheme } from 'react-native-paper';
import { TopBanner } from '../../components/common/TopBanner';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { FulizaLoanRepository } from '../../database/repositories/FulizaLoanRepository';
import { useFormFadeIn } from '../../hooks/useFormFadeIn';
import { DateField } from '../../components/common/DateField';
import { Dropdown } from '../../components/common/Dropdown';
import { spacing, borderRadius } from '../../theme';
import { haptic } from '../../services/haptics';
import type { RootStackParamList } from '../../navigation/types';

type LoanFormRouteProp = RouteProp<RootStackParamList, 'LoanForm'>;
const STATUSES = ['active', 'repaid', 'defaulted'] as const;
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

export function LoanFormScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<LoanFormRouteProp>();
  const { createLoan, updateLoan, deleteLoan } = usePlannerStore();

  const loanId = route.params?.loanId;
  const isEditing = !!loanId;

  const [isReady, setIsReady] = useState(!isEditing);
  const contentOpacity = useFormFadeIn(isReady);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [drawCode, setDrawCode] = useState('');
  const [drawAmount, setDrawAmount] = useState('');
  const [totalRepaid, setTotalRepaid] = useState('');
  const [status, setStatus] = useState<'active' | 'repaid' | 'defaulted'>('active');
  const [drawDate, setDrawDate] = useState('');
  const [lastRepaymentDate, setLastRepaymentDate] = useState('');

  useEffect(() => {
    if (!loanId) return;
    const repo = new FulizaLoanRepository(db);
    repo.findById(loanId).then((loan) => {
      if (loan) {
        setDrawCode(loan.draw_code ?? '');
        setDrawAmount(loan.draw_amount_kes.toString());
        setTotalRepaid(loan.total_repaid_kes.toString());
        setStatus(loan.status);
        setDrawDate(loan.draw_date.split('T')[0]);
        setLastRepaymentDate(loan.last_repayment_date ? loan.last_repayment_date.split('T')[0] : '');
      }
      setIsReady(true);
    });
  }, [loanId, db]);

  const handleSave = async () => {
    const amount = parseFloat(drawAmount);
    const repaid = parseFloat(totalRepaid) || 0;
    if (!amount || amount <= 0) {
      Alert.alert('Invalid input', 'Please enter a positive draw amount');
      return;
    }
    if (!drawDate.trim()) {
      Alert.alert('Missing date', 'Please enter a draw date');
      return;
    }

    setIsSaving(true);
    haptic('light');

    const data = {
      drawCode: drawCode.trim() || undefined,
      drawAmountKes: amount,
      totalRepaidKes: repaid,
      status,
      drawDate: new Date(`${drawDate}T00:00:00.000Z`).toISOString(),
      lastRepaymentDate: lastRepaymentDate.trim()
        ? new Date(`${lastRepaymentDate}T00:00:00.000Z`).toISOString()
        : undefined,
    };

    try {
      if (isEditing && loanId) {
        await updateLoan(db, loanId, data);
        setSuccessMsg('Loan updated');
      } else {
        await createLoan(db, data);
        setSuccessMsg('Loan added');
      }
      setTimeout(() => navigation.goBack(), 400);
    } catch (error) {
      console.error('Failed to save loan:', error);
      Alert.alert('Error', 'Failed to save loan');
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!loanId) return;
    Alert.alert('Delete loan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteLoan(db, loanId);
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
              {isEditing ? 'Edit Loan' : 'Add Loan'}
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
            label="Loan name / code"
            value={drawCode}
            onChangeText={setDrawCode}
            placeholder="e.g. Fuliza draw"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Draw amount"
            value={drawAmount}
            onChangeText={setDrawAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            dense
            label="Total repaid"
            value={totalRepaid}
            onChangeText={setTotalRepaid}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <DateField label="Draw date" value={drawDate} onChange={setDrawDate} />
          <DateField label="Last repayment date (optional)" value={lastRepaymentDate} onChange={setLastRepaymentDate} />

          <Dropdown
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatus(value as 'active' | 'repaid' | 'defaulted')}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Update Loan' : 'Add Loan'}
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
