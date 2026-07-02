package com.lifeos.sms

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
                SmsParserConfig.SmsCategory.LOAN,
                SmsParserConfig.SmsCategory.FULIZA_CHARGE,
                -> true
                else -> false
            }

        val transactionType: String
            get() = when {
                isIncome  -> "income"
                category == SmsParserConfig.SmsCategory.SENT -> "transfer"
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

        fun recent(): List<SmsParseError> = synchronized(lock) { log.toList() }
        fun count(): Int = synchronized(lock) { log.size }
    }

    // ── Date formatting ───────────────────────────────────────────────────────

    private val DATE_TIME_FORMATTERS = listOf(
        DateTimeFormatter.ofPattern("d/M/yy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy h:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yy hh:mm a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy hh:mm a", Locale.ENGLISH),
    )
    private val DATE_ONLY_FORMATTERS = listOf(
        DateTimeFormatter.ofPattern("d/M/yy", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("d/M/yyyy", Locale.ENGLISH),
    )

    // ── Pre-compiled regex constants (never allocate Regex inside a parse call) ──

    private val COUNTERPARTY_TRAILING_PHONE  = Regex("""\s+\d{9,12}$""")
    private val COUNTERPARTY_VIA_KOPO        = Regex("""\s+via\s+kopo\s+kopo.*$""", RegexOption.IGNORE_CASE)
    private val COUNTERPARTY_NEW_MPESA       = Regex("""\s+New M-PESA.*$""", RegexOption.IGNORE_CASE)
    private val AMBIGUOUS_INTENT_WORDS       = listOf(
        "received", "sent", "paid", "withdrawn", "airtime",
        "fuliza", "reversal", "reversed", "deposited", "bought"
    )

    // ── Stage 0: Fast M-Pesa signal filter ────────────────────────────────────

    fun isMpesaSms(sms: String): Boolean {
        return sms.contains("MPESA", ignoreCase = true) ||
            sms.contains("M-PESA", ignoreCase = true) ||
            (SmsParserConfig.CODE_RE.containsMatchIn(sms.trim()) && SmsParserConfig.AMOUNT_RE.containsMatchIn(sms))
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
            text.contains("for airtime") || (text.contains("bought") && text.contains("airtime")) -> "airtime"
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
            .replace(COUNTERPARTY_TRAILING_PHONE, "")
            .replace(COUNTERPARTY_VIA_KOPO, "")
            .trimEnd('.')
            .replace(COUNTERPARTY_NEW_MPESA, "")
            .trim()
            .takeIf { it.isNotBlank() && !it.startsWith("on ", ignoreCase = true) }
    }

    // ── Stage 5: Auxiliary extractors ─────────────────────────────────────────

    private fun parseAmount(body: String): Double? {
        val num = SmsParserConfig.AMOUNT_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
        return if (num != null && num > 0) num else null
    }

    private fun parseBalance(body: String): Double? =
        SmsParserConfig.BALANCE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

    private fun parseFee(body: String): Double? =
        SmsParserConfig.FEE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

    private fun parseDate(body: String): Long {
        return try {
            val m = SmsParserConfig.DATE_RE.find(body) ?: return System.currentTimeMillis()
            val datePart = m.groupValues[1]
            val timePart = m.groupValues.getOrNull(2)?.takeIf { it.isNotBlank() }
            if (timePart != null) {
                val combined = "$datePart $timePart"
                DATE_TIME_FORMATTERS.firstNotNullOfOrNull { fmt ->
                    runCatching {
                        LocalDateTime.parse(combined, fmt)
                            .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    }.getOrNull()
                } ?: System.currentTimeMillis()
            } else {
                DATE_ONLY_FORMATTERS.firstNotNullOfOrNull { fmt ->
                    runCatching {
                        LocalDate.parse(datePart, fmt)
                            .atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    }.getOrNull()
                } ?: System.currentTimeMillis()
            }
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }

    // ── Stage 5e: Semantic hash ───────────────────────────────────────────────

    /**
     * djb2-xor hash over "category|amount|date|counterparty".
     * Stable across device reinstalls — enables cross-device deduplication.
     */
    internal fun buildSemanticHash(
        category: SmsParserConfig.SmsCategory,
        amount: Double,
        dateMs: Long,
        counterparty: String?,
    ): String {
        val localDate = java.time.Instant.ofEpochMilli(dateMs)
            .atZone(ZoneId.systemDefault()).toLocalDate()
        val key = "${category.name}|${"%.2f".format(amount)}|$localDate|${counterparty?.lowercase().orEmpty()}"
        var hash = 5381L
        for (ch in key) hash = ((hash shl 5) + hash) xor ch.code.toLong()
        return "sem_${Integer.toHexString(hash.toInt())}"
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
     * Rejection reasons:
     *  "not_mpesa"         — no M-Pesa signal
     *  "fuliza_notice"     — Fuliza service/fee notice, not a real transaction
     *  "ambiguous_receipt" — generic success notice with no economic intent
     *  "no_code"           — no valid 10-character M-Pesa code
     *  "no_amount"         — no positive amount extractable
     *  "parse_exception:…" — unexpected exception
     */
    fun parse(sms: String): SmsParseResult {
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
            val match = detectRule(body) ?: run {
                val date = parseDate(body)
                val hash = buildSemanticHash(SmsParserConfig.SmsCategory.UNKNOWN, amount, date, null)
                return SmsParseResult.Success(
                    ParsedTransaction(
                        mpesaCode  = code, amount = amount,
                        category   = SmsParserConfig.SmsCategory.UNKNOWN,
                        confidence = SmsParserConfig.Confidence.LOW,
                        counterparty = null,
                        description = buildDescription(SmsParserConfig.SmsCategory.UNKNOWN, null, amount),
                        balanceAfter = parseBalance(body), fee = parseFee(body),
                        date = date, rawSms = sms,
                        parseRoute = ParseRoute.QUARANTINE, matchedRulePhase = 0, semanticHash = hash,
                    )
                )
            }

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

            // Stage 5c: Route from confidence
            val parseRoute = when (match.confidence) {
                SmsParserConfig.Confidence.HIGH   -> ParseRoute.DIRECT
                SmsParserConfig.Confidence.MEDIUM -> ParseRoute.REVIEW
                SmsParserConfig.Confidence.LOW    -> ParseRoute.QUARANTINE
            }

            // Stage 5d: Received-reversal direction detection
            val isReceivedReversal = match.rule.category == SmsParserConfig.SmsCategory.REVERSED &&
                SmsParserConfig.RECEIVED_REVERSED_RE.containsMatchIn(body)

            // Stage 5e: Date + semantic hash
            val date = parseDate(body)
            val semanticHash = buildSemanticHash(match.rule.category, amount, date, counterparty)

            // Stage 6: Description
            val description = buildDescription(match.rule.category, counterparty, amount)

            SmsParseResult.Success(
                ParsedTransaction(
                    mpesaCode               = code,
                    amount                  = amount,
                    category                = match.rule.category,
                    confidence              = match.confidence,
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
