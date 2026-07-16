package com.lifeos.sms

object ParserPipeline {

    // Specific parsers matched by exact institutionId from InstitutionDetector.
    // Add new institution-specific parsers here only when their format is
    // materially different from GenericBankParser (e.g. a non-KES currency,
    // a proprietary ref prefix, or a unique message structure).
    private val specificParsers: List<FinancialSmsParser> = listOf(
        MpesaParser,
        AirtelMoneyParser,
    )

    fun process(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult {
        val detection = InstitutionDetector.detect(sender, body)

        if (detection != null) {
            // 1. Try exact-match specific parser (M-Pesa, Airtel Money)
            val specific = specificParsers.find { it.institutionId == detection.institutionId }
            if (specific != null && specific.canParse(body, sender)) {
                return specific.parse(body, sender, receivedAtMs)
            }

            // 2. Semantic fallback for all other banks (KCB, Equity, Co-op, NCBA…)
            if (GenericBankParser.canParse(body, sender)) {
                return GenericBankParser.parse(body, sender, receivedAtMs)
            }
        }

        // 3. Body-keyword last resort — catches edge cases where the sender ID
        // wasn't recognised but the body clearly belongs to a known parser
        for (parser in specificParsers) {
            if (parser.canParse(body, sender)) {
                return parser.parse(body, sender, receivedAtMs)
            }
        }

        return SmsParser.SmsParseResult.Error(
            SmsParser.SmsParseError("not_financial", body)
        )
    }
}
