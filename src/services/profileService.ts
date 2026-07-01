import type { SQLiteDatabase } from 'expo-sqlite';
import { TransactionRepository } from '../database/repositories/TransactionRepository';

export interface ProfileStats {
  totalTransactions: number;
  totalSpend: number;
  totalIncome: number;
  largestTransaction: { merchant: string; amount: number } | null;
  mostCommonMerchant: string | null;
  averageTransaction: number;
}

export async function computeProfileStats(db: SQLiteDatabase): Promise<ProfileStats> {
  const txRepo = new TransactionRepository(db);

  const allTransactions = await txRepo.findAll({ limit: 100000, orderBy: 'date_desc' });

  if (allTransactions.length === 0) {
    return {
      totalTransactions: 0,
      totalSpend: 0,
      totalIncome: 0,
      largestTransaction: null,
      mostCommonMerchant: null,
      averageTransaction: 0,
    };
  }

  let totalSpend = 0;
  let totalIncome = 0;
  let largestAmount = 0;
  let largestTransaction: { merchant: string; amount: number } | null = null;
  const merchantCounts = new Map<string, number>();

  for (const tx of allTransactions) {
    if (tx.transaction_type === 'expense') {
      totalSpend += tx.amount;
    } else if (tx.transaction_type === 'income') {
      totalIncome += tx.amount;
    }

    if (tx.amount > largestAmount) {
      largestAmount = tx.amount;
      largestTransaction = { merchant: tx.merchant, amount: tx.amount };
    }

    merchantCounts.set(tx.merchant, (merchantCounts.get(tx.merchant) ?? 0) + 1);
  }

  let mostCommonMerchant: string | null = null;
  let maxCount = 0;
  for (const [merchant, count] of merchantCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMerchant = merchant;
    }
  }

  const averageTransaction = allTransactions.reduce((sum, tx) => sum + tx.amount, 0) / allTransactions.length;

  return {
    totalTransactions: allTransactions.length,
    totalSpend,
    totalIncome,
    largestTransaction,
    mostCommonMerchant,
    averageTransaction,
  };
}
