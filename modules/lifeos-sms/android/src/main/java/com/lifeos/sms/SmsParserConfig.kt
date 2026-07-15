package com.lifeos.sms

/**
 * Detection rules and static configuration for the LifeOS SMS parser.
 *
 * All Regex objects are compiled once at class initialisation and reused for
 * every subsequent SMS — never allocate Regex inside a parse call.
 *
 * Rule ORDER IS CRITICAL: more-specific rules must precede general ones.
 * e.g. REVERSAL before RECEIVED, AIRTIME before PAYBILL, PAYBILL before BUY_GOODS.
 */
internal object SmsParserConfig {

    // ─── Domain enums ──────────────────────────────────────────────────

    enum class SmsCategory {
        RECEIVED, SENT, AIRTIME, PAYBILL, BUY_GOODS,
        DEPOSIT, WITHDRAW, REVERSED, LOAN, FULIZA_CHARGE, UNKNOWN
    }

    enum class Confidence { HIGH, MEDIUM, LOW }

    // ─── Core extraction regexes ───────────────────────────────────────

    /**
     * M-Pesa transaction confirmation code — 9-10 uppercase alphanumeric chars with
     * AT LEAST ONE LETTER required. Uppercase-only matching excludes mixed-case English
     * words ("Confirmed", "received") while accepting both all-alpha codes (e.g.
     * "UGFDLBONAZ") and mixed codes (e.g. "QHL6ZKMF10"). The letter requirement stops
     * 10-digit phone numbers (0712345678) from matching as a code.
     */
    val CODE_RE = Regex("""\b(?=[A-Z0-9]*[A-Z])([A-Z0-9]{9,10})\b""")

