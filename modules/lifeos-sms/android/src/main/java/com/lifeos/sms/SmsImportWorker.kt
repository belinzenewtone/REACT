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

        if (fromMs >= toMs) return@withContext Result.failure(
            Data.Builder().putString("error", "invalid_date_range").build()
        )

        val db = DbWriter.getInstance(applicationContext)
        var scanned = 0     // all rows examined
            var total = 0       // M-Pesa candidate bodies (matches reference semantics)
            var imported = 0; var duplicates = 0; var quarantined = 0; var failed = 0

        // Try to promote to a foreground service so long imports survive OS
        // pressure. NON-FATAL: on some devices/OS versions (background start
        // restrictions, missing FGS type) this throws — the import must still
        // run as a regular worker instead of rejecting the whole call.
        try {
            setForeground(buildForegroundInfo("Scanning M-Pesa messages…"))
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

            val bodies = mutableListOf<String>()
            val dedupeCtx = SmsDedupeEngine.Context()
            // Pull existing DB dedup keys into memory ONCE. Cuts ~30k
            // per-row DB round-trips out of a 10k-message import.
            db.preloadDedupeHashes(
                dedupeCtx.seenCodes,
                dedupeCtx.seenSourceHashes,
                dedupeCtx.seenSemanticHashes,
            )

            // Phase 1: use the same query the reference Kotlin app uses —
            // address LIKE "%MPESA%" plus a date lower bound ONLY. The reference
            // does not use an upper bound; adding one can exclude valid messages
            // if the device's SMS clock differs from System.currentTimeMillis().
            val selection = "address LIKE ? AND date >= ?"
            val selArgs = arrayOf("%MPESA%", fromMs.coerceAtLeast(0L).toString())

            val phase1Cursor = applicationContext.contentResolver.query(
                "content://sms/inbox".toUri(),
                arrayOf("_id", "body", "date", "address"),
                selection,
                selArgs,
                "date DESC",
            )

            if (phase1Cursor == null) {
                Log.w(TAG, "SMS content resolver returned null for address-filtered query (permission likely denied silently)")
            } else {
                phase1Cursor.use { cursor ->
                    val bodyIdx = cursor.getColumnIndexOrThrow("body")
                    while (cursor.moveToNext()) {
                        val body = cursor.getString(bodyIdx) ?: continue
                        scanned++

                        if (!SmsParser.isMpesaSms(body)) continue

                        // Fast within-batch source-hash check before expensive parse
                        val preHash = SmsParser.sha256(SmsParser.normalizeForHash(body))
                        if (preHash in dedupeCtx.seenSourceHashes) {
                            duplicates++; continue
                        }
                        dedupeCtx.seenSourceHashes.add(preHash)
                        bodies.add(body)
                        total++
                    }
                }
            }

            // Phase 2 fallback: if the address-filtered scan found no M-Pesa bodies,
            // some devices/OEMs store M-Pesa under a short code or capitalisation that
            // doesn't match the address filter. Scan the whole inbox by body signal.
            if (total == 0) {
                Log.d(TAG, "Address-filtered SMS scan found 0 M-Pesa bodies; falling back to body-signal scan")
                val phase2Cursor = applicationContext.contentResolver.query(
                    "content://sms/inbox".toUri(),
                    arrayOf("_id", "body", "date", "address"),
                    "date >= ?",
                    arrayOf(fromMs.coerceAtLeast(0L).toString()),
                    "date DESC",
                )

                if (phase2Cursor == null) {
                    Log.w(TAG, "SMS content resolver returned null for body-signal fallback query")
                } else {
                    phase2Cursor.use { cursor ->
                        val bodyIdx = cursor.getColumnIndexOrThrow("body")
                        while (cursor.moveToNext()) {
                            val body = cursor.getString(bodyIdx) ?: continue
                            scanned++

                            if (!SmsParser.isMpesaSms(body)) continue

                            val preHash = SmsParser.sha256(SmsParser.normalizeForHash(body))
                            if (preHash in dedupeCtx.seenSourceHashes) {
                                duplicates++; continue
                            }
                            dedupeCtx.seenSourceHashes.add(preHash)
                            bodies.add(body)
                            total++
                        }
                    }
                }
            }

            Log.i(TAG, "SMS scan candidates: total=$total scanned=$scanned")

            // Parse all candidate SMS bodies in parallel (CPU-bound), then insert sequentially.
            val parsed = bodies.map { body ->
                async(Dispatchers.Default) { body to SmsParser.parse(body) }
            }.awaitAll()

            // Wrap DB writes in a transaction for bulk performance.
            db.beginTransaction()
            try {
                for ((body, result) in parsed) {
                    if (result is SmsParser.SmsParseResult.Error) {
                        db.insertAudit(null, body, null, null, "parse_failed:${result.error.reason}", result.error.reason)
                        failed++; continue
                    }

                    val tx = (result as SmsParser.SmsParseResult.Success).transaction

                    // FULIZA_CHARGE: always update outstanding balance. If the message
                    // carries an access/maintenance fee, also record it as a ledger transaction.
                    if (tx.category == SmsParserConfig.SmsCategory.FULIZA_CHARGE) {
                        tx.fulizaOutstandingKes?.let { db.setFulizaOutstanding(it) }

                        val fee = tx.fee
                        if (fee != null && fee > 0.0) {
                            val dupReason = SmsDedupeEngine.check(dedupeCtx, tx, db)
                            if (dupReason == SmsDedupeEngine.Result.NEW) {
                                val rowId = db.insertTransaction(tx)
                                if (rowId >= 0) {
                                    val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_batch"
                                    db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                                    imported++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                                } else {
                                    db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "import_failed", "DB insert failed")
                                    failed++
                                }
                            } else {
                                db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                                duplicates++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                            }
                        } else {
                            db.insertAudit(tx.mpesaCode, body, tx.fulizaOutstandingKes, "Fuliza M-PESA", "fuliza_balance_updated")
                            SmsDedupeEngine.markSeen(dedupeCtx, tx)
                        }
                        continue
                    }

                    // FULIZA_REPAYMENT (LOAN): update outstanding balance.
                    if (tx.category == SmsParserConfig.SmsCategory.LOAN && tx.fulizaAvailableLimitKes != null) {
                        val userLimit = getFulizaLimit().toDouble()
                        if (userLimit > 0.0) {
                            val outstanding = userLimit - tx.fulizaAvailableLimitKes
                            db.setFulizaOutstanding(outstanding.coerceAtLeast(0.0))
                        } else {
                            // No user limit set: decrement the active outstanding balance by the repayment amount.
                            val current = db.getFulizaOutstanding()
                            db.setFulizaOutstanding((current - tx.amount).coerceAtLeast(0.0))
                        }
                    }

                    // 4-tier deduplication
                    val dupReason = SmsDedupeEngine.check(dedupeCtx, tx, db)
                    if (dupReason != SmsDedupeEngine.Result.NEW) {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                        duplicates++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                        continue
                    }

                    if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "quarantined", "Low confidence")
                        quarantined++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                        continue
                    }

                    val rowId = db.insertTransaction(tx)
                    if (rowId >= 0) {
                        val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_batch"
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                        imported++; SmsDedupeEngine.markSeen(dedupeCtx, tx)
                    } else {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "import_failed", "DB insert failed")
                        failed++
                    }

                    // Update notification every 25 records (best effort)
                    if (total % 25 == 0) {
                        try {
                            setForeground(buildForegroundInfo("Imported $imported of ~$total M-Pesa messages…"))
                        } catch (_: Exception) {}
                    }
                }

                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
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

    override suspend fun getForegroundInfo() = buildForegroundInfo("Importing M-Pesa history…")

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
        