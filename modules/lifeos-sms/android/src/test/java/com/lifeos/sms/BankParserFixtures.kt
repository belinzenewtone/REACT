package com.lifeos.sms

data class BankFixture(
    val sender: String,
    val body: String,
    val expectedInstitution: String,
    val expectedAmount: Double? = null,
    val expectedDirection: String? = null,
    val expectedRef: String? = null,
    val shouldBeServiceNotice: Boolean = false,
    val expectedCrossRefMpesaCode: String? = null,
)

val ncbaFixtures: List<BankFixture> = listOf(
    BankFixture(
        sender = "NCBALOOP",
        body = "BELINZE, Online transaction of KES.250.00 has been approved on your card ending **8283 at GOOGLE *Google One. Forex Adjustment, KES.8.75 on 29/07/2025 16:56:01. If it's not yours, please call Loop 0730 714444/0709 714444 urgently.",
        expectedInstitution = "ncba",
        expectedAmount = 250.0,
        expectedDirection = "debit",
    ),
    BankFixture(
        sender = "NCBALOOP",
        body = "An airtime purchase of KES.600.00 from your LOOP account has been completed on 29/07/2025 18:44PM. LOOP ref NHLEQ22R7SEB",
        expectedInstitution = "ncba",
        expectedAmount = 600.0,
        expectedDirection = "debit",
        expectedCrossRefMpesaCode = "NHLEQ22R7SEB",
    ),
    BankFixture(
        sender = "NCBALOOP",
        body = "Dear BELINZE, you have received KES.25,000.00 into your account. LOOP Ref NHLEQ222C6TR. 29/07/2025 05:34:47.",
        expectedInstitution = "ncba",
        expectedAmount = 25000.0,
        expectedDirection = "credit",
        expectedCrossRefMpesaCode = "NHLEQ222C6TR",
    ),
    BankFixture(
        sender = "NCBALOOP",
        body = "Dear BELINZE! You have successfully transfered KES.280.00 from 44******4117 to wallet.",
        expectedInstitution = "ncba",
        expectedAmount = 280.0,
        expectedDirection = "debit",
    ),
    BankFixture(
        sender = "NCBA_BANK",
        body = "Dear Customer, Our NCBA NOW app and USSD code *488# Mobile Banking services have been restored. Thank you for your patience.",
        expectedInstitution = "ncba",
        shouldBeServiceNotice = true,
    ),
    BankFixture(
        sender = "NCBA_BANK",
        body = "Dear Customer, in celebration of the new year holiday, our branches will remain closed on Thursday, 1st January 2026.",
        expectedInstitution = "ncba",
        shouldBeServiceNotice = true,
    ),
)

val equityFixtures: List<BankFixture> = listOf(
    BankFixture(
        sender = "EQUITY",
        body = "Your payment of 270 KES to SAMUEL MAINA 0712345678 was successful. Ref. AC8C5B6D1B147 on 11/04/2025 at 13:58. Charges 0 KES",
        expectedInstitution = "equity",
        expectedAmount = 270.0,
        expectedDirection = "debit",
    ),
    BankFixture(
        sender = "EQUITY",
        body = "Never share this code with anyone, including us. Use code 082017 to send 50.00 KES to 0712345678 via MPesa.",
        expectedInstitution = "equity",
        shouldBeServiceNotice = true,
    ),
    BankFixture(
        sender = "EQUITY",
        body = "Your airtime purchase of 50 KES for Safaricom 0712345678 was successful. Ref. A908899BD8AB2 on 31 Mar 2025 at 19:04 EAT. Charges 0 KES",
        expectedInstitution = "equity",
        expectedAmount = 50.0,
        expectedDirection = "debit",
    ),
    BankFixture(
        sender = "EQUITY",
        body = "22000.00 KES has been successfully sent to Belinze Newtone Ojing 0712345678 INVESTMENT & MORGAGES BANK. Ref. AA0A2B6FAA8EA on 02 Apr 2025 at 09:30 EAT. Charges 59.76 KES",
        expectedInstitution = "equity",
        expectedAmount = 22000.0,
        expectedDirection = "debit",
    ),
)

val kcbFixtures: List<BankFixture> = listOf(
    BankFixture(
        sender = "KCB",
        body = "MBNHE7LGVNK8K5OH Completed. Your SEND TO M-PESA request of KES 409.00 from 134****073 to 254****586 - BELINZE NEWTONE OJING at 2026-03-30 02:27:07 PM has been processed successfully. Transaction cost KES 11.00",
        expectedInstitution = "kcb",
        expectedAmount = 409.0,
        expectedDirection = "debit",
    ),
    BankFixture(
        sender = "KCB",
        body = "MBNHE7LGVNK8K5OH Confirmed! You have received KES 409.00 from BELINZE NEWTONE OJING - 134****073 at 2026-03-30 02:27:07 PM via KCB.",
        expectedInstitution = "kcb",
        expectedAmount = 409.0,
        expectedDirection = "credit",
    ),
    BankFixture(
        sender = "KCB",
        body = "Ksh 170.00 sent to KCB account METRALIFEKENYALIMITED 8034610 has been received on 30/03/2026 at 08:48 AM. M-PESA Ref UCUDLB7GY3.",
        expectedInstitution = "kcb",
        expectedAmount = 170.0,
        expectedDirection = "credit",
        expectedCrossRefMpesaCode = "UCUDLB7GY3",
    ),
)

val stanchartFixtures: List<BankFixture> = listOf(
    BankFixture(
        sender = "STANCHART",
        body = "Dear Client, KES 1110.00 has been credited to your account ending with 2600 from MPESA. For any queries call +254 20 3293900",
        expectedInstitution = "stanchart",
        expectedAmount = 1110.0,
        expectedDirection = "credit",
    ),
    BankFixture(
        sender = "STANCHART",
        body = "Dear Client, our Online Banking/SC Mobile app will be temporarily unavailable today 4 April 2026 from 10pm to 11pm, as part of scheduled system enhancements.",
        expectedInstitution = "stanchart",
        shouldBeServiceNotice = true,
    ),
    BankFixture(
        sender = "STANCHART",
        body = "Dear Client, we will never call you and ask for your Visa debit or credit card details such as PIN, expiry details or CVV number. Do not share these with anyone.",
        expectedInstitution = "stanchart",
        shouldBeServiceNotice = true,
    ),
)

val allBankFixtures: List<BankFixture> = ncbaFixtures + equityFixtures + kcbFixtures + stanchartFixtures
