import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowIso } from '../index';

export interface CounterpartyOverride {
  id: string;
  /** SHA-256 hex of the normalised phone number (E.164 without "+"). */
  phone_hash: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

/**
 * CRUD for user-supplied counterparty display names.
 *
 * Counterparty disambiguation (S3): when the parser returns a phone number
 * as the counterparty label, the UI looks up a human-readable name here so
 * the user sees "Mum" instead of "0712345678".
 *
 * Phone numbers are stored as SHA-256 hashes so PII never lands in plaintext.
 * The caller is responsible for hashing before calling any method.
 */
export class CounterpartyOverrideRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async upsert(phoneHash: string, displayName: string, userId?: string): Promise<CounterpartyOverride> {
    const now = nowIso();
    const existing = await this.findByHash(phoneHash);

    if (existing) {
      await this.db.runAsync(
        `UPDATE counterparty_overrides SET display_name = ?, updated_at = ?, user_id = ? WHERE phone_hash = ?`,
        [displayName, now, userId ?? existing.user_id, phoneHash],
      );
      return { ...existing, display_name: displayName, updated_at: now, user_id: userId ?? existing.user_id };
    }

    const record: CounterpartyOverride = {
      id: generateId(),
      phone_hash: phoneHash,
      display_name: displayName,
      created_at: now,
      updated_at: now,
      user_id: userId ?? null,
    };

    await this.db.runAsync(
      `INSERT INTO counterparty_overrides (id, phone_hash, display_name, created_at, updated_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.id, record.phone_hash, record.display_name, record.created_at, record.updated_at, record.user_id],
    );

    return record;
  }

  async findByHash(phoneHash: string): Promise<CounterpartyOverride | null> {
    return this.db.getFirstAsync<CounterpartyOverride>(
      `SELECT * FROM counterparty_overrides WHERE phone_hash = ?`,
      [phoneHash],
    );
  }

  /** Resolve display name for a phone hash; returns null when no override exists. */
  async resolveDisplayName(phoneHash: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ display_name: string }>(
      `SELECT display_name FROM counterparty_overrides WHERE phone_hash = ?`,
      [phoneHash],
    );
    return row?.display_name ?? null;
  }

  /** Batch-resolve a list of hashes. Returns a map of hash → display_name. */
  async resolveBatch(phoneHashes: string[]): Promise<Map<string, string>> {
    if (phoneHashes.length === 0) return new Map();

    const placeholders = phoneHashes.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<{ phone_hash: string; display_name: string }>(
      `SELECT phone_hash, display_name FROM counterparty_overrides WHERE phone_hash IN (${placeholders})`,
      phoneHashes,
    );

    return new Map(rows.map((r) => [r.phone_hash, r.display_name]));
  }

  async delete(phoneHash: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM counterparty_overrides WHERE phone_hash = ?`,
      [phoneHash],
    );
  }

  async findAll(limit = 100): Promise<CounterpartyOverride[]> {
    return this.db.getAllAsync<CounterpartyOverride>(
      `SELECT * FROM counterparty_overrides ORDER BY updated_at DESC LIMIT ?`,
      [limit],
    );
  }
}

/**
 * Normalise a raw phone number to a canonical form before hashing.
 * Strips spaces, dashes, parentheses, and leading + so "0712 345 678"
 * and "+254712345678" hash to the same value.
 */
export function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  // Convert Kenyan local (07xx) → E.164-style without the +
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '254' + digits.slice(1);
  }
  return digits;
}
