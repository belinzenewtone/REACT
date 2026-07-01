import type { SQLiteDatabase } from 'expo-sqlite';
import type { Bill, BillCycle, RecordSource } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export type BillCreateInput = Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'> & {
  recordSource?: RecordSource;
};

export interface BillDbRecord extends SyncableRecord {
  title: string;
  amount: number;
  cycle: BillCycle;
  next_due_date: string;
  last_paid_at: string | null;
  notes: string | null;
  is_active: number;
  paid_status: number;
}

export class BillRepository extends BaseRepository<BillDbRecord> {
  protected tableName = 'bills';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: BillCreateInput): Promise<BillDbRecord> {
    const record: BillDbRecord = {
      ...this.generateRecordBase(data.recordSource ?? 'manual', data.userId),
      title: data.title,
      amount: data.amount,
      cycle: data.cycle,
      next_due_date: data.nextDueDate,
      last_paid_at: data.lastPaidAt ?? null,
      notes: data.notes ?? null,
      is_active: data.isActive ? 1 : 0,
      paid_status: data.paidStatus ? 1 : 0,
    } as BillDbRecord;

    await this.db.runAsync(
      `INSERT INTO bills (id, user_id, title, amount, cycle, next_due_date, last_paid_at, notes, is_active, paid_status, created_at, updated_at, sync_state, deleted_at, revision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.user_id,
        record.title,
        record.amount,
        record.cycle,
        record.next_due_date,
        record.last_paid_at,
        record.notes,
        record.is_active,
        record.paid_status,
        record.created_at,
        record.updated_at,
        record.sync_state,
        record.deleted_at ?? null,
        record.revision,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<Bill>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof BillDbRecord> = {
      title: 'title',
      amount: 'amount',
      cycle: 'cycle',
      nextDueDate: 'next_due_date',
      lastPaidAt: 'last_paid_at',
      notes: 'notes',
      isActive: 'is_active',
      paidStatus: 'paid_status',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        const value = (data as any)[key];
        if (key === 'isActive' || key === 'paidStatus') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value ?? null);
        }
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE bills SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<BillDbRecord | null> {
    return await this.db.getFirstAsync<BillDbRecord>(
      `SELECT * FROM bills WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(): Promise<BillDbRecord[]> {
    return await this.db.getAllAsync<BillDbRecord>(
      `SELECT * FROM bills WHERE ${this.notDeletedClause()} ORDER BY next_due_date ASC`
    );
  }
}
