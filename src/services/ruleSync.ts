/**
 * OTA parser rule sync (S1).
 *
 * At startup, fetches a versioned rule bundle from the CDN and stores it in
 * AsyncStorage. The fallback parser uses the loaded bundle instead of its
 * hardcoded rule array — giving instant coverage for new Safaricom SMS
 * formats without a Play Store release.
 *
 * The native Kotlin parser is authoritative for realtime/import; OTA rules
 * only augment the TypeScript fallback (Expo Go, iOS, debug tooling).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RuleBundle, CompiledRule } from './parserRules';
import { BUNDLED_RULE_BUNDLE, compileBundle } from './parserRules';

const STORAGE_KEY = 'lifeos:parser_rules_v1';
const CDN_URL = 'https://cdn.lifeos.app/parser-rules/v1/rules.json';
const FETCH_TIMEOUT_MS = 5_000;

// In-memory cache so every `parseSmsPreviewFallback` call doesn't hit AsyncStorage.
let _cachedBundle: RuleBundle | null = null;
let _compiledRules: CompiledRule[] | null = null;

function isBundleValid(obj: unknown): obj is RuleBundle {
  if (!obj || typeof obj !== 'object') return false;
  const b = obj as Record<string, unknown>;
  return (
    typeof b.version === 'number' &&
    typeof b.publishedAt === 'string' &&
    Array.isArray(b.rules) &&
    b.rules.every(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Record<string, unknown>).id === 'string' &&
        Array.isArray((r as Record<string, unknown>).patterns),
    )
  );
}

/** Load the most recent rule bundle: OTA > cached-AsyncStorage > bundled. */
export async function getRuleBundle(): Promise<RuleBundle> {
  if (_cachedBundle) return _cachedBundle;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isBundleValid(parsed) && parsed.version >= BUNDLED_RULE_BUNDLE.version) {
        _cachedBundle = parsed;
        return parsed;
      }
    }
  } catch {
    // AsyncStorage unavailable or malformed data — fall through to bundled
  }

  _cachedBundle = BUNDLED_RULE_BUNDLE;
  return BUNDLED_RULE_BUNDLE;
}

/**
 * Return compiled rules from the best available bundle.
 * Cached in-memory for the process lifetime.
 */
export async function getCompiledRules(): Promise<CompiledRule[]> {
  if (_compiledRules) return _compiledRules;
  const bundle = await getRuleBundle();
  _compiledRules = compileBundle(bundle);
  return _compiledRules;
}

export interface SyncResult {
  updated: boolean;
  version: number;
  error?: string;
}

/**
 * Fetch the latest rule bundle from the CDN.
 *
 * Only replaces the cached bundle when the remote version is strictly newer.
 * Safe to call on every app startup — the CDN responds with ETag/304 on
 * unchanged content.
 */
export async function syncRulesFromCDN(): Promise<SyncResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(CDN_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      return { updated: false, version: _cachedBundle?.version ?? BUNDLED_RULE_BUNDLE.version, error: `HTTP ${res.status}` };
    }

    const remote = (await res.json()) as unknown;
    if (!isBundleValid(remote)) {
      return { updated: false, version: _cachedBundle?.version ?? BUNDLED_RULE_BUNDLE.version, error: 'invalid_bundle' };
    }

    const current = _cachedBundle?.version ?? BUNDLED_RULE_BUNDLE.version;
    if (remote.version <= current) {
      return { updated: false, version: current };
    }

    // New version — persist and warm the caches
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
    _cachedBundle = remote;
    _compiledRules = compileBundle(remote);

    return { updated: true, version: remote.version };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      updated: false,
      version: _cachedBundle?.version ?? BUNDLED_RULE_BUNDLE.version,
      error: msg.includes('abort') ? 'timeout' : msg,
    };
  }
}

/** Reset in-memory caches (useful in tests or after a forced rule wipe). */
export function _resetRuleCacheForTesting(): void {
  _cachedBundle = null;
  _compiledRules = null;
}
