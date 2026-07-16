package com.lifeos.sms

object MpesaParser : FinancialSmsParser {
    override val institutionId = "mpesa"
    override val senderIds = setOf("MPESA", "M-PESA", "M_PESA")

    override fun canParse(body: String, sender: String): Boolean =
        SmsParser.isMpesaSms(body) || senderIds.any { sender.uppercase().contains(it) }

    override fun parse(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult {
        val result = SmsParser.parse(body, receivedAtMs)
        if (result is SmsParser.SmsParseResult.Success) {
            return SmsParser.SmsParseResult.Success(
                result.transaction.copy(
                    institutionId = "mpesa",
                    externalRef = result.transaction.mpesaCode,
                    rawSender = sender,
                )
            )
        }
        return result
    }
}
