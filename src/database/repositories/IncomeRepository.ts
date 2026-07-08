import type { SQLiteDatabase } from 'expo-sqlite';
import type { IncomeRecord, IncomeFrequency } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export interface IncomeDbRecord extends SyncableRecord {
  amount: number;
  source: string;
  date: string;
  note: string | null;
  is_recurring: number;
  frequency: IncomeFrequency | null;
}

export class IncomeRepository extends BaseRepository<IncomeDbRecord> {
  protected tableName = 'incomes';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: Omit<IncomeRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'>): Promise<IncomeDbRecord> {
    const record: IncomeDbRecord = {
      ...this.generateRecordBase(data.recordSource, data.userId),
      amount: data.amount,
      source: data.source,
      date: data.date,
      note: data.note ?? null,
      is_recurring: data.isRecurring ? 1 : 0,
      frequency: data.frequency ?? null,
    } as IncomeDbRecord;

    await this.db.runAsync(
      `INSERT INTO incomes (id, amount, source, date, note, is_recurring, frequency, created_at, updated_at, sync_state, record_source, deleted_at, revision, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.amount,
        record.source,
        record.date,
        record.note,
        record.is_recurring,
        record.frequency,
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

  async update(id: string, data: Partial<IncomeRecord>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof IncomeDbRecord> = {
      amount: 'amount',
      source: 'source',
      date: 'date',
      note: 'note',
      isRecurring: 'is_recurring',
      frequency: 'frequency',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        values.push(key === 'isRecurring' ? (value ? 1 : 0) : (value ?? null));
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE incomes SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<IncomeDbRecord | null> {
    return await this.db.getFirstAsync<IncomeDbRecord>(
      `SELECT * FROM incomes WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(): Promise<IncomeDbRecord[]> {
    return await this.db.getAllAsync<IncomeDbRecord>(
      `SELECT * FROM incomes WHERE ${this.notDeletedClause()} ORDER BY date DESC`
    );
  }

  async search(query: string, limit: number = 50): Promise<IncomeDbRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<IncomeDbRecord>(
      `SELECT * FROM incomes WHERE ${this.notDeletedClause()} AND (source LIKE ? OR note LIKE ?) ORDER BY date DESC LIMIT ?`,
      [like, like, limit]
    );
  }
}
