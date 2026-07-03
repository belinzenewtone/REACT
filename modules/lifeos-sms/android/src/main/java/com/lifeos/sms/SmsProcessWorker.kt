package com.lifeos.sms

import android.content.Context
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Expedited WorkManager worker for real-time M-Pesa SMS processing.
 *
 * Enqueued by [SmsReceiver] when an incoming SMS arrives.
 * Runs on IO dispatcher — no main-thread work.
 *
 * Pipeline:
 *  1. Parse via SmsParser (in-memory, fast)
 *  2. Deduplicate via DbWriter (3 checks)
 *  3. FULIZA_CHARGE → update outstanding balance, insert fee if present
 *  4. Insert into transactions table
 *  5. Insert audit entry
 *  6. Emit onNewTransaction event to JS (if SmsReceiverModule is alive)
 *  7. Emit onFulizaLimitNeeded if Fuliza detected and user limit is unset
 */
class SmsProcessWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val smsBody = inputData.getString(KEY_SMS_BODY).orEmpty()
        if (smsBody.isBlank()) return@withContext Result.failure()

        val db = DbWriter.getInstance(applicationContext)

        try {
            // Stage 0: Quick filter
            if (!SmsParser.isMpesaSms(smsBody)) {
                db.insertAudit(null, smsBody, null, null, "ignored_not_mpesa")
                return@withContext Result.success()
            }

            val parseResult = SmsParser.parse(smsBody)

            if (parseResult is SmsParser.SmsParseResult.Error) {
                db.insertAudit(
                    mpesaCode = null, rawMessage = smsBody,
                    amount = null, merchant = null,
                    outcome = "parse_failed:${parseResult.error.reason}",
                    failureReason = parseResult.error.reason,
                )
                return@withContext Result.success()
            }

            val tx = (parseResult as SmsParser.SmsParseResult.Success).transaction

            // FULIZA_CHARGE: update outstanding balance. If the message carries
            // an access/maintenance fee, also record it as a ledger transaction.
            if (tx.category == SmsParserConfig.SmsCategory.FULIZA_CHARGE) {
                val outstanding = tx.fulizaOutstandingKes
                if (outstanding != null) {
                    db.setFulizaOutstanding(outstanding)
                }

                val fee = tx.fee
                if (fee != null && fee > 0.0) {
                    val dupReason = SmsDedupeEngine.check(SmsDedupeEngine.Context(), tx, db)
                    if (dupReason == SmsDedupeEngine.Result.NEW) {
                        val rowId = db.insertTransaction(tx)
                        if (rowId >= 0) {
                            val label = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_realtime"
                            db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, label, null, tx.confidence.name.lowercase())
                            SmsReceiverModule.instance?.emitNewTransaction(tx)
                        } else {
                            db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, "import_failed", "DB insert returned -1")
                            return@withContext Result.retry()
                        }
                    } else {
                        db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                    }
                } else {
                    db.insertAudit(tx.mpesaCode, smsBody, outstanding, "Fuliza M-PESA", "fuliza_balance_updated")
                    maybeNotifyFulizaLimitNeeded(outstanding, "charge")
                }
                return@withContext Result.success()
            }

            // 4-tier deduplication
            val dupReason = SmsDedupeEngine.check(SmsDedupeEngine.Context(), tx, db)
            if (dupReason != SmsDedupeEngine.Result.NEW) {
                db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, "duplicate_detected:${dupReason.name.lowercase()}")
                return@withContext Result.success()
            }

            // Quarantine — hold, do not auto-insert
            if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                db.insertAudit(
                    tx.mpesaCode, smsBody, tx.amount, tx.counterparty,
                    "quarantined", "Low confidence — awaiting review",
                    tx.confidence.name.lowercase()
                )
                return@withContext Result.success()
            }

            // Insert transaction
            val rowId = db.insertTransaction(tx)
            if (rowId < 0) {
                db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, "import_failed", "DB insert returned -1")
                return@withContext Result.retry()
            }

            val outcomeLabel = if (tx.parseRoute == SmsParser.ParseRoute.REVIEW) "imported_review" else "imported_realtime"
            db.insertAudit(tx.mpesaCode, smsBody, tx.amount, tx.counterparty, outcomeLabel, null, tx.confidence.name.lowercase())

            // Fuliza repayment: update outstanding balance from available limit
            if (tx.category == SmsParserConfig.SmsCategory.LOAN && tx.fulizaAvailableLimitKes != null) {
                val userLimit = getFulizaLimit().toDouble()
                if (userLimit > 0.0) {
                    val outstanding = userLimit - tx.fulizaAvailableLimitKes
                    db.setFulizaOutstanding(outstanding.coerceAtLeast(0.0))
                } else {
                    val current = db.getFulizaOutstanding()
                    db.setFulizaOutstanding((current - tx.amount).coerceAtLeast(0.0))
                    maybeNotifyFulizaLimitNeeded(tx.fulizaAvailableLimitKes, "repayment")
                }
            }

            // Flush WAL so expo-sqlite's separate JS connection sees the new row.
            db.checkpoint()

            // Emit realtime event to JS
            SmsReceiverModule.instance?.emitNewTransaction(tx)

            Log.d(TAG, "Imported realtime: ${tx.mpesaCode} ${tx.category} ${tx.amount}")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "SmsProcessWorker failed: ${e.message}", e)
            db.insertAudit(null, smsBody, null, null, "import_failed", e.message?.take(200))
            Result.retry()
        }
    }

    private fun getFulizaLimit(): Float {
        return applicationContext.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            .getFloat(KEY_FULIZA_LIMIT, 0f)
    }

    private fun maybeNotifyFulizaLimitNeeded(outstandingKes: Double?, type: String) {
        val outstanding = outstandingKes ?: return
        if (getFulizaLimit() <= 0f) {
            SmsReceiverModule.instance?.emitFulizaLimitNeeded(outstanding, type)
        }
    }

    // Required by WorkManager for expedited work — use a silent channel notification
    override suspend fun getForegroundInfo(): ForegroundInfo {
        ensureNotificationChannel()
        val notification = NotificationCompat.Builder(applicationContext, NOTIF_CHANNEL_ID)
            .setContentTitle("Processing M-Pesa SMS")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(false)
            .build()
        return ForegroundInfo(NOTIF_ID_PROCESS, notification)
    }

    private fun ensureNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as android.app.NotificationManager
            if (nm.getNotificationChannel(NOTIF_CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    android.app.NotificationChannel(
                        NOTIF_CHANNEL_ID,
                        "SMS Import",
                        android.app.NotificationManager.IMPORTANCE_LOW,
                    )
                )
            }
        }
    }

    companion object {
        const val KEY_SMS_BODY = "sms_body"
        const val KEY_FULIZA_LIMIT = "fuliza_limit_kes"
        const val NOTIF_CHANNEL_ID = "lifeos_sms_channel"
        const val NOTIF_ID_PROCESS = 9001
        const val TAG = "LifeOS/SmsProcessWorker"
    }
}
