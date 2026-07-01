import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlannerStore } from '../../store';
import { FulizaLoanRepository } from '../../database/repositories/FulizaLoanRepository';
import { spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type LoanFormRouteProp = RouteProp<RootStackParamList, 'LoanForm'>;
const STATUSES = ['active', 'repaid', 'defaulted'] as const;

export function LoanFormScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const route = useRoute<LoanFormRouteProp>();
  const { createLoan, updateLoan, deleteLoan } = usePlannerStore();

  const loanId = route.params?.loanId;
  const isEditing = !!loanId;

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
      } else {
        await createLoan(db, data);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save loan:', error);
      Alert.alert('Error', 'Failed to save loan');
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Loan' : 'Add Loan'}
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
        <Input label="Loan name / code" value={drawCode} onChangeText={setDrawCode} placeholder="e.g. Fuliza draw" />
        <Input label="Draw amount" value={drawAmount} onChangeText={setDrawAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Total repaid" value={totalRepaid} onChangeText={setTotalRepaid} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Draw date" value={drawDate} onChangeText={setDrawDate} placeholder="YYYY-MM-DD" />
        <Input label="Last repayment date (optional)" value={lastRepaymentDate} onChangeText={setLastRepaymentDate} placeholder="YYYY-MM-DD" />

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

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
            {isEditing ? 'Update Loan' : 'Add Loan'}
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
