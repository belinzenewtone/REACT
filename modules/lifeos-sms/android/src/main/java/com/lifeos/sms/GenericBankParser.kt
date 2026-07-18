package com.lifeos.sms

/**
 * Semantic token extractor for Kenyan commercial bank SMS.
 *
 * Extracts financial tokens (amount, reference, balance, direction) from
 * any Kenyan bank transaction SMS regardless of exact wording. Resilient to
 * format changes — a bank shortening "Transaction ID:" to "Ref:" still parses
 * correctly because both labels are in REF_RE.
 *
 * Covers: KCB, Equity, Co-op, NCBA, Absa, StanChart, DTB, Family, I&M,
 * Stanbic, T-Kash, SBM, HF Group, Gulf, BOA, Prime — no per-bank subclasses needed.
 *
 * Institution identity is resolved via InstitutionDetector at parse time so
 * each transaction is stamped with the correct institutionId (e.g. "kcb",
 * "equity") rather than this parser's sentinel "generic_bank".
 */
internal object GenericBankParser : FinancialSmsParser {

    override val institutionId = "generic_bank"
    override val senderIds: Set<String> = emptySet()

    // ── Amount extraction ────────────────────────────────────────────────
    //
    // Priority order (first match wins via the combined regex):
    //   1. "KES 5,000.00 CR" or "DR KES 1,000"   — CR/DR suffix/prefix
    //   2. "Ksh 5,000.00" / "KES5000"             — standard prefix
    //   3. "Amount: 5,000.00"                      — labelled, no currency
    //   4. "5,000.00 debited" / "5,000.00 credited" — bare figure + verb

    // Primary: currency-prefixed, with optional CR/DR suffix (Equity, NCBA, Stanbic style)
    private val AMOUNT_CURRENCY_RE = Regex(
        """(?i)(?:k\.?shs?\.?|kes\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)(?:\s*(?:cr|dr))?"""
    )

