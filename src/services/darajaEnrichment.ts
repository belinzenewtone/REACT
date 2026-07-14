/**
 * Daraja / paybill enrichment (S4).
 *
 * Resolves human-readable business names for M-Pesa paybill and Buy-Goods
 * (till) numbers. The lookup chain is:
 *
 *   1. In-memory cache (process lifetime).
 *   2. `paybill_registry` SQLite table (persisted across sessions).
 *   3. Safaricom Daraja B2B Name Lookup API (requires OAuth bearer token,
 *      optional — skipped when no credentials are configured).
 *   4. `merchant_categories` table keyed by the numeric code as a string
 *      (fallback when the caller has already categorised a number).
 *
 * The caller supplies the SQLiteDatabase so the service stays stateless and
 * testable. Import and call `resolvePaybillName()` from any transaction-detail
 * screen that needs to show a friendly merchant label.
 *
 * IMPORTANT: Daraja credentials MUST NOT be hard-coded. Supply them via
 * app config (expo-constants / environment variables). If absent, the service
 * skips the network call silently.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { nowIso } from '../database/index';

export interface EnrichmentResult {
  code: string;
  displayName: string;
  source: 'cache' | 'db_registry' | 'daraja' | 'merchant_categories' | 'unknown';
}

// Process-lifetime in-memory cache: code → displayName.
const _cache = new Map<string, string>();

const DARAJA_BASE = 'https://api.safaricom.co.ke';
const FETCH_TIMEOUT_MS = 6_000;

interface DarajaTokenResponse {
  access_token: string;
  expires_in: string;
}

interface DarajaNameResponse {
  Result: {
    ResultCode: string;
    ResultDesc: string;
    ResultParameters?: {
      ResultParameter?: Array<{ Key: string; Value: string }>;
    };
  };
}

/**
 * Fetch a short-lived Daraja OAuth2 bearer token.
 * Returns null when credentials are missing or the request fails.
 */
async function fetchDarajaToken(consumerKey: string, consumerSecret: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const creds = btoa(`${consumerKey}:${consumerSecret}`);

    const res = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${creds}` },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return null;
    const data = (await res.json()) as DarajaTokenResponse;
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Query the Daraja Business Name API for a paybill/till number.
 * Returns the resolved name or null on any failure.
 */
async function fetchDarajaName(code: string, token: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `${DARAJA_BASE}/v1/business/search?BusinessShortCode=${encodeURIComponent(code)}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));

    if (!res.ok) return null;
    const data = (await res.json()) as DarajaNameResponse;

    const params = data?.Result?.ResultParameters?.ResultParameter ?? [];
    const namePair = params.find((p) => p.Key === 'BusinessName' || p.Key === 'ReceiverPartyPublicName');
    return namePair?.Value?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Persist a resolved name to `paybill_registry` and update usage stats. */
async function persistToRegistry(
  db: SQLiteDatabase,
  code: string,
  displayName: string,
  amountKes?: number,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO paybill_registry (paybill_number, display_name, last_seen_at, usage_count, last_amount_kes)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(paybill_number) DO UPDATE SET
       display_name  = excluded.display_name,
       last_seen_at  = excluded.last_seen_at,
       usage_count   = paybill_registry.usage_count + 1,
       last_amount_kes = excluded.last_amount_kes`,
    [code, displayName, now, amountKes ?? null],
  );
}

export interface ResolveOptions {
  /** Daraja OAuth consumer key (from expo-constants or env). */
  darajaConsumerKey?: string;
  /** Daraja OAuth consumer secret (from expo-constants or env). */
  darajaConsumerSecret?: string;
  /** Last transaction amount — written to registry for future analytics. */
  lastAmountKes?: number;
}

/**
 * Resolve a human-readable name for an M-Pesa paybill or till number.
 *
 * @param db      Expo SQLite database handle.
 * @param code    Raw paybill or till number string (e.g. "247247").
 * @param options Optional Daraja credentials and amount hint.
 */
export async function resolvePaybillName(
  db: SQLiteDatabase,
  code: string,
  options: ResolveOptions = {},
): Promise<EnrichmentResult> {
  const normalised = code.trim();
  if (!normalised) return { code, displayName: code, source: 'unknown' };

  // 1 — In-memory cache
  if (_cache.has(normalised)) {
    return { code: normalised, displayName: _cache.get(normalised)!, source: 'cache' };
  }

  // 2 — SQLite paybill_registry
  const dbRow = await db.getFirstAsync<{ display_name: string }>(
    `SELECT display_name FROM paybill_registry WHERE paybill_number = ?`,
    [normalised],
  );
  if (dbRow) {
    _cache.set(normalised, dbRow.display_name);
    return { code: normalised, displayName: dbRow.display_name, source: 'db_registry' };
  }

  // 3 — Daraja API (only when credentials are provided)
  if (options.darajaConsumerKey && options.darajaConsumerSecret) {
    const token = await fetchDarajaToken(options.darajaConsumerKey, options.darajaConsumerSecret);
    if (token) {
      const name = await fetchDarajaName(normalised, token);
      if (name) {
        _cache.set(normalised, name);
        await persistToRegistry(db, normalised, name, options.lastAmountKes);
        return { code: normalised, displayName: name, source: 'daraja' };
      }
    }
  }

  // 4 — merchant_categories keyed by code string
  const mcRow = await db.getFirstAsync<{ merchant: string }>(
    `SELECT merchant FROM merchant_categories WHERE merchant = ?`,
    [normalised],
  );
  if (mcRow) {
    _cache.set(normalised, mcRow.merchant);
    return { code: normalised, displayName: mcRow.merchant, source: 'merchant_categories' };
  }

  return { code: normalised, displayName: normalised, source: 'unknown' };
}

/** Pre-warm the in-memory cache from the local registry (call at app start). */
export async function warmCache(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ paybill_number: string; display_name: string }>(
    `SELECT paybill_number, display_name FROM paybill_registry ORDER BY usage_count DESC LIMIT 500`,
    [],
  );
  for (const row of rows) {
    _cache.set(row.paybill_number, row.display_name);
  }
}

/** Expose the cache size for debugging / health screens. */
export function enrichmentCacheSize(): number {
  return _cache.size;
}

/** Clear the in-memory cache (tests / forced refresh). */
export function _resetEnrichmentCacheForTesting(): void {
  _cache.clear();
}
