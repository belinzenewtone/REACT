/**
 * Lightweight JS fallback for the native M-Pesa parser.
 *
 * Used ONLY when the lifeos-sms native module is unavailable (Expo Go,
 * iOS, or a broken native build) so that SMS *preview* and CSV-of-SMS
 * tooling keep working in degraded mode. The native Kotlin parser remains
 * the sole realtime/import path — this mirrors its core semantics
 * (regexes, category rules, confidence routing) but not the full 6-stage
 * pipeline or 4-tier dedupe.
 */

import type { SmsPreviewResult } from '../../modules/lifeos-sms';

// Mirrors SmsParserConfig.CODE_RE — 9-10 alphanumerics with ≥1 digit.
const CODE_RE = /\b(?=[A-Za-z]*\d)([A-Za-z0-9]{9,10})\b/;
const AMOUNT_RE = /(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)/i;
const BALANCE_RE = /(?:new\s*)?(?:m-pesa\s*)?(?:available\s*)?balance\s*(?:is\s*)?\s*(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)/i;
const FEE_RE = /(?:transaction\s+cost|fee|charge|access\s+fee|withdrawal\s+charges?)[,.]?\s*(?:(?:Ksh|KES)\s?)?([\d,]+(?:\.\d{1,2})?)/i;
const FULIZA_OUTSTANDING_RE = /outstanding\s+amount\s+is\s+(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)/i;

// M-Pesa dates are almost always DD/MM/YY (or D/M/YY). Extract the first one.
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
const TIME_RE = /at\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;

type Rule = {
  id: string;
  category: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'fuliza';
  appCategory: string;
  test: (t: string) => boolean;
};

// Rule order mirrors the native parser's precedence.
const RULES: Rule[] = [
  {
    id: 'reversal', category: 'REVERSED', transactionType: 'expense', appCategory: 'miscellaneous',
    test: (t) => /has been reversed|reversal/i.test(t),
  },
  {
    id: 'received', category: 'RECEIVED', transactionType: 'income', appCategory: 'income',
    test: (t) => /you have received|received from|umepokea/i.test(t),
  },
  {
    id: 'deposit', category: 'DEPOSIT', transactionType: 'income', appCategory: 'savings',
    test: (t) => /deposited (?:by|to)|agent float.*deposited/i.test(t),
  },
  {
    id: 'airtime', category: 'AIRTIME', transactionType: 'expense', appCategory: 'airtime',
    test: (t) => /airtime|bought .* of airtime/i.test(t),
  },
  {
    id: 'paybill', category: 'PAYBILL', transactionType: 'expense', appCategory: 'utilities',
    test: (t) => /for account|paybill/i.test(t),
  },
  {
    id: 'buy_goods', category: 'BUY_GOODS', transactionType: 'expense', appCategory: 'shopping',
    test: (t) => /paid to/i.test(t),
  },
  {
    id: 'withdraw', category: 'WITHDRAW', transactionType: 'expense', appCategory: 'withdrawal',
    test: (t) => /withdraw(?:n|al)?|from agent/i.test(t),
  },
  {
    id: 'fuliza_charge', category: 'FULIZA_CHARGE', transactionType: 'fuliza', appCategory: 'fuliza',
    test: (t) => /fuliza.*outstanding|outstanding.*fuliza/i.test(t),
  },
  {
    id: 'fuliza_repayment', category: 'LOAN', transactionType: 'fuliza', appCategory: 'fuliza',
    // Repayment only: the user paid/repaid an outstanding Fuliza balance.
    // "Your Fuliza limit is..." is a service notice, not a repayment.
    test: (t) => /(?:paid|repaid|pay)\s+(?:the\s+)?(?:outstanding\s+)?fuliza|fuliza\s+(?:repaid|repayment|paid)|used to\s+(?:partially\s+)?pay\s+(?:your\s+)?(?:outstanding\s+)?fuliza/i.test(t),
  },
  {
    id: 'sent', category: 'SENT', transactionType: 'transfer', appCategory: 'transfer',
    test: (t) => /sent to|umetuma|customer transfer/i.test(t),
  },
];

