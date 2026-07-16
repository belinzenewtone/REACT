package com.lifeos.sms

/**
 * Parser for Airtel Money Kenya SMS.
 *
 * Confirmed format details (reply.cash developer docs + Airtel Kenya):
 * - Currency label: "KES" — the only Kenyan mobile money service NOT using "Ksh"
 * - Transaction ID prefix: "AIR" followed by digits (e.g. AIR123456789)
 * - Body prefix: "Airtel Money:" on most templates
 * - Balance label: "Your new balance is KES X"
 * - Sender IDs: "Airtel Money", "AIRTEL", "AIRTELMONEY"
 *
 * Example (send):
 *   Airtel Money: You sent KES 1,500.00 to JOHN DOE (0712345678) on 15/12/2024
 *   at 2:30 PM. Your new balance is KES 8,500.00. Transaction ID: AIR123456789.
 *   Charges: KES 15.00.
 *
 * Example (receive):
 *   Airtel Money: You received KES 1,500.00 from JANE SMITH (0723456789) on
 *   15/12/2024 at 2:30 PM. Your new balance is KES 3,200.00.
 *   Transaction ID: AIR123456789.
 */
internal object AirtelMoneyParser : FinancialSmsParser {

    override val institutionId = "airtel"
    override val senderIds = setOf("AIRTEL", "AIRTEL MONEY", "AIRTELMONEY")

    private val AMOUNT_RE  = Regex("""KES\s*([0-9,]+(?:\.[0-9]{1,2})?)""")
    // "Transaction ID: AIR123456789" — case-insensitive label, but AIR prefix preserved
    private val REF_RE     = Regex("""(?i)(?:transaction\s*id|txn\s*id|trans\s*id)[:\s#]+(AIR[0-9]{5,15})""")
    // "Your new balance is KES X" or "balance is KES X" or "new balance KES X"
    private val BALANCE_RE = Regex("""(?i)(?:new\s+)?balance\s+(?:is\s+)?KES\s*([0-9,]+(?:\.[0-9]{1,2})?)""")
    private val FEE_RE     = Regex("""(?i)charges?[:\s]+KES\s*([0-9,]+(?:\.[0-9]{1,2})?)""")

    // Airtel Money names are typically in ALL CAPS before a parenthesised phone
    private val FROM_RE    = Regex("""(?i)\bfrom\s+([A-Za-z][A-Za-z0-9 .\-']{1,35}?)(?:\s*\(|(?:\s+on\s+\d))""")
    private val TO_RE      = Regex("""(?i)\bto\s+([A-Za-z][A-Za-z0-9 .\-']{1,35}?)(?:\s*\(|(?:\s+on\s+\d))""")

    private val CREDIT_RE  = Regex("""(?i)\b(?:received?|credited?|deposit)\b""")
    private val DEBIT_RE   = Regex("""(?i)\b(?:sent|paid|payment|withdraw[an]l?)\b""")
    private val WITHDRAW_RE= Regex("""(?i)\b(?:withdraw[an]l?|cash\s*out|atm)\b""")
    private val PAYBILL_RE = Regex("""(?i)\b(?:paid\s+to|merchant|paybill|buy\s+goods)\b""")

    override fun canParse(body: String, sender: String): Boolean {
        val sUp = sender.trim().uppercase()
        if (sUp.contains("AIRTEL")) return true
        // Body-based signals when sender ID isn't available
        if (body.startsWith("Airtel Money:", ignoreCase = true)) return true
        // KES + AIR prefix combination is unique to Airtel Money
        return body.contains("KES", ignoreCase = false) &&
            (body.contains("AIR", ignoreCase = false) || body.contains("Airtel", ignoreCase = true))
    }

    override fun parse(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult {
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
        val isDebit    = DEBIT_RE.containsMatchIn(body)
        val isWithdraw = WITHDRAW_RE.containsMatchIn(body)
        val isPaybill  = PAYBILL_RE.containsMatchIn(body)

        val category = when {
            isCredit && !isDebit -> SmsParserConfig.SmsCategory.RECEIVED
            isWithdraw           -> SmsParserConfig.SmsCategory.WITHDRAW
            isPaybill            -> SmsParserConfig.SmsCategory.PAYBILL
            isDebit              -> SmsParserConfig.SmsCategory.SENT
            else                 -> SmsParserConfig.SmsCategory.UNKNOWN
        }

        val counterparty = when {
            isCredit -> FROM_RE.find(body)?.groupValues?.get(1)?.trim()
            isDebit  -> TO_RE.find(body)?.groupValues?.get(1)?.trim()
            else     -> null
        }

        val confidence = when {
            refRaw != null && (isCredit || isDebit)            -> SmsParserConfig.Confidence.HIGH
            (balance != null || counterparty != null) &&
                (isCredit || isDebit)                          -> SmsParserConfig.Confidence.MEDIUM
            isCredit || isDebit                                -> SmsParserConfig.Confidence.MEDIUM
            else                                               -> SmsParserConfig.Confidence.LOW
        }
        val route = when (confidence) {
            SmsParserConfig.Confidence.HIGH   -> SmsParser.ParseRoute.DIRECT
            SmsParserConfig.Confidence.MEDIUM -> SmsParser.ParseRoute.REVIEW
            SmsParserConfig.Confidence.LOW    -> SmsParser.ParseRoute.QUARANTINE
        }

        val sourceHash  = SmsParser.sha256(SmsParser.normalizeForHash(body))
        val externalRef = refRaw ?: "airtel:${amount.toLong()}:${receivedAtMs / 60_000}"
        val description = buildDescription(category, amount, counterparty)
        val semanticHash = SmsParser.sha256(
            "airtel|${category.name}|${amount.toLong()}|${receivedAtMs / 60_000}|${counterparty.orEmpty()}"
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
                institutionId = "airtel",
                externalRef  = externalRef,
                currency     = "KES",
                rawSender    = sender,
            )
        )
    }

    private fun buildDescription(
        category: SmsParserConfig.SmsCategory,
        amount: Double,
        counterparty: String?,
    ): String {
        val amtStr = "KES %.2f".format(amount)
        val prep   = if (category == SmsParserConfig.SmsCategory.RECEIVED) "from" else "to"
        val party  = if (!counterparty.isNullOrBlank()) " $prep $counterparty" else ""
        return when (category) {
            SmsParserConfig.SmsCategory.RECEIVED -> "Airtel Money Received $amtStr$party"
            SmsParserConfig.SmsCategory.SENT     -> "Airtel Money Sent $amtStr$party"
            SmsParserConfig.SmsCategory.WITHDRAW -> "Airtel Money Withdrawal $amtStr"
            SmsParserConfig.SmsCategory.PAYBILL  -> "Airtel Money Payment $amtStr$party"
            else                                 -> "Airtel Money $amtStr"
        }
    }
}
