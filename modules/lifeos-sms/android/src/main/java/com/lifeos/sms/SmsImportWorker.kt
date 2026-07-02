package com.lifeos.sms

import android.content.Context
import android.os.Build
import android.provider.Telephony

import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.net.toUri
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
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
        var total = 0; var imported = 0; var duplicates = 0; var quarantined = 0; var failed = 0

        // Notify foreground immediately (required before long work begins)
        setForeground(buildForegroundInfo("Scanning M-Pesa messages…"))

        try {
            val selection = "(address LIKE ? OR address LIKE ?) AND date >= ? AND date <= ?"
            val selArgs = arrayOf("%MPESA%", "%M-PESA%", fromMs.toString(), toMs.toString())

            applicationContext.contentResolver.query(
                "content://sms/inbox".toUri(),
                arrayOf("_id", "body", "date", "address"),
                selection,
                selArgs,
                "date DESC",
            )?.use { cursor ->
                val bodyIdx = cursor.getColumnIndexOrThrow("body")
                val dateIdx = cursor.getColumnIndex("date")
                val seenCodes = mutableSetOf<String>()
                val seenHashes = mutableSetOf<String>()

                while (cursor.moveToNext()) {
                    val body = cursor.getString(bodyIdx) ?: continue
                    // SMS content-provider date is the authoritative receive timestamp (ms since epoch).
                    // Prefer it over the date parsed from the body text, which can be wrong for
                    // re-delivered or delayed messages.
                    val smsDateMs = if (dateIdx >= 0) cursor.getLong(dateIdx).takeIf { it > 0L } else null
                    total++

                    if (!SmsParser.isMpesaSms(body)) continue

                    // Within-batch dedup
                    val batchCode = SmsParserConfig.CODE_RE.find(body)?.groupValues?.get(1)
                    val batchHash = db.sha256(body)
                    if (batchCode != null && batchCode in seenCodes || batchHash in seenHashes) {
                        duplicates++; continue
                    }

                    val result = SmsParser.parse(body)
                    if (result is SmsParser.SmsParseResult.Error) {
                        db.insertAudit(null, body, null, null, "parse_failed:${result.error.reason}", result.error.reason)
                        failed++; continue
                    }

                    // Use SMS metadata date if the body date parsing returned current time (fallback),
                    // or if the parsed date is implausibly far in the future.
                    val tx = (result as SmsParser.SmsParseResult.Success).transaction
                        .let { parsed ->
                            if (smsDateMs != null) parsed.copy(date = smsDateMs) else parsed
                        }

                    // FULIZA_CHARGE: update balance, don't insert
                    if (tx.category == SmsParserConfig.SmsCategory.FULIZA_CHARGE) {
                        tx.fulizaOutstandingKes?.let { db.setFulizaOutstanding(it) }
                        db.insertAudit(tx.mpesaCode, body, tx.fulizaOutstandingKes, "Fuliza M-PESA", "fuliza_balance_updated")
                        batchCode?.let { seenCodes.add(it) }; seenHashes.add(batchHash)
                        continue
                    }

                    // DB-level dedup
                    if (db.existsByMpesaCode(tx.mpesaCode) ||
                        db.existsBySourceHash(batchHash) ||
                        db.existsBySemanticHash(tx.semanticHash) ||
                        db.existsPotentialDuplicate(tx.amount, tx.counterparty ?: "", tx.date)
                    ) {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "duplicate_detected")
                        duplicates++; batchCode?.let { seenCodes.add(it) }; seenHashes.add(batchHash)
                        continue
                    }

                    if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "quarantined", "Low confidence")
                        quarantined++; batchCode?.let { seenCodes.add(it) }; seenHashes.add(batchHash)
                        continue
                    }

                    val rowId = db.insertTransaction(tx)
                    if (rowId >= 0) {
                        val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_batch"
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                        imported++
                        batchCode?.let { seenCodes.add(it) }; seenHashes.add(batchHash)
                    } else {
                        db.insertAudit(tx.mpesaCode, body, tx.amount, tx.counterparty, "import_failed", "DB insert failed")
                        failed++
                    }

                    // Update notification every 25 records
                    if (total % 25 == 0) {
                        setForeground(buildForegroundInfo("Imported $imported of ~$total M-Pesa messages…"))
                    }
                }
            }

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
        const val NOTIF_ID_IMPORT = 9002
        const val TAG = "LifeOS/SmsImportWorker"
    }
}