    // CR/DR prefix style: "CR KES 5,000" or "DR: KES 1,000"
    private val AMOUNT_CRDR_PREFIX_RE = Regex(
        """(?i)\b(?:cr|dr)[:\s]+(?:k\.?shs?\.?|kes\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // Labelled without currency: "Amount: 5,000.00" / "Principal: 10,000"
    private val AMOUNT_LABEL_RE = Regex(
        """(?i)(?:amount|principal|value|sum)[:\s]+([0-9,]+(?:\.[0-9]{1,2})?)(?!\s*[A-Za-z])"""
    )

    // Reverse format: "50 KES" / "22000.00 KES" (Equity style — amount before currency)
    private val AMOUNT_REVERSE_RE = Regex(
        """(?i)([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:k\.?shs?\.?|kes)\b"""
    )

    // Bare figure followed by direction verb (last resort)
    private val AMOUNT_BARE_RE = Regex(
        """([0-9,]{3,}(?:\.[0-9]{1,2})?)\s+(?:has been\s+)?(?:debited|credited|deducted|charged)"""
    )

    // ── Direction: CR/DR notation ────────────────────────────────────────
    // Many banks suffix amounts with CR (credit) or DR (debit) or use them standalone.
    private val CR_SUFFIX_RE = Regex(
        """(?i)(?:k\.?shs?\.?|kes\.?)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+cr\b"""
    )
    private val DR_SUFFIX_RE = Regex(
        """(?i)(?:k\.?shs?\.?|kes\.?)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+dr\b"""
    )
    private val CR_PREFIX_RE = Regex("""(?i)\bcr[:\s]+(?:k\.?shs?\.?|kes\.?)""")
    private val DR_PREFIX_RE = Regex("""(?i)\bdr[:\s]+(?:k\.?shs?\.?|kes\.?)""")

    // ── Direction: word signals ──────────────────────────────────────────
    private val CREDIT_RE = Regex(
        """(?i)\b(?:received?|credited?|deposited?|deposit|credit|funds?\s+received|payment\s+received|inward\s+(?:transfer|remittance))\b"""
    )
    private val DEBIT_RE = Regex(
        """(?i)\b(?:sent|paid|payment|debited?|deducted?|purchas\w+|bought|outward\s+(?:transfer|remittance)|funds?\s+(?:sent|transferred))\b"""
    )
    private val TRANSFER_RE = Regex(
        """(?i)\b(?:transferred?|transfer\s+to|transfer\s+from|funds?\s+transfer)\b"""
    )
    private val WITHDRAW_RE = Regex(
        """(?i)\b(?:withdraw(?:al|n)?|cash\s*out|atm\s*(?:withdrawal)?|agent\s+(?:cash\s*out|withdrawal))\b"""
    )
    private val PAYBILL_RE = Regex(
        """(?i)\b(?:paybill|pay\s*bill|utility|bill\s+payment|merchant|buy\s+goods|airtime|till\s+(?:no\.?|number))\b"""
    )
    private val REVERSAL_RE = Regex(
        """(?i)\b(?:reversed?|reversal|refund(?:ed)?|chargeback)\b"""
    )

    // "Account debited" / "Account credited" — common in formal bank SMS
    private val ACCOUNT_CREDITED_RE = Regex("""(?i)\baccount\s+(?:has been\s+)?credited\b""")
    private val ACCOUNT_DEBITED_RE  = Regex("""(?i)\baccount\s+(?:has been\s+)?debited\b""")

    // ── Reference extraction ─────────────────────────────────────────────
    // All reference label variants used by Kenyan banks.
    private val REF_RE = Regex(
        """(?i)(?:ref(?:erence)?(?:\s*(?:no\.?|num(?:ber)?|id))?""" +
        """|txn\s*(?:id|no\.?|ref)""" +
        """|trans(?:action)?\s*(?:id|no\.?|ref\.?)""" +
        """|receipt\s*(?:no\.?|id)""" +
        """|payment\s*(?:ref|id|code)""" +
        """|confirmation\s*(?:no\.?|code)""" +
        """|auth(?:orisation|orization)?\s*(?:code|no\.?)""" +
        """|approval\s*(?:code|no\.?)""" +
        """|trn|tran\s*id|trace\s*(?:no\.?|id)""" +
        """|narration)[:\s#]+([A-Z0-9]{5,25})"""
    )

    // Narration field — free-text description some banks include
    private val NARRATION_RE = Regex(
        """(?i)narration[:\s]+([^\n.;]{3,60})"""
    )

    // ── Balance extraction ───────────────────────────────────────────────
    // Covers: Balance, Available Balance, New Balance, Closing Balance,
    //         Running Balance, A/C Balance, Acc Bal, Book Balance.
    private val BALANCE_RE = Regex(
        """(?i)(?:(?:new|closing|running|available|current|book|ledger)\s+)?""" +
        """(?:(?:a\/?c|account|acc\.?)\s+)?""" +
        """bal(?:ance)?\s*(?:is|:|\s)\s*""" +
        """(?:k\.?shs?\.?|kes\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // "Balance after transaction: KES 12,000" — explicit "after" phrasing
    private val BALANCE_AFTER_RE = Regex(
        """(?i)bal(?:ance)?\s+after\s+(?:transaction\s+)?[:\s]*(?:k\.?shs?\.?|kes\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // ── Fee extraction ───────────────────────────────────────────────────
    private val FEE_RE = Regex(
        """(?i)(?:charges?|fees?|commission|levy|excise)[:\s]+(?:k\.?shs?\.?|kes\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // ── Counterparty extraction ──────────────────────────────────────────
    private val FROM_RE = Regex(
        """(?i)\bfrom\s+([A-Za-z][A-Za-z0-9 .&'\/\-]{1,40})"""
    )
    private val TO_RE = Regex(
        """(?i)\bto\s+([A-Za-z][A-Za-z0-9 .&'\/\-]{1,40})"""
    )

    // "Account: 123XXXXX" — masked account number used as counterparty when no name
    private val ACCOUNT_NUM_RE = Regex(
        """(?i)(?:a\/?c|account|acct)\.?\s*(?:no\.?\s*)?([0-9X*]{4,20})"""
    )

    // M-PESA reference code embedded in bank SMS (for cross-sender dedup)
    // Matches: "M-Pesa Ref TGV68IHDQE", "LOOP ref NHLEQ22R7SEB", "M-PESA Ref UCUDLB7GY3"
    private val MPESA_CROSSREF_RE = Regex(
        """(?i)(?:m-?pesa|loop)\s+ref\s+([A-Z0-9]{9,12})"""
    )

    // "Paybill: 123456 Account: ABC123" — paybill merchant + account ref
    private val PAYBILL_NUM_RE = Regex(
        """(?i)(?:paybill|till)\s*(?:no\.?)?\s*:?\s*([0-9]{4,10})"""
    )

    // Strip trailing noise from extracted counterparty name
    private val PARTY_TAIL = Regex(
        """(?i)\s*(?:\(.*|\bon\s+\d|\bat\s+\d|ref|txn|trans|balance|bal\b|your|k\.?shs?\.?|kes|\d{5,}|a\/?c|account).*$"""
    )

    // ── Public API ───────────────────────────────────────────────────────

    override fun canParse(body: String, sender: String): Boolean {
        val detection = InstitutionDetector.detect(sender, body) ?: return false
        return detection.institutionId != "mpesa" && detection.institutionId != "airtel"
    }

    fun canParse(detection: InstitutionDetector.Detection?): Boolean {
        if (detection == null) return false
        return detection.institutionId != "mpesa" && detection.institutionId != "airtel"
    }

    override fun parse(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult =
        parseWithDetection(body, sender, receivedAtMs, InstitutionDetector.detect(sender, body))

    fun parseWithDetection(
        body: String,
        sender: String,
        receivedAtMs: Long,
        detection: InstitutionDetector.Detection?,
    ): SmsParser.SmsParseResult {
        val instId = detection?.institutionId ?: "bank"

        // Amount — try each pattern in priority order
        val amount = extractAmount(body)
            ?: return SmsParser.SmsParseResult.Error(
                SmsParser.SmsParseError("no_amount", body, receivedAtMs)
            )
        if (amount <= 0) return SmsParser.SmsParseResult.Error(
            SmsParser.SmsParseError("zero_amount", body, receivedAtMs)
        )

        val refRaw  = REF_RE.find(body)?.groupValues?.get(1)?.trim()
        val crossRefMpesaCode = MPESA_CROSSREF_RE.find(body)?.groupValues?.get(1)?.trim()
        val balance = BALANCE_AFTER_RE.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?: BALANCE_RE.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
        val fee     = FEE_RE.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

        // Direction — CR/DR notation takes priority over word signals
        val isCrSuffix = CR_SUFFIX_RE.containsMatchIn(body)
        val isDrSuffix = DR_SUFFIX_RE.containsMatchIn(body)
        val isCrPrefix = CR_PREFIX_RE.containsMatchIn(body)
        val isDrPrefix = DR_PREFIX_RE.containsMatchIn(body)
        val isCrDr     = isCrSuffix || isCrPrefix
        val isDrDr     = isDrSuffix || isDrPrefix

        val isCredit   = isCrDr
            || CREDIT_RE.containsMatchIn(body)
            || ACCOUNT_CREDITED_RE.containsMatchIn(body)
        val isDebit    = isDrDr
            || DEBIT_RE.containsMatchIn(body)
            || TRANSFER_RE.containsMatchIn(body)
            || ACCOUNT_DEBITED_RE.containsMatchIn(body)
        val isWithdraw = WITHDRAW_RE.containsMatchIn(body)
        val isPaybill  = PAYBILL_RE.containsMatchIn(body)
        val isReversal = REVERSAL_RE.containsMatchIn(body)

        val category = when {
            isReversal               -> SmsParserConfig.SmsCategory.REVERSED
            isCredit && !isDebit     -> SmsParserConfig.SmsCategory.RECEIVED
            isWithdraw               -> SmsParserConfig.SmsCategory.WITHDRAW
            isPaybill && isDebit     -> SmsParserConfig.SmsCategory.PAYBILL
            isDebit                  -> SmsParserConfig.SmsCategory.SENT
            else                     -> SmsParserConfig.SmsCategory.UNKNOWN
        }

        val counterparty = extractCounterparty(body, category, isPaybill)

        // Confidence: more matched fields → higher confidence
        val fieldCount = listOfNotNull(refRaw, balance, counterparty).size
        val hasDirection = isCredit || isDebit || isWithdraw || isPaybill
        val confidence = when {
            fieldCount >= 2 && hasDirection -> SmsParserConfig.Confidence.HIGH
            fieldCount >= 1 && hasDirection -> SmsParserConfig.Confidence.MEDIUM
            hasDirection                    -> SmsParserConfig.Confidence.MEDIUM
            fieldCount >= 2                 -> SmsParserConfig.Confidence.MEDIUM
            else                            -> SmsParserConfig.Confidence.LOW
        }
        val route = when (confidence) {
            SmsParserConfig.Confidence.HIGH   -> SmsParser.ParseRoute.DIRECT
            SmsParserConfig.Confidence.MEDIUM -> SmsParser.ParseRoute.REVIEW
            SmsParserConfig.Confidence.LOW    -> SmsParser.ParseRoute.QUARANTINE
        }

        val sourceHash  = SmsParser.sha256(SmsParser.normalizeForHash(body))
        val externalRef = refRaw ?: "$instId:${amount.toLong()}:${receivedAtMs / 60_000}"
        val description = buildDescription(instId, category, amount, counterparty)
        val semanticHash = SmsParser.sha256(
            "$instId|${category.name}|${amount.toLong()}|${receivedAtMs / 60_000}|${counterparty.orEmpty()}"
        )

        return SmsParser.SmsParseResult.Success(
            SmsParser.ParsedTransaction(
                mpesaCode    = externalRef,
                amount       = amount,
                category     = category,
                confidence   = confidence,
                counterparty = counterparty,
                description  = description,
                balanceAfter = balance,
                fee          = fee,
                date         = receivedAtMs,
                rawSms       = body,
                parseRoute   = route,
                semanticHash = semanticHash,
                sourceHash   = sourceHash,
                institutionId = instId,
                externalRef  = externalRef,
                currency     = "KES",
                rawSender    = sender,
                crossRefMpesaCode = crossRefMpesaCode,
            )
        )
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private fun extractAmount(body: String): Double? {
        // 1. CR/DR prefix style first — most unambiguous
        AMOUNT_CRDR_PREFIX_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.let { return it }

        // 2. Standard currency prefix (also handles CR/DR suffix variant via the regex)
        AMOUNT_CURRENCY_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.let { return it }

        // 3. Reverse format: "50 KES" (amount before currency label)
        AMOUNT_REVERSE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.let { if (it > 0) return it }

        // 4. Labelled amount without currency
        AMOUNT_LABEL_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.let { if (it > 0) return it }

        // 5. Bare figure next to a direction verb (last resort)
        AMOUNT_BARE_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?.let { return it }

        return null
    }

    private fun extractCounterparty(
        body: String,
        category: SmsParserConfig.SmsCategory,
        isPaybill: Boolean,
    ): String? {
        // Paybill: prefer the paybill/till number as counterparty
        if (isPaybill) {
            val paybillNum = PAYBILL_NUM_RE.find(body)?.groupValues?.get(1)
            if (!paybillNum.isNullOrBlank()) return "Paybill $paybillNum"
        }

        // Named counterparty from "from …" / "to …"
        val named = when (category) {
            SmsParserConfig.SmsCategory.RECEIVED -> FROM_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
            SmsParserConfig.SmsCategory.SENT,
            SmsParserConfig.SmsCategory.PAYBILL  -> TO_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
            else -> FROM_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
                ?: TO_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
        }
        if (!named.isNullOrBlank()) return named

        // Narration field as fallback counterparty
        val narration = NARRATION_RE.find(body)?.groupValues?.get(1)?.trim()
            ?.takeIf { it.length >= 3 && !it.all { c -> c.isDigit() } }
        if (!narration.isNullOrBlank()) return narration

        // Account number as last-resort counterparty (masked: "1234XXXXX")
        val acct = ACCOUNT_NUM_RE.find(body)?.groupValues?.get(1)?.trim()
        if (!acct.isNullOrBlank()) return "A/C $acct"

        return null
    }

    private fun cleanParty(raw: String): String? =
        raw.replace(PARTY_TAIL, "").trim().takeIf { it.length >= 2 }

    private fun buildDescription(
        instId: String,
        category: SmsParserConfig.SmsCategory,
        amount: Double,
        counterparty: String?,
    ): String {
        val bank   = instId.replaceFirstChar { it.uppercaseChar() }
        val amtStr = "KSh %.2f".format(amount)
        val prep   = if (category == SmsParserConfig.SmsCategory.RECEIVED) "from" else "to"
        val party  = if (!counterparty.isNullOrBlank()) " $prep $counterparty" else ""
        return when (category) {
            SmsParserConfig.SmsCategory.RECEIVED -> "$bank Credit $amtStr$party"
            SmsParserConfig.SmsCategory.SENT     -> "$bank Transfer $amtStr$party"
            SmsParserConfig.SmsCategory.WITHDRAW -> "$bank Withdrawal $amtStr"
            SmsParserConfig.SmsCategory.PAYBILL  -> "$bank Payment $amtStr$party"
            SmsParserConfig.SmsCategory.DEPOSIT  -> "$bank Deposit $amtStr"
            SmsParserConfig.SmsCategory.REVERSED -> "$bank Reversal $amtStr"
            else                                 -> "$bank Transaction $amtStr"
        }
    }
}
