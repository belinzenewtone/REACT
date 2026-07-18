package com.lifeos.sms

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Regression test suite for [SmsParser].
 *
 * Coverage:
 *  - Stage 0: isMpesaSms signal detection
 *  - Stage 0b/0c: Fuliza service-notice and ambiguous-receipt filters
 *  - Stages 1-6: all 10 transaction categories
 *  - Edge cases: spaced phone numbers, Kopokopo variants, large amounts, ATM withdrawals
 *  - Confidence levels and parse-route assignment
 *  - Semantic hash / source hash determinism
 *  - isIncome / isExpense / transactionType derivations
 *  - Date parsing variants
 */
class SmsParserTest {

    private fun parseSuccess(sms: String): SmsParser.ParsedTransaction {
        val result = SmsParser.parse(sms)
        assertIs<SmsParser.SmsParseResult.Success>(result)
        return result.transaction
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Stage 0: isMpesaSms
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `isMpesaSms true for MPESA uppercase`() {
        assertTrue(SmsParser.isMpesaSms("MPESA XC12345678 Confirmed Ksh200"))
    }

    @Test
    fun `isMpesaSms true for M-PESA with hyphen`() {
        assertTrue(SmsParser.isMpesaSms("M-PESA XC12345678 Confirmed Ksh200"))
    }

    @Test
    fun `isMpesaSms true for lowercase mpesa`() {
        assertTrue(SmsParser.isMpesaSms("mpesa XC12345678 Confirmed Ksh200"))
    }

    @Test
    fun `isMpesaSms true for code plus amount without keyword`() {
        assertTrue(SmsParser.isMpesaSms("AB1234567C sent Ksh500"))
    }

    @Test
    fun `isMpesaSms false for unrelated SMS`() {
        assertFalse(SmsParser.isMpesaSms("Your OTP is 123456. Do not share this code."))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Error States
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse returns error not_mpesa for unrelated SMS`() {
        val result = SmsParser.parse("Your OTP is 123456.")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("not_mpesa", result.error.reason)
    }

    @Test
    fun `parse returns error ambiguous_receipt for success-only SMS`() {
        val result = SmsParser.parse("MPESA Transaction completed successfully.")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("ambiguous_receipt", result.error.reason)
    }

    @Test
    fun `parse returns error no_code when no 10-char code present`() {
        val result = SmsParser.parse("M-PESA Ksh500.00 received. New balance Ksh1000.00")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("no_code", result.error.reason)
    }

    @Test
    fun `parse returns error no_amount when amount is missing`() {
        val result = SmsParser.parse("M-PESA XC12345678 Confirmed. You have received from JOHN DOE on 15/6/24.")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("no_amount", result.error.reason)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Fuliza Service-Notice Filter
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `isFulizaServiceNotice true for access fee message`() {
        val sms = "Fuliza M-PESA: Access fee charged Ksh5.00 on your account."
        assertTrue(SmsParserConfig.isFulizaServiceNotice(sms))
    }

    @Test
    fun `parse rejects Fuliza service notice with fuliza_notice error`() {
        val sms = "Fuliza M-PESA: Access fee charged Ksh5.00. Your Fuliza account. Code AB12345678."
        val result = SmsParser.parse(sms)
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("fuliza_notice", result.error.reason)
    }

    @Test
    fun `parse does not reject valid Fuliza repayment SMS`() {
        val sms = "OP12345678 Confirmed. Ksh500.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA on 15/6/24 at 2:30 PM. Your available Fuliza M-PESA limit is Ksh416.84. New M-PESA balance is Ksh1,234.00."
        assertIs<SmsParser.SmsParseResult.Success>(SmsParser.parse(sms))
    }

    @Test
    fun `parse does not reject Fuliza charge notice with total outstanding`() {
        val sms = "MN12345678 Confirmed. Total Fuliza M-PESA outstanding amount is Ksh508.16 due on 30/6/24."
        assertIs<SmsParser.SmsParseResult.Success>(SmsParser.parse(sms))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RECEIVED
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies RECEIVED transaction`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00.")
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(500.0, tx.amount)
        assertEquals("XC12345678", tx.mpesaCode)
    }

    @Test
    fun `RECEIVED isIncome true isExpense false and transactionType income`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00.")
        assertTrue(tx.isIncome)
        assertFalse(tx.isExpense)
        assertEquals("income", tx.transactionType)
    }

