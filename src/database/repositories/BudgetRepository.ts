import type { SQLiteDatabase } from 'expo-sqlite';
import type { Budget, BudgetPeriod } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface BudgetRecord extends SyncableRecord {
  category: string;
  limit_amount: number;
  period: BudgetPeriod;
  alert_threshold: number | null;
}

export interface BudgetSpentRow {
  category: string;
  spent: number;
}

export class BudgetRepository extends BaseRepository<BudgetRecord> {
  protected tableName = 'budgets';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<BudgetRecord> {
    const record: BudgetRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      category: data.category,
      limit_amount: data.limitAmount,
      period: data.period,
      alert_threshold: data.alertThreshold ?? null,
    } as BudgetRecord;

    await this.db.runAsync(
      `INSERT INTO budgets (id, category, limit_amount, period, alert_threshold, created_at, updated_at, sync_state, record_source, deleted_at, revision, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.category,
        record.limit_amount,
        record.period,
        record.alert_threshold,
        record.created_at,
        record.updated_at,
        record.sync_state,
        record.record_source,
        record.deleted_at ?? null,
        record.revision,
        record.user_id,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<Budget>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof BudgetRecord> = {
      category: 'category',
      limitAmount: 'limit_amount',
      period: 'period',
      alertThreshold: 'alert_threshold',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        values.push((data as any)[key] ?? null);
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE budgets SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<BudgetRecord | null> {
    return await this.db.getFirstAsync<BudgetRecord>(
      `SELECT * FROM budgets WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(): Promise<BudgetRecord[]> {
    return await this.db.getAllAsync<BudgetRecord>(
      `SELECT * FROM budgets WHERE ${this.notDeletedClause()} ORDER BY category ASC`
    );
  }

  async getSpentByCategory(year: number, month: number): Promise<BudgetSpentRow[]> {
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const end = month === 12
      ? `${year + 1}-01-01T00:00:00.000Z`
      : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;

    return await this.db.getAllAsync<BudgetSpentRow>(
      `SELECT category, SUM(amount) as spent FROM transactions
       WHERE ${this.notDeletedClause()} AND date >= ? AND date < ? AND transaction_type = 'expense' AND status = 'completed'
       GROUP BY category`,
      [start, end]
    );
  }
}
