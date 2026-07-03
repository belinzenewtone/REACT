import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction, TransactionStatus, TransactionType } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface TransactionRecord extends SyncableRecord {
  amount: number;
  merchant: string;
  category: string;
  date: string;
  source: string;
  transaction_type: TransactionType;
  mpesa_code: string | null;
  source_hash: string | null;
  raw_sms: string | null;
  description: string | null;
  notes: string | null;
  balance_after: number | null;
  fee: number | null;
  status: TransactionStatus;
  inferred_category: number;
  inference_source: string | null;
  semantic_hash: string | null;
}

export class TransactionRepository extends BaseRepository<TransactionRecord> {
  protected tableName = 'transactions';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<TransactionRecord> {
    const record: TransactionRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      amount: data.amount,
      merchant: data.merchant,
      category: data.category,
      date: data.date,
      source: data.source,
      transaction_type: data.transactionType,
      mpesa_code: data.mpesaCode ?? null,
      source_hash: data.sourceHash ?? null,
      raw_sms: data.rawSms ?? null,
      description: data.description ?? null,
      notes: data.notes ?? null,
      balance_after: data.balanceAfter ?? null,
      fee: data.fee ?? null,
      status: data.status,
      inferred_category: data.inferredCategory ? 1 : 0,
      inference_source: data.inferenceSource ?? null,
      semantic_hash: data.semanticHash ?? null,
    } as TransactionRecord;

    await this.db.runAsync(
      `INSERT INTO transactions (
        id, amount, merchant, category, date, source, transaction_type, mpesa_code, source_hash, raw_sms,
        description, notes, balance_after, fee, status, created_at, updated_at, sync_state, record_source,
        deleted_at, revision, user_id, inferred_category, inference_source, semantic_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.amount,
        record.merchant,
        record.category,
        record.date,
        record.source,
        record.transaction_type,
        record.mpesa_code,
        record.source_hash,
        record.raw_sms,
        record.description,
        record.notes,
        record.balance_after,
        record.fee,
        record.status,
        record.created_at,
        record.updated_at,
        record.sync_state,
        record.record_source,
        record.deleted_at ?? null,
        record.revision,
        record.user_id,
        record.inferred_category,
        record.inference_source,
        record.semantic_hash,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<Transaction>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof TransactionRecord> = {
      amount: 'amount',
      merchant: 'merchant',
      category: 'category',
      date: 'date',
      source: 'source',
      transactionType: 'transaction_type',
      mpesaCode: 'mpesa_code',
      sourceHash: 'source_hash',
      rawSms: 'raw_sms',
      description: 'description',
      notes: 'notes',
      balanceAfter: 'balance_after',
      fee: 'fee',
      status: 'status',
      inferredCategory: 'inferred_category',
      inferenceSource: 'inference_source',
      semanticHash: 'semantic_hash',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        values.push(key === 'inferredCategory' ? (value ? 1 : 0) : (value ?? null));
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<TransactionRecord | null> {
    return await this.db.getFirstAsync<TransactionRecord>(
      `SELECT * FROM transactions WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(options: {
    limit?: number;
    offset?: number;
    category?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    orderBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  } = {}): Promise<TransactionRecord[]> {
    const where: string[] = [this.notDeletedClause()];
    const params: (string | number)[] = [];

    if (options.category) {
      where.push('category = ?');
      params.push(options.category);
    }
    if (options.type) {
      where.push('transaction_type = ?');
      params.push(options.type);
    }
    if (options.status) {
      where.push('status = ?');
      params.push(options.status);
    }
    if (options.startDate) {
      where.push('date >= ?');
      params.push(options.startDate);
    }
    if (options.endDate) {
      where.push('date <= ?');
      params.push(options.endDate);
    }
    if (options.search) {
      where.push('(merchant LIKE ? OR description LIKE ? OR mpesa_code LIKE ?)');
      const like = `%${options.search}%`;
      params.push(like, like, like);
    }

    let order = 'date DESC';
    switch (options.orderBy) {
      case 'date_asc':
        order = 'date ASC';
        break;
      case 'amount_desc':
        order = 'amount DESC';
        break;
      case 'amount_asc':
        order = 'amount ASC';
        break;
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    return await this.db.getAllAsync<TransactionRecord>(
      `SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  }

  async getMonthlyTotals(year: number, month: number): Promise<{ income: number; expense: number }> {
    // Local month boundaries to match SMS-imported transaction date storage.
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const end = month === 12
      ? `${year + 1}-01-01T00:00:00`
      : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`;

    const rows = await this.db.getAllAsync<{ transaction_type: TransactionType; total: number }>(
      `SELECT transaction_type, SUM(amount) as total FROM transactions
       WHERE ${this.notDeletedClause()} AND date >= ? AND date < ? AND status = 'completed'
       GROUP BY transaction_type`,
      [start, end]
    );

    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.transaction_type === 'income') {
        income = row.total;
      } else if (row.transaction_type === 'expense' || row.transaction_type === 'transfer' || row.transaction_type === 'fuliza') {
        expense += row.total;
      }
    }
    return { income, expense };
  }

  async getCategoryTotals(year: number, month: number, type: TransactionType = 'expense'): Promise<{ category: string; total: number }[]> {
    // Local month boundaries to match SMS-imported transaction date storage.
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const end = month === 12
      ? `${year + 1}-01-01T00:00:00`
      : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`;

    return await this.db.getAllAsync<{ category: string; total: number }>(
      `SELECT category, SUM(amount) as total FROM transactions
       WHERE ${this.notDeletedClause()} AND date >= ? AND date < ? AND transaction_type = ? AND status = 'completed'
       GROUP BY category
       ORDER BY total DESC`,
      [start, end, type]
    );
  }

  async getFeesTotalForMonth(): Promise<number> {
    const now = new Date();
    // Local month start to match SMS-imported transaction date storage.
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
    const feeCategories = ['AIRTIME', 'FULIZA', 'WITHDRAWAL', 'SUBSCRIPTION', 'Fee'];
    const placeholders = feeCategories.map(() => '?').join(',');
    const row = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions
       WHERE date >= ? AND UPPER(category) IN (${placeholders}) AND ${this.notDeletedClause()}`,
      [startOfMonth, ...feeCategories]
    );
    return row?.total ?? 0;
  }

  async getUncategorized(): Promise<TransactionRecord[]> {
    return await this.db.getAllAsync<TransactionRecord>(
      `SELECT * FROM transactions WHERE ${this.notDeletedClause()} AND category = 'uncategorized' ORDER BY date DESC`
    );
  }

  async updateCategoryForMerchant(merchant: string, category: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE transactions SET category = ?, updated_at = ?, sync_state = 'pending', revision = revision + 1
       WHERE merchant = ? AND category = 'uncategorized' AND ${this.notDeletedClause()}`,
      [category, nowIso(), merchant]
    );
  }

  async getTotalsInRange(start: string, end: string): Promise<{ income: number; expense: number }> {
    const rows = await this.db.getAllAsync<{ transaction_type: TransactionType; total: number }>(
      `SELECT transaction_type, SUM(amount) as total FROM transactions
       WHERE ${this.notDeletedClause()} AND date >= ? AND date < ? AND status = 'completed'
       GROUP BY transaction_type`,
      [start, end]
    );

    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.transaction_type === 'income') {
        income = row.total;
      } else if (row.transaction_type === 'expense' || row.transaction_type === 'transfer' || row.transaction_type === 'fuliza') {
        expense += row.total;
      }
    }
    return { income, expense };
  }
}
