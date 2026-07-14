/**
 * OTA-updateable parser rule layer (S1).
 *
 * Rules are stored as JSON-serializable specs so they can be fetched from a
 * CDN and applied to the TypeScript fallback parser without a Play Store
 * release. The native Kotlin parser uses compiled Regex and is updated via
 * app releases; the TypeScript layer gets immediate coverage for new
 * Safaricom SMS formats through this mechanism.
 *
 * Usage:
 *   const bundle = await getRuleBundle();     // ruleSync.ts
 *   const rules  = compileBundle(bundle);     // returns CompiledRule[]
 *   const match  = rules.find(r => r.test(smsBody));
 */

export interface ParserRuleSpec {
  /** Unique rule identifier — matches native SmsParserConfig.DetectionRule.id. */
  id: string;
  /** Native SmsCategory name. */
  category: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'fuliza';
  /** App-level spending category (e.g. "utilities"). */
  appCategory: string;
  /**
   * Phase 1 primary regex patterns (any match → HIGH confidence).
   * Stored as strings; compiled to RegExp at load time.
   */
  patterns: string[];
  /**
   * Phase 2 fallback patterns (any match → MEDIUM confidence).
   * Checked only when all Phase 1 patterns miss.
   */
  fallbackPatterns?: string[];
  /**
   * Regex to extract the counterparty name (capture group 1).
   * Applied after a rule matches.
   */
  counterpartyPattern?: string;
  /** Minimum bundle version this spec requires. */
  version: number;
}

export interface RuleBundle {
  /** Monotonically increasing version number. Compare to decide whether to
   *  apply OTA bundle or keep the cached one. */
  version: number;
  /** ISO timestamp of the last publish. */
  publishedAt: string;
  rules: ParserRuleSpec[];
}

/** Compiled rule — pattern strings converted to RegExp, ready for matching. */
export interface CompiledRule {
  spec: ParserRuleSpec;
  compiled: RegExp[];
  compiledFallback: RegExp[];
  compiledCounterparty: RegExp | null;
}

export function compileBundle(bundle: RuleBundle): CompiledRule[] {
  return bundle.rules.map((spec) => ({
    spec,
    compiled: spec.patterns.map((p) => new RegExp(p, 'i')),
    compiledFallback: (spec.fallbackPatterns ?? []).map((p) => new RegExp(p, 'i')),
    compiledCounterparty: spec.counterpartyPattern ? new RegExp(spec.counterpartyPattern, 'i') : null,
  }));
}

/**
 * Find the first matching rule from a compiled bundle.
 * Returns the match and which phase (1 or 2) matched.
 */
export function matchRule(
  body: string,
  compiled: CompiledRule[],
): { rule: CompiledRule; phase: 1 | 2 } | null {
  for (const rule of compiled) {
    if (rule.compiled.some((re) => re.test(body))) return { rule, phase: 1 };
  }
  for (const rule of compiled) {
    if (rule.compiledFallback.some((re) => re.test(body))) return { rule, phase: 2 };
  }
  return null;
}

// ── Bundled default rules ─────────────────────────────────────────────────────
// Mirrors SmsParserConfig.DETECTION_RULES in the native Kotlin layer.
// These are the authoritative fallback when no OTA bundle is available or
// when the OTA bundle is older than the bundled version.