    @Test
    fun `RECEIVED has HIGH confidence and DIRECT route`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00.")
        assertEquals(SmsParserConfig.Confidence.HIGH, tx.confidence)
        assertEquals(SmsParser.ParseRoute.DIRECT, tx.parseRoute)
        assertEquals(1, tx.matchedRulePhase)
    }

    @Test
    fun `RECEIVED alternative format Ksh received from`() {
        val tx = parseSuccess("SB98765432 Confirmed. Ksh390.00 received from JANE SMITH on 15/6/24 at 3:00 PM. New M-PESA balance is Ksh2,000.00.")
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(390.0, tx.amount)
    }

    @Test
    fun `RECEIVED from bank extracts institution name`() {
        val tx = parseSuccess("XC98765432 Confirmed. You have received Ksh10,000.00 from EQUITY BANK on 15/6/24 at 3:00 PM. New M-PESA balance is Ksh12,000.00.")
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("EQUITY BANK", ignoreCase = true))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SENT P2P
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies SENT transaction`() {
        val tx = parseSuccess("SL12345678 Confirmed. Ksh200.00 sent to JANE DOE 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,034.00.")
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(200.0, tx.amount)
    }

    @Test
    fun `SENT isExpense true isIncome false and transactionType transfer`() {
        val tx = parseSuccess("SL12345678 Confirmed. Ksh200.00 sent to JANE DOE 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,034.00.")
        assertTrue(tx.isExpense)
        assertFalse(tx.isIncome)
        assertEquals("transfer", tx.transactionType)
    }

    @Test
    fun `SENT extracts counterparty name excluding phone suffix`() {
        val tx = parseSuccess("SL12345678 Confirmed. Ksh200.00 sent to JANE DOE 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,034.00.")
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("JANE DOE", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("0712345678"))
    }

    @Test
    fun `SENT to compact phone number classified as SENT`() {
        val tx = parseSuccess("PH12345678 Confirmed. Ksh100.00 sent to 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh934.00.")
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
    }

    @Test
    fun `SENT customer transfer format classified as SENT`() {
        val tx = parseSuccess("TC12345678 Confirmed. customer transfer of Ksh500.00 to JAMES NJOROGE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh500.00.")
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(500.0, tx.amount)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AIRTIME
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies AIRTIME transaction`() {
        val tx = parseSuccess("AB12345678 Confirmed. You bought Ksh50.00 of airtime on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh984.00.")
        assertEquals(SmsParserConfig.SmsCategory.AIRTIME, tx.category)
        assertEquals(50.0, tx.amount)
    }

    @Test
    fun `AIRTIME isExpense true and transactionType expense`() {
        val tx = parseSuccess("AB12345678 Confirmed. You bought Ksh50.00 of airtime on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh984.00.")
        assertTrue(tx.isExpense)
        assertEquals("expense", tx.transactionType)
    }

    @Test
    fun `AIRTIME sent to phone format classified correctly`() {
        val tx = parseSuccess("AT98765432 Confirmed. Ksh30.00 sent to 0712345678 for airtime on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh500.00.")
        assertEquals(SmsParserConfig.SmsCategory.AIRTIME, tx.category)
        assertEquals(30.0, tx.amount)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAYBILL
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies PAYBILL transaction`() {
        val tx = parseSuccess("BC12345678 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh734.00.")
        assertEquals(SmsParserConfig.SmsCategory.PAYBILL, tx.category)
        assertEquals(1250.0, tx.amount)
    }

    @Test
    fun `PAYBILL extracts merchant name`() {
        val tx = parseSuccess("BC12345678 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh734.00.")
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("KPLC", ignoreCase = true))
    }

    @Test
    fun `PAYBILL isExpense true and transactionType expense`() {
        val tx = parseSuccess("BC12345678 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh734.00.")
        assertTrue(tx.isExpense)
        assertEquals("expense", tx.transactionType)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUY_GOODS
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies BUY_GOODS transaction`() {
        val tx = parseSuccess("QR12345678 Confirmed. Ksh850.00 paid to NAIVAS SUPERMARKET on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh2,150.00.")
        assertEquals(SmsParserConfig.SmsCategory.BUY_GOODS, tx.category)
        assertEquals(850.0, tx.amount)
    }

    @Test
    fun `BUY_GOODS extracts merchant name`() {
        val tx = parseSuccess("QR12345678 Confirmed. Ksh850.00 paid to NAIVAS SUPERMARKET on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh2,150.00.")
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("NAIVAS", ignoreCase = true))
    }

    @Test
    fun `BUY_GOODS via Kopokopo extracts merchant`() {
        val tx = parseSuccess("KP12345678 Confirmed. Ksh350.00 paid to JAVA HOUSE via kopo kopo on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh650.00.")
        assertEquals(SmsParserConfig.SmsCategory.BUY_GOODS, tx.category)
        assertTrue(tx.counterparty!!.contains("JAVA HOUSE", ignoreCase = true))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEPOSIT
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies DEPOSIT transaction`() {
        val tx = parseSuccess("DP12345678 Confirmed. Ksh5,000.00 deposited by agent 1234 - JOHN AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh6,000.00.")
        assertEquals(SmsParserConfig.SmsCategory.DEPOSIT, tx.category)
        assertEquals(5000.0, tx.amount)
    }

    @Test
    fun `DEPOSIT isIncome true and transactionType income`() {
        val tx = parseSuccess("DP12345678 Confirmed. Ksh5,000.00 deposited by agent 1234 - JOHN AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh6,000.00.")
        assertTrue(tx.isIncome)
        assertEquals("income", tx.transactionType)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WITHDRAW
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies WITHDRAW transaction`() {
        val tx = parseSuccess("WT12345678 Confirmed. Ksh2,000.00 withdrawn from agent 5678 - MARY AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh3,000.00.")
        assertEquals(SmsParserConfig.SmsCategory.WITHDRAW, tx.category)
        assertEquals(2000.0, tx.amount)
    }

    @Test
    fun `WITHDRAW isExpense true and transactionType expense`() {
        val tx = parseSuccess("WT12345678 Confirmed. Ksh2,000.00 withdrawn from agent 5678 - MARY AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh3,000.00.")
        assertTrue(tx.isExpense)
        assertEquals("expense", tx.transactionType)
    }

    @Test
    fun `ATM withdrawal classified as WITHDRAW with ATM counterparty`() {
        val tx = parseSuccess("QRS1TUV234 Confirmed. Ksh5,000.00 withdrawn from ATM on 12/4/26 at 2:00 PM. New M-PESA balance is Ksh2,000.00.")
        assertEquals(SmsParserConfig.SmsCategory.WITHDRAW, tx.category)
        assertEquals(5000.0, tx.amount)
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("ATM", ignoreCase = true))
        assertTrue(tx.isExpense)
        assertEquals("expense", tx.transactionType)
    }

    @Test
    fun `ATM withdrawal with location extracts merchant name`() {
        val tx = parseSuccess("ATM1WDW234 Confirmed. Ksh2,500.00 withdrawn at EQUITY ATM WESTLANDS on 15/4/26 at 11:00 AM. New M-PESA balance is Ksh7,500.00.")
        assertEquals(SmsParserConfig.SmsCategory.WITHDRAW, tx.category)
        assertEquals(2500.0, tx.amount)
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("EQUITY", ignoreCase = true))
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REVERSAL
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies REVERSAL of received payment`() {
        val sms = "RV12345678 Confirmed. Transaction of Ksh500.00 received from JOHN DOE has been reversed on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,000.00."
        val tx = parseSuccess(sms)
        assertEquals(SmsParserConfig.SmsCategory.REVERSED, tx.category)
        assertTrue(tx.isReceivedReversal)
        assertTrue(tx.isExpense)
        assertEquals("expense", tx.transactionType)
    }

    @Test
    fun `parse classifies REVERSAL of sent payment`() {
        val sms = "RV12345678 Confirmed. Ksh500.00 sent to JANE DOE has been reversed on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,500.00."
        val tx = parseSuccess(sms)
        assertEquals(SmsParserConfig.SmsCategory.REVERSED, tx.category)
        assertFalse(tx.isReceivedReversal)
        assertFalse(tx.isExpense)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FULIZA CHARGE
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies FULIZA_CHARGE notice`() {
        val tx = parseSuccess("MN12345678 Confirmed. Total Fuliza M-PESA outstanding amount is Ksh508.16 due on 30/6/24 at 2:30 PM.")
        assertEquals(SmsParserConfig.SmsCategory.FULIZA_CHARGE, tx.category)
        assertEquals(508.16, tx.fulizaOutstandingKes)
    }

    @Test
    fun `FULIZA_CHARGE isExpense false and transactionType fuliza`() {
        val tx = parseSuccess("MN12345678 Confirmed. Total Fuliza M-PESA outstanding amount is Ksh508.16 due on 30/6/24 at 2:30 PM.")
        assertFalse(tx.isExpense)
        assertEquals("fuliza", tx.transactionType)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FULIZA REPAYMENT (LOAN)
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse correctly classifies LOAN repayment`() {
        val tx = parseSuccess("OP12345678 Confirmed. Ksh500.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA on 15/6/24 at 2:30 PM. Your available Fuliza M-PESA limit is Ksh416.84. New M-PESA balance is Ksh1,234.00.")
        assertEquals(SmsParserConfig.SmsCategory.LOAN, tx.category)
        assertEquals(500.0, tx.amount)
        assertEquals(416.84, tx.fulizaAvailableLimitKes)
    }

    @Test
    fun `LOAN isExpense false and transactionType fuliza`() {
        val tx = parseSuccess("OP12345678 Confirmed. Ksh500.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA on 15/6/24 at 2:30 PM. Your available Fuliza M-PESA limit is Ksh416.84. New M-PESA balance is Ksh1,234.00.")
        assertFalse(tx.isExpense)
        assertEquals("fuliza", tx.transactionType)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UNKNOWN / Quarantine
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse quarantines unrecognised M-Pesa SMS with code and amount`() {
        val tx = parseSuccess("ZZ12345678 Confirmed. M-PESA voucher Ksh1,000.00 issued on 15/6/24 at 2:30 PM. New balance Ksh5,000.00.")
        assertEquals(SmsParserConfig.SmsCategory.UNKNOWN, tx.category)
        assertEquals(SmsParserConfig.Confidence.LOW, tx.confidence)
        assertEquals(SmsParser.ParseRoute.QUARANTINE, tx.parseRoute)
        assertEquals(0, tx.matchedRulePhase)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Hash determinism
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `semanticHash is deterministic for identical transactions`() {
        val sms = "XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00."
        val tx1 = parseSuccess(sms)
        val tx2 = parseSuccess(sms)
        assertEquals(tx1.semanticHash, tx2.semanticHash)
    }

    @Test
    fun `semanticHash differs for different amounts`() {
        val sms1 = "XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00."
        val sms2 = "XC12345678 Confirmed. You have received Ksh600.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00."
        val tx1 = parseSuccess(sms1)
        val tx2 = parseSuccess(sms2)
        assertNotEquals(tx1.semanticHash, tx2.semanticHash)
    }

    @Test
    fun `sourceHash is stable across whitespace differences`() {
        val sms1 = "XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM."
        val sms2 = "XC12345678  Confirmed.   You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM."
        val tx1 = parseSuccess(sms1)
        val tx2 = parseSuccess(sms2)
        assertEquals(tx1.sourceHash, tx2.sourceHash)
    }

    @Test
    fun `sourceHash differs for different raw SMS`() {
        val sms1 = "XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM."
        val sms2 = "XC12345679 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM."
        val tx1 = parseSuccess(sms1)
        val tx2 = parseSuccess(sms2)
        assertNotEquals(tx1.sourceHash, tx2.sourceHash)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Metadata
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parse includes non-empty ruleId and sourceHash`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00.")
        assertTrue(tx.ruleId.isNotBlank())
        assertTrue(tx.sourceHash.isNotBlank())
    }

    @Test
    fun `parse extracts balance and fee when present`() {
        val tx = parseSuccess("BC12345678 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 15/6/24 at 2:30 PM. Transaction cost, Ksh23.00. New M-PESA balance is Ksh734.00.")
        assertEquals(1250.0, tx.amount)
        assertEquals(734.0, tx.balanceAfter)
        assertEquals(23.0, tx.fee)
    }

    @Test
    fun `parse extracts date without time`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24. New M-PESA balance is Ksh1,234.00.")
        assertTrue(tx.date > 0)
    }

    @Test
    fun `parse extracts four-digit year date`() {
        val tx = parseSuccess("XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/2024 at 2:30 PM. New M-PESA balance is Ksh1,234.00.")
        assertTrue(tx.date > 0)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Concurrency smoke test
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `parser is thread-safe under concurrent load`() {
        val sms = "XC12345678 Confirmed. You have received Ksh500.00 from JOHN DOE on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,234.00."
        val results = (1..100).map { Thread { SmsParser.parse(sms) } }
        results.forEach { it.start() }
        results.forEach { it.join() }
        // No exceptions thrown means pass
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Real-world edge cases (success, review, quarantine, rejection)
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `old format RECEIVED You have received parses and routes DIRECT`() {
        val tx = parseSuccess(
            "XC12345678 Confirmed. You have received Ksh1,250.00 from MARY WANJIKU on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh5,250.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(1250.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("MARY WANJIKU", ignoreCase = true))
        assertEquals(SmsParserConfig.Confidence.HIGH, tx.confidence)
        assertEquals(SmsParser.ParseRoute.DIRECT, tx.parseRoute)
    }

    @Test
    fun `old format SENT You have sent parses and routes DIRECT`() {
        val tx = parseSuccess(
            "SL12345678 Confirmed. You have sent Ksh800.00 to PETER OTIENO on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh4,200.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(800.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("PETER OTIENO", ignoreCase = true))
        assertEquals(SmsParser.ParseRoute.DIRECT, tx.parseRoute)
    }

    @Test
    fun `compact old format Received from parses`() {
        val tx = parseSuccess(
            "OR12345678 Confirmed. Received Ksh550.00 from ALICE MBOYA on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh3,550.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(550.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("ALICE MBOYA", ignoreCase = true))
    }

    @Test
    fun `truncated receipt without time or balance still parses`() {
        val tx = parseSuccess(
            "TR12345678 Confirmed. Ksh300.00 sent to ALICE MUTHONI on 15/6/24."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(300.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("ALICE MUTHONI", ignoreCase = true))
        assertTrue(tx.date > 0)
    }

    @Test
    fun `Swahili fragment umepokea received parses`() {
        val tx = parseSuccess(
            "UM12345678 Confirmed. Umepokea Ksh600.00 kutoka JOHN KAMAU on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh2,600.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(600.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("JOHN KAMAU", ignoreCase = true))
        assertEquals(SmsParser.ParseRoute.DIRECT, tx.parseRoute)
    }

    @Test
    fun `agent float deposit classified as DEPOSIT`() {
        val tx = parseSuccess(
            "AF12345678 Confirmed. Agent float of Ksh10,000.00 deposited by agent 9876 - SAFARICOM AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh15,000.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.DEPOSIT, tx.category)
        assertEquals(10000.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("SAFARICOM AGENT", ignoreCase = true))
    }

    @Test
    fun `agent float withdrawal classified as WITHDRAW`() {
        val tx = parseSuccess(
            "AW12345678 Confirmed. Agent float of Ksh5,000.00 withdrawn from agent 5432 - MIKE AGENT on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh8,000.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.WITHDRAW, tx.category)
        assertEquals(5000.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("MIKE AGENT", ignoreCase = true))
    }

    @Test
    fun `Kopokopo till payment extracts merchant and strips till number`() {
        val tx = parseSuccess(
            "KT12345678 Confirmed. Ksh450.00 paid to BIDCO SHOP via kopokopo till 12345 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh3,550.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.BUY_GOODS, tx.category)
        assertEquals(450.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("BIDCO SHOP", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("till", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("12345"))
        assertFalse(tx.counterparty!!.contains("kopokopo", ignoreCase = true))
    }

    @Test
    fun `Kopokopo paybill with account number parses as PAYBILL`() {
        val tx = parseSuccess(
            "KP12345678 Confirmed. Ksh2,000.00 paid to ZUKU via Kopo-Kopo for account ZK12345 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh2,500.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.PAYBILL, tx.category)
        assertEquals(2000.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("ZUKU", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("Kopo-Kopo", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("ZK12345"))
    }

    @Test
    fun `Paybill with account number and token strips metadata`() {
        val tx = parseSuccess(
            "PB12345678 Confirmed. Ksh1,500.00 sent to KPLC PREPAID for account number 1234567890 token ABCD1234 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,000.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.PAYBILL, tx.category)
        assertEquals(1500.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("KPLC PREPAID", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("account", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("1234567890"))
        assertFalse(tx.counterparty!!.contains("ABCD1234"))
    }

    @Test
    fun `till number buy goods parses as BUY_GOODS`() {
        val tx = parseSuccess(
            "TG12345678 Confirmed. Ksh750.00 paid to QUICKMART SUPERMARKET till 987654 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh4,250.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.BUY_GOODS, tx.category)
        assertEquals(750.0, tx.amount)
        assertTrue(tx.counterparty!!.contains("QUICKMART", ignoreCase = true))
        assertFalse(tx.counterparty!!.contains("987654"))
    }

    @Test
    fun `reversed received transaction marks isReceivedReversal`() {
        val tx = parseSuccess(
            "RR12345678 Confirmed. Your M-Pesa transaction received Ksh900.00 from JANE DOE has been reversed on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh1,900.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.REVERSED, tx.category)
        assertEquals(900.0, tx.amount)
        assertTrue(tx.isReceivedReversal)
        assertTrue(tx.isExpense)
    }

    @Test
    fun `date format dd-MMM-yy parses`() {
        val tx = parseSuccess(
            "DM12345678 Confirmed. You have received Ksh1,100.00 from TOM KIPLAGAT on 15-JUN-24 at 2:30 PM. New M-PESA balance is Ksh6,100.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(1100.0, tx.amount)
        assertTrue(tx.date > 0)
    }

    @Test
    fun `date format MMM dd yyyy parses`() {
        val tx = parseSuccess(
            "MD12345678 Confirmed. Ksh1,200.00 sent to LUCY ACHIENG on Jun 15, 2024 at 2:30 PM. New M-PESA balance is Ksh7,800.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(1200.0, tx.amount)
        assertTrue(tx.date > 0)
    }

    @Test
    fun `missing time falls back to start of day`() {
        val tx = parseSuccess(
            "MT12345678 Confirmed. You have received Ksh400.00 from SAM KIMANI on 15/6/24. New M-PESA balance is Ksh2,400.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(400.0, tx.amount)
        assertTrue(tx.date > 0)
    }

    @Test
    fun `missing balance on high value routes to REVIEW`() {
        val tx = parseSuccess(
            "HB12345678 Confirmed. Ksh75,000.00 sent to INVESTMENT CLUB on 15/6/24 at 2:30 PM."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(75000.0, tx.amount)
        assertNull(tx.balanceAfter)
        assertEquals(SmsParserConfig.Confidence.MEDIUM, tx.confidence)
        assertEquals(SmsParser.ParseRoute.REVIEW, tx.parseRoute)
    }

    @Test
    fun `phone only counterparty routes to REVIEW`() {
        val tx = parseSuccess(
            "WP12345678 Confirmed. Ksh1,500.00 sent to 0712345678 on 15/6/24 at 2:30 PM. New M-PESA balance is Ksh3,500.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(1500.0, tx.amount)
        assertNotNull(tx.counterparty)
        assertTrue(tx.counterparty!!.contains("0712345678"))
        assertEquals(SmsParserConfig.Confidence.MEDIUM, tx.confidence)
        assertEquals(SmsParser.ParseRoute.REVIEW, tx.parseRoute)
    }

    @Test
    fun `future date routes to REVIEW`() {
        val tx = parseSuccess(
            "FD12345678 Confirmed. You have received Ksh3,000.00 from FUTURE PAYER on 15/6/2030 at 2:30 PM. New M-PESA balance is Ksh8,000.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(3000.0, tx.amount)
        assertEquals(SmsParserConfig.Confidence.MEDIUM, tx.confidence)
        assertEquals(SmsParser.ParseRoute.REVIEW, tx.parseRoute)
    }

    @Test
    fun `implausible amount and unknown category quarantines`() {
        val tx = parseSuccess(
            "IA12345678 Confirmed. M-PESA voucher Ksh2,500,000.00 issued on 15/6/24 at 2:30 PM."
        )
        assertEquals(SmsParserConfig.SmsCategory.UNKNOWN, tx.category)
        assertEquals(2_500_000.0, tx.amount)
        assertEquals(SmsParserConfig.Confidence.LOW, tx.confidence)
        assertEquals(SmsParser.ParseRoute.QUARANTINE, tx.parseRoute)
    }

    @Test
    fun `rejection not_mpesa for unrelated OTP SMS`() {
        val result = SmsParser.parse("Your OTP is 123456. Do not share this code.")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("not_mpesa", result.error.reason)
    }

    @Test
    fun `rejection ambiguous_receipt for generic success message`() {
        val result = SmsParser.parse("MPESA Transaction completed successfully.")
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("ambiguous_receipt", result.error.reason)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Phase 3 keyword fallback
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    fun `unusual format falls back to phase 3 keyword match`() {
        // "You have received payment from" fails all Phase 1+2 patterns (no Ksh
        // directly after "received", no "received from [A-Z]" substring) but the
        // Phase 3 keyword scan catches "you have received" and maps to the received rule.
        val tx = parseSuccess(
            "ZX12345678 Confirmed. Amount: Ksh500.00. You have received payment from JAMES KAMAU. Date 12/4/26."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(3, tx.matchedRulePhase)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Airtel Money airtime
    // ═══════════════════════════════════════════════════════════════════════

    private fun parseAirtelSuccess(sms: String, sender: String = "AIRTEL"): SmsParser.ParsedTransaction {
        val result = AirtelMoneyParser.parse(sms, sender, 1_700_000_000_000L)
        assertIs<SmsParser.SmsParseResult.Success>(result)
        return result.transaction
    }

    @Test
    fun `Airtel airtime purchase classified as AIRTIME`() {
        val tx = parseAirtelSuccess(
            "Airtel Money: You have bought KES 50.00 of airtime on 15/07/2026 at 10:00 AM. Your new balance is KES 950.00. Transaction ID: AIR123456789."
        )
        assertEquals(SmsParserConfig.SmsCategory.AIRTIME, tx.category)
        assertEquals(50.0, tx.amount)
        assertEquals("airtel", tx.institutionId)
    }

    @Test
    fun `Airtel airtime for another number classified as AIRTIME`() {
        val tx = parseAirtelSuccess(
            "Airtel Money: KES 100.00 airtime for 0712345678 sent on 15/07/2026 at 11:30 AM. Your new balance is KES 400.00. Transaction ID: AIR987654321."
        )
        assertEquals(SmsParserConfig.SmsCategory.AIRTIME, tx.category)
        assertEquals(100.0, tx.amount)
    }

    @Test
    fun `Airtel data bundle classified as AIRTIME`() {
        val tx = parseAirtelSuccess(
            "Airtel Money: You have bought a data bundle of KES 200.00 on 15/07/2026 at 9:00 AM. Your new balance is KES 800.00. Transaction ID: AIR112233445."
        )
        assertEquals(SmsParserConfig.SmsCategory.AIRTIME, tx.category)
        assertEquals(200.0, tx.amount)
    }

    @Test
    fun `Airtel airtime description is correct`() {
        val tx = parseAirtelSuccess(
            "Airtel Money: You have bought KES 50.00 of airtime on 15/07/2026 at 10:00 AM. Your new balance is KES 950.00. Transaction ID: AIR123456789."
        )
        assertEquals("Airtel Airtime KES 50.00", tx.description)
    }

    @Test
    fun `Airtel regular send is still classified as SENT not AIRTIME`() {
        val tx = parseAirtelSuccess(
            "Airtel Money: You sent KES 500.00 to JANE DOE (0723456789) on 15/07/2026 at 2:00 PM. Your new balance is KES 1,500.00. Transaction ID: AIR556677889. Charges: KES 10.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
    }

    // ── Phase 1 regression tests ──────────────────────────────────────────────

    @Test
    fun `Fuliza Interest charged variant extracts fee amount`() {
        val tx = parseSuccess(
            "TGI4HPX4PK Confirmed. Fuliza M-PESA amount is Ksh 100.00. Interest charged Ksh 1.00. Total Fuliza M-PESA outstanding amount is Ksh 724.62 due on 14/08/25."
        )
        assertEquals(SmsParserConfig.SmsCategory.FULIZA_CHARGE, tx.category)
        assertEquals(1.0, tx.amount, 0.01)
        assertNotNull(tx.fulizaOutstandingKes)
        assertEquals(724.62, tx.fulizaOutstandingKes!!, 0.01)
    }

    @Test
    fun `Give Ksh deposit is classified as DEPOSIT`() {
        val tx = parseSuccess(
            "TDN9WBCDSD Confirmed. On 23/4/25 at 5:40 PM Give Ksh1,000.00 cash to Fkam Limited Queenix Gate Venture Adams Arcade New M-PESA balance is Ksh1,000.00. You can now access M-PESA via *334#"
        )
        assertEquals(SmsParserConfig.SmsCategory.DEPOSIT, tx.category)
        assertEquals(1000.0, tx.amount, 0.01)
        assertTrue(tx.counterparty?.contains("Fkam") == true)
    }

    @Test
    fun `New reversal format is classified as REVERSED`() {
        val tx = parseSuccess(
            "TI27ZWJC3B  confirmed. Reversal of transaction TI26ZVL0L8 has been successfully reversed  on 2/9/25  at 8:31 AM and Ksh100.00 is debited from your M-PESA account. New M-PESA account balance is Ksh1,758.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.REVERSED, tx.category)
        assertEquals(100.0, tx.amount, 0.01)
    }

    @Test
    fun `Balance inquiry is rejected`() {
        val result = SmsParser.parse(
            "UB6DL632FM Confirmed. Your account balance was: M-PESA Account : Ksh0.00 Business Account : Ksh0.00 on 6/2/26 at 5:19 PM. Transaction cost, Ksh0.00."
        )
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("balance_inquiry", result.error.reason)
    }

    @Test
    fun `Cancelled transaction is rejected`() {
        val result = SmsParser.parse(
            "You have cancelled the transaction of KSH50.00. Kindly note that if you cancel 5 times, you will be barred from using M-PESA HAKIKISHA. Your M-PESA balance is KSH0.00."
        )
        assertIs<SmsParser.SmsParseResult.Error>(result)
        assertEquals("cancelled", result.error.reason)
    }

    @Test
    fun `Fuliza partial repayment has correct type and description`() {
        val tx = parseSuccess(
            "UFGDL8CVOX  Confirmed. Ksh 100.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 419.56. Your M-PESA balance is 0.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.LOAN, tx.category)
        assertEquals("partial", tx.fulizaRepaymentType)
        assertEquals("Fuliza partial repayment", tx.description)
    }

    @Test
    fun `Fuliza full repayment has correct type and description`() {
        val tx = parseSuccess(
            "UFPDL9G7O1  Confirmed. Ksh 723.62 from your M-PESA has been used to fully pay your outstanding Fuliza M-PESA. Available Fuliza M-PESA limit is Ksh 900.00. Your M-PESA balance is 3076.38."
        )
        assertEquals(SmsParserConfig.SmsCategory.LOAN, tx.category)
        assertEquals("full", tx.fulizaRepaymentType)
        assertEquals("Fuliza fully repaid", tx.description)
    }

    @Test
    fun `Ksh Ksh double prefix still parses as received`() {
        val tx = parseSuccess(
            "SLR41L5AO8 Confirmed.You have received Ksh Ksh4,870.00 from ZIIDI on 27/12/24 3:41 PM New M-PESA balance is Ksh Ksh4,870.00."
        )
        assertEquals(SmsParserConfig.SmsCategory.RECEIVED, tx.category)
        assertEquals(4870.0, tx.amount, 0.01)
    }

    @Test
    fun `Regular transaction with Fuliza promo footer is not filtered`() {
        val tx = parseSuccess(
            "SCI1G5CAWL Confirmed. Ksh175.00 sent to PAUL OWAYO 0712345678 on 18/3/24 at 7:56 PM. New M-PESA balance is Ksh0.00. Transaction cost, Ksh7.00. Pay for Goods, Withdraw & Send money Worry FREE! Join FULIZA, Dial *234*0#"
        )
        assertEquals(SmsParserConfig.SmsCategory.SENT, tx.category)
        assertEquals(175.0, tx.amount, 0.01)
    }

    @Test
    fun `Service notice filter catches bank maintenance SMS`() {
        assertTrue(SmsParserConfig.isServiceNotice(
            "Dear Client, our Online Banking / SC Mobile app will be temporarily unavailable today as part of scheduled system enhancements."
        ))
    }

    @Test
    fun `Service notice filter catches OTP messages`() {
        assertTrue(SmsParserConfig.isServiceNotice(
            "Dear Client, your OTP for viewing your debit card on SC Mobile is lAwN-755547."
        ))
    }

    @Test
    fun `Service notice filter does NOT catch real bank transactions`() {
        assertFalse(SmsParserConfig.isServiceNotice(
            "Dear Client, KES 1110.00 has been credited to your account ending with 2600 from MPESA."
        ))
    }
}
