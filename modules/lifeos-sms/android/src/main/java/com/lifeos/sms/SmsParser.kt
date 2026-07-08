package com.lifeos.sms

import java.security.MessageDigest
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * LifeOS M-Pesa SMS Parser — Reliability-First Edition.
 *
 * Architecture (6 stages):
 *  Stage 0  Fast filter — is this even an M-Pesa SMS?
 *  Stage 1  Extract transaction code (required — no code = reject)
 *  Stage 2  Extract amount (required — zero / negative = reject)
 *  Stage 3  Classify via DETECTION_RULES (3-phase: primary → fallback → last-resort)
 *  Stage 4  Extract counterparty / merchant / agent
 *  Stage 5  Enrich: balance, fee, Fuliza fields, route, direction, semantic hash
 *  Stage 6  Build human-readable description
 *
 * Thread-safety: all operations are purely in-memory regex. No I/O.
 */
internal object SmsParser {

    // ── Public types ──────────────────────────────────────────────────────────

    data class SmsParseError(
        val reason: String,
        val rawSms: String,
        val timestampMs: Long = System.currentTimeMillis(),
    )

    sealed class SmsParseResult {
        data class Success(val transaction: ParsedTransaction) : SmsParseResult()
        data class Error(val error: SmsParseError) : SmsParseResult()
    }

    enum class ParseRoute {
        DIRECT,    // HIGH confidence  — auto-insert into ledger
        REVIEW,    // MEDIUM confidence — insert, flag for review
        QUARANTINE // LOW confidence   — hold, do not auto-insert
    }

    data class ParsedTransaction(
        val mpesaCode: String,
        val amount: Double,
        val category: SmsParserConfig.SmsCategory,
        val confidence: SmsParserConfig.Confidence,
        val counterparty: String?,
        val description: String,
        val balanceAfter: Double?,
        val fee: Double?,
        val date: Long,
        val rawSms: String,
        val parseRoute: ParseRoute,
        val isReceivedReversal: Boolean = false,
        val semanticHash: String = "",
        val matchedRulePhase: Int = 1,
        /** Id of the detection rule that produced this classification (for debugging/ML tracking). */
        val ruleId: String = "",
        /** SHA-256 of the normalized raw SMS — stable across re-delivery for deduplication. */
        val sourceHash: String = "",
        /**
         * For FULIZA_CHARGE: authoritative cumulative outstanding balance stated directly
         * in the charge SMS. Use this to update the live Fuliza balance.
         */
        val fulizaOutstandingKes: Double? = null,
        /**
         * For LOAN repayment: remaining available credit after this repayment.
         * outstanding = userFulizaLimit - fulizaAvailableLimitKes
         */
        val fulizaAvailableLimitKes: Double? = null,
    ) {
        val isIncome: Boolean
            get() = !isReceivedReversal && (
                category == SmsParserConfig.SmsCategory.RECEIVED ||
                category == SmsParserConfig.SmsCategory.DEPOSIT
            )

        val isExpense: Boolean
            get() = isReceivedReversal || when (category) {
                SmsParserConfig.SmsCategory.SENT,
                SmsParserConfig.SmsCategory.AIRTIME,
                SmsParserConfig.SmsCategory.PAYBILL,
                SmsParserConfig.SmsCategory.BUY_GOODS,
                SmsParserConfig.SmsCategory.WITHDRAW,
                -> true
                else -> false
            }

        val transactionType: String
            get() = when {
                isIncome  -> "income"
                category == SmsParserConfig.SmsCategory.SENT -> "transfer"
                category == SmsParserConfig.SmsCategory.LOAN ||
                    category == SmsParserConfig.SmsCategory.FULIZA_CHARGE -> "fuliza"
                category == SmsParserConfig.SmsCategory.REVERSED -> "expense"
                else      -> "expense"
            }
    }

    // ── In-memory rejection log (ring buffer, last 50) ────────────────────────

    object RejectionLog {
        private val lock = Any()
        private val log = ArrayDeque<SmsParseError>(50)

        fun record(error: SmsParseError) = synchronized(lock) {
            if (log.size >= 50) log.removeFirst()
            log.addLast(error)
        }

