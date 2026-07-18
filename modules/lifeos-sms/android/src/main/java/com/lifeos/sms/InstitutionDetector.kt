package com.lifeos.sms

object InstitutionDetector {
    data class Detection(val institutionId: String, val tier: Int)

    /**
     * Single source of truth for an institution and all its brands/subsidiaries.
     *
     * To add a new bank:      append an Institution entry to INSTITUTIONS.
     * To add a subsidiary:    add its sender ID to the parent's senderIds set.
     * To add a body fallback: add a keyword to bodyKeywords.
     *
     * Sender IDs are matched both exactly (Tier 1a) and as substrings of the
     * incoming sender string (Tier 1b) — so "KCBMOBILE" matches the "KCB" entry
     * automatically without being listed explicitly.
     */
    private data class Institution(
        val id: String,
        val senderIds: Set<String>,     // exact or substring-matched sender IDs (uppercase)
        val bodyKeywords: List<String>, // body-text fallback when sender is unrecognised
    )

    private val INSTITUTIONS = listOf(

        // ── Mobile money ────────────────────────────────────────────────────

        Institution(
            id           = "mpesa",
            senderIds    = setOf("MPESA", "M-PESA", "M_PESA"),
            bodyKeywords = listOf("MPESA", "M-PESA"),
        ),
        Institution(
            // Airtel Money Kenya
            id           = "airtel",
            senderIds    = setOf("AIRTEL", "AIRTELMONEY", "AIRTEL MONEY", "AIRTELKE"),
            bodyKeywords = listOf("Airtel Money", "AirtelMoney"),
        ),
        Institution(
            // T-Kash — Telkom Kenya's mobile money service
            id           = "tkash",
            senderIds    = setOf("T-KASH", "TKASH", "TELKOM", "TELKOMKE", "TELKOMMONEY"),
            bodyKeywords = listOf("T-Kash", "TKash", "Telkom Money", "T-Kash wallet"),
        ),

        // ── Tier 1 banks ────────────────────────────────────────────────────

        Institution(
            // KCB Group + KCB Vooma mobile wallet + KCB M-Pesa
            id           = "kcb",
            senderIds    = setOf("KCB", "KCBBANK", "KCBGROUP", "KCBMOBILE", "VOOMA", "KCBVOOMA", "KCB-VOOMA"),
            bodyKeywords = listOf("KCB Account", "KCB Balance", "KCB Ref", "KCB Vooma", "Vooma Wallet", "KCB Bank"),
        ),
        Institution(
            // Equity Bank + Equity Mobile (formerly EazzyBanking, rebranded 2024)
            id           = "equity",
            senderIds    = setOf("EQUITY", "EQUITYBNK", "EQUITYBANK", "EQUITYBK", "EQUITYMOBILE", "EAZZYBK", "EAZZYBANK"),
            bodyKeywords = listOf("Equity Bank", "EquityBank", "Equity Mobile", "EazzyBanking", "Equity Group"),
        ),
        Institution(
            // Co-operative Bank of Kenya + MCo-op Cash
            id           = "coopbank",
            senderIds    = setOf("COOPBANK", "COOPBNK", "MCOOPBANK", "COOPCASH", "COOP", "CO-OPBANK"),
            bodyKeywords = listOf("Co-operative Bank", "Coop Bank", "MCo-op Cash", "Co-op Bank", "Co-operative Bank of Kenya"),
        ),
        Institution(
            // NCBA Bank + Loop (NCBA's digital banking brand)
            // NCBA_BANK confirmed in wild from Aug 2025 Loop migration.
            id           = "ncba",
            senderIds    = setOf("NCBA", "NCBABANK", "NCBA_BANK", "NCBAGROUP", "LOOP", "NCBALOOP", "NCBA_LOOP", "LOOPBANK"),
            bodyKeywords = listOf("NCBA Bank", "NCBABank", "Loop by NCBA", "NCBA Loop", "LOOP Bank", "NCBA Group"),
        ),

        // ── Tier 2 banks ────────────────────────────────────────────────────

        Institution(
            // Absa Bank Kenya (formerly Barclays Bank of Kenya, rebranded 2020)
            id           = "absa",
            senderIds    = setOf("ABSA", "ABSAKENYA", "ABSABANK", "BARCLAYS", "BARCLAYSKE"),
            bodyKeywords = listOf("Absa Bank", "ABSA Kenya", "Absa Kenya", "Barclays Bank Kenya"),
        ),
        Institution(
            // Standard Chartered Bank Kenya
            id           = "stanchart",
            senderIds    = setOf("STANCHART", "SCB", "SCBANK", "STANDARDCHARTERED", "STDCHARTERED"),
            bodyKeywords = listOf("Standard Chartered", "StanChart", "Standard Chartered Bank", "SC Bank"),
        ),
        Institution(
            // Diamond Trust Bank (DTB)
            id           = "dtb",
            senderIds    = setOf("DTB", "DTBKENYA", "DTBANK", "DTBBANK", "DIAMONDTRUST"),
            bodyKeywords = listOf("Diamond Trust Bank", "DTB Bank", "DTB Kenya", "Diamond Trust"),
        ),
        Institution(
            // Family Bank Kenya
            id           = "family",
            senderIds    = setOf("FAMILYBANK", "FAMILYBNK", "FAMILYBK", "FAMILYBANKKE"),
            bodyKeywords = listOf("Family Bank", "Family Bank Kenya"),
        ),
        Institution(
            // I&M Bank Kenya
            id           = "im",
            senderIds    = setOf("IMBANK", "IMBANKKE", "I&MBANK", "IANDMBANK"),
            bodyKeywords = listOf("I&M Bank", "I and M Bank", "IM Bank", "I&M"),
        ),
        Institution(
            // Stanbic Bank Kenya (subsidiary of Standard Bank Group)
            id           = "stanbic",
            senderIds    = setOf("STANBIC", "STANBICKE", "STANBICBANK"),
            bodyKeywords = listOf("Stanbic Bank", "Stanbic Kenya", "Stanbic Bank Kenya"),
        ),

        // ── Tier 3 / specialist banks ────────────────────────────────────────

        Institution(
            // SBM Bank Kenya (formerly Chase Bank Kenya, restructured 2018)
            id           = "sbm",
            senderIds    = setOf("SBM", "SBMBANK", "SBMKENYA", "SBMBANKKE"),
            bodyKeywords = listOf("SBM Bank", "SBM Kenya", "SBM Bank Kenya"),
        ),
        Institution(
            // HF Group (Housing Finance Company of Kenya)
            id           = "hfgroup",
            senderIds    = setOf("HFGROUP", "HFBANK", "HFCK", "HFGROUPKE"),
            bodyKeywords = listOf("HF Group", "Housing Finance", "HFCK", "HF Bank"),
        ),
        Institution(
            // Gulf African Bank — Kenya's first fully Sharia-compliant bank
            id           = "gulf",
            senderIds    = setOf("GULF", "GULFBANK", "GAFBANK", "GULFAFRICAN"),
            bodyKeywords = listOf("Gulf African Bank", "Gulf Bank Kenya", "Gulf Bank"),
        ),
        Institution(
            // Bank of Africa Kenya
            id           = "boa",
            senderIds    = setOf("BOA", "BOAKENYA", "BANKOFAFRICA", "BOABANK"),
            bodyKeywords = listOf("Bank of Africa", "BOA Kenya", "Bank of Africa Kenya"),
        ),
        Institution(
            // Prime Bank Kenya
            id           = "primebank",
            senderIds    = setOf("PRIMEBANK", "PRIMEBK", "PRIMEBANKKE"),
            bodyKeywords = listOf("Prime Bank", "Prime Bank Kenya"),
        ),
        Institution(
            // Consolidated Bank of Kenya
            id           = "consolidated",
            senderIds    = setOf("CONSOLIDATEDBANK", "CONSOBANK", "CONSO"),
            bodyKeywords = listOf("Consolidated Bank", "Consolidated Bank of Kenya"),
        ),
        Institution(
            // Credit Bank Kenya
            id           = "creditbank",
            senderIds    = setOf("CREDITBANK", "CREDITBNK", "CREDITBANKKE"),
            bodyKeywords = listOf("Credit Bank", "Credit Bank Kenya"),
        ),
        Institution(
            // Sidian Bank Kenya (formerly K-Rep Bank)
            id           = "sidian",
            senderIds    = setOf("SIDIAN", "SIDIANBANK", "KREP", "KREPBANK"),
            bodyKeywords = listOf("Sidian Bank", "Sidian", "K-Rep Bank"),
        ),
        Institution(
            // Kingdom Bank Kenya (formerly Jamii Bora Bank)
            id           = "kingdom",
            senderIds    = setOf("KINGDOM", "KINGDOMBANK", "JAMIIBORA"),
            bodyKeywords = listOf("Kingdom Bank", "Jamii Bora"),
        ),
        Institution(
            // Victoria Commercial Bank
            id           = "victoria",
            senderIds    = setOf("VICTORIABANK", "VCB", "VCBANK"),
            bodyKeywords = listOf("Victoria Commercial Bank", "Victoria Bank"),
        ),
        Institution(
            // Equity BCDC (DRC subsidiary — relevant for cross-border)
            id           = "equitybcdc",
            senderIds    = setOf("EQUITYBCDC", "BCDC"),
            bodyKeywords = listOf("Equity BCDC", "BCDC"),
        ),
        Institution(
            // Guardian Bank Kenya
            id           = "guardian",
            senderIds    = setOf("GUARDIANBANK", "GUARDIAN"),
            bodyKeywords = listOf("Guardian Bank", "Guardian Bank Kenya"),
        ),
        Institution(
            // Trans-National Bank Kenya (merged into NCBA 2020 — legacy SMS still in inboxes)
            id           = "transnational",
            senderIds    = setOf("TRANSNATIONAL", "TNB", "TNBKE"),
            bodyKeywords = listOf("Trans-National Bank", "TNB Kenya"),
        ),

        // ── Interbank / payment networks ────────────────────────────────────

        Institution(
            // PesaLink — KBA interbank transfer network (IPSL)
            id           = "pesalink",
            senderIds    = setOf("PESALINK", "IPSL", "KBAPESALINK"),
            bodyKeywords = listOf("PesaLink", "PESALINK", "Integrated Payment Services", "KBA PesaLink"),
        ),
    )

