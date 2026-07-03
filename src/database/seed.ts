import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * No-op: the app starts with a clean database.
 * Sample/demo seeding has been removed so users begin with their own data.
 */
export async function seedDatabaseIfEmpty(_db: SQLiteDatabase): Promise<void> {
  // Intentionally empty — no default transactions, budgets, tasks, or events.
}