        fun recent(limit: Int = 50): List<SmsParseError> = synchronized(lock) {
            log.takeLast(limit.coerceIn(1, 50))
        }
        fun count(): Int = synchronized(lock) { log.size }
    }

    // ── Date formatting ───────────────────────────────────────────────────────

    private val DATE_TIME_FORMATTERS = listOf(
        // Numeric day/month/year
        DateTimeFormatter.ofPattern("d/M/yy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yyyy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm", Locale.ENGLISH),
        // With seconds
        DateTimeFormatter.ofPattern("d/M/yy HH:mm:ss", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy HH:mm:ss", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yy HH:mm:ss", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yyyy HH:mm:ss", Locale.ENGLISH),
        // Month-name variants: "3-JUL-25", "Jul 3, 2025", "3 Jul 2025"
        DateTimeFormatter.ofPattern("d-MMM-yy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-MMM-yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-MMM-yy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-MMM-yyyy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM d, yyyy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM dd, yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM dd, yyyy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yyyy hh:mm a", Locale.ENGLISH),
    )
    private val DATE_ONLY_FORMATTERS = listOf(
        DateTimeFormatter.ofPattern("d/M/yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-M-yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-MMM-yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d-MMM-yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH),
    )

    // ── Pre-compiled regex constants (never allocate Regex inside a parse call) ──

    private val COUNTERPARTY_TRAILING_PHONE  = Regex("""\s+(?:\+?254|0)\d[\d\s-]{7,14}$""")
    // Trailing transaction codes are 9-10 alphanumerics with at least one digit
    // (matches CODE_RE). Without the digit requirement, multi-word merchant names
    // like "CHandarana FOODMPLUS" get truncated.
    private val COUNTERPARTY_TRAILING_CODE   = Regex("""\s+(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{9,10}$""")
    private val COUNTERPARTY_TRAILING_DATE   = Regex("""\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_TRAILING_DATE_WORD = Regex("""\s+on\s+\d{1,2}[-/\s][A-Za-z]{3,9}[-/\s]\d{2,4}.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_VIA_KOPO        = Regex("""\s+via\s+(?:kopo[\s-]+kopo|kopokopo)(?:\s+ltd|\s+limited)?.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_NEW_MPESA       = Regex("""\s+New M-PESA.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_TRAILING_TILL   = Regex("""\s+(?:till\s*(?:number)?\s*[:#]?\s*)?\d{5,6}$""", RegexOption.IGNORE_CASE)
    // Require "ref." (with a period) rather than bare "ref" so merchant names
    // like "KPLC REFUND" are not treated as account-reference trailers.
    private val COUNTERPARTY_TRAILING_ACCOUNT = Regex("""\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|token|bill)\s*[:#]?\s*[\w-]+.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_TRAILING_AGENT  = Regex("""\s+agent\s+\d+.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_TRAILING_TIME   = Regex("""\s+at\s+\d{1,2}:\d{2}.*$""", RegexOption.IGNORE_CASE)
    private val PHONE_ONLY_RE                = Regex("""^(?:\+?254|0)\d[\d\s-]{7,14}$""")
    private val CODE_FORMAT_RE               = Regex("""^[A-Za-z0-9]{9,10}$""")
    private val AMBIGUOUS_INTENT_WORDS       = listOf(
        "received", "sent", "paid", "withdrawn", "airtime",
        "fuliza", "reversal", "reversed", "deposited", "bought"
    )

    // ── Hash helpers ──────────────────────────────────────────────────────────

    /** Collapses whitespace and upper-cases the raw SMS for a stable source hash. */
    internal fun normalizeForHash(input: String): String =
        input.replace(SmsParserConfig.WS_RE, " ").trim().uppercase()

    internal fun sha256(input: String): String = try {
        MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    } catch (_: Exception) {
        input.hashCode().toString()
    }

    // ── Stage 0: Fast M-Pesa signal filter ────────────────────────────────────

    fun isMpesaSms(sms: String): Boolean {
        return sms.contains("MPESA", ignoreCase = true) ||
            sms.contains("M-PESA", ignoreCase = true) ||
            (SmsParserConfig.CODE_RE.containsMatchIn(sms.trim()) && SmsParserConfig.AMOUNT_RE.containsMatchIn(sms))
    }

    /**
     * Extracts a Fuliza limit assignment from an opt-in or limit-increase SMS.
     * Returns null if the message is not a limit-assignment notice.
     */
    fun extractFulizaLimit(sms: String): Double? {
        return SmsParserConfig.FULIZA_LIMIT_ASSIGNMENT_RE.find(sms)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.takeIf { it >= 0 }
    }

    /**
     * True if the SMS is a generic success receipt with no economic intent
     * (e.g. "Your transaction completed successfully." with no direction words).
     */
    private fun isAmbiguousReceipt(body: String): Boolean {
        val lower = body.lowercase()
        val hasSuccessSignal = lower.contains("completed successfully") ||
            lower.contains("transaction successful") ||
            lower.contains("confirmed successfully")
        if (!hasSuccessSignal) return false
        return AMBIGUOUS_INTENT_WORDS.none { lower.contains(it) }
    }

    // ── Stage 3: 3-phase rule classification ─────────────────────────────────

    private data class MatchResult(
        val rule: SmsParserConfig.DetectionRule,
        val confidence: SmsParserConfig.Confidence,
        val phase: Int,
    )

    private fun detectRule(body: String): MatchResult? {
        // Phase 1 — primary structural patterns → HIGH
        for (rule in SmsParserConfig.DETECTION_RULES) {
            if (rule.patterns.any { it.containsMatchIn(body) }) {
                return MatchResult(rule, SmsParserConfig.Confidence.HIGH, phase = 1)
            }
        }

        // Phase 2 — fallback keyword patterns → MEDIUM
        for (rule in SmsParserConfig.DETECTION_RULES) {
            if (rule.fallbackPatterns.any { it.containsMatchIn(body) }) {
                return MatchResult(rule, SmsParserConfig.Confidence.MEDIUM, phase = 2)
            }
        }

        // Phase 3 — last-resort keyword scan for very old / unusual formats → MEDIUM
        val text = body.lowercase()
        val ruleId: String? = when {
            text.contains("has been reversed")                                           -> "reversal"
            text.contains(" deposited") || text.contains("cash deposit")                -> "deposit"
            text.contains("for airtime") || text.contains("airtime for") ||
                (text.contains("bought") && text.contains("airtime")) -> "airtime"
            (text.contains("sent to") || text.contains("paid to")) &&
                (text.contains(" account ") || text.contains("for account"))            -> "paybill"
            text.contains("paid to")                                                    -> "buy_goods"
            text.contains("withdrawn from agent") || text.contains("cash withdrawal")   -> "withdrawal"
            text.contains("from your m-pesa has been used to") &&
                text.contains("outstanding fuliza")                                     -> "fuliza_repayment"
            text.contains("received from") || text.contains("you have received")        -> "received"
            text.contains("sent to") || text.contains("customer transfer")              -> "sent_p2p"
            else -> null
        }

        return ruleId?.let { id ->
            SmsParserConfig.DETECTION_RULES.find { it.id == id }
                ?.let { MatchResult(it, SmsParserConfig.Confidence.MEDIUM, phase = 3) }
        }
    }

    // ── Stage 4: Counterparty extraction ─────────────────────────────────────

    private fun extractCounterparty(body: String, rule: SmsParserConfig.DetectionRule): String? {
        for (pattern in rule.counterpartyPatterns) {
            val candidate = pattern.find(body)?.groupValues?.getOrNull(1)
            if (!candidate.isNullOrBlank()) {
                return cleanCounterparty(candidate)
            }
        }
        return when (rule.category) {
            SmsParserConfig.SmsCategory.DEPOSIT  -> "Cash Deposit"
            SmsParserConfig.SmsCategory.AIRTIME  -> "Airtime Purchase"
            SmsParserConfig.SmsCategory.WITHDRAW -> "ATM Withdrawal"
            else -> null
        }
    }

    private fun cleanCounterparty(raw: String): String? {
        return raw
            .replace(SmsParserConfig.WS_RE, " ")
            // Strip channel / suffix markers first so they do not anchor later regexes.
            .replace(COUNTERPARTY_VIA_KOPO, "")
            .replace(COUNTERPARTY_NEW_MPESA, "")
            // Strip trailing dates and times (numeric and word-month variants).
            .replace(COUNTERPARTY_TRAILING_DATE, "")
            .replace(COUNTERPARTY_TRAILING_DATE_WORD, "")
            .replace(COUNTERPARTY_TRAILING_TIME, "")
            // Strip account/reference/paybill metadata and agent floats.
            .replace(COUNTERPARTY_TRAILING_ACCOUNT, "")
            .replace(COUNTERPARTY_TRAILING_AGENT, "")
            // Strip trailing phone numbers, transaction codes, till numbers.
            .replace(COUNTERPARTY_TRAILING_PHONE, "")
            .replace(COUNTERPARTY_TRAILING_CODE, "")
            .replace(COUNTERPARTY_TRAILING_TILL, "")
            .trimEnd('.', ' ', ',', '-')
            .trim()
            .takeIf {
                it.isNotBlank() &&
                    !it.startsWith("on ", ignoreCase = true) &&
                    !it.startsWith("mnamo ", ignoreCase = true)
            }
    }

    // ── Stage 5: Auxiliary extractors ─────────────────────────────────────────

    /**
     * Weighted 6-factor confidence score. Moves beyond rule-phase confidence by
     * penalising missing or weak fields, so a phase-1 match with no counterparty,
     * an implausible amount/date, or a missing balance on a high-value tx still
     * drops to MEDIUM/LOW.
     */
    internal fun scoreConfidence(
        category: SmsParserConfig.SmsCategory,
        amount: Double,
        dateMs: Long,
        counterparty: String?,
        code: String,
        rulePhase: Int,
        balanceAfter: Double?,
    ): SmsParserConfig.Confidence {
        val now = System.currentTimeMillis()
        val oneYearMs = 365L * 24 * 60 * 60 * 1000
        val fiveYearsMs = 5L * oneYearMs
        val highValueThreshold = 50_000.0
        val implausibleAmountThreshold = 1_000_000.0

        val codeScore = if (CODE_FORMAT_RE.matches(code)) 1.0 else 0.5
        val amountScore = when {
            amount <= 0 -> 0.0
            amount > implausibleAmountThreshold -> 0.6
            else -> 1.0
        }
        val categoryScore = if (category != SmsParserConfig.SmsCategory.UNKNOWN) 1.0 else 0.3
        val cp = counterparty?.trim().orEmpty()
        val counterpartyScore = when {
            cp.length in 3..50 && !PHONE_ONLY_RE.matches(cp) -> 1.0
            cp.length in 2..50 -> 0.7
            cp.isNotBlank() -> 0.4
            else -> 0.2
        }
        val dateScore = when {
            dateMs in (now - oneYearMs)..(now + 86_400_000L) -> 1.0
            dateMs in (now - fiveYearsMs)..(now + 86_400_000L) -> 0.7
            else -> 0.4
        }
        val phaseScore = when (rulePhase) {
            1 -> 1.0
            2 -> 0.75
            3 -> 0.55
            else -> 0.4
        }

        var score =
            codeScore * 0.15 +
            amountScore * 0.20 +
            categoryScore * 0.15 +
            counterpartyScore * 0.20 +
            dateScore * 0.15 +
            phaseScore * 0.15

        // Penalties (do not allocate Regex here)
        if (amount > implausibleAmountThreshold) score -= 0.20
        if (dateMs < now - fiveYearsMs || dateMs > now + 86_400_000L) score -= 0.20
        if (amount >= highValueThreshold && balanceAfter == null) score -= 0.20
        if (cp.isNotBlank() && PHONE_ONLY_RE.matches(cp)) score -= 0.20
        if (category == SmsParserConfig.SmsCategory.UNKNOWN) score -= 0.20

        return when {
            score >= 0.85 -> SmsParserConfig.Confidence.HIGH
            score >= 0.65 -> SmsParserConfig.Confidence.MEDIUM
            else -> SmsParserConfig.Confidence.LOW
        }
    }

    private fun parseAmount(body: String): Double? {
        val num = SmsParserConfig.AMOUNT_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
        return if (num != null && num > 0) num else null
    }

    private fun parseAmountForCategory(body: String, category: SmsParserConfig.SmsCategory): Double? {
        return when (category) {
            SmsParserConfig.SmsCategory.FULIZA_CHARGE -> {
                // Prefer the access/maintenance fee; fall back to the first amount.
                SmsParserConfig.FULIZA_ACCESS_FEE_RE.find(body)
                    ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
                    ?: parseAmount(body)
            }
            SmsParserConfig.SmsCategory.LOAN -> {
                // The repayment amount is the figure before "from your M-PESA".
                SmsParserConfig.LOAN_REPAYMENT_AMOUNT_RE.find(body)
                    ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
                    ?: parseAmount(body)
            }
            else -> parseAmount(body)
        }
    }

    private fun parseBalance(body: String): Double? =
        SmsParserConfig.BALANCE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

    private fun parseFee(body: String): Double? =
        SmsParserConfig.FEE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

    private fun parseDate(body: String, receivedAtMs: Long): Long {
        return try {
            // Try every date match in the SMS, not just the first one. Some messages contain
            // multiple dates (e.g. a "due on" date before the transaction date), and the first
            // match may be in a format we cannot parse. Use the SMS received timestamp as the
            // final fallback instead of "now" so Fuliza repayment notices without an embedded
            // date do not all appear to have happened at import time.
            SmsParserConfig.DATE_RE.findAll(body).firstNotNullOfOrNull { m ->
                parseDateMatch(m.groupValues[1], m.groupValues.getOrNull(2)?.takeIf { it.isNotBlank() })
            } ?: receivedAtMs
        } catch (_: Exception) {
            receivedAtMs
        }
    }

    private fun parseDateMatch(datePart: String, timePart: String?): Long? {
        if (timePart != null) {
            val combined = "$datePart $timePart"
            DATE_TIME_FORMATTERS.firstNotNullOfOrNull { fmt ->
                runCatching {
                    LocalDateTime.parse(combined, fmt)
                        .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                }.getOrNull()
            }?.let { return it }
        }
        return DATE_ONLY_FORMATTERS.firstNotNullOfOrNull { fmt ->
            runCatching {
                LocalDate.parse(datePart, fmt)
                    .atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            }.getOrNull()
        }
    }

    // ── Stage 5e: Semantic hash ───────────────────────────────────────────────

    /**
     * SHA-256 hash over "category|amount|utc_date_time|normalized_counterparty".
     * Stable across device reinstalls and identical SMS re-deliveries.
     *
     * Previously used UTC date only, which falsely deduplicated legitimate same-day
     * purchases (e.g. two KES 5 airtime buys). Using the full parsed timestamp
     * keeps re-delivery detection intact while allowing multiple identical purchases
     * on the same day.
     */
    internal fun buildSemanticHash(
        category: SmsParserConfig.SmsCategory,
        amount: Double,
        dateMs: Long,
        counterparty: String?,
    ): String {
        val utcDateTime = java.time.Instant.ofEpochMilli(dateMs)
            .atZone(java.time.ZoneId.of("UTC")).toLocalDateTime()
        val normalizedCp = counterparty?.lowercase()
            ?.replace(SmsParserConfig.WS_RE, " ")
            ?.replace(COUNTERPARTY_TRAILING_PHONE, "")
            ?.replace(COUNTERPARTY_TRAILING_CODE, "")
            ?.replace(COUNTERPARTY_TRAILING_DATE, "")
            ?.trim()
            .orEmpty()
        val key = "${category.name}|${"%.2f".format(amount)}|$utcDateTime|$normalizedCp"
        return "sem_${sha256(key).take(16)}"
    }

    // ── Stage 6: Description builder ─────────────────────────────────────────

    private fun buildDescription(
        category: SmsParserConfig.SmsCategory,
        counterparty: String?,
        amount: Double,
    ): String = when (category) {
        SmsParserConfig.SmsCategory.RECEIVED  ->
            if (counterparty != null) "Received from $counterparty" else "M-Pesa received"
        SmsParserConfig.SmsCategory.DEPOSIT   -> "Cash deposit"
        SmsParserConfig.SmsCategory.AIRTIME   ->
            if (counterparty != null && counterparty != "Airtime Purchase") "Airtime for $counterparty"
            else "Airtime purchase"
        SmsParserConfig.SmsCategory.LOAN           -> "Fuliza repayment"
        SmsParserConfig.SmsCategory.FULIZA_CHARGE  -> "Fuliza charge notice"
        SmsParserConfig.SmsCategory.PAYBILL   ->
            if (counterparty != null) "Paid to $counterparty (Paybill)" else "Paybill payment"
        SmsParserConfig.SmsCategory.BUY_GOODS ->
            if (counterparty != null) "Bought goods at $counterparty" else "Buy Goods"
        SmsParserConfig.SmsCategory.WITHDRAW  ->
            if (counterparty != null && counterparty != "ATM Withdrawal") "Withdrawal at $counterparty"
            else "Cash withdrawal"
        SmsParserConfig.SmsCategory.REVERSED  ->
            if (counterparty != null) "Reversal for $counterparty" else "Transaction reversed"
        SmsParserConfig.SmsCategory.SENT      ->
            if (counterparty != null) "Sent to $counterparty" else "M-Pesa sent"
        SmsParserConfig.SmsCategory.UNKNOWN   ->
            "M-Pesa KES ${String.format(Locale.US, "%,.0f", amount)}"
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Parse a single M-Pesa SMS body through the 6-stage pipeline.
     *
     * @param sms           Raw SMS body.
     * @param receivedAtMs  Timestamp when the SMS was received (from the SMS provider). Used as a
     *                      fallback when the body does not contain a parseable transaction date so
     *                      that Fuliza repayments and other notices do not all appear "today".
     *
     * Rejection reasons:
     *  "not_mpesa"         — no M-Pesa signal
     *  "fuliza_notice"     — Fuliza service/fee notice, not a real transaction
     *  "ambiguous_receipt" — generic success notice with no economic intent
     *  "no_code"           — no valid 10-character M-Pesa code
     *  "no_amount"         — no positive amount extractable
     *  "parse_exception:…" — unexpected exception
     */
    fun parse(sms: String, receivedAtMs: Long = System.currentTimeMillis()): SmsParseResult {
        return try {
            val body = sms.replace(SmsParserConfig.WS_RE, " ").trim()

            // Stage 0a: M-Pesa signal
            if (!isMpesaSms(body)) {
                return SmsParseResult.Error(
                    SmsParseError("not_mpesa", sms).also { RejectionLog.record(it) }
                )
            }

            // Stage 0b: Fuliza service/fee notice filter
            if (SmsParserConfig.isFulizaServiceNotice(body)) {
                return SmsParseResult.Error(
                    SmsParseError("fuliza_notice", sms).also { RejectionLog.record(it) }
                )
            }

            // Stage 0c: Ambiguous success receipt filter
            if (isAmbiguousReceipt(body)) {
                return SmsParseResult.Error(
                    SmsParseError("ambiguous_receipt", sms).also { RejectionLog.record(it) }
                )
            }

            // Stage 1: M-Pesa code required
            val code = SmsParserConfig.CODE_RE.find(body)?.groupValues?.get(1)
                ?: return SmsParseResult.Error(
                    SmsParseError("no_code", sms).also { RejectionLog.record(it) }
                )

            // Stage 2: Positive amount required
            val amount = parseAmount(body)
                ?: return SmsParseResult.Error(
                    SmsParseError("no_amount", sms).also { RejectionLog.record(it) }
                )

            // Stage 3: Classify — unrecognised formats quarantine (no data loss)
            val normalizedBody = normalizeForHash(body)
            val sourceHash = sha256(normalizedBody)
            val match = detectRule(body) ?: run {
                val date = parseDate(body, receivedAtMs)
                val balance = parseBalance(body)
                val fee = parseFee(body)
                val confidence = scoreConfidence(
                    SmsParserConfig.SmsCategory.UNKNOWN, amount, date, null, code, 0, balance
                )
                val parseRoute = when (confidence) {
                    SmsParserConfig.Confidence.HIGH   -> ParseRoute.DIRECT
                    SmsParserConfig.Confidence.MEDIUM -> ParseRoute.REVIEW
                    SmsParserConfig.Confidence.LOW    -> ParseRoute.QUARANTINE
                }
                val semanticHash = buildSemanticHash(SmsParserConfig.SmsCategory.UNKNOWN, amount, date, null)
                return SmsParseResult.Success(
                    ParsedTransaction(
                        mpesaCode    = code, amount = amount,
                        category     = SmsParserConfig.SmsCategory.UNKNOWN,
                        confidence   = confidence,
                        counterparty = null,
                        description  = buildDescription(SmsParserConfig.SmsCategory.UNKNOWN, null, amount),
                        balanceAfter = balance, fee = fee,
                        date         = date, rawSms = sms,
                        parseRoute   = parseRoute,
                        matchedRulePhase = 0,
                        ruleId       = "unknown",
                        semanticHash = semanticHash,
                        sourceHash   = sourceHash,
                    )
                )
            }

            // Stage 3b: Re-extract amount using category-specific selectors.
            val finalAmount = parseAmountForCategory(body, match.rule.category)
                ?: return SmsParseResult.Error(
                    SmsParseError("no_amount", sms).also { RejectionLog.record(it) }
                )

            // Stage 4: Counterparty
            val counterparty = extractCounterparty(body, match.rule)

            // Stage 5: Balance & fee
            val balance = parseBalance(body)
            val fee     = parseFee(body)

            // Stage 5b: Fuliza-specific enrichment
            val fulizaOutstanding: Double? = when (match.rule.category) {
                SmsParserConfig.SmsCategory.FULIZA_CHARGE ->
                    SmsParserConfig.FULIZA_OUTSTANDING_RE.find(body)
                        ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
                else -> null
            }
            val fulizaAvailLimit: Double? = when (match.rule.category) {
                SmsParserConfig.SmsCategory.LOAN ->
                    SmsParserConfig.FULIZA_AVAIL_LIMIT_RE.find(body)
                        ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
                else -> null
            }

            // Stage 5c: Date + semantic hash (needed for scoring and output)
            val date = parseDate(body, receivedAtMs)
            val semanticHash = buildSemanticHash(match.rule.category, finalAmount, date, counterparty)

            // Stage 5d: Weighted confidence score
            val confidence = scoreConfidence(
                match.rule.category, finalAmount, date, counterparty, code, match.phase, balance
            )

            // Stage 5e: Route from confidence
            val parseRoute = when (confidence) {
                SmsParserConfig.Confidence.HIGH   -> ParseRoute.DIRECT
                SmsParserConfig.Confidence.MEDIUM -> ParseRoute.REVIEW
                SmsParserConfig.Confidence.LOW    -> ParseRoute.QUARANTINE
            }

            // Stage 5f: Received-reversal direction detection
            val isReceivedReversal = match.rule.category == SmsParserConfig.SmsCategory.REVERSED &&
                SmsParserConfig.RECEIVED_REVERSED_RE.containsMatchIn(body)

            // Stage 6: Description
            val description = buildDescription(match.rule.category, counterparty, finalAmount)

            SmsParseResult.Success(
                ParsedTransaction(
                    mpesaCode               = code,
                    amount                  = finalAmount,
                    category                = match.rule.category,
                    confidence              = confidence,
                    counterparty            = counterparty,
                    description             = description,
                    balanceAfter            = balance,
                    fee                     = fee,
                    date                    = date,
                    rawSms                  = sms,
                    parseRoute              = parseRoute,
                    isReceivedReversal      = isReceivedReversal,
                    semanticHash            = semanticHash,
                    matchedRulePhase        = match.phase,
                    ruleId                  = match.rule.id,
                    sourceHash              = sourceHash,
                    fulizaOutstandingKes    = fulizaOutstanding,
                    fulizaAvailableLimitKes = fulizaAvailLimit,
                )
            )
        } catch (e: Exception) {
            SmsParseResult.Error(
                SmsParseError("parse_exception: ${e.message}", sms).also { RejectionLog.record(it) }
            )
        }
    }

    fun parseOrNull(sms: String): ParsedTransaction? =
        (parse(sms) as? SmsParseResult.Success)?.transaction
}
