import { SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { CREATE_TABLES_SQL, DATABASE_NAME } from './schema';

export { SQLiteProvider, useSQLiteContext };
export { DATABASE_NAME, CREATE_TABLES_SQL };
export * from './schema';

/**
 * Migrate/initialize the database schema.
 * Called once when the SQLiteProvider mounts.
 */
export async function migrateDatabaseAsync(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  // Future migrations can be gated by PRAGMA user_version.
  // const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  // if ((version?.user_version ?? 0) < 2) { ...; await db.execAsync('PRAGMA user_version = 2'); }
}

/**
 * Helper to generate a UUID v4 primary key.
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Current ISO timestamp helper.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Wrap an optional deleted_at filter.
 */
export function notDeleted(): string {
  return 'deleted_at IS NULL';
}