    // O(1) exact sender-ID → institution-id lookup built at class-load time.
    private val SENDER_INDEX: Map<String, String> =
        INSTITUTIONS.flatMap { inst -> inst.senderIds.map { it to inst.id } }.toMap()

    // Pre-lowercased body keyword → institution-id pairs for a single-pass Tier 2 scan.
    private val BODY_KEYWORD_INDEX: List<Pair<String, String>> =
        INSTITUTIONS.flatMap { inst -> inst.bodyKeywords.map { it.lowercase() to inst.id } }

    fun detect(sender: String, body: String): Detection? {
        val upper = sender.trim().uppercase()

        // Tier 1a: exact sender-ID match
        SENDER_INDEX[upper]?.let { return Detection(it, tier = 1) }

        // Tier 1b: sender contains a known ID — catches composite names like
        // NCBALOOP, KCBMOBILE, EQUITYBANK, or any future BankXYZ variants.
        for (inst in INSTITUTIONS) {
            if (inst.senderIds.any { upper.contains(it) })
                return Detection(inst.id, tier = 1)
        }

        // Tier 2: body-text keyword fallback — body lowercased once at call site,
        // keywords pre-lowercased at class-load time.
        val bodyLower = body.lowercase()
        for ((keyword, id) in BODY_KEYWORD_INDEX) {
            if (bodyLower.contains(keyword)) return Detection(id, tier = 2)
        }

        return null
    }

    fun isFinancialSms(sender: String, body: String): Boolean = detect(sender, body) != null
}
