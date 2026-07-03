import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowIso } from '../database';

/**
 * Learns merchant → category mappings from user corrections.
 *
 * Merchants are stored in a normalized form (lowercase, alphanumeric-only,
 * collapsed whitespace) so that small formatting differences in SMS or manual
 * entries still match the same learned category.
 */
export class MerchantCategoryRepository {
  constructor(private db: SQLiteDatabase) {}

  static normalizeMerchant(merchant: string): string {
    return merchant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getCategoryForMerchant(merchant: string): Promise<string | null> {
    const normalized = MerchantCategoryRepository.normalizeMerchant(merchant);
    if (!normalized) return null;
    const row = await this.db.getFirstAsync<{ category: string }>(
      `SELECT category FROM merchant_categories
       WHERE merchant = ? AND deleted_at IS NULL
       ORDER BY user_corrected DESC, confidence DESC, updated_at DESC
       LIMIT 1`,
      [normalized]
    );
    return row?.category ?? null;
  }

  async setCategory(merchant: string, category: string): Promise<void> {
    const normalized = MerchantCategoryRepository.normalizeMerchant(merchant);
    if (!normalized || !category) return;

    const existing = await this.db.getFirstAsync<{ id: string }>(
      `SELECT id FROM merchant_categories WHERE merchant = ? AND deleted_at IS NULL`,
      [normalized]
    );

    const now = nowIso();
    if (existing) {
      await this.db.runAsync(
        `UPDATE merchant_categories
         SET category = ?, user_corrected = 1, confidence = 1.0, updated_at = ?, sync_state = 'pending', revision = revision + 1
         WHERE id = ?`,
        [category, now, existing.id]
      );
    } else {
      await this.db.runAsync(
        `INSERT INTO merchant_categories
         (id, merchant, category, confidence, user_corrected, created_at, updated_at, sync_state, record_source, revision)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), normalized, category, 1.0, 1, now, now, 'pending', 'manual', 1]
      );
    }
  }
}