    /** Primary amount — first Ksh/KES figure in the message. */
    val AMOUNT_RE = Regex("""(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)

    /** M-Pesa balance after the transaction. */
    val BALANCE_RE = Regex(
        """(?:new\s*)?(?:m-pesa\s*)?(?:available\s*)?balance\s*(?:is\s*)?\s*(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Transaction fee / cost. */
    val FEE_RE = Regex(
        """(?:transaction\s+cost|fee|charge|access\s+fee|withdrawal\s+charges?)[,.]?\s*(?:(?:Ksh|KES)\s?)?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Date with optional time — e.g. "3/7/25 at 2:30 PM", "3-7-2025 14:30", "2025-07-03",
     *  "3-JUL-25", "Jul 3, 2025", "3 Jul 2025 at 2:30:15 PM". */
    val DATE_RE = Regex(
        """(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-[A-Za-z]{3,9}-\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})(?:\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?))?""",
        RegexOption.IGNORE_CASE,
    )

    /** Fuliza outstanding balance (in charge-notice SMS). */
    val FULIZA_OUTSTANDING_RE = Regex(
        """Total Fuliza M-PESA outstanding amount is\s*(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Fuliza available limit (in repayment SMS). */
    val FULIZA_AVAIL_LIMIT_RE = Regex(
        """available Fuliza M-PESA limit is\s*(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Fuliza access fee in charge-notice SMS. */
    val FULIZA_ACCESS_FEE_RE = Regex(
        """(?:access\s+fee|maintenance\s+fee)\s*(?:charged\s*)?(?:(?:Ksh|KES)\s?)?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Repayment amount in Fuliza repayment SMS — the figure before "from your M-PESA". */
    val LOAN_REPAYMENT_AMOUNT_RE = Regex(
        """(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)\s+from your M-PESA""",
        RegexOption.IGNORE_CASE,
    )

    /** Fuliza limit assignment / increase notice: "your Fuliza M-PESA limit is Ksh X". */
    val FULIZA_LIMIT_ASSIGNMENT_RE = Regex(
        """your\s+fuliza\s+m-pesa\s+limit\s+is\s+(?:Ksh|KES)\s?([\d,]+(?:\.\d{1,2})?)""",
        RegexOption.IGNORE_CASE,
    )

    /** Detects reversal of a received payment (net effect = money leaves balance). */
    val RECEIVED_REVERSED_RE = Regex(
        """(?:your\s+m-pesa\s+transaction\s+)?(?:received|you have received)\s+(?:Ksh|KES)\s?[\d,.]+.+has been reversed""" +
        """|(?:transaction of\s+)?(?:Ksh|KES)\s?[\d,.]+\s+received from.+has been reversed""",
        RegexOption.IGNORE_CASE,
    )

    /** Fast whitespace normaliser — collapse all runs to single space. */
    val WS_RE = Regex("""\s+""")

    // ─── Fuliza service-notice filter ──────────────────────────────────
    // Single compiled regex — one pass instead of N string.contains() calls.
    val FULIZA_NOTICE_RE = Regex(
        """access fee charged|outstanding amount is|daily charges|""" +
        """query charges|select query charges|interest accrual|""" +
        """interest charged|interest accrued|maintenance fee|""" +
        """overdraft balance|overdraft notice|fuliza service charge|""" +
        """overdue charge|late payment fee|rollover fee|penalty fee|""" +
        """processing fee charged|your fuliza m-pesa balance""",
        RegexOption.IGNORE_CASE,
    )

    // ─── Category → app category mapping ──────────────────────────────

    val APP_CATEGORY: Map<SmsCategory, String> = mapOf(
        SmsCategory.RECEIVED      to "income",
        SmsCategory.SENT          to "transfer",
        SmsCategory.AIRTIME       to "airtime",
        SmsCategory.PAYBILL       to "utilities",
        SmsCategory.BUY_GOODS     to "shopping",
        SmsCategory.DEPOSIT       to "savings",
        SmsCategory.WITHDRAW      to "withdrawal",
        SmsCategory.REVERSED      to "miscellaneous",
        SmsCategory.LOAN          to "fuliza",
        SmsCategory.FULIZA_CHARGE to "fuliza",
        SmsCategory.UNKNOWN       to "uncategorized",
    )

    /**
     * Refines the broad category using the counterparty name for merchant-aware
     * categorization. Falls back to the base APP_CATEGORY mapping when no specific
     * match is found.
     *
     * Covers major Kenyan paybill operators, retailers, and service categories.
     */
    fun refineAppCategory(category: SmsCategory, counterparty: String?, amount: Double? = null): String {
        val base = APP_CATEGORY[category] ?: "uncategorized"
        if (counterparty.isNullOrBlank()) {
            // Amount-based fallback when no merchant string is available
            return amount?.let { amountHeuristicCategory(it, category) } ?: base
        }

        val cp = counterparty.lowercase().replace(WS_RE, " ")

        // Always keep unambiguous M-Pesa semantic types as-is — no merchant override
        // and no amount heuristic. This mirrors CategoryInferenceEngine.infer() in the
        // Kotlin reference, where SENT -> Transfer and AIRTIME -> Airtime directly.
        if (category == SmsCategory.RECEIVED || category == SmsCategory.DEPOSIT ||
            category == SmsCategory.WITHDRAW  || category == SmsCategory.LOAN   ||
            category == SmsCategory.FULIZA_CHARGE || category == SmsCategory.REVERSED ||
            category == SmsCategory.SENT || category == SmsCategory.AIRTIME
        ) return base

        return when {
            // ── Utilities ─────────────────────────────────────────────────────
            cp.containsAny("kplc", "kenya power", "ketraco", "kenya electricity") -> "utilities"
            cp.containsAny("nairobi water", "nwsc", "nms water", "nairobiwater") -> "utilities"
            cp.containsAny("county water", "mombasa water", "nakuru water", "kisumu water") -> "utilities"
            cp.containsAny("nita", "niwater", "tanathi water") -> "utilities"
            cp.containsAny("ntsa", "national transport") -> "miscellaneous"

            // ── Telecoms / Airtime ─────────────────────────────────────────────
            cp.containsAny("safaricom", "airtel", "telkom", "faiba", "telkomkenya") -> "airtime"

            // ── Food & Restaurants ─────────────────────────────────────────────
            cp.containsAny("uber eats", "jumia food", "glovo", "bolt food") -> "food"
            cp.containsAny("restaurant", "grill", "kitchen", "eatery", "diner") -> "food"
            cp.containsAny("java house", "artcaffe", "kfc", "domino", "pizza") -> "food"
            cp.containsAny("burger", "chicken inn", "galitos", "steers") -> "food"
            cp.containsAny("cafe", "bakery", "coffee") -> "food"

            // ── Groceries / Supermarkets ───────────────────────────────────────
            cp.containsAny("naivas", "carrefour", "quickmart", "cleanshelf") -> "groceries"
            cp.containsAny("tuskys", "nakumatt", "chandarana", "ukwala") -> "groceries"
            cp.containsAny("uchumi", "game ", "shoprite", "massmart") -> "groceries"
            cp.containsAny("fairprice", "market", "supermarket") -> "groceries"
            cp.containsAny("eastmatt", "tumaini", "magunas", "mulleys", "khetia") -> "groceries"
            cp.containsAny("mama mboga", "mboga", "kiosk", "food stall", "duka") -> "groceries"
            cp.containsAny("greenspoon", "zucchini", "healthy u") -> "groceries"

            // ── Fuel ───────────────────────────────────────────────────────────
            cp.containsAny("shell", "total ", "totalenergies", "kenol", "rubis") -> "fuel"
            cp.containsAny("vivo energy", "kobil", "hass petroleum", "hashi", "oilliby") -> "fuel"
            cp.containsAny("petrol", "petroleum", "fuel station", "service station") -> "fuel"

            // ── Transport ─────────────────────────────────────────────────────
            cp.containsAny("uber", "bolt cab", "little cab", "taxify") -> "transport"
            cp.containsAny("matatu", "sacco", "bus ", "shuttle") -> "transport"
            cp.containsAny("parking", "ecitizen vehicle", "ntsa sticker") -> "transport"
            cp.containsAny("kenya airways", "jambojet", "fly540") -> "transport"
            cp.containsAny("standard gauge", "sgr") -> "transport"

            // ── Entertainment & Subscriptions ──────────────────────────────────
            cp.containsAny("dstv", "multichoice") -> "entertainment"
            cp.containsAny("zuku", "startimes", "gotv", "safaricom home", "poa internet") -> "entertainment"
            cp.containsAny("netflix", "showmax", "spotify", "apple") -> "subscriptions"
            cp.containsAny("youtube", "amazon prime", "disney") -> "subscriptions"
            cp.containsAny("cinema", "imax", "movies") -> "entertainment"

            // ── Health & Medical ───────────────────────────────────────────────
            cp.containsAny("pharmacy", "chemist", "dawa") -> "health"
            cp.containsAny("hospital", "clinic", "health centre", "medical") -> "health"
            cp.containsAny("nhif", "sha ", "amref", "aah", "aga khan") -> "health"
            cp.containsAny("doctor", "dentist", "physiotherapy") -> "health"

            // ── Education ─────────────────────────────────────────────────────
            cp.containsAny("school", "university", "college", "polytechnic") -> "education"
            cp.containsAny("academy", "institute", "training") -> "education"
            cp.containsAny("knec", "kcse", "kcpe", "uon ", "ku ", "kenyatta univ") -> "education"
            cp.containsAny("helb", "hef") -> "education"

            // ── Housing & Rent ─────────────────────────────────────────────────
            cp.containsAny("rent", "landlord", "property", "estate", "realty") -> "housing"
            cp.containsAny("housing", "bedsitter", "apartment") -> "housing"

            // ── Insurance ─────────────────────────────────────────────────────
            cp.containsAny("insurance", "jubilee", "britam", "icea", "aaa assurance") -> "miscellaneous"
            cp.containsAny("madison", "resolution insurance", "old mutual") -> "miscellaneous"

            // ── Banking & Finance (inter-bank transfers) ───────────────────────
            cp.containsAny("equity bank", "kcb", "co-op bank", "cooperative bank") -> "transfer"
            cp.containsAny("absa", "barclays", "dtb", "diamond trust") -> "transfer"
            cp.containsAny("ncba", "family bank", "stanbic", "i&m") -> "transfer"
            cp.containsAny("postbank", "national bank", "sidian") -> "transfer"
            cp.containsAny("mshwari", "m-shwari", "kcb mpesa", "kcb m-pesa") -> "savings"

            // ── Digital loans / SACCOs ─────────────────────────────────────────
            cp.containsAny("tala", "branch", "zenka", "haraka", "okolea", "timiza", "berry") -> "loans"
            cp.containsAny("hustler fund", "hustler", "faulu", "sacco loan") -> "loans"

            // ── Government / Fees ─────────────────────────────────────────────
            cp.containsAny("kra", "revenue authority", "tax") -> "miscellaneous"
            cp.containsAny("huduma", "ecitizen", "county cess") -> "miscellaneous"
            cp.containsAny("nssf", "national social security") -> "miscellaneous"

            else -> amount?.let { amountHeuristicCategory(it, category) } ?: base
        }
    }

    /**
     * Amount-based fallback categorization for expenses when no merchant match.
     *
     * The previous amount-band heuristic (<=50 -> airtime, <=500 -> food, etc.)
     * was miscategorising small BUY_GOODS / SENT transactions as airtime. We now
     * trust the parser's semantic category instead of guessing from the amount.
     */
    private fun amountHeuristicCategory(amount: Double, category: SmsCategory): String {
        return APP_CATEGORY[category] ?: "uncategorized"
    }

    // Extension helper — avoids a chain of separate contains() calls
    private fun String.containsAny(vararg substrings: String): Boolean =
        substrings.any { this.contains(it) }

    val CATEGORY_DISPLAY: Map<SmsCategory, String> = mapOf(
        SmsCategory.RECEIVED      to "M-Pesa Received",
        SmsCategory.SENT          to "Transfer",
        SmsCategory.AIRTIME       to "Airtime",
        SmsCategory.PAYBILL       to "Utilities",
        SmsCategory.BUY_GOODS     to "Shopping",
        SmsCategory.DEPOSIT       to "Deposit",
        SmsCategory.WITHDRAW      to "Cash Withdrawal",
        SmsCategory.REVERSED      to "Reversal",
        SmsCategory.LOAN          to "Loans & Credit",
        SmsCategory.FULIZA_CHARGE to "Fuliza Charge",
        SmsCategory.UNKNOWN       to "Other",
    )

    // ─── Fuliza service-notice filter ─────────────────────────────────

    /**
     * True when the SMS is a Fuliza/M-Pesa service or fee notice that must NOT be
     * imported as a transaction. Requires BOTH a "fuliza" context word AND one of the
     * fee-signal strings below.
     *
     * Exceptions: charge notices ("Total Fuliza M-PESA outstanding amount is Ksh X")
     * and repayment notices ("from your M-PESA has been used to … Fuliza") are real
     * economic events — they are parsed by the main rule engine, not filtered here.
     */
    fun isFulizaServiceNotice(message: String): Boolean {
        val text = message.lowercase().replace(WS_RE, " ").trim()
        if (!text.contains("fuliza")) return false
        // Charge notices and repayment notices are real economic events — they
        // must pass through to the main rule engine rather than being filtered here.
        // Using the shared regex constants makes these exemptions resilient to minor
        // phrasing changes in Safaricom's SMS templates.
        if (FULIZA_OUTSTANDING_RE.containsMatchIn(message)) return false
        if (LOAN_REPAYMENT_AMOUNT_RE.containsMatchIn(message)) return false
        return FULIZA_NOTICE_RE.containsMatchIn(text)
    }

    // ─── Detection rule ────────────────────────────────────────────────

    data class DetectionRule(
        val id: String,
        val category: SmsCategory,
        val description: String = "",
        /** Phase 1 — HIGH confidence on match. */
        val patterns: List<Regex>,
        /** Phase 2 — MEDIUM confidence on match. */
        val fallbackPatterns: List<Regex> = emptyList(),
        /** Used to extract the merchant / counterparty name. */
        val counterpartyPatterns: List<Regex> = emptyList(),
    )

    // ─── Ordered detection rules ───────────────────────────────────────

    val DETECTION_RULES: List<DetectionRule> = listOf(

        // 1. REVERSAL — MUST be first: "received Ksh X from Y has been reversed"
        //    matches RECEIVED patterns, so reversal must win first.
        DetectionRule(
            id = "reversal",
            category = SmsCategory.REVERSED,
            description = "Reversal of a previous transaction",
            patterns = listOf(
                Regex("""(?:transaction of|transaction for)\s*(?:Ksh|KES)\s?[\d,.]+.*?has been reversed""", RegexOption.IGNORE_CASE),
                Regex("""(?:received|sent)\s+(?:Ksh|KES)\s?[\d,.]+.+has been reversed""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to.+has been reversed""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+received from.+has been reversed""", RegexOption.IGNORE_CASE),
                Regex("""(?:your\s+m-pesa\s+transaction\s+)?(?:received|you have received)\s+(?:Ksh|KES)\s?[\d,.]+.+has been reversed""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""has been reversed""", RegexOption.IGNORE_CASE),
                Regex("""transaction.*reversed""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""received from\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""sent to\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+received from\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 2. RECEIVED
        DetectionRule(
            id = "received",
            category = SmsCategory.RECEIVED,
            description = "Money received from person or bank",
            patterns = listOf(
                Regex("""(?:you have\s+)?received\s+(?:Ksh|KES)\s?[\d,.]+\s+from\s+""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+received from\s+""", RegexOption.IGNORE_CASE),
                // Old / compact formats sometimes drop "You have"
                Regex("""received\s+(?:Ksh|KES)\s?[\d,.]+\s+from\s+[A-Z]""", RegexOption.IGNORE_CASE),
                // Non-English fragment variants (Swahili)
                Regex("""umepokea\s+(?:Ksh|KES)\s?[\d,.]+\s+(?:kutoka|from)\s+""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""received from\s+[A-Z]""", RegexOption.IGNORE_CASE),
                Regex("""umepokea\s+(?:Ksh|KES)""", RegexOption.IGNORE_CASE),
                Regex("""umepokea""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""received\s+(?:Ksh|KES)\s?[\d,.]+\s+from\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+received from\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""umepokea\s+(?:Ksh|KES)\s?[\d,.]+\s+(?:kutoka|from)\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 3. DEPOSIT
        DetectionRule(
            id = "deposit",
            category = SmsCategory.DEPOSIT,
            description = "Cash or bank deposit into M-Pesa",
            patterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+deposited""", RegexOption.IGNORE_CASE),
                Regex("""cash deposit of\s+(?:Ksh|KES)\s?[\d,.]+""", RegexOption.IGNORE_CASE),
                Regex("""deposited\s+(?:Ksh|KES)\s?[\d,.]+""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+(?:of\s+)?(?:Ksh|KES)\s?[\d,.]+.*\s+deposited""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+deposited""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""deposited\s+(?:Ksh|KES)""", RegexOption.IGNORE_CASE),
                Regex("""\bdeposited\b""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""deposited by(?:\s+agent)?\s+\d+\s*-?\s*(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""deposited by(?:\s+agent)\s+([A-Za-z][^.]+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+(?:of\s+)?(?:Ksh|KES)\s?[\d,.]+\s+deposited\s+(?:by\s+)?(?:agent\s+)?\d+\s*-?\s*(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 4. AIRTIME — BEFORE paybill: "sent to 0712345678 for airtime" would also
        //    hit paybill's "sent to" pattern, so airtime must win first.
        DetectionRule(
            id = "airtime",
            category = SmsCategory.AIRTIME,
            description = "Airtime or data bundle purchase",
            patterns = listOf(
                Regex("""(?:you\s+)?bought\s+(?:Ksh|KES)\s?[\d,.]+\s+of airtime""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+\d{9,12}\s+for airtime""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+airtime\s+for\s+\d+""", RegexOption.IGNORE_CASE),
                Regex("""for airtime(?:\s+on|\s+purchase|\s+of|\s*\.)""", RegexOption.IGNORE_CASE),
                Regex("""airtime\s+(?:purchase|of\s+(?:Ksh|KES))""", RegexOption.IGNORE_CASE),
                Regex("""of airtime purchased""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""for airtime""", RegexOption.IGNORE_CASE),
                Regex("""airtime\s+for\s+\d+""", RegexOption.IGNORE_CASE),
                Regex("""airtime purchase""", RegexOption.IGNORE_CASE),
                Regex("""bought\s+(?:Ksh|KES)\s?[\d,.]+\s+of airtime""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""sent to\s+(.+?)\s+for airtime""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 5. PAYBILL — BEFORE buy_goods: paybill has an explicit account/reference number
        DetectionRule(
            id = "paybill",
            category = SmsCategory.PAYBILL,
            description = "Paybill payment — utility, subscription or bill with reference",
            patterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+.+?\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""paid to\s+.+?\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paybill(?:\s+payment)?\s+to\s+.+?(?:\s+for\s+account|\s+on\s|\s+New\s|\.)""", RegexOption.IGNORE_CASE),
                Regex("""paybill to\s+\d+""", RegexOption.IGNORE_CASE),
                Regex("""paybill\s+\d+\s+account\s*[:#]?\s*[\w-]+""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""(?:sent to|paid to)\s+.+?\s+(?:for\s+)?(?:account|acc\.?|acct\.|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paybill(?:\s+payment)?\s+to\s+.+?""", RegexOption.IGNORE_CASE),
                Regex("""paybill(?:\s+payment)?\s+to\s+\S+""", RegexOption.IGNORE_CASE),
                Regex("""account\s*(?:number|no\.?)?\s*[:#]?\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""paybill\b""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+(.+?)\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""paid to\s+(.+?)\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""sent to\s+(.+?)\s+(?:for\s+)?(?:account|acc\.?|acct\.?|account\s+number|meter|ref\.|reference|policy|postpay|token|bill|invoice)\s*[\w-]+""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paybill(?:\s+payment)?\s+to\s+(.+?)(?:\s+for\s+account|\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""paybill(?:\s+payment)?\s+to\s+(.+?)(?:\s+for\s+account|\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""paybill to\s+\d+\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 6. BUY_GOODS — general "paid to" without account number
        //    Handles Kopo Kopo variants (kopo kopo / kopokopo / kopo-kopo).
        DetectionRule(
            id = "buy_goods",
            category = SmsCategory.BUY_GOODS,
            description = "Merchant till payment (Lipa na M-Pesa)",
            patterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paid to\s+.+?\s+(?:on\s\d|\.\s|confirmed)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paid to\s+.+?\s+via\s+(?:kopo[\s-]+kopo|kopokopo)\b""", RegexOption.IGNORE_CASE),
                Regex("""buy goods""", RegexOption.IGNORE_CASE),
                Regex("""till\s*(?:number)?\s*[:#]?\s*\d{5,6}""", RegexOption.IGNORE_CASE),
                Regex("""paid to\s+.+?\.\s+New M-PESA""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paid to\s+.+?\s+till\s*(?:number)?\s*\d+""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""paid to\s+\S""", RegexOption.IGNORE_CASE),
                Regex("""till\s*(?:number)?\s*[:#]?\s*\d{5,6}""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""buy goods from\s+(.+?)(?:\s+on\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paid to\s+(.+?)\s+via\s+(?:kopo[\s-]+kopo|kopokopo)(?:\.\s|\s+on\s|\s+New\s|$)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+paid to\s+(.+?)(?:\s+on\s\d|\.\s|confirmed|\s+till\s*(?:number)?\s*\d+|$)""", RegexOption.IGNORE_CASE),
                Regex("""paid to\s+(.+?)(?:\s+on\s\d|\.\s|confirmed|\s+till\s*(?:number)?\s*\d+|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 7. WITHDRAW
        DetectionRule(
            id = "withdrawal",
            category = SmsCategory.WITHDRAW,
            description = "ATM or agent cash withdrawal",
            patterns = listOf(
                Regex("""withdrawn from agent""", RegexOption.IGNORE_CASE),
                Regex("""cash withdrawal\s+of\s+(?:Ksh|KES)""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+withdrawn""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+withdrawn from ATM""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+(?:of\s+)?(?:Ksh|KES)\s?[\d,.]+.*\s+withdrawn""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+withdrawn""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""cash withdrawal""", RegexOption.IGNORE_CASE),
                Regex("""withdrawn from""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""withdrawn from(?:\s+agent)?\s+\d+\s*-?\s*(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""withdrawn from(?:\s+agent)\s+([A-Za-z][^.]+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""withdrawn at\s+(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
                Regex("""agent\s+float\s+(?:of\s+)?(?:Ksh|KES)\s?[\d,.]+\s+withdrawn\s+(?:from\s+)?(?:agent\s+)?\d+\s*-?\s*(.+?)(?:\s+on\s|\s+New\s|\.|$)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 8. FULIZA_CHARGE — BEFORE repayment: authoritative "outstanding amount is Ksh X"
        DetectionRule(
            id = "fuliza_charge",
            category = SmsCategory.FULIZA_CHARGE,
            description = "Fuliza charge notice — carries authoritative total outstanding balance",
            patterns = listOf(
                Regex("""Total Fuliza M-PESA outstanding amount is\s*(?:Ksh|KES)\s?[\d,]+""", RegexOption.IGNORE_CASE),
                Regex("""Fuliza M-PESA amount is\s*(?:Ksh|KES)\s?[\d,.]+.*Access Fee charged""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""Total Fuliza.*outstanding amount""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""(Fuliza M-PESA)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 9. FULIZA REPAYMENT (LOAN)
        DetectionRule(
            id = "fuliza_repayment",
            category = SmsCategory.LOAN,
            description = "Fuliza repayment — deducted automatically from wallet balance",
            patterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+from your M-PESA has been used to (?:partially|fully)\s+pay your outstanding Fuliza M-PESA""", RegexOption.IGNORE_CASE),
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+from your M-PESA has been used to .*outstanding Fuliza M-PESA""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""from your M-PESA has been used to .*Fuliza""", RegexOption.IGNORE_CASE),
                Regex("""outstanding Fuliza M-PESA""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""(Fuliza M-PESA)""", RegexOption.IGNORE_CASE),
            ),
        ),

        // 10. SENT P2P — LAST: catches all remaining "sent to" cases
        DetectionRule(
            id = "sent_p2p",
            category = SmsCategory.SENT,
            description = "Peer-to-peer money transfer",
            patterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+[A-Z].+?(?:\s+on\s|\s+New\s|\.)""", RegexOption.IGNORE_CASE),
                Regex("""customer transfer of\s+(?:Ksh|KES)\s?[\d,.]+\s+to\s+""", RegexOption.IGNORE_CASE),
                // compact phone: 0712345678 or +254712345678
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+(?:\+?254|0)\d{8,9}\b""", RegexOption.IGNORE_CASE),
                // spaced/hyphenated phone: 07 12 34 56 78
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+(?:0|\+?254[\s-]?)\d[\d\s-]{7,14}\b""", RegexOption.IGNORE_CASE),
                // Old / compact formats: "You have sent Ksh X to Y"
                Regex("""you have sent\s+(?:Ksh|KES)\s?[\d,.]+\s+to\s+""", RegexOption.IGNORE_CASE),
            ),
            fallbackPatterns = listOf(
                Regex("""sent to\s+[A-Z]""", RegexOption.IGNORE_CASE),
                Regex("""sent to\s+(?:\+?254|0)\d{8,9}\b""", RegexOption.IGNORE_CASE),
                Regex("""sent to\s+(?:0|\+?254[\s-]?)\d[\d\s-]{7,14}\b""", RegexOption.IGNORE_CASE),
                Regex("""you have sent""", RegexOption.IGNORE_CASE),
            ),
            counterpartyPatterns = listOf(
                Regex("""(?:Ksh|KES)\s?[\d,.]+\s+sent to\s+(.+?)(?:\s+on\s|\s+New\s|\.|confirmed|$)""", RegexOption.IGNORE_CASE),
                Regex("""customer transfer of\s+(?:Ksh|KES)\s?[\d,.]+\s+to\s+(.+?)(?:\s+on\s|\s+New\s|\.|confirmed|$)""", RegexOption.IGNORE_CASE),
                Regex("""you have sent\s+(?:Ksh|KES)\s?[\d,.]+\s+to\s+(.+?)(?:\s+on\s|\s+New\s|\.|confirmed|$)""", RegexOption.IGNORE_CASE),
                Regex("""sent to\s+((?:\+?254|0)\d{8,9})\b""", RegexOption.IGNORE_CASE),
            ),
        ),
    )
}
