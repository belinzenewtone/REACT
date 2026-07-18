package com.lifeos.sms

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class GenericBankParserTest {

    @Test
    fun `InstitutionDetector identifies all bank fixture senders`() {
        val failures = mutableListOf<String>()
        for (fx in allBankFixtures) {
            val det = InstitutionDetector.detect(fx.sender, fx.body)
            if (det == null || det.institutionId != fx.expectedInstitution) {
                failures += "${fx.sender}: expected '${fx.expectedInstitution}' but got '${det?.institutionId}'"
            }
        }
        assertTrue(failures.isEmpty(), "Institution detection failures:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `Service notice filter catches non-transactional bank SMS`() {
        val noticeFixtures = allBankFixtures.filter { it.shouldBeServiceNotice }
        assertTrue(noticeFixtures.isNotEmpty(), "No service notice fixtures defined")
        val failures = mutableListOf<String>()
        for (fx in noticeFixtures) {
            if (!SmsParserConfig.isServiceNotice(fx.body)) {
                failures += "${fx.sender}: expected service notice but filter missed it"
            }
        }
        assertTrue(failures.isEmpty(), "Service notice misses:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `Service notice filter does NOT flag transactional bank SMS`() {
        val txFixtures = allBankFixtures.filter { !it.shouldBeServiceNotice }
        val failures = mutableListOf<String>()
        for (fx in txFixtures) {
            if (SmsParserConfig.isServiceNotice(fx.body)) {
                failures += "${fx.sender}: transactional SMS incorrectly flagged as service notice"
            }
        }
        assertTrue(failures.isEmpty(), "False positives:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `GenericBankParser extracts amounts from transactional bank SMS`() {
        val txFixtures = allBankFixtures.filter { !it.shouldBeServiceNotice && it.expectedAmount != null }
        assertTrue(txFixtures.isNotEmpty(), "No transactional fixtures with expected amounts")
        val failures = mutableListOf<String>()

        for (fx in txFixtures) {
            val det = InstitutionDetector.detect(fx.sender, fx.body) ?: continue
            val result = GenericBankParser.parseWithDetection(fx.body, fx.sender, System.currentTimeMillis(), det)
            when (result) {
                is SmsParser.SmsParseResult.Success -> {
                    val diff = kotlin.math.abs(result.transaction.amount - fx.expectedAmount!!)
                    if (diff > 0.02) {
                        failures += "${fx.sender}: expected amount ${fx.expectedAmount} but got ${result.transaction.amount}"
                    }
                }
                is SmsParser.SmsParseResult.Error ->
                    failures += "${fx.sender}: parse failed with '${result.error.reason}'"
            }
        }
        assertTrue(failures.isEmpty(), "Amount extraction failures:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `GenericBankParser stamps correct institutionId`() {
        val txFixtures = allBankFixtures.filter { !it.shouldBeServiceNotice }
        val failures = mutableListOf<String>()
        for (fx in txFixtures) {
            val det = InstitutionDetector.detect(fx.sender, fx.body) ?: continue
            val result = GenericBankParser.parseWithDetection(fx.body, fx.sender, System.currentTimeMillis(), det)
            if (result is SmsParser.SmsParseResult.Success) {
                if (result.transaction.institutionId != fx.expectedInstitution) {
                    failures += "${fx.sender}: expected institution '${fx.expectedInstitution}' but got '${result.transaction.institutionId}'"
                }
            }
        }
        assertTrue(failures.isEmpty(), "Institution ID failures:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `KES dot format parses amount correctly for NCBA Loop`() {
        val fx = ncbaFixtures.first { it.body.contains("KES.250.00") }
        val det = InstitutionDetector.detect(fx.sender, fx.body)!!
        val result = GenericBankParser.parseWithDetection(fx.body, fx.sender, System.currentTimeMillis(), det)
        assertIs<SmsParser.SmsParseResult.Success>(result, "KES.250.00 should parse")
        assertEquals(250.0, result.transaction.amount, 0.02)
    }

    @Test
    fun `Reverse amount format parses for Equity`() {
        val fx = equityFixtures.first { it.body.contains("270 KES") }
        val det = InstitutionDetector.detect(fx.sender, fx.body)!!
        val result = GenericBankParser.parseWithDetection(fx.body, fx.sender, System.currentTimeMillis(), det)
        assertIs<SmsParser.SmsParseResult.Success>(result, "270 KES should parse")
        assertEquals(270.0, result.transaction.amount, 0.02)
    }

    @Test
    fun `Cross-ref M-PESA code extracted from bank SMS`() {
        val crossRefFixtures = allBankFixtures.filter { it.expectedCrossRefMpesaCode != null }
        assertTrue(crossRefFixtures.isNotEmpty(), "No cross-ref fixtures defined")
        val failures = mutableListOf<String>()
        for (fx in crossRefFixtures) {
            val det = InstitutionDetector.detect(fx.sender, fx.body) ?: continue
            val result = GenericBankParser.parseWithDetection(fx.body, fx.sender, System.currentTimeMillis(), det)
            if (result is SmsParser.SmsParseResult.Success) {
                if (result.transaction.crossRefMpesaCode != fx.expectedCrossRefMpesaCode) {
                    failures += "${fx.sender}: expected cross-ref '${fx.expectedCrossRefMpesaCode}' but got '${result.transaction.crossRefMpesaCode}'"
                }
            } else {
                failures += "${fx.sender}: parse failed"
            }
        }
        assertTrue(failures.isEmpty(), "Cross-ref extraction failures:\n${failures.joinToString("\n")}")
    }

    @Test
    fun `Equity Use code SMS is caught as service notice`() {
        val fx = equityFixtures.first { it.body.contains("Never share this code") }
        assertTrue(SmsParserConfig.isServiceNotice(fx.body), "Equity 'Use code' SMS should be caught as service notice")
    }

    @Test
    fun `ParserPipeline rejects service notices before reaching GenericBankParser`() {
        val noticeFixtures = allBankFixtures.filter { it.shouldBeServiceNotice }
        val failures = mutableListOf<String>()
        for (fx in noticeFixtures) {
            val result = ParserPipeline.process(fx.body, fx.sender, System.currentTimeMillis())
            when (result) {
                is SmsParser.SmsParseResult.Error -> {
                    if (result.error.reason != "service_notice") {
                        failures += "${fx.sender}: expected 'service_notice' error but got '${result.error.reason}'"
                    }
                }
                is SmsParser.SmsParseResult.Success ->
                    failures += "${fx.sender}: service notice incorrectly parsed as transaction"
            }
        }
        assertTrue(failures.isEmpty(), "Pipeline service notice failures:\n${failures.joinToString("\n")}")
    }
}
