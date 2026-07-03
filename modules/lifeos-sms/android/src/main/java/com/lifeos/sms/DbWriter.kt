package com.lifeos.sms

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File
import java.security.MessageDigest
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * Direct SQLite helper that reads and writes to the app's lifeos.db without the
 * Room/JS layer. Opens the DB in WAL mode for concurrent access from the
 * WorkManager background thread and the React Native JS thread.
 *
 * Singleton — one shared SQLiteDatabase connection per process. WAL mode
 * allows concurrent reads from JS while workers are writing.
 */
internal class DbWriter private constructor(context: Context) {

    private val db: SQLiteDatabase

    init {
        // IMPORTANT: expo-sqlite (JS layer) stores DBs under `filesDir/SQLite/<name>`,
        // NOT the Android-default `databases/` directory. If we open the wrong path
        // we write to a separate file — the JS layer never sees our rows, so imports
        // appear successful but the UI stays empty. Match expo-sqlite's location.
        val app = context.applicationContext
        val sqliteDir = File(app.filesDir, "SQLite")
        sqliteDir.mkdirs()
        val target = File(sqliteDir, "lifeos.db")

        // One-time migration: earlier builds wrote to `databases/lifeos.db`.
        // Copy that file (and its WAL/SHM sidecars) into the correct location
        // ONLY if the target does not yet exist, so we do not overwrite the
        // authoritative JS-managed DB.
        try {
            val legacy = app.getDatabasePath("lifeos.db")
            if (legacy.exists() && !target.exists()) {
                Log.w(TAG, "Migrating legacy DB from ${legacy.absolutePath} → ${target.absolutePath}")
                legacy.copyTo(target, overwrite = false)
                File(legacy.absolutePath + "-wal").takeIf { it.exists() }
                    ?.copyTo(File(target.absolutePath + "-wal"), overwrite = false)
                File(legacy.absolutePath + "-shm").takeIf { it.exists() }
                    ?.copyTo(File(target.absolutePath + "-shm"), overwrite = false)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Legacy DB migration skipped: ${e.message}")
        }

        val path = target.absolutePath
        Log.i(TAG, "Opening SQLite at $path (matching expo-sqlite location)")
        db = SQLiteDatabase.openDatabase(
            path,
            null,
            SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.CREATE_IF_NECESSARY
        )
        db.execSQL("PRAGMA journal_mode=WAL")
        db.execSQL("PRAGMA synchronous=NORMAL")
        db.execSQL("PRAGMA foreign_keys=ON")
        ensureImportAuditTable()
    }

    /**
     * Force a WAL checkpoint so any writes done through this connection become
     * immediately visible to other connections opened on the same DB file
     * (specifically expo-sqlite on the JS side). Called after every batch import.
     */
    fun checkpoint() {
        try {
            db.rawQuery("PRAGMA wal_checkpoint(RESTART)", null).use { it.moveToFirst() }
        } catch (e: Exception) {
            Log.w(TAG, "wal_checkpoint failed: ${e.message}")
        }
    }

    companion object {
        const val TAG = "LifeOS/DbWriter"

        @Volatile private var INSTANCE: DbWriter? = null

        fun getInstance(context: Context): DbWriter =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: DbWriter(context.applicationContext).also { INSTANCE = it }
            }
    }

    // ─── Transaction helpers ─────────────────────────────────────────────────

    fun beginTransaction() = db.beginTransaction()
    fun setTransactionSuccessful() = db.setTransactionSuccessful()
    fun endTransaction() = db.endTransaction()

    // ─── Auto-migrate import_audit if absent ──────────────────────────────────

