import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goal, RecordSource } from '../../types';
import { BaseRepository, type SyncableRecord } from './BaseRepository';
import { nowIso } from '../index';

export type GoalCreateInput = Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'syncState' | 'revision'> & {
  recordSource?: RecordSource;
};

export interface GoalDbRecord extends SyncableRecord {
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string | null;
  category: string | null;
  deadline: string | null;
  status: 'active' | 'completed' | 'archived';
}

export class GoalRepository extends BaseRepository<GoalDbRecord> {
  protected tableName = 'goals';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  async create(data: GoalCreateInput): Promise<GoalDbRecord> {
    const record: GoalDbRecord = {
      ...this.generateRecordBase(data.recordSource ?? 'manual', data.userId),
      title: data.title,
      description: data.description ?? null,
      target_value: data.targetValue,
      current_value: data.currentValue,
      unit: data.unit ?? null,
      category: data.category ?? null,
      deadline: data.deadline ?? null,
      status: data.status,
    } as GoalDbRecord;

    await this.db.runAsync(
      `INSERT INTO goals (id, user_id, title, description, target_value, current_value, unit, category, deadline, status, created_at, updated_at, sync_state, deleted_at, revision)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.user_id,
        record.title,
        record.description,
        record.target_value,
        record.current_value,
        record.unit,
        record.category,
        record.deadline,
        record.status,
        record.created_at,
        record.updated_at,
        record.sync_state,
        record.deleted_at ?? null,
        record.revision,
      ]
    );

    return record;
  }

  async update(id: string, data: Partial<Goal>): Promise<void> {
    const sets: string[] = ['updated_at = ?', 'sync_state = ?', 'revision = revision + 1'];
    const values: (string | number | null)[] = [nowIso(), 'pending'];

    const map: Record<string, keyof GoalDbRecord> = {
      title: 'title',
      description: 'description',
      targetValue: 'target_value',
      currentValue: 'current_value',
      unit: 'unit',
      category: 'category',
      deadline: 'deadline',
      status: 'status',
    };

    for (const [key, col] of Object.entries(map)) {
      if (key in data) {
        sets.push(`${col} = ?`);
        values.push((data as any)[key] ?? null);
      }
    }

    values.push(id);
    await this.db.runAsync(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async findById(id: string): Promise<GoalDbRecord | null> {
    return await this.db.getFirstAsync<GoalDbRecord>(
      `SELECT * FROM goals WHERE id = ? AND ${this.notDeletedClause()}`,
      [id]
    );
  }

  async findAll(): Promise<GoalDbRecord[]> {
    return await this.db.getAllAsync<GoalDbRecord>(
      `SELECT * FROM goals WHERE ${this.notDeletedClause()} ORDER BY created_at DESC`
    );
  }

  async search(query: string, limit: number = 50): Promise<GoalDbRecord[]> {
    const like = `%${query}%`;
    return await this.db.getAllAsync<GoalDbRecord>(
      `SELECT * FROM goals WHERE ${this.notDeletedClause()} AND (title LIKE ? OR description LIKE ? OR category LIKE ?) ORDER BY created_at DESC LIMIT ?`,
      [like, like, like, limit]
    );
  }
}
