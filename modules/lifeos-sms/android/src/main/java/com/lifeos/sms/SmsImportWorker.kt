package com.lifeos.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Telephony

import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext

/**
 * WorkManager CoroutineWorker for bulk historical SMS import.
 *
 * Runs as a foreground service so it can process thousands of messages
 * without being killed by the OS. Shows a persistent progress notification
 * while running, auto-dismissed when complete.
 *
 * The JS side calls [SmsReceiverModule.importHistoricalSms] which enqueues
 * this worker and awaits the result via a listening mechanism.
 */
class SmsImportWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val fromMs = inputData.getLong(KEY_FROM_MS, 0L)
        val toMs   = inputData.getLong(KEY_TO_MS,   System.currentTimeMillis())
        val filter = inputData.getString(KEY_FILTER) ?: "all"
        val includeMpesa = filter != "banks_only"
        val includeBanks = filter != "mpesa_only"

        if (fromMs >= toMs) return@withContext Result.failure(
            Data.Builder().putString("error", "invalid_date_range").build()
        )

        val db = DbWriter.getInstance(applicationContext)
        var scanned = 0
            var total = 0
            var imported = 0; var duplicates = 0; var quarantined = 0; var failed = 0

        // Try to promote to a foreground service so long imports survive OS
        // pressure. NON-FATAL: on some devices/OS versions (background start
        // restrictions, missing FGS type) this throws — the import must still
        // run as a regular worker instead of rejecting the whole call.
        try {
            setForeground(buildForegroundInfo("Scanning financial messages…"))
        } catch (e: Exception) {
            Log.w(TAG, "setForeground unavailable, continuing as background worker: ${e.message}")
        }

        try {
            // Require READ_SMS up front — without it the content resolver returns an
            // empty cursor and the UI reports "No M-Pesa messages found".
            if (ContextCompat.checkSelfPermission(
                    applicationContext,
                    Manifest.permission.READ_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return@withContext Result.failure(
                    Data.Builder().putString("error", "sms_permission_denied").build()
                )
            }

            data class SmsCandidate(val body: String, val sender: String, val receivedAtMs: Long)
            val candidates = mutableListOf<SmsCandidate>()
            val seenBodyHashes = mutableSetOf<String>()
            val dedupeCtx = SmsDedupeEngine.Context()
            // Pull existing DB dedup keys into memory ONCE. Cuts ~30k
            // per-row DB round-trips out of a 10k-message import.
            db.preloadDedupeHashes(
                dedupeCtx.seenCodes,
                dedupeCtx.seenSourceHashes,
                dedupeCtx.seenSemanticHashes,
            )

            val selection = "date >= ?"
            val selArgs = arrayOf(fromMs.coerceAtLeast(0L).toString())

            val smsCursor = applicationContext.contentResolver.query(
                "content://sms/inbox".toUri(),
                arrayOf("_id", "body", "date", "address"),
                selection,
                selArgs,
                "date DESC",
            )

            if (smsCursor == null) {
                Log.w(TAG, "SMS content resolver returned null (permission likely denied silently)")
            } else {
                smsCursor.use { cursor ->
                    val bodyIdx = cursor.getColumnIndexOrThrow("body")
                    val dateIdx = cursor.getColumnIndexOrThrow("date")
                    val addressIdx = cursor.getColumnIndex("address")
                    while (cursor.moveToNext()) {
                        val body = cursor.getString(bodyIdx) ?: continue
                        val address = if (addressIdx >= 0) cursor.getString(addressIdx) ?: "" else ""
                        val receivedAtMs = cursor.getLong(dateIdx)
                        scanned++

                        val detection = InstitutionDetector.detect(address, body) ?: continue
                        if (detection.institutionId == "mpesa" && !includeMpesa) continue
                        if (detection.institutionId != "mpesa" && !includeBanks) continue

                        val preHash = SmsParser.sha256(SmsParser.normalizeForHash(body))
                        if (preHash in seenBodyHashes) {
                            duplicates++; continue
                        }
                        seenBodyHashes.add(preHash)
                        candidates.add(SmsCandidate(body, address, receivedAtMs))
                        total++
                    }
                }
            }

            Log.i(TAG, "SMS scan candidates: total=$total scanned=$scanned")

            // Pre-scan for Fuliza limit-assignment SMSes. These carry no transaction code
            // but tell us the user's real limit; capture them before the parser rejects
            // them as "no_code".
            candidates.forEach { candidate ->
                SmsParser.extractFulizaLimit(candidate.body)?.let { assignedLimit ->
                    if (getFulizaLimit() <= 0f && assignedLimit > 0.0) {
                        applicationContext.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                            .edit()
                            .putFloat(SmsProcessWorker.KEY_FULIZA_LIMIT, assignedLimit.toFloat())
                            .apply()
                        db.insertAudit(null, candidate.body, assignedLimit, "Fuliza M-PESA", "fuliza_limit_assigned")
                    }
                }
            }

            // Parse and insert in chunks of CHUNK_SIZE. Avoids holding ~20 MB of
            // ParsedTransaction objects in memory before writing a single row (the old
            // awaitAll() approach on 10k candidates). Each chunk parses in parallel then
            // inserts in its own DB transaction so memory is released incrementally.
            for (chunk in candidates.chunked(CHUNK_SIZE)) {
                val parsed = chunk.map { candidate ->
                    async(Dispatchers.Default) {
                        candidate to ParserPipeline.process(candidate.body, candidate.sender, candidate.receivedAtMs)
                    }
                }.awaitAll()

                // Pre-compile the audit INSERT once per chunk transaction — avoids
                // one SQLiteStatement compilation per row (~200 per chunk vs 200k total).
                db.beginTransaction()
                db.compileAuditInsertStatement().use { auditStmt ->
                db.compileTransactionInsertStatement().use { txStmt ->
                    try {
                        for ((candidate, result) in parsed) {
                            val body = candidate.body
                            if (result is SmsParser.SmsParseResult.Error) {
                                Log.w(TAG, "Parse failed: ${result.error.reason}")
                                db.insertAuditReusing(auditStmt, null, body, null, null,
                                    "parse_failed:${result.error.reason}", result.error.reason)
                                failed++; continue
                            }

                            val tx = (result as SmsParser.SmsParseResult.Success).transaction

                            // FULIZA_CHARGE: update outstanding balance. If the message carries
                            // an access/maintenance fee, also record it as a ledger transaction.
                            if (tx.category == SmsParserConfig.SmsCategory.FULIZA_CHARGE) {
                                tx.fulizaOutstandingKes?.let {
                                    db.setFulizaOutstanding(it)
                                    maybeNotifyFulizaLimitNeeded(it, "charge")
                                }
                                val fee = tx.fee
                                if (fee != null && fee > 0.0) {
                                    val dupReason = SmsDedupeEngine.check(dedupeCtx, tx, db)
                                    if (dupReason == SmsDedupeEngine.Result.NEW) {
                                        val rowId = db.insertTransactionReusing(txStmt, tx)
                                        if (rowId >= 0) {
                                            val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_batch"
                                            db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                                            imported++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                        } else {
                                            db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, "import_failed", "DB insert failed")
                                            failed++
                                        }
                                    } else {
                                        db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                                        duplicates++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                    }
                                } else {
                                    db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.fulizaOutstandingKes, "Fuliza M-PESA", "fuliza_balance_updated")
                                    SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                }
                                continue
                            }

                            // FULIZA_REPAYMENT (LOAN): route through setFulizaRepayment so the
                            // write is atomic with setFulizaOutstanding() — same fix as SmsProcessWorker.
                            if (tx.category == SmsParserConfig.SmsCategory.LOAN && tx.fulizaAvailableLimitKes != null) {
                                db.setFulizaRepayment(tx.amount, tx.fulizaAvailableLimitKes)
                                if (getFulizaLimit() <= 0f) {
                                    maybeNotifyFulizaLimitNeeded(tx.fulizaAvailableLimitKes, "repayment")
                                }
                            }

                            // 4-tier deduplication
                            val dupReason = SmsDedupeEngine.check(dedupeCtx, tx, db)
                            if (dupReason != SmsDedupeEngine.Result.NEW) {
                                Log.d(TAG, "Duplicate detected: ${dupReason.name.lowercase()} code=${tx.mpesaCode}")
                                db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                                duplicates++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                continue
                            }

                            if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                                db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, "quarantined", "Low confidence")
                                quarantined++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                continue
                            }

                            val rowId = db.insertTransactionReusing(txStmt, tx)
                            if (rowId >= 0) {
                                val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_batch"
                                db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                                imported++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                            } else {
                                db.insertAuditReusing(auditStmt, tx.mpesaCode, body, tx.amount, tx.counterparty, "import_failed", "DB insert failed")
                                failed++
                            }
                        }

                        db.setTransactionSuccessful()
                    } finally {
                        db.endTransaction()
                    }
                } }

                // Update progress notification after each chunk (best effort)
                try {
                    setForeground(buildForegroundInfo("Imported $imported of ~$total financial messages…"))
                } catch (_: Exception) {}
            }

            // Flush WAL so expo-sqlite's separate connection sees the new rows immediately.
            db.checkpoint()

            Log.i(TAG, "Bulk import done: total=$total imported=$imported dupes=$duplicates quar=$quarantined failed=$failed")

            Result.success(
                Data.Builder()
                    .putInt("total", total)
                    .putInt("imported", imported)
                    .putInt("duplicates", duplicates)
                    .putInt("quarantined", quarantined)
                    .putInt("failed", failed)
                    .build()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Bulk import crashed: ${e.message}", e)
            Result.failure(Data.Builder().putString("error", e.message?.take(200)).build())
        }
    }

    private fun getFulizaLimit(): Float {
        return applicationContext.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            .getFloat(SmsProcessWorker.KEY_FULIZA_LIMIT, 0f)
    }

    private fun maybeNotifyFulizaLimitNeeded(outstandingKes: Double?, type: String) {
        val outstanding = outstandingKes ?: return
        if (getFulizaLimit() <= 0f) {
            SmsReceiverModule.instance?.emitFulizaLimitNeeded(outstanding, type)
        }
    }

    override suspend fun getForegroundInfo() = buildForegroundInfo("Importing financial history…")

    private fun buildForegroundInfo(text: String): ForegroundInfo {
        ensureNotificationChannel()
        val notification = NotificationCompat.Builder(applicationContext, SmsProcessWorker.NOTIF_CHANNEL_ID)
            .setContentTitle("LifeOS SMS Import")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(
                NOTIF_ID_IMPORT,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            ForegroundInfo(NOTIF_ID_IMPORT, notification)
        }
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as android.app.NotificationManager
            if (nm.getNotificationChannel(SmsProcessWorker.NOTIF_CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    android.app.NotificationChannel(
                        SmsProcessWorker.NOTIF_CHANNEL_ID,
                        "SMS Import",
                        android.app.NotificationManager.IMPORTANCE_LOW,
                    )
                )
            }
        }
    }

    companion object {
        const val KEY_FROM_MS  = "from_ms"
        const val KEY_TO_MS    = "to_ms"
        const val KEY_FILTER   = "institution_filter"
        const val NOTIF_ID_IMPORT = 9002
        const val TAG = "LifeOS/SmsImportWorker"

        // Parse + insert in batches of this size so memory footprint scales with
        // CHUNK_SIZE rather than total candidate count (avoids ~20 MB heap spike
        // when importing 10k messages with the old single-awaitAll approach).
        private const val CHUNK_SIZE = 200
    }
}