export const BUNDLED_RULE_BUNDLE: RuleBundle = {
  version: 1,
  publishedAt: '2026-07-14T00:00:00Z',
  rules: [
    {
      id: 'reversal',
      category: 'REVERSED',
      transactionType: 'expense',
      appCategory: 'miscellaneous',
      version: 1,
      patterns: [
        '(?:transaction of|transaction for)\\s*(?:Ksh|KES)\\s?[\\d,.]+.*?has been reversed',
        '(?:received|sent)\\s+(?:Ksh|KES)\\s?[\\d,.]+.+has been reversed',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to.+has been reversed',
        '(?:your\\s+m-pesa\\s+transaction\\s+)?(?:received|you have received)\\s+(?:Ksh|KES)\\s?[\\d,.]+.+has been reversed',
      ],
      fallbackPatterns: ['has been reversed', 'transaction.*reversed'],
      counterpartyPattern:
        'received from\\s+(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)|sent to\\s+(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)',
    },
    {
      id: 'received',
      category: 'RECEIVED',
      transactionType: 'income',
      appCategory: 'income',
      version: 1,
      patterns: [
        '(?:you have\\s+)?received\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+from\\s+',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+received from\\s+',
        'received\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+from\\s+[A-Z]',
        'umepokea\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+(?:kutoka|from)\\s+',
      ],
      fallbackPatterns: [
        'received from\\s+[A-Z]',
        'umepokea\\s+(?:Ksh|KES)',
        'umepokea',
      ],
      counterpartyPattern:
        'received\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+from\\s+(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)',
    },
    {
      id: 'deposit',
      category: 'DEPOSIT',
      transactionType: 'income',
      appCategory: 'savings',
      version: 1,
      patterns: [
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+deposited',
        'cash deposit of\\s+(?:Ksh|KES)\\s?[\\d,.]+',
        'agent\\s+float\\s+(?:of\\s+)?(?:Ksh|KES)\\s?[\\d,.]+.*\\s+deposited',
      ],
      fallbackPatterns: ['deposited\\s+(?:Ksh|KES)', '\\bdeposited\\b', 'agent\\s+float'],
      counterpartyPattern:
        'deposited by(?:\\s+agent)?\\s+\\d+\\s*-?\\s*(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)',
    },
    {
      id: 'airtime',
      category: 'AIRTIME',
      transactionType: 'expense',
      appCategory: 'airtime',
      version: 1,
      patterns: [
        '(?:you\\s+)?bought\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+of airtime',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+\\d{9,12}\\s+for airtime',
        'for airtime(?:\\s+on|\\s+purchase|\\s+of|\\s*\\.)',
        'airtime\\s+(?:purchase|of\\s+(?:Ksh|KES))',
      ],
      fallbackPatterns: ['for airtime', 'airtime\\s+for\\s+\\d+', 'airtime purchase'],
      counterpartyPattern: 'sent to\\s+(.+?)\\s+for airtime',
    },
    {
      id: 'paybill',
      category: 'PAYBILL',
      transactionType: 'expense',
      appCategory: 'utilities',
      version: 1,
      patterns: [
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+.+?\\s+(?:for\\s+)?(?:account|acc\\.?|acct\\.?|account\\s+number|meter|ref\\.|reference|policy|token|bill|invoice)\\s*[\\w-]+',
        'paid to\\s+.+?\\s+(?:for\\s+)?(?:account|acc\\.?|account\\s+number|meter|ref\\.|reference|token|bill)\\s*[\\w-]+',
        'paybill to\\s+\\d+',
      ],
      fallbackPatterns: [
        '(?:sent to|paid to)\\s+.+?\\s+(?:for\\s+)?(?:account|acc\\.?|account\\s+number|meter|ref\\.|reference|token|bill)\\s*[\\w-]+',
        'paybill\\b',
        'account\\s*(?:number|no\\.?)?\\s*[:#]?\\s*[\\w-]+',
      ],
      counterpartyPattern:
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+(.+?)\\s+(?:for\\s+)?(?:account|acc\\.?|account\\s+number|meter|ref\\.|reference|token|bill)',
    },
    {
      id: 'buy_goods',
      category: 'BUY_GOODS',
      transactionType: 'expense',
      appCategory: 'shopping',
      version: 1,
      patterns: [
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+paid to\\s+.+?\\s+(?:on\\s\\d|\\. |confirmed)',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+paid to\\s+.+?\\s+via\\s+(?:kopo[\\s-]+kopo|kopokopo)\\b',
        'buy goods',
        'till\\s*(?:number)?\\s*[:#]?\\s*\\d{5,6}',
      ],
      fallbackPatterns: ['paid to\\s+\\S', 'till\\s*(?:number)?\\s*[:#]?\\s*\\d{5,6}'],
      counterpartyPattern:
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+paid to\\s+(.+?)(?:\\s+on\\s\\d|\\. |confirmed|\\s+till\\s*(?:number)?\\s*\\d+|$)',
    },
    {
      id: 'withdrawal',
      category: 'WITHDRAW',
      transactionType: 'expense',
      appCategory: 'withdrawal',
      version: 1,
      patterns: [
        'withdrawn from agent',
        'cash withdrawal\\s+of\\s+(?:Ksh|KES)',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+withdrawn',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+withdrawn from ATM',
        'agent\\s+float\\s+(?:of\\s+)?(?:Ksh|KES)\\s?[\\d,.]+.*\\s+withdrawn',
      ],
      fallbackPatterns: ['cash withdrawal', 'withdrawn from', 'agent\\s+float'],
      counterpartyPattern:
        'withdrawn from(?:\\s+agent)?\\s+\\d+\\s*-?\\s*(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)|withdrawn at\\s+(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|$)',
    },
    {
      id: 'fuliza_charge',
      category: 'FULIZA_CHARGE',
      transactionType: 'fuliza',
      appCategory: 'fuliza',
      version: 1,
      patterns: [
        'Total Fuliza M-PESA outstanding amount is\\s*(?:Ksh|KES)\\s?[\\d,]+',
        'Fuliza M-PESA amount is\\s*(?:Ksh|KES)\\s?[\\d,.]+.*Access Fee charged',
      ],
      fallbackPatterns: ['Total Fuliza.*outstanding amount'],
    },
    {
      id: 'fuliza_repayment',
      category: 'LOAN',
      transactionType: 'fuliza',
      appCategory: 'fuliza',
      version: 1,
      patterns: [
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+from your M-PESA has been used to (?:partially|fully)\\s+pay your outstanding Fuliza M-PESA',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+from your M-PESA has been used to .*outstanding Fuliza M-PESA',
      ],
      fallbackPatterns: [
        'from your M-PESA has been used to .*Fuliza',
        'outstanding Fuliza M-PESA',
      ],
    },
    {
      id: 'sent_p2p',
      category: 'SENT',
      transactionType: 'transfer',
      appCategory: 'transfer',
      version: 1,
      patterns: [
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+[A-Z].+?(?:\\s+on\\s|\\s+New\\s|\\.)',
        'customer transfer of\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+to\\s+',
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+(?:\\+?254|0)\\d{8,9}\\b',
        'you have sent\\s+(?:Ksh|KES)\\s?[\\d,.]+\\s+to\\s+',
      ],
      fallbackPatterns: [
        'sent to\\s+[A-Z]',
        'sent to\\s+(?:\\+?254|0)\\d{8,9}\\b',
        'you have sent',
      ],
      counterpartyPattern:
        '(?:Ksh|KES)\\s?[\\d,.]+\\s+sent to\\s+(.+?)(?:\\s+on\\s|\\s+New\\s|\\.|confirmed|$)',
    },
  ],
};
