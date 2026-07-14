package com.lifeos.sms

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.fail

/**
 * Corpus-driven accuracy suite: runs [SmsParser] against the 166 real-world /
 * legacy M-Pesa fixtures in [MpesaParserFixtures.kt] (ported from the REACT
 * sibling app's parser test corpus).
 *
 * Complements [SmsParserTest] (behavioral unit tests) with breadth: every
 * message a real device produced must classify, extract, and route correctly.
 *
 * Run: `./gradlew :lifeos-sms:testDebugUnitTest`  (or `npm run test:parser`).
 *
 * Mapping notes (REACT fixture schema → RFINAL semantics):
 *  - expectedKind → SmsParserConfig.SmsCategory (see [KIND_TO_CATEGORY]).
 *  - expectedRoute "direct_ledger" → ParseRoute.DIRECT; "review_queue" →
 *    REVIEW *or better*. A stronger parser routing with MORE confidence than
 *    the reference parser is not a failure.
 *  - expectedConfidence "high" → HIGH; "medium" → HIGH or MEDIUM.
 *  - shouldIgnore: REACT drops Fuliza service notices entirely. RFINAL
 *    deliberately parses ones that carry balances as FULIZA_CHARGE (to track
 *    outstanding) or rejects/quarantines the rest. The invariant asserted here
 *    is the one that matters: they must never land in the ledger as a normal
 *    transaction.
 */
class FixtureCorpusTest {

    companion object {
        private val KIND_TO_CATEGORY = mapOf(
            "received"         to SmsParserConfig.SmsCategory.RECEIVED,
            "sent"             to SmsParserConfig.SmsCategory.SENT,
            "paybill"          to SmsParserConfig.SmsCategory.PAYBILL,
            "buy_goods"        to SmsParserConfig.SmsCategory.BUY_GOODS,
            "airtime"          to SmsParserConfig.SmsCategory.AIRTIME,
            "withdraw"         to SmsParserConfig.SmsCategory.WITHDRAW,
            "deposit"          to SmsParserConfig.SmsCategory.DEPOSIT,
            "reversal"         to SmsParserConfig.SmsCategory.REVERSED,
            "fuliza_charge"    to SmsParserConfig.SmsCategory.FULIZA_CHARGE,
            "fuliza_repayment" to SmsParserConfig.SmsCategory.LOAN,
        )
    }

    @Test
    fun `all fixtures classify extract and route correctly`() {
        val failures = mutableListOf<String>()

        for ((index, fx) in allFixtures.withIndex()) {
            val label = "fixture[$index] '${fx.body.take(60)}…'"
            val result = SmsParser.parse(fx.body)

            if (fx.shouldIgnore) {
                val acceptable = when (result) {
                    is SmsParser.SmsParseResult.Error -> true
                    is SmsParser.SmsParseResult.Success -> {
                        val tx = result.transaction
                        tx.parseRoute == SmsParser.ParseRoute.QUARANTINE ||
                            tx.category == SmsParserConfig.SmsCategory.FULIZA_CHARGE
                    }
                }
                if (!acceptable) failures += "$label: service notice reached the ledger as a normal transaction"
                continue
            }

            // Fixtures that assert a specific parse error (e.g. codeless SMS after H3 fix)
            if (fx.expectedError != null) {
                when (result) {
                    is SmsParser.SmsParseResult.Error ->
                        if (result.error.reason != fx.expectedError)
                            failures += "$label: expected error '${fx.expectedError}' but got '${result.error.reason}'"
                    is SmsParser.SmsParseResult.Success ->
                        failures += "$label: expected error '${fx.expectedError}' but parse succeeded as ${result.transaction.category}"
                }
                continue
            }

            val tx = when (result) {
                is SmsParser.SmsParseResult.Error -> {
                    failures += "$label: parse failed with '${result.error.reason}'"
                    continue
                }
                is SmsParser.SmsParseResult.Success -> result.transaction
            }

            fx.expectedKind?.let { kind ->
                val expected = KIND_TO_CATEGORY[kind]
                if (expected == null) {
                    failures += "$label: unknown fixture kind '$kind'"
                } else if (tx.category != expected) {
                    failures += "$label: category ${tx.category} != $expected"
                }
            }

            fx.expectedAmount?.let { amount ->
                if (Math.abs(tx.amount - amount) > 0.001) {
                    failures += "$label: amount ${tx.amount} != $amount"
                }
            }

            fx.expectedBalance?.let { balance ->
                val actual = tx.balanceAfter
                if (actual == null || Math.abs(actual - balance) > 0.001) {
                    failures += "$label: balance $actual != $balance"
                }
            }

            fx.expectedCounterpartyContains?.let { fragment ->
                val cp = tx.counterparty ?: ""
                if (!cp.contains(fragment, ignoreCase = true)) {
                    failures += "$label: counterparty '$cp' does not contain '$fragment'"
                }
            }

            fx.expectedConfidence?.let { conf ->
                val ok = when (conf) {
                    "high"   -> tx.confidence == SmsParserConfig.Confidence.HIGH
                    "medium" -> tx.confidence != SmsParserConfig.Confidence.LOW
                    else     -> true
                }
                if (!ok) failures += "$label: confidence ${tx.confidence} below expected '$conf'"
            }

            fx.expectedRoute?.let { route ->
                val ok = when (route) {
                    "direct_ledger" -> tx.parseRoute == SmsParser.ParseRoute.DIRECT
                    "review_queue"  -> tx.parseRoute != SmsParser.ParseRoute.QUARANTINE
                    else            -> true
                }
                if (!ok) failures += "$label: route ${tx.parseRoute} below expected '$route'"
            }
        }

        if (failures.isNotEmpty()) {
            fail(
                "${failures.size} assertion(s) failed across ${allFixtures.size} fixtures:\n" +
                    failures.joinToString("\n"),
            )
        }
    }

