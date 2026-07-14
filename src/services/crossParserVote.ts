/**
 * Cross-parser confidence voting (S2).
 *
 * Runs both the native Kotlin parser and the TypeScript fallback on an SMS
 * body and compares their outputs. When they disagree on category or amount
 * by more than the thresholds, the result is flagged for human review.
 *
 * The native Kotlin parser is authoritative for realtime/import paths.
 * Voting is most useful in:
 *  - The review queue UI (surfacing transactions worth re-checking)
 *  - The SMS debug/preview tool (showing both parsers' views)
 *  - Post-import reconciliation for REVIEW-routed transactions
 *
 * Neither parser calls the other's runtime — the comparison is done in
 * JavaScript after both have returned their results.
 */

import type { SmsPreviewResult } from '../../modules/lifeos-sms';
import { parseSmsPreview } from '../../modules/lifeos-sms';
import { parseSmsPreviewFallback } from './fallbackSmsParser';

/** Fraction of amount difference that triggers a flag (5%). */
const AMOUNT_DISAGREE_THRESHOLD = 0.05;

export interface VoteResult {
  /** Result from the native Kotlin parser (authoritative). */
  nativeResult: SmsPreviewResult;
  /** Result from the TypeScript fallback parser. */
  fallbackResult: SmsPreviewResult;
  /** True when both parsers reached the same category and similar amounts. */
  agree: boolean;
  /** True when both succeeded but disagree on category. */
  categoryDisagree: boolean;
  /**
   * Absolute fraction difference between native and fallback amounts.
   * Null when either parser failed or one returned a zero amount.
   */
  amountDisagreePct: number | null;
  /**
   * The recommended result to display or act on.
   * When parsers agree: native. When they disagree: native with route
   * overridden to REVIEW so a human can confirm.
   */
  recommended: SmsPreviewResult;
  /** Human-readable flags explaining any disagreement. */
  flags: string[];
}

/**
 * Run both parsers on `smsBody` and produce a reconciled VoteResult.
 * Always resolves — individual parse failures are captured in the result.
 */
export async function crossVote(smsBody: string): Promise<VoteResult> {
  const [nativeResult, fallbackResult] = await Promise.all([
    parseSmsPreview(smsBody).catch((err): SmsPreviewResult => ({
      ok: false,
      reason: err instanceof Error ? err.message : 'native_error',
    })),
    Promise.resolve(parseSmsPreviewFallback(smsBody)),
  ]);

  const flags: string[] = [];
  let categoryDisagree = false;
  let amountDisagreePct: number | null = null;
  let agree = true;

  const nativeOk = nativeResult.ok;
  const fallbackOk = fallbackResult.ok;

  if (!nativeOk && !fallbackOk) {
    // Both failed — not an M-Pesa SMS or both have the same rejection.
    const nativeReason = !nativeResult.ok ? nativeResult.reason : '';
    const fallbackReason = !fallbackResult.ok ? fallbackResult.reason : '';
    if (nativeReason !== fallbackReason) {
      flags.push(`rejection_mismatch: native="${nativeReason}" fallback="${fallbackReason}"`);
      agree = false;
    }
  } else if (nativeOk !== fallbackOk) {
    // One succeeded, the other rejected — notable disagreement.
    const failedSide = nativeOk ? 'fallback' : 'native';
    const failReason = !nativeResult.ok ? nativeResult.reason : (!fallbackResult.ok ? fallbackResult.reason : '');
    flags.push(`parse_split: ${failedSide} rejected with "${failReason}"`);
    agree = false;
  } else if (nativeOk && fallbackOk) {
    // Both succeeded — compare categories and amounts.
    const nativeTx = nativeResult as Extract<SmsPreviewResult, { ok: true }>;
    const fallbackTx = fallbackResult as Extract<SmsPreviewResult, { ok: true }>;

    if (nativeTx.category !== fallbackTx.category) {
      categoryDisagree = true;
      agree = false;
      flags.push(`category_mismatch: native="${nativeTx.category}" fallback="${fallbackTx.category}"`);
    }

    if (nativeTx.amount > 0 && fallbackTx.amount > 0) {
      const diff = Math.abs(nativeTx.amount - fallbackTx.amount) / nativeTx.amount;
      amountDisagreePct = diff;
      if (diff > AMOUNT_DISAGREE_THRESHOLD) {
        agree = false;
        flags.push(
          `amount_mismatch: native=${nativeTx.amount} fallback=${fallbackTx.amount} diff=${(diff * 100).toFixed(1)}%`,
        );
      }
    }
  }

  // Build recommended result: native wins, but downgrade route on disagreement.
  let recommended: SmsPreviewResult = nativeResult;
  if (!agree && nativeResult.ok) {
    const nativeTx = nativeResult as Extract<SmsPreviewResult, { ok: true }>;
    if (nativeTx.parseRoute === 'direct') {
      recommended = { ...nativeTx, parseRoute: 'review' };
    }
  }

  return { nativeResult, fallbackResult, agree, categoryDisagree, amountDisagreePct, recommended, flags };
}

/**
 * Quick synchronous vote using only the fallback parser (no native call).
 * Useful in Expo Go or when the native module is unavailable.
 */
export function crossVoteFallbackOnly(smsBody: string): VoteResult {
  const fallbackResult = parseSmsPreviewFallback(smsBody);
  return {
    nativeResult: { ok: false, reason: 'module_unavailable' },
    fallbackResult,
    agree: false,
    categoryDisagree: false,
    amountDisagreePct: null,
    recommended: fallbackResult,
    flags: ['native_unavailable'],
  };
}
