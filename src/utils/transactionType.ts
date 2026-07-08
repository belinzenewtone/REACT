import type { TransactionType } from '../types';

/**
 * Transaction types that represent money leaving the user's wallet.
 *
 * M-Pesa splits outflows into several `transaction_type` values:
 *   - expense  → ordinary purchases / bills
 *   - transfer → peer-to-peer sends
 *   - fuliza   → overdraft draws / repayments
 *
 * Spend summaries (Today / Week / Month / Analytics) should count all of them
 * so a sent transfer or Fuliza draw is not invisible in the totals.
 */
export const OUTFLOW_TYPES: readonly TransactionType[] = ['expense', 'transfer', 'fuliza'];

/** Income / money entering the wallet. */
export const INCOME_TYPES: readonly TransactionType[] = ['income'];

export function isOutflow(type: string): type is TransactionType {
  return (OUTFLOW_TYPES as readonly string[]).includes(type);
}

export function isInflow(type: string): type is TransactionType {
  return (INCOME_TYPES as readonly string[]).includes(type);
}
