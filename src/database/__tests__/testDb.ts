/**
 * In-memory SQLite shim for repository/migration tests.
 *
 * Repositories only use three expo-sqlite methods (runAsync, getAllAsync,
 * getFirstAsync) plus execAsync in migrations — this adapter maps them onto
 * better-sqlite3 so the REAL SQL runs against a REAL database engine in jest,
 * no device needed.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

// Prefer better-sqlite3; fall back to Node's built-in sqlite (node >= 22.5,
// may need NODE_OPTIONS=--experimental-sqlite on Node 22). Both expose the
// same prepare/run/all/get shape used below.
function openMemoryDb(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite3 = require('better-sqlite3');
    return new BetterSqlite3(':memory:');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(':memory:');
  }
}

export interface TestDb {
  db: SQLiteDatabase;
  close: () => void;
  /** Raw better-sqlite3 handle for direct assertions. */
  raw: any;
}

export function createTestDb(): TestDb {
  const raw = openMemoryDb();

  const normalize = (params: unknown[] = []) =>
    params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

  const db = {
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    async runAsync(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
      const info = raw.prepare(sql).run(...normalize(params));
      return { changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return raw.prepare(sql).all(...normalize(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (raw.prepare(sql).get(...normalize(params)) as T | undefined) ?? null;
    },
  } as unknown as SQLiteDatabase;

  return { db, raw, close: () => raw.close() };
}

/** Column names of a table (empty array when the table doesn't exist). */
export function tableColumns(raw: any, table: string): string[] {
  try {
    return raw.prepare(`PRAGMA table_info(${table})`).all().map((r: any) => r.name);
  } catch {
    return [];
  }
}
