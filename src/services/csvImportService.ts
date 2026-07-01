import Papa from 'papaparse';
import type { TransactionType, TransactionStatus } from '../types';

export interface CsvColumnMapping {
  amount: string;
  merchant: string;
  category: string;
  date: string;
  type: string;
  status: string;
  description: string;
}

export interface CsvRow {
  [key: string]: string;
}

export interface ParsedCsvResult {
  headers: string[];
  rows: CsvRow[];
}

export interface CsvImportCandidate {
  amount: number;
  merchant: string;
  category: string;
  date: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  description?: string;
  errors: string[];
}

export function parseCsvContent(content: string): ParsedCsvResult {
  const parsed = Papa.parse<CsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  return {
    headers: parsed.meta.fields ?? [],
    rows: parsed.data,
  };
}

export function detectColumnMapping(headers: string[]): Partial<CsvColumnMapping> {
  const find = (candidates: string[]) => {
    for (const candidate of candidates) {
      const match = headers.find((h) => h.toLowerCase().includes(candidate.toLowerCase()));
      if (match) return match;
    }
    return '';
  };

  return {
    amount: find(['amount', 'value', 'price', 'sum']),
    merchant: find(['merchant', 'counterparty', 'payee', 'recipient', 'to', 'from', 'party']),
    category: find(['category']),
    date: find(['date', 'time', 'datetime', 'timestamp']),
    type: find(['type', 'transaction_type', 'kind']),
    status: find(['status', 'state']),
    description: find(['description', 'note', 'notes', 'memo']),
  };
}

export function validateAndMapRows(
  rows: CsvRow[],
  mapping: CsvColumnMapping
): { candidates: CsvImportCandidate[]; validCount: number } {
  const candidates: CsvImportCandidate[] = [];
  let validCount = 0;

  for (const row of rows) {
    const errors: string[] = [];

    const rawAmount = row[mapping.amount]?.trim() ?? '';
    const amount = parseFloat(rawAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) errors.push('Invalid amount');

    const merchant = row[mapping.merchant]?.trim();
    if (!merchant) errors.push('Missing merchant');

    const rawDate = row[mapping.date]?.trim() ?? '';
    const parsedDate = new Date(rawDate);
    const date = isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString();
    if (!date) errors.push('Invalid date');

    const rawType = row[mapping.type]?.trim().toLowerCase() ?? 'expense';
    const transactionType: TransactionType =
      rawType === 'income' ? 'income' : rawType === 'transfer' ? 'transfer' : 'expense';

    const rawStatus = row[mapping.status]?.trim().toLowerCase() ?? 'completed';
    const status: TransactionStatus =
      rawStatus === 'pending'
        ? 'pending'
        : rawStatus === 'failed'
        ? 'failed'
        : rawStatus === 'reversed'
        ? 'reversed'
        : 'completed';

    const category = row[mapping.category]?.trim() || 'uncategorized';
    const description = row[mapping.description]?.trim() || undefined;

    if (errors.length === 0) validCount++;

    candidates.push({
      amount,
      merchant: merchant ?? '',
      category,
      date,
      transactionType,
      status,
      description,
      errors,
    });
  }

  return { candidates, validCount };
}
