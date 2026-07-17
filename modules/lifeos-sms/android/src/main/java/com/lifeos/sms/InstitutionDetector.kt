package com.lifeos.sms

object InstitutionDetector {
    data class Detection(val institutionId: String, val tier: Int)

    /**
     * Single source of truth for an institution and all its brands/subsidiaries.
     *
     * To add a new bank:      append an Institution entry to INSTITUTIONS.
     * To add a subsidiary:    add its sender ID to the parent's senderIds set.
     *   e.g. Loop (NCBA) → senderIds = setOf("NCBA", "NCBABANK", "LOOP", "NCBALOOP")
     * To add a body fallback: add a keyword to bodyKeywords.
     */
    private data class Institution(
        val id: String,
        val senderIds: Set<String>,     // exact or substring-matched sender IDs (uppercase)
        val bodyKeywords: List<String>, // body-text fallback when sender is unrecognised
    )

    private val INSTITUTIONS = listOf(
        Institution(
            id           = "mpesa",
            senderIds    = setOf("MPESA", "M-PESA", "M_PESA"),
            bodyKeywords = listOf("MPESA", "M-PESA"),
        ),
        Institution(
            // KCB + Vooma (KCB's mobile wallet subsidiary).
            id           = "kcb",
            senderIds    = setOf("KCBBANK", "KCB", "VOOMA", "KCBVOOMA"),
            bodyKeywords = listOf("KCB Account", "KCB Balance", "KCB Ref", "KCB Vooma", "Vooma Wallet"),
        ),
        Institution(
            // Equity Bank + Equity Mobile (formerly EazzyBanking, migrated 2024).
            // Real sender seen in wild: "EquityBank" → uppercased "EQUITYBANK".
            id           = "equity",
            senderIds    = setOf("EQUITYBNK", "EQUITY", "EQUITYBANK", "EQUITYBK", "EAZZYBK"),
            bodyKeywords = listOf("Equity Bank", "EquityBank", "Equity Mobile", "EazzyBanking"),
        ),
        Institution(
            // Co-operative Bank + MCo-op Cash mobile wallet.
            id           = "coopbank",
            senderIds    = setOf("COOPBANK", "COOPBNK", "MCOOPBANK", "COOPCASH"),
            bodyKeywords = listOf("Co-operative Bank", "Coop Bank", "MCo-op Cash", "Co-op Bank"),
        ),
        Institution(
            // NCBA + Loop (NCBA's digital banking subsidiary).
            // Confirmed sender IDs: "NCBALOOP" and "NCBA_LOOP" (source: loop.co.ke/company FAQ).
            // Real sender seen in wild: "NCBA_BANK" — Loop migrated transaction SMS
            // to this sender from August 2025 per in-app notification.
            id           = "ncba",
            senderIds    = setOf("NCBA", "NCBABANK", "NCBA_BANK", "LOOP", "NCBALOOP", "NCBA_LOOP"),
            bodyKeywords = listOf("NCBA Bank", "NCBABank", "Loop by NCBA", "NCBA Loop", "LOOP Bank"),
        ),
        Institution(
            id           = "absa",
            senderIds    = setOf("ABSA", "ABSAKENYA"),
            bodyKeywords = listOf("Absa Bank", "ABSA Kenya", "Absa Kenya"),
        ),
        Institution(
            id           = "stanchart",
            senderIds    = setOf("STANCHART", "SCB", "SCBANK"),
            bodyKeywords = listOf("Standard Chartered", "StanChart", "Standard Chartered Bank"),
        ),
        Institution(
            id           = "dtb",
            senderIds    = setOf("DTBKENYA", "DTB", "DTBANK"),
            bodyKeywords = listOf("Diamond Trust", "DTB Bank", "DTB Kenya"),
        ),
        Institution(
            id           = "family",
            senderIds    = setOf("FAMILYBNK", "FAMILYBK", "FAMILYBANK"),
            bodyKeywords = listOf("Family Bank", "Family Bank Kenya"),
        ),
        Institution(
            id           = "im",
            senderIds    = setOf("IMBANK", "IMBANKKE"),
            bodyKeywords = listOf("I&M Bank", "I and M Bank", "IM Bank"),
        ),
        Institution(
            id           = "stanbic",
            senderIds    = setOf("STANBIC", "STANBICKE"),
            bodyKeywords = listOf("Stanbic Bank", "Stanbic Kenya"),
        ),
        Institution(
            // PesaLink is the KBA interbank transfer network (IPSL).
            // It sends its own SMS separate from the originating bank's SMS.
            id           = "pesalink",
            senderIds    = setOf("PESALINK", "IPSL"),
            bodyKeywords = listOf("PesaLink", "PESALINK", "Integrated Payment Services"),
        ),
        Institution(
            id           = "airtel",
            senderIds    = setOf("AIRTEL", "AIRTEL MONEY", "AIRTELMONEY"),
            bodyKeywords = listOf("Airtel Money"),
        ),
        Institution(
            // T-Kash is Telkom Kenya's mobile money service.
            id           = "tkash",
            senderIds    = setOf("T-KASH", "TKASH", "TELKOM", "TELKOMKE"),
            bodyKeywords = listOf("T-Kash", "TKash", "Telkom Money"),
        ),
        Institution(
            // SBM Bank Kenya (formerly Chase Bank Kenya, restructured 2018).
            id           = "sbm",
            senderIds    = setOf("SBMBANK", "SBM"),
            bodyKeywords = listOf("SBM Bank", "SBM Kenya"),
        ),
        Institution(
            // HF Group (Housing Finance Company of Kenya).
            id           = "hfgroup",
            senderIds    = setOf("HFGROUP", "HFBANK", "HFCK"),
            bodyKeywords = listOf("HF Group", "Housing Finance", "HFCK"),
        ),
        Institution(
            // Gulf African Bank — Kenya's first fully Sharia-compliant bank.
            id           = "gulf",
            senderIds    = setOf("GULFBANK", "GULF", "GAFBANK"),
            bodyKeywords = listOf("Gulf African Bank", "Gulf Bank"),
        ),
        Institution(
            // Bank of Africa Kenya.
            id           = "boa",
            senderIds    = setOf("BOAKENYA", "BOA", "BANKOFAFRICA"),
            bodyKeywords = listOf("Bank of Africa", "BOA Kenya"),
        ),
        Institution(
            // Prime Bank Kenya.
            id           = "primebank",
            senderIds    = setOf("PRIMEBANK", "PRIMEBK"),
            bodyKeywords = listOf("Prime Bank", "Prime Bank Kenya"),
        ),
    )

    // Flat sender-ID → institution-id index for O(1) exact lookup.
    private val SENDER_INDEX: Map<String, String> =
        INSTITUTIONS.flatMap { inst -> inst.senderIds.map { it to inst.id } }.toMap()

    fun detect(sender: String, body: String): Detection? {
        val upper = sender.trim().uppercase()

        // Tier 1a: exact sender match
        SENDER_INDEX[upper]?.let { return Detection(it, tier = 1) }

        // Tier 1b: sender contains a known ID — catches composite names like
        // NCBALOOP, KCBMOBILE, or any future BankXYZ variants automatically.
        for (inst in INSTITUTIONS) {
            if (inst.senderIds.any { upper.contains(it) })
                return Detection(inst.id, tier = 1)
        }

        // Tier 2: body-text keyword fallback when sender is unknown or generic.
        for (inst in INSTITUTIONS) {
            if (inst.bodyKeywords.any { body.contains(it, ignoreCase = true) })
                return Detection(inst.id, tier = 2)
        }

        return null
    }

    fun isFinancialSms(sender: String, body: String): Boolean = detect(sender, body) != null
}