function num(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  const v = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

/**
 * Extract an epoch timestamp from the SMS body. M-Pesa SMS use DD/MM/YY
 * (or D/M/YY). If no date is found, fall back to "now" so previews still
 * work, but real imports always use the authoritative SMS timestamp from
 * the native side.
 */
function parseSmsDateMs(body: string): number {
  const d = body.match(DATE_RE);
  if (!d) return Date.now();

  let day = parseInt(d[1], 10);
  let month = parseInt(d[2], 10) - 1;
  let year = parseInt(d[3], 10);
  if (year < 100) year += year >= 50 ? 1900 : 2000;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  const tm = body.match(TIME_RE);
  if (tm) {
    hours = parseInt(tm[1], 10);
    minutes = parseInt(tm[2], 10);
    if (tm[3]) seconds = parseInt(tm[3], 10);
    const meridian = tm[4]?.toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
  }

  const date = new Date(year, month, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

export function isMpesaSmsFallback(body: string): boolean {
  if (!body || body.length < 10) return false;
  const hasKeyword = /m-?pesa/i.test(body);
  const hasCode = CODE_RE.test(body);
  const hasAmount = AMOUNT_RE.test(body);
  // Require at least a plausible financial marker. "M-Pesa" alone
  // (marketing spam) is not enough; a code + amount is.
  return (hasKeyword && (hasCode || hasAmount)) || (hasCode && hasAmount);
}

/**
 * Parse a single SMS in degraded mode. Output shape matches the native
 * module's `parseSmsPreview` so callers don't need to branch.
 */
export function parseSmsPreviewFallback(body: string): SmsPreviewResult {
  if (!isMpesaSmsFallback(body)) return { ok: false, reason: 'not_mpesa' };

  const code = body.match(CODE_RE)?.[1];
  if (!code) return { ok: false, reason: 'no_code' };

  const amount = num(body.match(AMOUNT_RE));
  if (amount == null || amount <= 0) return { ok: false, reason: 'no_amount' };

  const rule = RULES.find((r) => r.test(body));
  const balanceAfter = num(body.match(BALANCE_RE));
  const fee = num(body.match(FEE_RE));

  // Confidence/routing mirror: known rule + balance → high/direct; known rule
  // without balance → medium/review; no rule → low/quarantine.
  const confidence: 'high' | 'medium' | 'low' = rule
    ? balanceAfter != null ? 'high' : 'medium'
    : 'low';
  const parseRoute: 'direct' | 'review' | 'quarantine' =
    confidence === 'high' ? 'direct' : confidence === 'medium' ? 'review' : 'quarantine';

  // Rough counterparty: text between the directional keyword and the date/phone.
  const cpMatch = body.match(
    /(?:from|to|paid to|sent to|received from)\s+([A-Za-z][A-Za-z .&'-]{2,40}?)(?=\s+(?:0\d{9}|on\s|for\s|via\s|\.|,|$))/i,
  );
  const counterparty = cpMatch?.[1]?.trim() ?? '';

  return {
    ok: true,
    mpesaCode: code.toUpperCase(),
    amount,
    merchant: counterparty,
    category: rule?.appCategory ?? 'uncategorized',
    transactionType: rule?.transactionType ?? 'expense',
    confidence,
    description: body.slice(0, 120),
    dateMs: parseSmsDateMs(body),
    balanceAfter,
    fee,
    rawSms: body,
    parseRoute,
    semanticHash: '', // dedupe hashes are native-only; preview doesn't insert
    matchPhase: rule ? 1 : 0,
    ruleId: rule ? `fallback_${rule.id}` : 'fallback_unknown',
    sourceHash: '',
  };
}
