package com.lifeos.sms

/**
 * Accuracy-test fixtures for [MpesaParserEngine] / [MpesaNativeParser].
 *
 * - [legacyFixtures] are ported from the JS test suite at
 *   apps/mobile/src/features/finance/mpesa-parser.test.ts.
 * - [realWorldFixtures] add realistic M-Pesa SMS variants for stress testing.
 * - [allFixtures] is the union used by [MpesaParserEngineTest].
 */

data class ParserFixture(
    val body: String,
    val expectedKind: String? = null,
    val expectedAmount: Double? = null,
    val expectedBalance: Double? = null,
    val expectedConfidence: String? = null,
    val expectedRoute: String? = null,
    val expectedCounterpartyContains: String? = null,
    val shouldIgnore: Boolean = false,
    /** When set, asserts parse returns Error with this reason instead of Success. */
    val expectedError: String? = null,
)

val legacyFixtures: List<ParserFixture> = listOf(
    // --- RECEIVED ----------------------------------------------------------------
    ParserFixture(
        body = "SIE8QWE123 Confirmed. You have received Ksh390.00 from JOHN DOE 0712345678 on 16/3/26 at 11:20 AM. New M-PESA balance is Ksh1,200.00.",
        expectedKind = "received",
        expectedAmount = 390.0,
        expectedBalance = 1200.0,
        expectedConfidence = "high",
        expectedRoute = "direct_ledger",
        expectedCounterpartyContains = "JOHN DOE",
    ),
    ParserFixture(
        body = "AB12345678 Confirmed. Ksh5,000.00 received from MARY WANJIRU 0722111222 on 16/3/26 at 9:00 AM. New M-PESA balance is Ksh6,200.00.",
        expectedKind = "received",
        expectedAmount = 5000.0,
        expectedCounterpartyContains = "MARY WANJIRU",
    ),
    ParserFixture(
        body = "CD98765432 Confirmed. You have received Ksh85,000.00 from EMPLOYER COMPANY LTD on 28/2/26 at 8:00 AM. New M-PESA balance is Ksh90,500.00.",
        expectedKind = "received",
        expectedAmount = 85000.0,
    ),

    // --- SENT --------------------------------------------------------------------
    ParserFixture(
        body = "SIE8QWE124 Confirmed. Ksh390.00 sent to JANE DOE 0712345678 on 16/3/26 at 11:22 AM. New M-PESA balance is Ksh810.00.",
        expectedKind = "sent",
        expectedAmount = 390.0,
        expectedCounterpartyContains = "JANE DOE",
    ),
    ParserFixture(
        body = "KL11223344 Confirmed. Customer transfer of Ksh2,000.00 to PETER KAMAU 0711000111 on 15/3/26 at 3:15 PM. New M-PESA balance is Ksh8,000.00.",
        expectedKind = "sent",
        expectedAmount = 2000.0,
        expectedCounterpartyContains = "PETER KAMAU",
    ),

    // --- PAYBILL -----------------------------------------------------------------
    ParserFixture(
        body = "SIE8QWE125 Confirmed. Ksh1,250.00 sent to KPLC PREPAID for account 998877 on 16/3/26 at 11:23 AM. New M-PESA balance is Ksh2,100.00.",
        expectedKind = "paybill",
        expectedAmount = 1250.0,
        expectedCounterpartyContains = "KPLC",
    ),
    ParserFixture(
        body = "MN55443322 Confirmed. Ksh3,000.00 paid to NAIROBI WATER AND SEWERAGE for account 0088776 on 14/3/26 at 10:00 AM. New M-PESA balance is Ksh7,800.00.",
        expectedKind = "paybill",
        expectedCounterpartyContains = "NAIROBI WATER",
    ),
    ParserFixture(
        body = "PQ99887766 Confirmed. Ksh500.00 paybill payment to GOTV on 12/3/26 at 7:30 AM. New M-PESA balance is Ksh4,500.00.",
        expectedKind = "paybill",
        expectedAmount = 500.0,
    ),

    // --- BUY GOODS ---------------------------------------------------------------
    ParserFixture(
        body = "SIE8QWE126 Confirmed. Ksh450.00 paid to NAIVAS WESTLANDS on 16/3/26 at 11:25 AM. New M-PESA balance is Ksh1,650.00.",
        expectedKind = "buy_goods",
        expectedAmount = 450.0,
        expectedCounterpartyContains = "NAIVAS",
    ),
    ParserFixture(
        body = "TU44332211 Confirmed. Ksh230.00 paid to QUICKMART via till number 123456 on 9/3/26 at 5:45 PM. New M-PESA balance is Ksh3,200.00.",
        expectedKind = "buy_goods",
    ),

    // --- AIRTIME -----------------------------------------------------------------
    ParserFixture(
        body = "VW33221100 Confirmed. Ksh50.00 sent to 0712345678 for airtime on 16/3/26 at 8:00 AM. New M-PESA balance is Ksh950.00.",
        expectedKind = "airtime",
        expectedAmount = 50.0,
    ),
    ParserFixture(
        body = "XY11009988 Confirmed. Ksh100.00 airtime purchase for 0722333444 on 16/3/26 at 9:30 AM. New M-PESA balance is Ksh850.00.",
        expectedKind = "airtime",
        expectedAmount = 100.0,
    ),
    ParserFixture(
        body = "UCHDL9V5IF confirmed.You bought Ksh5.00 of airtime on 17/3/26 at 8:11 PM.New M-PESA balance is Ksh0.00. Transaction cost, Ksh0.00.",
        expectedKind = "airtime",
        expectedAmount = 5.0,
        expectedConfidence = "high",
        expectedRoute = "direct_ledger",
    ),

    // --- WITHDRAW ----------------------------------------------------------------
    ParserFixture(
        body = "ZA22110099 Confirmed. Ksh2,000.00 withdrawn from agent 1234 - JOHN AGENT on 15/3/26 at 2:00 PM. New M-PESA balance is Ksh8,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 2000.0,
    ),
    ParserFixture(
        body = "BC55443300 Confirmed. Cash withdrawal of Ksh1,500.00 from agent 5678 on 13/3/26 at 4:30 PM. New M-PESA balance is Ksh3,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 1500.0,
    ),

    // --- DEPOSIT -----------------------------------------------------------------
    ParserFixture(
        body = "DE66554400 Confirmed. Ksh3,000.00 deposited by agent FAITH AGENT 7890 on 14/3/26 at 11:00 AM. New M-PESA balance is Ksh3,500.00.",
        expectedKind = "deposit",
        expectedAmount = 3000.0,
    ),
    ParserFixture(
        body = "FG77665511 Confirmed. Cash deposit of Ksh5,000.00 on 12/3/26 at 3:00 PM. New M-PESA balance is Ksh5,800.00.",
        expectedKind = "deposit",
        expectedAmount = 5000.0,
    ),

    // --- REVERSAL ----------------------------------------------------------------
    ParserFixture(
        body = "SIE8QWE127 Confirmed. The transaction of Ksh390.00 received from JOHN DOE 0712345678 on 16/3/26 at 11:20 AM has been reversed. New M-PESA balance is Ksh1,590.00.",
        expectedKind = "reversal",
        expectedAmount = 390.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "HI88776622 Confirmed. Ksh1,000.00 sent to PAUL MWANGI 0711222333 on 10/3/26 has been reversed. New M-PESA balance is Ksh5,000.00.",
        expectedKind = "reversal",
        expectedAmount = 1000.0,
    ),
    ParserFixture(
        body = "RK55443322 Confirmed. Received Ksh390.00 from JOAN AUMA 0711999222 on 16/3/26 at 9:00 AM has been reversed. New M-PESA balance is Ksh1,200.00.",
        expectedKind = "reversal",
        expectedAmount = 390.0,
    ),
    ParserFixture(
        body = "LM00997788 Confirmed. Ksh500.00 received from PETER OTIENO 0722112233 on 14/3/26 at 10:00 AM has been reversed. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "reversal",
        expectedConfidence = "high",
        expectedCounterpartyContains = "PETER OTIENO",
    ),
    ParserFixture(
        body = "FX44332211 Confirmed. Your last wallet transaction has been reversed. Ksh120.00 has been returned to your balance.",
        expectedKind = "reversal",
        expectedConfidence = "medium",
        expectedRoute = "review_queue",
    ),

    // --- FULIZA ------------------------------------------------------------------
    ParserFixture(
        body = "UCHDL9UR07 Confirmed. Ksh 730.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 857.72. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 730.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "UCHDL9TKH6 Confirmed. Ksh 110.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 299.42. Your M-PESA balance is 0.00.",
        expectedConfidence = "high",
        expectedRoute = "direct_ledger",
    ),
    ParserFixture(
        body = "UCIDL9W36G Confirmed. Fuliza M-PESA amount is Ksh 60.00. Access Fee charged Ksh 0.60. Total Fuliza M-PESA outstanding amount is Ksh239.23 due on 15/04/26.",
        expectedKind = "fuliza_charge",
    ),
    ParserFixture(
        body = "UCIDL9W87A Confirmed. Fuliza M-PESA amount is Ksh 40.00. Access Fee charged Ksh 0.40. Total Fuliza M-PESA outstanding amount is Ksh178.63 due on 15/04/26. To check daily charges, Dial *334#OK Select Query Charges",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),

    // --- DIRECTION / EDGE CASES --------------------------------------------------
    ParserFixture(
        body = "JK99887733 Confirmed. Ksh1,200.00 paid to JUMIA ONLINE STORE on 11/3/26 at 10:00 AM. New M-PESA balance is Ksh9,800.00.",
        expectedKind = "buy_goods",
    ),
    ParserFixture(
        body = "LM00998844 Confirmed. You have received Ksh1.00 from TEST USER 0700000000 on 16/3/26 at 12:00 PM. New M-PESA balance is Ksh101.00.",
        expectedKind = "received",
        expectedAmount = 1.0,
    ),
    ParserFixture(
        body = "BB11223344 Confirmed. Ksh800.00 sent to RECEIVED INCOME SACCO for account 556677 on 16/3/26 at 9:45 AM. New M-PESA balance is Ksh4,200.00.",
        expectedKind = "paybill",
    ),

    // --- AMOUNT / BALANCE / PREFIX -----------------------------------------------
    ParserFixture(
        body = "NO11223355 Confirmed. Ksh12,345.67 sent to SARAH KIMANI 0733445566 on 16/3/26 at 2:30 PM. New M-PESA balance is Ksh87,654.33.",
        expectedAmount = 12345.67,
        expectedBalance = 87654.33,
    ),
    ParserFixture(
        body = "OP22334466 Confirmed. KES 800.00 sent to BOB OTIENO 0712223334 on 16/3/26 at 3:45 PM. New M-PESA balance is KES 4,200.00.",
        expectedAmount = 800.0,
        expectedBalance = 4200.0,
    ),
    ParserFixture(
        body = "PP11223344 Confirmed. Ksh300.00 sent to ESTHER WAWERU 0700888999 on 16/3/26 at 4:00 PM. New M-PESA balance is Ksh3,700.",
    ),
    ParserFixture(
        body = "QQ22334455 Confirmed. You have received Ksh500.00 from DAVID MWENDA 0700999888. New M-PESA balance is Ksh1,500.00.",
        expectedBalance = 1500.0,
    ),

    // --- DATE / SEMANTIC HASH EDGE CASES ---------------------------------------
    ParserFixture(
        body = "QR33445577 Confirmed. Ksh200.00 sent to ALICE 0722334455 on 1/1/26 at 12:00 PM. New M-PESA balance is Ksh3,800.00.",
    ),
    ParserFixture(
        body = "UV55667799 Confirmed. You have received Ksh500.00 from DAVID MWENDA 0700999888. New M-PESA balance is Ksh1,500.00.",
        expectedBalance = 1500.0,
    ),
    ParserFixture(
        body = "AA11223344 Confirmed. You have received Ksh1,000.00 from GRACE MUTHONI 0700111222 on 16/3/26 at 9:00 AM. New M-PESA balance is Ksh3,000.00.",
    ),

    // --- LOW CONFIDENCE / UNKNOWN ------------------------------------------------
    ParserFixture(
        body = "ZZ99887766 Confirmed. Ksh250.00 M-PESA credit applied to your wallet. Ref 7890AB.",
    ),

    // --- REAL-WORLD REGRESSION SET -----------------------------------------------
    ParserFixture(
        body = "UCIDL9W87A Confirmed. Ksh40.00 sent to HESPON  ORINA on 18/3/26 at 7:51 AM. New M-PESA balance is Ksh0.00. Transaction cost, Ksh0.00.",
        expectedKind = "sent",
        expectedConfidence = "high",
        expectedCounterpartyContains = "HESPON ORINA",
    ),
    ParserFixture(
        body = "UCHDL9V1H2 confirmed.You bought Ksh5.00 of airtime on 17/3/26 at 7:58 PM.New M-PESA balance is Ksh0.00. Transaction cost, Ksh0.00.",
        expectedKind = "airtime",
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "UCHDL9TKZL Confirmed. Ksh40.00 paid to HOTEL DELITOS Via Kopo Kopo. on 17/3/26 at 2:34 PM.New M-PESA balance is Ksh0.00.",
        expectedKind = "buy_goods",
        expectedConfidence = "high",
        expectedCounterpartyContains = "HOTEL DELITOS",
    ),
    ParserFixture(
        body = "UCHPW9JQXV Confirmed.You have received Ksh110.00 from ORWARU  NYAKERI 0729220356 on 17/3/26 at 2:08 PM  New M-PESA balance is Ksh110.00.",
        expectedKind = "received",
        expectedConfidence = "high",
        expectedCounterpartyContains = "ORWARU NYAKERI",
    ),
    ParserFixture(
        body = "UCGDL9OXFW Confirmed. You have received Ksh400.00 from IM BANK LIMITED- APP on 16/3/26 at 12:19 PM. New M-PESA balance is Ksh400.00. Buy goods with M-PESA.",
        expectedKind = "received",
        expectedConfidence = "high",
        expectedCounterpartyContains = "IM BANK LIMITED- APP",
    ),

    // --- IGNORE CASES ------------------------------------------------------------
    ParserFixture(
        body = "FF11223344 Confirmed. Fuliza M-PESA interest charged Ksh 2.50 on outstanding balance. Your available limit is Ksh500.00.",
        shouldIgnore = true,
    ),
    ParserFixture(
        body = "GG22334455 Confirmed. Fuliza M-PESA overdraft notice. Maintenance fee of Ksh 5.00 charged. Outstanding balance Ksh250.00.",
        shouldIgnore = true,
    ),

    // --- THREAD-SAFETY BATCH FIXTURES --------------------------------------------
    ParserFixture(
        body = "LHF8N8X5D3 Confirmed. Ksh390.00 sent to JANE DOE 0712345678 on 01/06/26 at 2:15 PM. New M-PESA balance is Ksh1,210.00. Transaction cost, Ksh0.00. To reverse, forward this message to 456.",
        expectedKind = "sent",
        expectedAmount = 390.0,
    ),
    ParserFixture(
        body = "LHG7M3W2B1 Confirmed.You have received Ksh1,500.00 from JOHN SMITH 0723456789 on 02/06/26 at 9:30 AM.New M-PESA balance is Ksh3,700.00.",
        expectedKind = "received",
        expectedAmount = 1500.0,
    ),
    ParserFixture(
        body = "LHF9P4X5C2 Confirmed. Ksh450.00 paid to NAIVAS WESTLANDS on 03/06/26 at 1:00 PM. New M-PESA balance is Ksh2,500.00. Transaction cost, Ksh0.00. To reverse, forward this message to 456.",
        expectedKind = "buy_goods",
        expectedAmount = 450.0,
    ),
    ParserFixture(
        body = "LHGA1B2C3D Confirmed. Ksh50.00 paid to HOTEL DELITOS Via Kopo Kopo. on 04/06/26 at 12:00 PM. New M-PESA balance is Ksh1,950.00. Transaction cost, Ksh0.00.",
        expectedKind = "buy_goods",
        expectedAmount = 50.0,
    ),
    ParserFixture(
        body = "LHGB2C3D4E Confirmed. Ksh5,000.00 withdrawn from agent 12345 - SHOP AGENT on 05/06/26 at 10:00 AM. New M-PESA balance is Ksh800.00. Transaction cost, Ksh30.00.",
        expectedKind = "withdraw",
        expectedAmount = 5000.0,
    ),
)


