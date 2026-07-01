import type { SQLiteDatabase } from 'expo-sqlite';
import type { RecurringRule, RecurringCadence } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface RecurringRuleDbRecord extends SyncableRecord {
  title: string;
  type: 'expense' | 'income' | 'task';
  cadence: RecurringCadence;
  next_run_at: string;
  amount: number | null;
  category: string | null;
  enabled: number;
}

export class RecurringRuleRepository extends BaseRepository<RecurringRuleDbRecord> {
  protected tableName = 'recurring_rules';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<RecurringRuleDbRecord> {
    const record: RecurringRuleDbRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      title: data.title,
      type: data.type,
      cadence: data.cadence,
      next_run_at: data.nextRunAt,
      amount: data.amount ?? null,
      category: data.category ?? null,
      enabled: data.enabled ? 1 : 0,
    } as RecurringRuleDbRecord;

    await this.db.runAsync(
      `INSERT INTO recurring_rules (id, title, type, cadence, next_run_at, amount, category, enabled, created_at, updated_at, sync_state, record_source, deleted_at, revision, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.type,
        record.cadence,
        record.next_run_at,
        record.amount,
        record.category,
        record.enabled,
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

  async update(id: string, data: Partial<RecurringRule>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof RecurringRuleDbRecord> = {
      title: 'title',
      type: 'type',
      cadence: 'cadence',
      nextRunAt: 'next_run_at',
      amount: 'amount',
      category: 'category',
      enabled: 'enabled',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        values.push(key === 'enabled' ? (value ? 1 : 0) : (value ?? null));
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE recurring_rules SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<RecurringRuleDbRecord | null> {
    return await this.db.getFirstAsync<RecurringRuleDbRecord>(
      `SELECT * FROM recurring_rules WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(): Promise<RecurringRuleDbRecord[]> {
    return await this.db.getAllAsync<RecurringRuleDbRecord>(
      `SELECT * FROM recurring_rules WHERE ${this.notDeletedClause()} ORDER BY next_run_at ASC`
    );
  }

  async search(query: string, limit: number = 50): Promise<RecurringRuleDbRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<RecurringRuleDbRecord>(
      `SELECT * FROM recurring_rules WHERE ${this.notDeletedClause()} AND (title LIKE ? OR category LIKE ?) ORDER BY next_run_at ASC LIMIT ?`,
      [like, like, limit]
    );
  }
}
