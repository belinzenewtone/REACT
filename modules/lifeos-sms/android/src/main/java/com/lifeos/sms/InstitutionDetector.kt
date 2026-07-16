package com.lifeos.sms

object InstitutionDetector {
    data class Detection(val institutionId: String, val tier: Int)

    private val SENDER_MAP: Map<String, String> = mapOf(
        "MPESA" to "mpesa", "M-PESA" to "mpesa", "M_PESA" to "mpesa",
        "KCBBANK" to "kcb", "KCB" to "kcb",
        "EQUITYBNK" to "equity", "EQUITY" to "equity",
        "COOPBANK" to "coopbank", "COOPBNK" to "coopbank",
        "NCBA" to "ncba", "NCBABANK" to "ncba",
        "ABSA" to "absa",
        "STANCHART" to "stanchart", "SCB" to "stanchart",
        "DTBKENYA" to "dtb", "DTB" to "dtb",
        "FAMILYBNK" to "family",
        "IMBANK" to "im",
        "STANBIC" to "stanbic",
        "AIRTEL" to "airtel",
        "T-KASH" to "tkash", "TKASH" to "tkash",
    )

    private data class BodyPrint(val id: String, val keywords: List<String>)
    private val BODY_PRINTS = listOf(
        BodyPrint("mpesa", listOf("MPESA", "M-PESA")),
        BodyPrint("kcb", listOf("KCB Account", "KCB Balance", "KCB Ref")),
        BodyPrint("equity", listOf("Equity Bank", "EquityBank")),
        BodyPrint("coopbank", listOf("Co-operative Bank", "Coop Bank")),
        BodyPrint("ncba", listOf("NCBA Bank", "NCBABank")),
        BodyPrint("absa", listOf("Absa Bank", "ABSA Kenya")),
        BodyPrint("stanchart", listOf("Standard Chartered", "StanChart")),
        BodyPrint("dtb", listOf("Diamond Trust", "DTB Bank")),
        BodyPrint("stanbic", listOf("Stanbic Bank")),
        BodyPrint("airtel", listOf("Airtel Money")),
    )

    fun detect(sender: String, body: String): Detection? {
        val upper = sender.trim().uppercase()
        SENDER_MAP[upper]?.let { return Detection(it, tier = 1) }
        for ((key, id) in SENDER_MAP) {
            if (upper.contains(key)) return Detection(id, tier = 1)
        }
        for (fp in BODY_PRINTS) {
            if (fp.keywords.any { body.contains(it, ignoreCase = true) })
                return Detection(fp.id, tier = 2)
        }
        return null
    }

    fun isFinancialSms(sender: String, body: String): Boolean = detect(sender, body) != null
}