val realWorldFixtures: List<ParserFixture> = listOf(
    // --- RECEIVED ----------------------------------------------------------------
    ParserFixture(
        body = "XAB1C2D3E4 Confirmed.You have received Ksh250.00 from Wanjiku Mwangi 0712345678 on 12/4/26 at 8:45 AM.New M-PESA balance is Ksh4,250.00.",
        expectedKind = "received",
        expectedAmount = 250.0,
        expectedBalance = 4250.0,
        expectedCounterpartyContains = "Wanjiku Mwangi",
    ),
    ParserFixture(
        body = "YBC2D3E4F5 Confirmed. Ksh1,200.00 received from JAMES OTIENO 0723456789 on 13/4/26 at 10:15 AM. New M-PESA balance is Ksh6,700.00.",
        expectedKind = "received",
        expectedAmount = 1200.0,
        expectedCounterpartyContains = "JAMES OTIENO",
    ),
    ParserFixture(
        body = "ZCD3E4F5G6 Confirmed. You have received Ksh78,500.00 from ACME LIMITED on 14/4/26 at 9:00 AM. New M-PESA balance is Ksh80,000.00.",
        expectedKind = "received",
        expectedAmount = 78500.0,
        expectedCounterpartyContains = "ACME LIMITED",
    ),
    ParserFixture(
        body = "WDE4F5G6H7 Confirmed. You have received Ksh3.00 from KPLC REFUND 0700000000 on 15/4/26 at 11:30 AM. New M-PESA balance is Ksh503.00.",
        expectedKind = "received",
        expectedAmount = 3.0,
        expectedCounterpartyContains = "KPLC REFUND",
    ),
    ParserFixture(
        body = "VEF5G6H7I8 Confirmed. Ksh9,999.00 received from MARY AKINYI 0734567890 on 16/4/26 at 1:20 PM. New M-PESA balance is Ksh12,499.00.",
        expectedKind = "received",
        expectedAmount = 9999.0,
        expectedCounterpartyContains = "MARY AKINYI",
    ),
    ParserFixture(
        body = "TGH6H7I8J9 Confirmed. You have received Ksh1,000.00 from SAFARICOM BONUS 0720000000 on 17/4/26 at 3:00 PM. New M-PESA balance is Ksh1,000.00.",
        expectedKind = "received",
        expectedAmount = 1000.0,
        expectedCounterpartyContains = "SAFARICOM BONUS",
    ),
    ParserFixture(
        body = "SII7I8J9K0 Confirmed. Ksh450.00 received from WAFULA  WEKESA 0745678901 on 18/4/26 at 4:45 PM. New M-PESA balance is Ksh2,950.00.",
        expectedKind = "received",
        expectedAmount = 450.0,
        expectedCounterpartyContains = "WAFULA WEKESA",
    ),
    ParserFixture(
        body = "RJJ8J9K0L1 Confirmed. You have received KES 5,500.00 from ANNE NJERI 0756789012 on 19/4/26 at 6:10 PM. New M-PESA balance is KES 8,000.00.",
        expectedKind = "received",
        expectedAmount = 5500.0,
        expectedCounterpartyContains = "ANNE NJERI",
    ),
    ParserFixture(
        body = "QKK9K0L1M2 Confirmed. Ksh22,000.00 received from PETER NDUNG'U 0767890123 on 20/4/26 at 7:55 AM. New M-PESA balance is Ksh25,500.00.",
        expectedKind = "received",
        expectedAmount = 22000.0,
        expectedCounterpartyContains = "PETER NDUNG'U",
    ),
    ParserFixture(
        body = "PLL0L1M2N3 Confirmed. You have received Ksh600.00 from LUCY KEMUNTO 0778901234 on 21/4/26 at 12:25 PM. New M-PESA balance is Ksh1,100.00.",
        expectedKind = "received",
        expectedAmount = 600.0,
        expectedCounterpartyContains = "LUCY KEMUNTO",
    ),
    ParserFixture(
        body = "OMM1M2N3O4 Confirmed. Ksh15,000.00 received from FAMILY BANK on 22/4/26 at 2:40 PM. New M-PESA balance is Ksh18,200.00.",
        expectedKind = "received",
        expectedAmount = 15000.0,
        expectedCounterpartyContains = "FAMILY BANK",
    ),
    ParserFixture(
        body = "NNN2N3O4P5 Confirmed. You have received Ksh88.00 from TAXI DRIVER 0789012345 on 23/4/26 at 9:50 PM. New M-PESA balance is Ksh188.00.",
        expectedKind = "received",
        expectedAmount = 88.0,
        expectedCounterpartyContains = "TAXI DRIVER",
    ),

    // --- SENT --------------------------------------------------------------------
    ParserFixture(
        body = "BPP3O4P5Q6 Confirmed. Ksh1,500.00 sent to JOHN KAMAU 0711234567 on 12/4/26 at 8:00 AM. New M-PESA balance is Ksh3,500.00.",
        expectedKind = "sent",
        expectedAmount = 1500.0,
        expectedCounterpartyContains = "JOHN KAMAU",
    ),
    ParserFixture(
        body = "CQQ4P5Q6R7 Confirmed. Customer transfer of Ksh4,000.00 to ESTHER WANJIKU 0722345678 on 13/4/26 at 11:10 AM. New M-PESA balance is Ksh6,000.00.",
        expectedKind = "sent",
        expectedAmount = 4000.0,
        expectedCounterpartyContains = "ESTHER WANJIKU",
    ),
    ParserFixture(
        body = "DRR5Q6R7S8 Confirmed. Ksh750.00 sent to MUM 0733456789 on 14/4/26 at 1:25 PM. New M-PESA balance is Ksh1,250.00.",
        expectedKind = "sent",
        expectedAmount = 750.0,
        expectedCounterpartyContains = "MUM",
    ),
    ParserFixture(
        body = "ESS6R7S8T9 Confirmed. Ksh10,000.00 sent to LANDLORD 0744567890 on 15/4/26 at 4:00 PM. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "sent",
        expectedAmount = 10000.0,
        expectedCounterpartyContains = "LANDLORD",
    ),
    ParserFixture(
        body = "FTT7S8T9U0 Confirmed. Ksh199.00 sent to MBUSHI 0755678901 on 16/4/26 at 6:30 PM. New M-PESA balance is Ksh801.00.",
        expectedKind = "sent",
        expectedAmount = 199.0,
        expectedCounterpartyContains = "MBUSHI",
    ),
    ParserFixture(
        body = "GUU8T9U0V1 Confirmed. Customer transfer of Ksh25,000.00 to WIFE 0766789012 on 17/4/26 at 8:15 AM. New M-PESA balance is Ksh4,500.00.",
        expectedKind = "sent",
        expectedAmount = 25000.0,
        expectedCounterpartyContains = "WIFE",
    ),
    ParserFixture(
        body = "HVV9U0V1W2 Confirmed. KES 3,300.00 sent to BROTHER 0777890123 on 18/4/26 at 12:45 PM. New M-PESA balance is KES 6,700.00.",
        expectedKind = "sent",
        expectedAmount = 3300.0,
        expectedCounterpartyContains = "BROTHER",
    ),
    ParserFixture(
        body = "IWW0V1W2X3 Confirmed. Ksh5.00 sent to KEVIN 0788901234 on 19/4/26 at 2:20 PM. New M-PESA balance is Ksh95.00.",
        expectedKind = "sent",
        expectedAmount = 5.0,
        expectedCounterpartyContains = "KEVIN",
    ),
    ParserFixture(
        body = "JXX1W2X3Y4 Confirmed. Ksh8,888.00 sent to CHARITY FUND 0799012345 on 20/4/26 at 5:55 PM. New M-PESA balance is Ksh1,112.00.",
        expectedKind = "sent",
        expectedAmount = 8888.0,
        expectedCounterpartyContains = "CHARITY FUND",
    ),
    ParserFixture(
        body = "KYY2X3Y4Z5 Confirmed. Customer transfer of Ksh1,111.00 to NANCY 0700123456 on 21/4/26 at 9:05 AM. New M-PESA balance is Ksh3,889.00.",
        expectedKind = "sent",
        expectedAmount = 1111.0,
        expectedCounterpartyContains = "NANCY",
    ),
    ParserFixture(
        body = "LZZ3Y4Z5A6 Confirmed. Ksh2,000.00 sent to FATHER 0711234567 on 22/4/26 at 10:40 AM. New M-PESA balance is Ksh500.00.",
        expectedKind = "sent",
        expectedAmount = 2000.0,
        expectedCounterpartyContains = "FATHER",
    ),

    // --- PAYBILL -----------------------------------------------------------------
    ParserFixture(
        body = "MAA4Z5A6B7 Confirmed. Ksh2,500.00 sent to KPLC PREPAID for account 1234567890 on 12/4/26 at 9:00 AM. New M-PESA balance is Ksh1,500.00.",
        expectedKind = "paybill",
        expectedAmount = 2500.0,
        expectedCounterpartyContains = "KPLC",
    ),
    ParserFixture(
        body = "NBB5A6B7C8 Confirmed. Ksh1,800.00 paid to NAIROBI WATER for account 987654 on 13/4/26 at 10:30 AM. New M-PESA balance is Ksh2,200.00.",
        expectedKind = "paybill",
        expectedAmount = 1800.0,
        expectedCounterpartyContains = "NAIROBI WATER",
    ),
    ParserFixture(
        body = "OCC6B7C8D9 Confirmed. Ksh999.00 paybill payment to DSTV on 14/4/26 at 11:45 AM. New M-PESA balance is Ksh4,001.00.",
        expectedKind = "paybill",
        expectedAmount = 999.0,
        expectedCounterpartyContains = "DSTV",
    ),
    ParserFixture(
        body = "PDD7C8D9E0 Confirmed. Ksh3,500.00 sent to ZUKU for account 112233 on 15/4/26 at 1:00 PM. New M-PESA balance is Ksh6,500.00.",
        expectedKind = "paybill",
        expectedAmount = 3500.0,
        expectedCounterpartyContains = "ZUKU",
    ),
    ParserFixture(
        body = "QEE8D9E0F1 Confirmed. Ksh1,200.00 paid to FAIBA for account 445566 on 16/4/26 at 2:15 PM. New M-PESA balance is Ksh2,800.00.",
        expectedKind = "paybill",
        expectedAmount = 1200.0,
        expectedCounterpartyContains = "FAIBA",
    ),
    ParserFixture(
        body = "RFF9E0F1G2 Confirmed. Ksh500.00 paybill to NHIF for account 778899 on 17/4/26 at 3:30 PM. New M-PESA balance is Ksh1,500.00.",
        expectedKind = "paybill",
        expectedAmount = 500.0,
        expectedCounterpartyContains = "NHIF",
    ),
    ParserFixture(
        body = "SGG0F1G2H3 Confirmed. Ksh4,000.00 sent to KRA for account A001234567 on 18/4/26 at 4:45 PM. New M-PESA balance is Ksh5,000.00.",
        expectedKind = "paybill",
        expectedAmount = 4000.0,
        expectedCounterpartyContains = "KRA",
    ),
    ParserFixture(
        body = "THH1G2H3I4 Confirmed. Ksh2,250.00 paid to STARTIMES for account 556677 on 19/4/26 at 6:00 PM. New M-PESA balance is Ksh3,750.00.",
        expectedKind = "paybill",
        expectedAmount = 2250.0,
        expectedCounterpartyContains = "STARTIMES",
    ),
    ParserFixture(
        body = "UII2H3I4J5 Confirmed. Ksh6,000.00 sent to SAFARICOM HOME for account 998877 on 20/4/26 at 7:15 PM. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "paybill",
        expectedAmount = 6000.0,
        expectedCounterpartyContains = "SAFARICOM HOME",
    ),
    ParserFixture(
        body = "VJJ3I4J5K6 Confirmed. Ksh1,500.00 paybill payment to JAMBOPAY for account 334455 on 21/4/26 at 8:30 PM. New M-PESA balance is Ksh2,500.00.",
        expectedKind = "paybill",
        expectedAmount = 1500.0,
        expectedCounterpartyContains = "JAMBOPAY",
    ),

    // --- BUY GOODS ---------------------------------------------------------------
    ParserFixture(
        body = "WKK4J5K6L7 Confirmed. Ksh1,200.00 paid to CARREFOUR on 12/4/26 at 9:15 AM. New M-PESA balance is Ksh3,800.00.",
        expectedKind = "buy_goods",
        expectedAmount = 1200.0,
        expectedCounterpartyContains = "CARREFOUR",
    ),
    ParserFixture(
        body = "XLL5K6L7M8 Confirmed. Ksh450.00 paid to CHandarana FOODMPLUS on 13/4/26 at 10:45 AM. New M-PESA balance is Ksh2,550.00.",
        expectedKind = "buy_goods",
        expectedAmount = 450.0,
        expectedCounterpartyContains = "FOODMPLUS",
    ),
    ParserFixture(
        body = "YMM6L7M8N9 Confirmed. Ksh890.00 paid to MATTRESS RESTAURANT via till number 98765 on 14/4/26 at 12:00 PM. New M-PESA balance is Ksh4,110.00.",
        expectedKind = "buy_goods",
        expectedAmount = 890.0,
        expectedCounterpartyContains = "MATTRESS RESTAURANT",
    ),
    ParserFixture(
        body = "ZNN7M8N9O0 Confirmed. Ksh2,300.00 paid to TOTAL ENERGY on 15/4/26 at 1:30 PM. New M-PESA balance is Ksh5,700.00.",
        expectedKind = "buy_goods",
        expectedAmount = 2300.0,
        expectedCounterpartyContains = "TOTAL ENERGY",
    ),
    ParserFixture(
        body = "AOO8N9O0P1 Confirmed. Ksh150.00 paid to LOCAL KIBANDA on 16/4/26 at 2:45 PM. New M-PESA balance is Ksh850.00.",
        expectedKind = "buy_goods",
        expectedAmount = 150.0,
        expectedCounterpartyContains = "LOCAL KIBANDA",
    ),
    ParserFixture(
        body = "BPP9O0P1Q2 Confirmed. Ksh5,500.00 paid to LAPTOP REPAIR SHOP via till number 11223 on 17/4/26 at 4:00 PM. New M-PESA balance is Ksh1,500.00.",
        expectedKind = "buy_goods",
        expectedAmount = 5500.0,
        expectedCounterpartyContains = "LAPTOP REPAIR SHOP",
    ),
    ParserFixture(
        body = "CQQ0P1Q2R3 Confirmed. Ksh675.00 paid to PHARMACY PLUS on 18/4/26 at 5:15 PM. New M-PESA balance is Ksh2,325.00.",
        expectedKind = "buy_goods",
        expectedAmount = 675.0,
        expectedCounterpartyContains = "PHARMACY PLUS",
    ),
    ParserFixture(
        body = "DRR1Q2R3S4 Confirmed. Ksh3,000.00 paid to BATA KENYA on 19/4/26 at 6:30 PM. New M-PESA balance is Ksh4,000.00.",
        expectedKind = "buy_goods",
        expectedAmount = 3000.0,
        expectedCounterpartyContains = "BATA KENYA",
    ),
    ParserFixture(
        body = "ESS2R3S4T5 Confirmed. Ksh1,050.00 paid to JAVA HOUSE on 20/4/26 at 7:45 PM. New M-PESA balance is Ksh1,950.00.",
        expectedKind = "buy_goods",
        expectedAmount = 1050.0,
        expectedCounterpartyContains = "JAVA HOUSE",
    ),
    ParserFixture(
        body = "FTT3S4T5U6 Confirmed. Ksh7,800.00 paid to ELECTRONICS HUB via till number 55667 on 21/4/26 at 9:00 PM. New M-PESA balance is Ksh2,200.00.",
        expectedKind = "buy_goods",
        expectedAmount = 7800.0,
        expectedCounterpartyContains = "ELECTRONICS HUB",
    ),

    // --- AIRTIME -----------------------------------------------------------------
    ParserFixture(
        body = "GUU4T5U6V7 Confirmed. Ksh20.00 sent to 0712345678 for airtime on 12/4/26 at 8:30 AM. New M-PESA balance is Ksh480.00.",
        expectedKind = "airtime",
        expectedAmount = 20.0,
    ),
    ParserFixture(
        body = "HVV5U6V7W8 Confirmed. Ksh500.00 airtime purchase for 0723456789 on 13/4/26 at 9:45 AM. New M-PESA balance is Ksh3,500.00.",
        expectedKind = "airtime",
        expectedAmount = 500.0,
    ),
    ParserFixture(
        body = "IWW6V7W8X9 Confirmed. You bought Ksh100.00 of airtime on 14/4/26 at 10:00 AM. New M-PESA balance is Ksh900.00. Transaction cost, Ksh0.00.",
        expectedKind = "airtime",
        expectedAmount = 100.0,
    ),
    ParserFixture(
        body = "JXX7W8X9Y0 Confirmed. Ksh50.00 airtime for 0734567890 on 15/4/26 at 11:15 AM. New M-PESA balance is Ksh450.00.",
        expectedKind = "airtime",
        expectedAmount = 50.0,
    ),
    ParserFixture(
        body = "KYY8X9Y0Z1 Confirmed. Ksh1,000.00 sent to 0745678901 for airtime on 16/4/26 at 12:30 PM. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "airtime",
        expectedAmount = 1000.0,
    ),
    ParserFixture(
        body = "LZZ9Y0Z1A2 Confirmed. You bought Ksh10.00 of airtime on 17/4/26 at 1:45 PM. New M-PESA balance is Ksh90.00.",
        expectedKind = "airtime",
        expectedAmount = 10.0,
    ),
    ParserFixture(
        body = "MAA0Z1A2B3 Confirmed. Ksh250.00 airtime purchase for 0756789012 on 18/4/26 at 3:00 PM. New M-PESA balance is Ksh750.00.",
        expectedKind = "airtime",
        expectedAmount = 250.0,
    ),
    ParserFixture(
        body = "NBB1A2B3C4 Confirmed. Ksh30.00 sent to 0767890123 for airtime on 19/4/26 at 4:15 PM. New M-PESA balance is Ksh470.00.",
        expectedKind = "airtime",
        expectedAmount = 30.0,
    ),
    ParserFixture(
        body = "OCC2B3C4D5 Confirmed. You bought Ksh75.00 of airtime on 20/4/26 at 5:30 PM. New M-PESA balance is Ksh425.00. Transaction cost, Ksh0.00.",
        expectedKind = "airtime",
        expectedAmount = 75.0,
    ),
    ParserFixture(
        body = "PDD3C4D5E6 Confirmed. Ksh2,000.00 airtime for 0778901234 on 21/4/26 at 6:45 PM. New M-PESA balance is Ksh5,000.00.",
        expectedKind = "airtime",
        expectedAmount = 2000.0,
    ),

    // --- WITHDRAW ----------------------------------------------------------------
    ParserFixture(
        body = "QEE4D5E6F7 Confirmed. Ksh5,000.00 withdrawn from agent 9876 - AGENT ONE on 12/4/26 at 9:30 AM. New M-PESA balance is Ksh1,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 5000.0,
    ),
    ParserFixture(
        body = "RFF5E6F7G8 Confirmed. Cash withdrawal of Ksh3,000.00 from agent 5432 on 13/4/26 at 10:45 AM. New M-PESA balance is Ksh4,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 3000.0,
    ),
    ParserFixture(
        body = "SGG6F7G8H9 Confirmed. Ksh1,000.00 withdrawn from agent 1111 - MWANGI AGENT on 14/4/26 at 12:00 PM. New M-PESA balance is Ksh2,500.00.",
        expectedKind = "withdraw",
        expectedAmount = 1000.0,
    ),
    ParserFixture(
        body = "THH7G8H9I0 Confirmed. Cash withdrawal of Ksh10,000.00 from agent 2222 on 15/4/26 at 1:15 PM. New M-PESA balance is Ksh500.00.",
        expectedKind = "withdraw",
        expectedAmount = 10000.0,
    ),
    ParserFixture(
        body = "UII8H9I0J1 Confirmed. Ksh7,500.00 withdrawn from agent 3333 - TRUSTED AGENT on 16/4/26 at 2:30 PM. New M-PESA balance is Ksh8,500.00.",
        expectedKind = "withdraw",
        expectedAmount = 7500.0,
    ),
    ParserFixture(
        body = "VJJ9I0J1K2 Confirmed. Cash withdrawal of Ksh4,500.00 from agent 4444 on 17/4/26 at 3:45 PM. New M-PESA balance is Ksh6,550.00.",
        expectedKind = "withdraw",
        expectedAmount = 4500.0,
    ),
    ParserFixture(
        body = "WKK0J1K2L3 Confirmed. Ksh2,200.00 withdrawn from agent 5555 - QUICK CASH on 18/4/26 at 5:00 PM. New M-PESA balance is Ksh3,300.00.",
        expectedKind = "withdraw",
        expectedAmount = 2200.0,
    ),
    ParserFixture(
        body = "XLL1K2L3M4 Confirmed. Cash withdrawal of Ksh800.00 from agent 6666 on 19/4/26 at 6:15 PM. New M-PESA balance is Ksh1,200.00.",
        expectedKind = "withdraw",
        expectedAmount = 800.0,
    ),
    ParserFixture(
        body = "YMM2L3M4N5 Confirmed. Ksh15,000.00 withdrawn from agent 7777 - MAINA AGENCY on 20/4/26 at 7:30 PM. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 15000.0,
    ),

    // --- DEPOSIT -----------------------------------------------------------------
    ParserFixture(
        body = "ZNN3M4N5O6 Confirmed. Ksh2,000.00 deposited by agent WANJIKU AGENT 8888 on 12/4/26 at 9:45 AM. New M-PESA balance is Ksh5,500.00.",
        expectedKind = "deposit",
        expectedAmount = 2000.0,
    ),
    ParserFixture(
        body = "AOO4N5O6P7 Confirmed. Cash deposit of Ksh8,000.00 on 13/4/26 at 11:00 AM. New M-PESA balance is Ksh10,500.00.",
        expectedKind = "deposit",
        expectedAmount = 8000.0,
    ),
    ParserFixture(
        body = "BPP5O6P7Q8 Confirmed. Ksh500.00 deposited by agent KAMAU AGENT 9999 on 14/4/26 at 12:15 PM. New M-PESA balance is Ksh1,000.00.",
        expectedKind = "deposit",
        expectedAmount = 500.0,
    ),
    ParserFixture(
        body = "CQQ6P7Q8R9 Confirmed. Cash deposit of Ksh25,000.00 on 15/4/26 at 1:30 PM. New M-PESA balance is Ksh30,000.00.",
        expectedKind = "deposit",
        expectedAmount = 25000.0,
    ),
    ParserFixture(
        body = "DRR7Q8R9S0 Confirmed. Ksh3,500.00 deposited by agent NJERI AGENT 1010 on 16/4/26 at 2:45 PM. New M-PESA balance is Ksh4,000.00.",
        expectedKind = "deposit",
        expectedAmount = 3500.0,
    ),
    ParserFixture(
        body = "ESS8R9S0T1 Confirmed. Cash deposit of Ksh1,000.00 on 17/4/26 at 4:00 PM. New M-PESA balance is Ksh1,500.00.",
        expectedKind = "deposit",
        expectedAmount = 1000.0,
    ),
    ParserFixture(
        body = "FTT9S0T1U2 Confirmed. Ksh12,000.00 deposited by agent OTIENO AGENT 1212 on 18/4/26 at 5:15 PM. New M-PESA balance is Ksh15,000.00.",
        expectedKind = "deposit",
        expectedAmount = 12000.0,
    ),
    ParserFixture(
        body = "GUU0T1U2V3 Confirmed. Cash deposit of Ksh6,600.00 on 19/4/26 at 6:30 PM. New M-PESA balance is Ksh8,800.00.",
        expectedKind = "deposit",
        expectedAmount = 6600.0,
    ),

    // --- REVERSAL ----------------------------------------------------------------
    ParserFixture(
        body = "HVV1U2V3W4 Confirmed. Ksh1,500.00 received from MARY 0712345678 on 12/4/26 at 10:00 AM has been reversed. New M-PESA balance is Ksh3,500.00.",
        expectedKind = "reversal",
        expectedAmount = 1500.0,
    ),
    ParserFixture(
        body = "IWW2V3W4X5 Confirmed. Ksh3,000.00 sent to PETER 0723456789 on 13/4/26 at 11:30 AM has been reversed. New M-PESA balance is Ksh8,000.00.",
        expectedKind = "reversal",
        expectedAmount = 3000.0,
    ),
    ParserFixture(
        body = "JXX3W4X5Y6 Confirmed. The transaction of Ksh750.00 received from ALICE 0734567890 on 14/4/26 at 1:00 PM has been reversed. New M-PESA balance is Ksh2,250.00.",
        expectedKind = "reversal",
        expectedAmount = 750.0,
    ),
    ParserFixture(
        body = "KYY4X5Y6Z7 Confirmed. Ksh2,000.00 sent to JOHN 0745678901 on 15/4/26 at 2:30 PM has been reversed. New M-PESA balance is Ksh6,000.00.",
        expectedKind = "reversal",
        expectedAmount = 2000.0,
    ),
    ParserFixture(
        body = "LZZ5Y6Z7A8 Confirmed. Received Ksh4,500.00 from JANE 0756789012 on 16/4/26 at 4:00 PM has been reversed. New M-PESA balance is Ksh5,500.00.",
        expectedKind = "reversal",
        expectedAmount = 4500.0,
    ),
    ParserFixture(
        body = "MAA6Z7A8B9 Confirmed. The transaction of Ksh900.00 sent to BOB 0767890123 on 17/4/26 at 5:30 PM has been reversed. New M-PESA balance is Ksh4,900.00.",
        expectedKind = "reversal",
        expectedAmount = 900.0,
    ),
    ParserFixture(
        body = "NBB7A8B9C0 Confirmed. Ksh5,000.00 received from CAROL 0778901234 on 18/4/26 at 7:00 PM has been reversed. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "reversal",
        expectedAmount = 5000.0,
    ),
    ParserFixture(
        body = "OCC8B9C0D1 Confirmed. Ksh1,100.00 sent to DAVID 0789012345 on 19/4/26 at 8:30 PM has been reversed. New M-PESA balance is Ksh3,100.00.",
        expectedKind = "reversal",
        expectedAmount = 1100.0,
    ),

    // --- FULIZA REPAYMENT --------------------------------------------------------
    ParserFixture(
        body = "PDD9C0D1E2 Confirmed. Ksh 500.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 1,000.00. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 500.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "QEE0D1E2F3 Confirmed. Ksh 1,250.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 2,500.00. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 1250.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "RFF1E2F3G4 Confirmed. Ksh 75.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 425.00. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 75.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "SGG2F3G4H5 Confirmed. Ksh 2,000.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 5,000.00. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 2000.0,
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "THH3G4H5I6 Confirmed. Ksh 3,400.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 1,600.00. Your M-PESA balance is 0.00.",
        expectedKind = "fuliza_repayment",
        expectedAmount = 3400.0,
        expectedConfidence = "high",
    ),

    // --- FULIZA CHARGE -----------------------------------------------------------
    ParserFixture(
        body = "UII4H5I6J7 Confirmed. Fuliza M-PESA amount is Ksh 100.00. Access Fee charged Ksh 1.00. Total Fuliza M-PESA outstanding amount is Ksh500.00 due on 20/04/26.",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "VJJ5I6J7K8 Confirmed. Fuliza M-PESA amount is Ksh 250.00. Access Fee charged Ksh 2.50. Total Fuliza M-PESA outstanding amount is Ksh1,250.00 due on 21/04/26.",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "WKK6J7K8L9 Confirmed. Fuliza M-PESA amount is Ksh 1,000.00. Access Fee charged Ksh 10.00. Total Fuliza M-PESA outstanding amount is Ksh4,000.00 due on 22/04/26.",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "XLL7K8L9M0 Confirmed. Fuliza M-PESA amount is Ksh 50.00. Access Fee charged Ksh 0.50. Total Fuliza M-PESA outstanding amount is Ksh150.00 due on 23/04/26.",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),
    ParserFixture(
        body = "YMM8L9M0N1 Confirmed. Fuliza M-PESA amount is Ksh 2,000.00. Access Fee charged Ksh 20.00. Total Fuliza M-PESA outstanding amount is Ksh8,000.00 due on 24/04/26.",
        expectedKind = "fuliza_charge",
        expectedConfidence = "high",
    ),

    // --- PROMO TAILS -------------------------------------------------------------
    ParserFixture(
        body = "ZNN9M0N1O2 Confirmed. Ksh200.00 sent to ALICE 0712345678 on 12/4/26 at 9:00 AM. New M-PESA balance is Ksh800.00. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,800.00. Earn interest daily on Ziidi MMF, Dial *334#",
        expectedKind = "sent",
        expectedAmount = 200.0,
        expectedCounterpartyContains = "ALICE",
    ),
    ParserFixture(
        body = "AOO0N1O2P3 Confirmed. Ksh1,000.00 paid to SUPERMARKET on 13/4/26 at 10:30 AM. New M-PESA balance is Ksh4,000.00. Transaction cost, Ksh0.00. Download the M-PESA App today.",
        expectedKind = "buy_goods",
        expectedAmount = 1000.0,
        expectedCounterpartyContains = "SUPERMARKET",
    ),
    ParserFixture(
        body = "BPP1O2P3Q4 Confirmed. You have received Ksh500.00 from BOB 0723456789 on 14/4/26 at 11:45 AM. New M-PESA balance is Ksh1,500.00. Get the M-PESA App for easier transactions.",
        expectedKind = "received",
        expectedAmount = 500.0,
        expectedCounterpartyContains = "BOB",
    ),
    ParserFixture(
        body = "CQQ2P3Q4R5 Confirmed. Ksh3,000.00 withdrawn from agent 1234 - AGENT X on 15/4/26 at 1:00 PM. New M-PESA balance is Ksh2,000.00. Transaction cost, Ksh50.00. Pata M-PESA App kwa simu yako.",
        expectedKind = "withdraw",
        expectedAmount = 3000.0,
    ),
    ParserFixture(
        body = "DRR3Q4R5S6 Confirmed. Ksh100.00 sent to MARY 0734567890 on 16/4/26 at 2:15 PM. New M-PESA balance is Ksh400.00. Transaction cost, Ksh0.00. Dial *334# to check your M-PESA balance.",
        expectedKind = "sent",
        expectedAmount = 100.0,
        expectedCounterpartyContains = "MARY",
    ),

    // --- KES PREFIX --------------------------------------------------------------
    ParserFixture(
        body = "ESS4R5S6T7 Confirmed. KES 1,500.00 sent to JAMES 0745678901 on 12/4/26 at 9:30 AM. New M-PESA balance is KES 3,500.00.",
        expectedKind = "sent",
        expectedAmount = 1500.0,
        expectedBalance = 3500.0,
        expectedCounterpartyContains = "JAMES",
    ),
    ParserFixture(
        body = "FTT5S6T7U8 Confirmed. You have received KES 2,500.00 from GRACE 0756789012 on 13/4/26 at 10:45 AM. New M-PESA balance is KES 5,000.00.",
        expectedKind = "received",
        expectedAmount = 2500.0,
        expectedBalance = 5000.0,
        expectedCounterpartyContains = "GRACE",
    ),
    ParserFixture(
        body = "GUU6T7U8V9 Confirmed. KES 800.00 paid to FUEL STATION on 14/4/26 at 12:00 PM. New M-PESA balance is KES 4,200.00.",
        expectedKind = "buy_goods",
        expectedAmount = 800.0,
        expectedBalance = 4200.0,
        expectedCounterpartyContains = "FUEL STATION",
    ),
    ParserFixture(
        body = "HVV7U8V9W0 Confirmed. KES 5,000.00 withdrawn from agent 5555 on 15/4/26 at 1:15 PM. New M-PESA balance is KES 1,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 5000.0,
        expectedBalance = 1000.0,
    ),
    ParserFixture(
        body = "IWW8V9W0X1 Confirmed. KES 3,000.00 deposited by agent LUCY AGENT 7777 on 16/4/26 at 2:30 PM. New M-PESA balance is KES 6,000.00.",
        expectedKind = "deposit",
        expectedAmount = 3000.0,
        expectedBalance = 6000.0,
    ),

    // --- MISSING BALANCE ---------------------------------------------------------
    ParserFixture(
        body = "JXX9W0X1Y2 Confirmed. Ksh1,000.00 sent to PATRICK 0767890123 on 12/4/26 at 9:00 AM.",
        expectedKind = "sent",
        expectedAmount = 1000.0,
        expectedCounterpartyContains = "PATRICK",
    ),
    ParserFixture(
        body = "KYY0X1Y2Z3 Confirmed. You have received Ksh2,000.00 from RUTH 0778901234 on 13/4/26 at 10:15 AM.",
        expectedKind = "received",
        expectedAmount = 2000.0,
        expectedCounterpartyContains = "RUTH",
    ),
    ParserFixture(
        body = "LZZ1Y2Z3A4 Confirmed. Ksh500.00 paid to GROCERIES on 14/4/26 at 11:30 AM.",
        expectedKind = "buy_goods",
        expectedAmount = 500.0,
        expectedCounterpartyContains = "GROCERIES",
    ),
    ParserFixture(
        body = "MAA2Z3A4B5 Confirmed. Ksh5,000.00 withdrawn from agent 9999 on 15/4/26 at 12:45 PM.",
        expectedKind = "withdraw",
        expectedAmount = 5000.0,
    ),
    ParserFixture(
        body = "NBB3A4B5C6 Confirmed. Cash deposit of Ksh7,000.00 on 16/4/26 at 2:00 PM.",
        expectedKind = "deposit",
        expectedAmount = 7000.0,
    ),

    // --- ODD SPACING / LINE BREAKS -----------------------------------------------
    ParserFixture(
        body = "OCC4B5C6D7 Confirmed.\nYou have received Ksh1,200.00 from SAMUEL 0789012345 on 12/4/26 at 9:00 AM.\nNew M-PESA balance is Ksh2,200.00.",
        expectedKind = "received",
        expectedAmount = 1200.0,
        expectedBalance = 2200.0,
        expectedCounterpartyContains = "SAMUEL",
    ),
    ParserFixture(
        body = "PDD5C6D7E8 Confirmed.  Ksh900.00  sent to  LUCY  0790123456  on  13/4/26  at  10:15  AM.  New  M-PESA  balance  is  Ksh1,100.00.",
        expectedKind = "sent",
        expectedAmount = 900.0,
        expectedBalance = 1100.0,
        expectedCounterpartyContains = "LUCY",
    ),
    ParserFixture(
        body = "QEE6D7E8F9 Confirmed.\n\nKsh3,000.00 paid to\nRESTAURANT on 14/4/26 at 11:30 AM.\n\nNew M-PESA balance is Ksh5,000.00.",
        expectedKind = "buy_goods",
        expectedAmount = 3000.0,
        expectedBalance = 5000.0,
        expectedCounterpartyContains = "RESTAURANT",
    ),
    ParserFixture(
        body = "RFF7E8F9G0 Confirmed.\tKsh2,500.00 sent to\tPETER\t0712345678\ton\t15/4/26\tat\t12:45 PM.\tNew M-PESA balance is Ksh3,500.00.",
        expectedKind = "sent",
        expectedAmount = 2500.0,
        expectedBalance = 3500.0,
        expectedCounterpartyContains = "PETER",
    ),
    ParserFixture(
        body = "SGG8F9G0H1 Confirmed.You have received Ksh4,000.00 from ANN 0723456789 on 16/4/26 at 2:00 PM.New M-PESA balance is Ksh6,000.00.",
        expectedKind = "received",
        expectedAmount = 4000.0,
        expectedBalance = 6000.0,
        expectedCounterpartyContains = "ANN",
    ),

    // --- ALL-ALPHA CODE REGRESSION ---------------------------------------------------
    // Real M-Pesa codes can be all uppercase letters with no digits (e.g. UGFDLBONAZ).
    // The previous CODE_RE required ≥1 digit and wrongly rejected these — now fixed.
    ParserFixture(
        body = "UGFDLBONAZ Confirmed. You have received Ksh5.00 from TEST USER 0724000586 on 15/7/26 at 10:08 AM. New M-PESA balance is Ksh145.67.",
        expectedKind = "received",
        expectedAmount = 5.0,
        expectedBalance = 145.67,
        expectedCounterpartyContains = "TEST USER",
    ),
    ParserFixture(
        body = "UGFDLBONAZ Confirmed. Ksh5.00 sent to Obed Nyakoni 0712087778 on 15/7/26 at 10:08 AM. New M-PESA balance is Ksh145.67.",
        expectedKind = "sent",
        expectedAmount = 5.0,
        expectedCounterpartyContains = "Obed Nyakoni",
    ),

    // --- CODELESS OFFICIAL-MPESA STYLE -------------------------------------------
    // These bodies intentionally omit the 10-character transaction code. The CODE_RE
    // uppercase-only requirement rejects phone numbers (all digits, no [A-Z]).
    ParserFixture(
        body = "You have received Ksh500.00 from JAMES KAMAU 0712345678 on 12/4/26 at 9:00 AM. New M-PESA balance is Ksh1,500.00.",
        expectedError = "no_code",
    ),
    ParserFixture(
        body = "Ksh1,200.00 sent to MARY WANJIRU 0723456789 on 13/4/26 at 10:30 AM. New M-PESA balance is Ksh2,800.00.",
        expectedError = "no_code",
    ),
    ParserFixture(
        body = "LOC1CAFE23 Confirmed. Ksh800.00 paid to LOCAL CAFE on 14/4/26 at 11:45 AM. New M-PESA balance is Ksh4,200.00.",
        expectedKind = "buy_goods",
        expectedAmount = 800.0,
        expectedBalance = 4200.0,
        expectedCounterpartyContains = "LOCAL CAFE",
    ),
    ParserFixture(
        body = "AIR1TIME23 Confirmed. You bought Ksh50.00 of airtime on 15/4/26 at 12:00 PM. New M-PESA balance is Ksh950.00.",
        expectedKind = "airtime",
        expectedAmount = 50.0,
        expectedBalance = 950.0,
    ),
    ParserFixture(
        body = "DEP1OSIT23 Confirmed. Cash deposit of Ksh5,000.00 on 16/4/26 at 1:30 PM. New M-PESA balance is Ksh7,500.00.",
        expectedKind = "deposit",
        expectedAmount = 5000.0,
        expectedBalance = 7500.0,
    ),
    ParserFixture(
        body = "WIT1DRAW23 Confirmed. Ksh2,000.00 withdrawn from agent 1234 - AGENT ONE on 17/4/26 at 2:45 PM. New M-PESA balance is Ksh1,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 2000.0,
        expectedBalance = 1000.0,
    ),

    // --- ATM WITHDRAWALS ---------------------------------------------------------
    ParserFixture(
        body = "QRS1TUV234 Confirmed. Ksh5,000.00 withdrawn from ATM on 12/4/26 at 2:00 PM. New M-PESA balance is Ksh2,000.00.",
        expectedKind = "withdraw",
        expectedAmount = 5000.0,
        expectedBalance = 2000.0,
        expectedCounterpartyContains = "ATM",
    ),
    ParserFixture(
        body = "ATM1WDW234 Confirmed. Ksh2,500.00 withdrawn at EQUITY ATM WESTLANDS on 15/4/26 at 11:00 AM. New M-PESA balance is Ksh7,500.00.",
        expectedKind = "withdraw",
        expectedAmount = 2500.0,
        expectedBalance = 7500.0,
        expectedCounterpartyContains = "EQUITY",
    ),

    // --- IGNORED NOISE VARIANTS --------------------------------------------------
    ParserFixture(
        body = "HHH1A2B3C4 Confirmed. Fuliza M-PESA interest accrued Ksh 1.20 on outstanding balance. Your available limit is Ksh300.00.",
        shouldIgnore = true,
    ),
    ParserFixture(
        body = "III2B3C4D5 Confirmed. Fuliza M-PESA maintenance fee of Ksh 5.00 charged. Outstanding balance Ksh100.00.",
        shouldIgnore = true,
    ),
    ParserFixture(
        body = "JJJ3C4D5E6 Confirmed. Fuliza M-PESA daily charges notification. Access fee charged Ksh 0.50.",
        shouldIgnore = true,
    ),

    // --- FULIZA DRAW — "Interest charged" variant (2025+ format) ----------------
    ParserFixture(
        body = "TGI4HPX4PK Confirmed. Fuliza M-PESA amount is Ksh 100.00. Interest charged Ksh 1.00. Total Fuliza M-PESA outstanding amount is Ksh 724.62 due on 14/08/25. To check daily charges, Dial *334#OK Select Fuliza M-PESA to Query Charges.",
        expectedKind = "fuliza_charge",
        expectedAmount = 1.0,
        expectedCounterpartyContains = "Fuliza",
    ),
    ParserFixture(
        body = "UFPDL9EP4N Confirmed. Fuliza M-PESA amount is Ksh 30.00. Access Fee charged Ksh 0.30. Total Fuliza M-PESA outstanding amount is Ksh723.62 due on 22/07/26. To check daily charges, Dial *334#OK Select Query Charges",
        expectedKind = "fuliza_charge",
        expectedAmount = 0.30,
        expectedCounterpartyContains = "Fuliza",
    ),

    // --- FULIZA REPAYMENT — partial vs full -----------------------------------
    ParserFixture(
        body = "UFGDL8CVOX  Confirmed. Ksh 100.00 from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Your available Fuliza M-PESA limit is Ksh 419.56. Your M-PESA balance is 0.00.",
        expectedKind = "loan",
        expectedAmount = 100.0,
        expectedCounterpartyContains = "Fuliza",
    ),
    ParserFixture(
        body = "UFPDL9G7O1  Confirmed. Ksh 723.62 from your M-PESA has been used to fully pay your outstanding Fuliza M-PESA. Available Fuliza M-PESA limit is Ksh 900.00. Your M-PESA balance is 3076.38.",
        expectedKind = "loan",
        expectedAmount = 723.62,
        expectedCounterpartyContains = "Fuliza",
    ),

    // --- "Give Ksh" cash deposit (new M-PESA format) --------------------------
    ParserFixture(
        body = "TDN9WBCDSD Confirmed. On 23/4/25 at 5:40 PM Give Ksh1,000.00 cash to Fkam Limited Queenix Gate Venture Adams Arcade New M-PESA balance is Ksh1,000.00. You can now access M-PESA via *334#",
        expectedKind = "deposit",
        expectedAmount = 1000.0,
        expectedBalance = 1000.0,
        expectedCounterpartyContains = "Fkam Limited",
    ),
    ParserFixture(
        body = "SHM5WLHPY1 Confirmed. On 22/8/24 at 3:24 PM Give Ksh3,550.00 cash to ABYUM CONTRACTORS & GEN SUPPLIES LTD Small minimart umoja 3 NRB umoja 3 New M-PESA balance is Ksh3,550.00. You can now access M-PESA via *334#",
        expectedKind = "deposit",
        expectedAmount = 3550.0,
        expectedBalance = 3550.0,
    ),

    // --- New reversal format ("Reversal of transaction X has been successfully reversed") ---
    ParserFixture(
        body = "TI27ZWJC3B  confirmed. Reversal of transaction TI26ZVL0L8 has been successfully reversed  on 2/9/25  at 8:31 AM and Ksh100.00 is debited from your M-PESA account. New M-PESA account balance is Ksh1,758.00.",
        expectedKind = "reversal",
        expectedAmount = 100.0,
        expectedBalance = 1758.0,
    ),
    ParserFixture(
        body = "SH15IQQ2T9 confirmed. Reversal of transaction SGV1INNQOH has been successfully reversed  on 1/8/24  at 2:23 AM and Ksh6,319.00 is credited to your M-PESA account. New M-PESA account balance is Ksh6,319.00.",
        expectedKind = "reversal",
        expectedAmount = 6319.0,
        expectedBalance = 6319.0,
    ),

    // --- "Ksh Ksh" double prefix — ZIIDI received (should still parse) --------
    ParserFixture(
        body = "SLR41L5AO8 Confirmed.You have received Ksh Ksh4,870.00 from ZIIDI on 27/12/24 3:41 PM New M-PESA balance is Ksh Ksh4,870.00. Separate personal and business funds through Pochi la Biashara on *334#.",
        expectedKind = "received",
        expectedAmount = 4870.0,
        expectedCounterpartyContains = "ZIIDI",
    ),

    // --- Regular M-PESA with Fuliza promo footer (NOT a Fuliza tx) ------------
    ParserFixture(
        body = "SCI1G5CAWL Confirmed. Ksh175.00 sent to PAUL OWAYO 0712345678 on 18/3/24 at 7:56 PM. New M-PESA balance is Ksh0.00. Transaction cost, Ksh7.00. Amount you can transact within the day is 495,765.00. Pay for Goods, Withdraw & Send money Worry FREE! Join FULIZA, Dial *234*0#",
        expectedKind = "sent",
        expectedAmount = 175.0,
        expectedCounterpartyContains = "PAUL",
    ),

    // --- Balance inquiry (should be rejected, not a transaction) ---------------
    ParserFixture(
        body = "UB6DL632FM Confirmed. Your account balance was: M-PESA Account : Ksh0.00 Business Account : Ksh0.00 on 6/2/26 at 5:19 PM. Transaction cost, Ksh0.00. Start Investing today with Ziidi MMF & earn daily. Dial *334#",
        expectedError = "balance_inquiry",
    ),

    // --- Cancelled transaction (should be rejected) ----------------------------
    ParserFixture(
        body = "You have cancelled the transaction of KSH50.00. Kindly note that if you cancel 5 times, you will be barred from using M-PESA HAKIKISHA. Your M-PESA balance is KSH0.00.",
        expectedError = "cancelled",
    ),
)


val allFixtures: List<ParserFixture> = legacyFixtures + realWorldFixtures
