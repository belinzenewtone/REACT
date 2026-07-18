package com.lifeos.sms

object ParserPipeline {

    private val specificParsers: Map<String, FinancialSmsParser> = listOf(
        MpesaParser,
        AirtelMoneyParser,
    ).associateBy { it.institutionId }

    private val specificParserList: Collection<FinancialSmsParser> = specificParsers.values

    fun process(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult {
        val detection = InstitutionDetector.detect(sender, body)

        if (detection != null) {
            // 1. Try exact-match specific parser (M-Pesa, Airtel Money)
            val specific = specificParsers[detection.institutionId]
            if (specific != null && specific.canParse(body, sender)) {
                return specific.parse(body, sender, receivedAtMs)
            }

            // 2. Semantic fallback for all other banks (KCB, Equity, Co-op, NCBA…)
            //    Skip non-transactional SMS (OTPs, maintenance, promos) before parsing.
            if (GenericBankParser.canParse(detection)) {
                if (SmsParserConfig.isServiceNotice(body)) {
                    return SmsParser.SmsParseResult.Error(
                        SmsParser.SmsParseError("service_notice", body)
                    )
                }
                return GenericBankParser.parseWithDetection(body, sender, receivedAtMs, detection)
            }
        }

        // 3. Body-keyword last resort — catches edge cases where the sender ID
        // wasn't recognised but the body clearly belongs to a known parser
        for (parser in specificParserList) {
            if (parser.canParse(body, sender)) {
                return parser.parse(body, sender, receivedAtMs)
            }
        }

        return SmsParser.SmsParseResult.Error(
            SmsParser.SmsParseError("not_financial", body)
        )
    }
}
