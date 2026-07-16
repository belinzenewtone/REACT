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
 * Stanbic, and T-Kash — no per-bank subclasses needed.
 *
 * Institution identity is resolved via InstitutionDetector at parse time so
 * each transaction is stamped with the correct institutionId (e.g. "kcb",
 * "equity") rather than this parser's sentinel "generic_bank".
 */
internal object GenericBankParser : FinancialSmsParser {

    // Sentinel — ParserPipeline uses this parser as fallback for any detected
    // institution that has no dedicated specific parser.
    override val institutionId = "generic_bank"
    override val senderIds: Set<String> = emptySet()

    // All Kenyan currency variants: Ksh, KSh, KES, Kshs, K.Shs
    private val AMOUNT_RE = Regex(
        """(?i)(?:k\.?shs?|kes)\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // Reference labels in use across major Kenyan banks — deliberately broad.
    // Min 5 chars prevents short noise tokens; max 20 caps false-positives.
    private val REF_RE = Regex(
        """(?i)(?:ref(?:erence)?(?:\s*(?:no\.?|num(?:ber)?|id))?""" +
        """|txn\s*(?:id|no\.?|ref)""" +
        """|trans(?:action)?\s*(?:id|no\.?|ref\.?)""" +
        """|receipt\s*(?:no\.?|id)""" +
        """|payment\s*(?:ref|id)""" +
        """|confirmation\s*(?:no\.?|code)""" +
        """|trn|tran\s*id)[:\s#]+([A-Z0-9]{5,20})"""
    )

    // Balance — covers "Balance:", "Available balance is", "A/C Bal:", "Acc Balance"
    private val BALANCE_RE = Regex(
        """(?i)(?:(?:available|current|a\/?c|account|acc\.?)\s+)?bal(?:ance)?\s*(?:is|:|\s+)\s*(?:k\.?shs?|kes)?\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // Fee / charge / commission
    private val FEE_RE = Regex(
        """(?i)(?:charges?|fees?|commission)[:\s]+(?:k\.?shs?|kes)?\s*([0-9,]+(?:\.[0-9]{1,2})?)"""
    )

    // Direction signals
    private val CREDIT_RE   = Regex("""(?i)\b(?:received?|credited?|deposited?|deposit|credit)\b""")
    private val DEBIT_RE    = Regex("""(?i)\b(?:sent|paid|payment|debited?|deducted?|purchas\w+|bought)\b""")
    private val TRANSFER_RE = Regex("""(?i)\btransferred?\b""")
    private val WITHDRAW_RE = Regex("""(?i)\b(?:withdraw[an]l?|cash\s*out|atm)\b""")
    private val PAYBILL_RE  = Regex("""(?i)\b(?:paybill|pay\s*bill|utility|merchant|buy\s+goods|airtime)\b""")

    // Counterparty extraction — name ends at a parenthesis, "on DATE", or a
    // currency marker
    private val FROM_RE     = Regex("""(?i)\bfrom\s+([A-Za-z][A-Za-z0-9 .&'\/\-]{1,40})""")
    private val TO_RE       = Regex("""(?i)\bto\s+([A-Za-z][A-Za-z0-9 .&'\/\-]{1,40})""")
    // Strip trailing noise from extracted counterparty
    private val PARTY_TAIL  = Regex("""(?i)\s*(?:\(.*|\bon\s+\d|\bat\s+\d|ref|txn|trans|balance|bal\b|your|k\.?shs?|kes|\d{5,}).*$""")

    override fun canParse(body: String, sender: String): Boolean {
        val detection = InstitutionDetector.detect(sender, body) ?: return false
        return detection.institutionId != "mpesa" && detection.institutionId != "airtel"
    }

    override fun parse(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult {
        val instId = InstitutionDetector.detect(sender, body)?.institutionId ?: "bank"

        val amount = AMOUNT_RE.find(body)
            ?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
            ?: return SmsParser.SmsParseResult.Error(
                SmsParser.SmsParseError("no_amount", body, receivedAtMs)
            )
        if (amount <= 0) return SmsParser.SmsParseResult.Error(
            SmsParser.SmsParseError("zero_amount", body, receivedAtMs)
        )

        val refRaw  = REF_RE.find(body)?.groupValues?.get(1)?.trim()
        val balance = BALANCE_RE.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
        val fee     = FEE_RE.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

        val isCredit   = CREDIT_RE.containsMatchIn(body)
        val isDebit    = DEBIT_RE.containsMatchIn(body) || TRANSFER_RE.containsMatchIn(body)
        val isWithdraw = WITHDRAW_RE.containsMatchIn(body)
        val isPaybill  = PAYBILL_RE.containsMatchIn(body)

        val category = when {
            isCredit && !isDebit -> SmsParserConfig.SmsCategory.RECEIVED
            isWithdraw           -> SmsParserConfig.SmsCategory.WITHDRAW
            isPaybill && isDebit -> SmsParserConfig.SmsCategory.PAYBILL
            isDebit              -> SmsParserConfig.SmsCategory.SENT
            else                 -> SmsParserConfig.SmsCategory.UNKNOWN
        }

        val counterparty = when {
            isCredit -> FROM_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
            isDebit  -> TO_RE.find(body)?.groupValues?.get(1)?.let { cleanParty(it) }
            else     -> null
        }

        val fieldCount = listOfNotNull(refRaw, balance, counterparty).size
        val confidence = when {
            fieldCount >= 2 && (isCredit || isDebit) -> SmsParserConfig.Confidence.HIGH
            fieldCount >= 1 && (isCredit || isDebit) -> SmsParserConfig.Confidence.MEDIUM
            isCredit || isDebit                       -> SmsParserConfig.Confidence.MEDIUM
            else                                      -> SmsParserConfig.Confidence.LOW
        }
        val route = when (confidence) {
            SmsParserConfig.Confidence.HIGH   -> SmsParser.ParseRoute.DIRECT
            SmsParserConfig.Confidence.MEDIUM -> SmsParser.ParseRoute.REVIEW
            SmsParserConfig.Confidence.LOW    -> SmsParser.ParseRoute.QUARANTINE
        }

        val sourceHash  = SmsParser.sha256(SmsParser.normalizeForHash(body))
        // Synthetic ref when no reference label found: institution + amount + minute bucket.
        // Minute-precision prevents false dedup of same-amount transactions 60s apart.
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
            )
        )
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
            else                                 -> "$bank Transaction $amtStr"
        }
    }
}
