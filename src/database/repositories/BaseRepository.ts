import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowIso } from '../index';

/**
 * Generic CRUD helpers for SQLite repositories.
 * All tables use string UUID primary keys and soft-delete via deleted_at.
 */

export interface SyncableRecord {
  id: string;
  created_at: string;
  updated_at: string;
  sync_state: string;
  record_source: string;
  deleted_at: string | null;
  revision: number;
  user_id: string | null;
}

export abstract class BaseRepository<T extends SyncableRecord> {
  protected abstract tableName: string;

  constructor(protected db: SQLiteDatabase) {}

  protected notDeletedClause(alias?: string): string {
    const prefix = alias ? `${alias}.` : '';
    return `${prefix}deleted_at IS NULL`;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ?, sync_state = 'pending', revision = revision + 1 WHERE id = ?`,
      [nowIso(), nowIso(), id]
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  async purgeDeleted(): Promise<void> {
    await this.db.runAsync(`DELETE FROM ${this.tableName} WHERE deleted_at IS NOT NULL`, []);
  }

  protected generateRecordBase(
    recordSource: string = 'manual',
    userId?: string
  ): Pick<SyncableRecord, 'id' | 'created_at' | 'updated_at' | 'sync_state' | 'record_source' | 'deleted_at' | 'revision' | 'user_id'> {
    const now = nowIso();
    return {
      id: generateId(),
      created_at: now,
      updated_at: now,
      sync_state: 'pending',
      record_source: recordSource,
      deleted_at: null,
      revision: 1,
      user_id: userId ?? null,
    };
  }
}
