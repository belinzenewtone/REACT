package com.lifeos.sms

/**
 * Centralised 4-tier SMS deduplication engine.
 *
 * Tiers (cheapest first):
 *  1. M-Pesa transaction code
 *  2. Normalised raw-SMS source hash (SHA-256)
 *  3. Semantic hash (category + amount + date + counterparty)
 *  4. Heuristic time-window match (amount + merchant within ±5 min)
 *
 * The engine is stateless except for an optional [DedupeContext] that tracks
 * codes/hashes already seen within the current batch. Use a fresh context for
 * realtime/retry paths.
 */
internal object SmsDedupeEngine {

    enum class Result {
        NEW,
        DUPLICATE_CODE,
        DUPLICATE_SOURCE_HASH,
        DUPLICATE_SEMANTIC_HASH,
        DUPLICATE_HEURISTIC,
    }

    data class Context(
        val seenCodes: MutableSet<String> = mutableSetOf(),
        val seenSourceHashes: MutableSet<String> = mutableSetOf(),
        val seenSemanticHashes: MutableSet<String> = mutableSetOf(),
    )

    /**
     * Returns [Result.NEW] if the transaction appears unique, or the first
     * duplicate tier that matched.
     */
    fun check(
        ctx: Context,
        tx: SmsParser.ParsedTransaction,
        db: DbWriter,
    ): Result {
        // Tier 1: transaction code — institution-scoped
        if (tx.institutionId == "mpesa") {
            if (tx.mpesaCode.isNotBlank() && (tx.mpesaCode in ctx.seenCodes || db.existsByMpesaCode(tx.mpesaCode))) {
                return Result.DUPLICATE_CODE
            }
        } else {
            if (tx.externalRef.isNotBlank() && (tx.externalRef in ctx.seenCodes || db.existsByExternalRef(tx.institutionId, tx.externalRef))) {
                return Result.DUPLICATE_CODE
            }
        }

        // Tier 2: Source hash (exact raw SMS match)
        if (tx.sourceHash in ctx.seenSourceHashes || db.existsBySourceHash(tx.sourceHash)) {
            return Result.DUPLICATE_SOURCE_HASH
        }

        // Tier 3: Semantic hash (same economic event, possibly re-delivered)
        if (tx.semanticHash in ctx.seenSemanticHashes || db.existsBySemanticHash(tx.semanticHash)) {
            return Result.DUPLICATE_SEMANTIC_HASH
        }

        // Tier 4: Heuristic time-window match.
        // Skip for categories where multiple identical small purchases in quick
        // succession are normal (e.g. buying airtime twice within 5 minutes).
        if (tx.category != SmsParserConfig.SmsCategory.AIRTIME &&
            db.existsPotentialDuplicate(tx.amount, tx.counterparty ?: "", tx.date)
        ) {
            return Result.DUPLICATE_HEURISTIC
        }

        return Result.NEW
    }

    /** Mark a transaction as seen in the current [Context]. */
    fun markSeen(ctx: Context, tx: SmsParser.ParsedTransaction) {
        if (tx.institutionId == "mpesa") {
            if (tx.mpesaCode.isNotBlank()) ctx.seenCodes.add(tx.mpesaCode)
        } else {
            if (tx.externalRef.isNotBlank()) ctx.seenCodes.add(tx.externalRef)
        }
        ctx.seenSourceHashes.add(tx.sourceHash)
        ctx.seenSemanticHashes.add(tx.semanticHash)
    }
}