    @Test
    fun `every classified fixture extracts the leading mpesa code`() {
        for (fx in allFixtures) {
            if (fx.shouldIgnore || fx.expectedKind == null) continue
            val result = SmsParser.parse(fx.body)
            if (result !is SmsParser.SmsParseResult.Success) continue
            val leadingToken = fx.body.trim().split(Regex("\\s+")).first().trimEnd('.', ',')
            if (leadingToken.matches(Regex("[A-Za-z0-9]{9,10}"))) {
                assertEquals(
                    leadingToken.uppercase(),
                    result.transaction.mpesaCode.uppercase(),
                    "code mismatch for: ${fx.body.take(60)}",
                )
            }
        }
    }

    @Test
    fun `corpus parsing is deterministic across repeated runs`() {
        // Same corpus parsed twice must yield identical outcomes — guards
        // against hidden mutable state in the parser singleton.
        fun snapshot(): List<String> = allFixtures.map { fx ->
            when (val r = SmsParser.parse(fx.body)) {
                is SmsParser.SmsParseResult.Error -> "ERR:${r.error.reason}"
                is SmsParser.SmsParseResult.Success ->
                    "${r.transaction.category}:${r.transaction.amount}:${r.transaction.parseRoute}"
            }
        }
        assertEquals(snapshot(), snapshot())
    }

    @Test
    fun `million-scale comma amounts extract exactly`() {
        val result = SmsParser.parse(
            "QAB1CDE2FG Confirmed. You have received Ksh1,234,567.89 from BIG CLIENT LTD on 1/7/26 at 9:00 AM. New M-PESA balance is Ksh1,240,000.00.",
        )
        val tx = (result as? SmsParser.SmsParseResult.Success)?.transaction
            ?: fail("million-scale receive must parse")
        assertEquals(1234567.89, tx.amount, 0.001)
        assertEquals(1240000.0, tx.balanceAfter ?: -1.0, 0.001)
    }

    @Test
    fun `lowercase and 9-char codes are accepted`() {
        val result = SmsParser.parse(
            "sie8qwe12 Confirmed. Ksh100.00 sent to JOHN DOE 0712345678 on 1/7/26 at 9:00 AM. New M-PESA balance is Ksh900.00.",
        )
        val tx = (result as? SmsParser.SmsParseResult.Success)?.transaction
            ?: fail("lowercase 9-char code must be accepted")
        assertEquals(9, tx.mpesaCode.length)
    }
}
