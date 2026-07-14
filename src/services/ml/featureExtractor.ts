/**
 * Feature extraction for the on-device transaction classifier (S6).
 *
 * Converts a transaction's structured fields into a fixed-length numeric
 * vector that the decision tree can train and infer on. All features are
 * integers or bounded floats so the tree splits are stable across updates.
 *
 * Feature index map (9 features):
 *   0  amount          — raw KES amount
 *   1  amountBucket    — 0–4  (<500 / 500–2k / 2k–5k / 5k–20k / 20k+)
 *   2  dayOfMonth      — 1–31
 *   3  dayOfWeek       — 0–6 (0=Sunday)
 *   4  hourOfDay       — 0–23
 *   5  txTypeCode      — 0=expense / 1=income / 2=transfer / 3=fuliza
 *   6  merchantBucket  — 0–99, djb2 hash of merchant name
 *   7  isPaybill       — 1 when merchant is a pure numeric paybill code
 *   8  paybillPrefix   — floor(paybillCode / 1000) or 0
 */

export const FEATURE_COUNT = 9;

export interface FeatureTx {
  amount: number;
  date: string;
  transaction_type: string;
  merchant: string;
}

export function extractFeatures(tx: FeatureTx): number[] {
  const date = new Date(tx.date);

  const amount = tx.amount;
  const amountBucket =
    amount < 500 ? 0 : amount < 2_000 ? 1 : amount < 5_000 ? 2 : amount < 20_000 ? 3 : 4;

  const dayOfMonth = isNaN(date.getDate()) ? 1 : date.getDate();
  const dayOfWeek  = isNaN(date.getDay())  ? 0 : date.getDay();
  const hourOfDay  = isNaN(date.getHours()) ? 12 : date.getHours();

  const txTypeCode =
    tx.transaction_type === 'income'   ? 1 :
    tx.transaction_type === 'transfer' ? 2 :
    tx.transaction_type === 'fuliza'   ? 3 : 0;

  // djb2 hash → bucket 0–99
  const m = tx.merchant.trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < m.length; i++) h = ((h << 5) + h + m.charCodeAt(i)) | 0;
  const merchantBucket = Math.abs(h) % 100;

  const paybillMatch = /^\d{4,6}$/.test(m);
  const isPaybill     = paybillMatch ? 1 : 0;
  const paybillPrefix = paybillMatch ? Math.floor(parseInt(m, 10) / 1_000) : 0;

  return [amount, amountBucket, dayOfMonth, dayOfWeek, hourOfDay, txTypeCode, merchantBucket, isPaybill, paybillPrefix];
}