    private fun ensureImportAuditTable() {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS import_audit (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                mpesa_code    TEXT,
                raw_message   TEXT NOT NULL,
                amount        REAL,
                merchant      TEXT,
                outcome       TEXT NOT NULL,
                failure_reason TEXT,
                confidence    TEXT,
                created_at    TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """.trimIndent()
        )
    }

    // ─── Deduplication checks ─────────────────────────────────────────────────

    /**
     * Preload existing transaction dedup keys (mpesa_code, source_hash, semantic_hash)
     * from the DB into three sets in ONE query. Turns 30k dedup round-trips
     * (3 queries × 10k rows) into a single sequential scan for bulk imports.
     *
     * We restrict to non-deleted rows and cap to the most recent [limit] rows
     * (default 50k) to keep memory bounded on huge inboxes. Older rows still
     * fall through to the per-row `existsBy*` DB checks.
     */
    fun preloadDedupeHashes(
        seenCodes: MutableSet<String>,
        seenSourceHashes: MutableSet<String>,
        seenSemanticHashes: MutableSet<String>,
        limit: Int = 50_000,
    ) {
        try {
            db.rawQuery(
                """SELECT mpesa_code, source_hash, semantic_hash
                   FROM transactions
                   WHERE deleted_at IS NULL
                   ORDER BY date DESC
                   LIMIT ?""",
                arrayOf(limit.toString())
            ).use { c ->
                while (c.moveToNext()) {
                    c.getString(0)?.let { seenCodes.add(it) }
                    c.getString(1)?.let { seenSourceHashes.add(it) }
                    c.getString(2)?.let { seenSemanticHashes.add(it) }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "preloadDedupeHashes failed: ${e.message}")
        }
    }

    fun existsByMpesaCode(code: String): Boolean {
        return db.rawQuery(
            "SELECT 1 FROM transactions WHERE mpesa_code = ? AND deleted_at IS NULL LIMIT 1",
            arrayOf(code)
        ).use { it.moveToFirst() }
    }

    fun existsBySourceHash(hash: String): Boolean {
        return db.rawQuery(
            "SELECT 1 FROM transactions WHERE source_hash = ? AND deleted_at IS NULL LIMIT 1",
            arrayOf(hash)
        ).use { it.moveToFirst() }
    }

    fun existsBySemanticHash(hash: String): Boolean {
        return db.rawQuery(
            "SELECT 1 FROM transactions WHERE semantic_hash = ? AND deleted_at IS NULL LIMIT 1",
            arrayOf(hash)
        ).use { it.moveToFirst() }
    }

    fun existsPotentialDuplicate(amount: Double, merchant: String, dateMs: Long, windowMs: Long = 300_000L): Boolean {
        // date column stores ISO 8601 with 'T' separator — compare as ISO strings directly.
        val loIso = epochToIso(dateMs - windowMs)
        val hiIso = epochToIso(dateMs + windowMs)
        return db.rawQuery(
            """SELECT 1 FROM transactions
               WHERE amount = ? AND merchant = ?
               AND date >= ? AND date <= ?
               AND deleted_at IS NULL LIMIT 1""",
            arrayOf(amount.toString(), merchant, loIso, hiIso)
        ).use { it.moveToFirst() }
    }

    // ─── Source hash ──────────────────────────────────────────────────────────

    fun sha256(input: String): String = try {
        MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    } catch (_: Exception) {
        input.hashCode().toString()
    }

    // ─── Merchant category learning ───────────────────────────────────────────

    private fun normalizeMerchant(merchant: String?): String {
        if (merchant.isNullOrBlank()) return ""
        return merchant.lowercase()
            .replace(Regex("""[^a-z0-9]+"""), " ")
            .replace(Regex("""\s+"""), " ")
            .trim()
    }

    private fun lookupMerchantCategory(merchant: String?): String? {
        val normalized = normalizeMerchant(merchant)
        if (normalized.isBlank()) return null
        return db.rawQuery(
            """SELECT category FROM merchant_categories
               WHERE merchant = ? AND deleted_at IS NULL
               ORDER BY user_corrected DESC, confidence DESC, updated_at DESC
               LIMIT 1""",
            arrayOf(normalized)
        ).use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }

    // ─── Transaction insert ───────────────────────────────────────────────────

    /**
     * Inserts a parsed transaction into the transactions table.
     * Returns the new row ID, or -1 if the insert failed.
     */
    fun insertTransaction(tx: SmsParser.ParsedTransaction): Long {
        val id = UUID.randomUUID().toString()
        val now = isoNow()
        val appCategory = lookupMerchantCategory(tx.counterparty)
            ?: SmsParserConfig.refineAppCategory(tx.category, tx.counterparty, tx.amount)
        val dateIso = epochToIso(tx.date)
        val syncState = when (tx.parseRoute) {
            SmsParser.ParseRoute.DIRECT    -> "pending"
            SmsParser.ParseRoute.REVIEW    -> "pending_review"
            SmsParser.ParseRoute.QUARANTINE -> "quarantine"
        }

        return try {
            db.compileStatement(
                """INSERT INTO transactions
                   (id, amount, merchant, category, date, source, transaction_type,
                    mpesa_code, source_hash, raw_sms, description, balance_after, fee,
                    status, created_at, updated_at, sync_state, record_source,
                    revision, inferred_category, inference_source, semantic_hash)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"""
            ).use { stmt ->
                stmt.bindString(1, id)
                stmt.bindDouble(2, tx.amount)
                stmt.bindString(3, tx.counterparty ?: (SmsParserConfig.CATEGORY_DISPLAY[tx.category] ?: "M-Pesa"))
                stmt.bindString(4, appCategory)
                stmt.bindString(5, dateIso)
                stmt.bindString(6, "mpesa")
                stmt.bindString(7, tx.transactionType)
                stmt.bindString(8, tx.mpesaCode)
                stmt.bindString(9, tx.sourceHash)
                stmt.bindString(10, tx.rawSms)
                stmt.bindString(11, tx.description)
                if (tx.balanceAfter != null) stmt.bindDouble(12, tx.balanceAfter) else stmt.bindNull(12)
                if (tx.fee != null) stmt.bindDouble(13, tx.fee) else stmt.bindNull(13)
                stmt.bindString(14, "completed")
                stmt.bindString(15, now)
                stmt.bindString(16, now)
                stmt.bindString(17, syncState)
                stmt.bindString(18, "sms_import")
                stmt.bindLong(19, 0)
                stmt.bindLong(20, 1)
                stmt.bindString(21, "sms_parser")
                stmt.bindString(22, tx.semanticHash)
                stmt.executeInsert()
            }
        } catch (e: Exception) {
            Log.e(TAG, "insertTransaction failed: ${e.message}", e)
            -1L
        }
    }

    // ─── Fuliza outstanding balance ───────────────────────────────────────────

    /**
     * Records the authoritative outstanding Fuliza balance from a FULIZA_CHARGE SMS.
     * The outstanding amount IS the current balance — we store it as draw_amount_kes
     * so the UI can display the current balance without additional maths.
     * Updates the most recent active loan row; inserts a sentinel row if none exists.
     */
    fun setFulizaOutstanding(outstandingKes: Double) {
        try {
            val now = isoNow()
            val updated = db.compileStatement(
                "UPDATE fuliza_loans SET draw_amount_kes = ?, total_repaid_kes = 0, updated_at = ? WHERE status = 'active'"
            ).use { stmt ->
                stmt.bindDouble(1, outstandingKes)
                stmt.bindString(2, now)
                stmt.executeUpdateDelete()
            }
            if (updated == 0) {
                // No active loan row — insert a sentinel so the UI can display the balance
                db.compileStatement(
                    """INSERT INTO fuliza_loans
                       (id, draw_code, draw_amount_kes, total_repaid_kes, status, draw_date, created_at, updated_at)
                       VALUES (?,?,?,?,?,?,?,?)"""
                ).use { stmt ->
                    stmt.bindString(1, UUID.randomUUID().toString())
                    stmt.bindString(2, "FULIZA_CHARGE")
                    stmt.bindDouble(3, outstandingKes)
                    stmt.bindDouble(4, 0.0)
                    stmt.bindString(5, "active")
                    stmt.bindString(6, now)
                    stmt.bindString(7, now)
                    stmt.bindString(8, now)
                    stmt.executeInsert()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "setFulizaOutstanding failed: ${e.message}", e)
        }
    }

    // ─── Fuliza outstanding balance ───────────────────────────────────────────

    /**
     * Returns the current active Fuliza outstanding balance, or 0.0 if no active loan row exists.
     */
    fun getFulizaOutstanding(): Double {
        return try {
            db.rawQuery(
                "SELECT draw_amount_kes - total_repaid_kes FROM fuliza_loans WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1",
                null
            ).use { c ->
                if (c.moveToFirst()) c.getDouble(0) else 0.0
            }
        } catch (e: Exception) {
            0.0
        }
    }

    // ─── Import audit ─────────────────────────────────────────────────────────

    fun insertAudit(
        mpesaCode: String?,
        rawMessage: String,
        amount: Double?,
        merchant: String?,
        outcome: String,
        failureReason: String? = null,
        confidence: String? = null,
    ) {
        try {
            db.compileStatement(
                """INSERT INTO import_audit
                   (mpesa_code, raw_message, amount, merchant, outcome, failure_reason, confidence)
                   VALUES (?,?,?,?,?,?,?)"""
            ).use { stmt ->
                if (mpesaCode != null) stmt.bindString(1, mpesaCode) else stmt.bindNull(1)
                stmt.bindString(2, rawMessage.take(1000))
                if (amount != null) stmt.bindDouble(3, amount) else stmt.bindNull(3)
                if (merchant != null) stmt.bindString(4, merchant) else stmt.bindNull(4)
                stmt.bindString(5, outcome)
                if (failureReason != null) stmt.bindString(6, failureReason) else stmt.bindNull(6)
                if (confidence != null) stmt.bindString(7, confidence) else stmt.bindNull(7)
                stmt.executeInsert()
            }
        } catch (e: Exception) {
            Log.e(TAG, "insertAudit failed: ${e.message}", e)
        }
    }

    fun getAuditLog(limit: Int = 100): List<Map<String, Any?>> {
        val results = mutableListOf<Map<String, Any?>>()
        db.rawQuery(
            "SELECT id, mpesa_code, raw_message, amount, merchant, outcome, failure_reason, confidence, created_at FROM import_audit ORDER BY id DESC LIMIT ?",
            arrayOf(limit.toString())
        ).use { c ->
            while (c.moveToNext()) {
                results.add(
                    mapOf(
                        "id"            to c.getLong(0),
                        "mpesaCode"     to c.getString(1),
                        "rawMessage"    to (c.getString(2) ?: ""),
                        "amount"        to if (c.isNull(3)) null else c.getDouble(3),
                        "merchant"      to c.getString(4),
                        "outcome"       to (c.getString(5) ?: ""),
                        "failureReason" to c.getString(6),
                        "confidence"    to c.getString(7),
                        "createdAt"     to (c.getString(8) ?: ""),
                    )
                )
            }
        }
        return results
    }

    fun getStats(): Map<String, Any?> {
        // Outcomes are written by workers as either exact strings ('imported_realtime',
        // 'quarantined', 'ignored_not_mpesa', …) or as `${category}:${reason}` (e.g.
        // 'parse_failed:no_code', 'duplicate_detected:mpesa_code'). Match via LIKE so
        // the suffixed variants aren't miscategorised.
        //
        // Only rows whose outcome contains "imported" or "realtime" count toward
        // the imported total. `retried`/`dismissed`/`ignored_*`/`fuliza_*` are
        // administrative and shouldn't inflate the imported count.
        var imported = 0L; var skipped = 0L; var errors = 0L; var quarantined = 0L; var lastAt: String? = null
        db.rawQuery(
            """SELECT
               SUM(CASE WHEN outcome LIKE 'imported%' OR outcome LIKE 'retry_imported%' THEN 1 ELSE 0 END),
               SUM(CASE WHEN outcome LIKE 'duplicate_detected%' THEN 1 ELSE 0 END),
               SUM(CASE WHEN outcome LIKE 'parse_failed%' OR outcome LIKE 'import_failed%' THEN 1 ELSE 0 END),
               SUM(CASE WHEN outcome LIKE 'quarantined%' THEN 1 ELSE 0 END),
               MAX(created_at)
               FROM import_audit""",
            null
        ).use { c ->
            if (c.moveToFirst()) {
                imported    = if (c.isNull(0)) 0 else c.getLong(0)
                skipped     = if (c.isNull(1)) 0 else c.getLong(1)
                errors      = if (c.isNull(2)) 0 else c.getLong(2)
                quarantined = if (c.isNull(3)) 0 else c.getLong(3)
                lastAt      = c.getString(4)
            }
        }
        return mapOf(
            "totalImported"    to imported,
            "totalDuplicates"  to skipped,
            "totalFailed"      to errors,
            "totalQuarantined" to quarantined,
            "lastImportAt"     to lastAt,
        )
    }

    fun getQuarantinedMessages(): List<Map<String, Any?>> {
        val results = mutableListOf<Map<String, Any?>>()
        db.rawQuery(
            "SELECT id, raw_message, mpesa_code, amount, merchant FROM import_audit WHERE outcome = 'quarantined' ORDER BY id DESC LIMIT 200",
            null
        ).use { c ->
            while (c.moveToNext()) {
                results.add(
                    mapOf(
                        "id"         to c.getLong(0),
                        "rawMessage" to (c.getString(1) ?: ""),
                        "mpesaCode"  to c.getString(2),
                        "amount"     to if (c.isNull(3)) null else c.getDouble(3),
                        "merchant"   to c.getString(4),
                    )
                )
            }
        }
        return results
    }

    fun markAuditRetried(ids: List<Long>) {
        if (ids.isEmpty()) return
        val placeholders = ids.joinToString(",") { "?" }
        db.execSQL(
            "UPDATE import_audit SET outcome = 'retried' WHERE id IN ($placeholders)",
            ids.map { it.toString() }.toTypedArray()
        )
    }

    fun markAuditDismissed(ids: List<Long>) {
        if (ids.isEmpty()) return
        val placeholders = ids.joinToString(",") { "?" }
        db.execSQL(
            "UPDATE import_audit SET outcome = 'dismissed' WHERE id IN ($placeholders)",
            ids.map { it.toString() }.toTypedArray()
        )
    }

    fun getQuarantinedById(id: Long): Map<String, Any?>? {
        return db.rawQuery(
            "SELECT id, raw_message, mpesa_code, amount, merchant FROM import_audit WHERE id = ? LIMIT 1",
            arrayOf(id.toString())
        ).use { c ->
            if (!c.moveToFirst()) return@use null
            mapOf(
                "id"         to c.getLong(0),
                "rawMessage" to (c.getString(1) ?: ""),
                "mpesaCode"  to c.getString(2),
                "amount"     to if (c.isNull(3)) null else c.getDouble(3),
                "merchant"   to c.getString(4),
            )
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun isoNow(): String {
        val fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME
        return java.time.LocalDateTime.now().format(fmt)
    }

    private fun epochToIso(epochMs: Long): String {
        val ldt = java.time.Instant.ofEpochMilli(epochMs)
            .atZone(java.time.ZoneId.systemDefault())
            .toLocalDateTime()
        return java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(ldt)
    }

}
