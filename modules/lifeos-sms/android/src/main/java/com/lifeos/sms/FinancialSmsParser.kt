package com.lifeos.sms

interface FinancialSmsParser {
    val institutionId: String
    val senderIds: Set<String>
    fun canParse(body: String, sender: String): Boolean
    fun parse(body: String, sender: String, receivedAtMs: Long): SmsParser.SmsParseResult
}
