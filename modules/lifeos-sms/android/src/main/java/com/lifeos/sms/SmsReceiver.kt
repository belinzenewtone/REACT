package com.lifeos.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Static BroadcastReceiver registered in AndroidManifest — fires even when the
 * app process is completely killed.
 *
 * Pipeline:
 *  1. Extract full SMS from PDU messages
 *  2. Quick M-Pesa signal filter (cheap string check — no regex yet)
 *  3. Check background receiver enabled flag (SharedPreferences)
 *  4. Persist raw body to durable [sms_ingest_queue] on a background thread
 *  5. Enqueue [SmsProcessWorker] keyed by queue row id so duplicate broadcasts
 *     and sweep runs are race-free
 *
 * IMPORTANT: all DB and WorkManager work is moved off the main thread using
 * [goAsync] + a coroutine. Opening SQLite inside [onReceive] directly causes
 * ANRs and BroadcastReceiver timeouts on some devices.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val (fullMessage, sender) = buildFullMessageAndSender(intent) ?: return
        if (!InstitutionDetector.isFinancialSms(sender, fullMessage)) return

        // Respect the user's background receiver toggle
        if (!isBackgroundReceiverEnabled(context)) {
            Log.d(TAG, "Background receiver disabled — skipping realtime SMS")
            return
        }

        // Keep the broadcast alive while we do durable IO off the main thread.
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                processRealtimeSms(context, fullMessage, sender)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private suspend fun processRealtimeSms(context: Context, fullMessage: String, sender: String) {
        val db = DbWriter.getInstance(context)

        val queueId = try {
            db.enqueueIngest(fullMessage, sender)
        } catch (e: Exception) {
            Log.w(TAG, "enqueueIngest failed (processing continues in-flight): ${e.message}")
            -1L
        }

        // Make sure the self-healing sweep is scheduled (idempotent — KEEP).
        IngestSweepWorker.ensureScheduled(context)

        if (queueId >= 0) {
            enqueueProcessWorker(context, queueId, sender = sender)
        } else {
            enqueueProcessWorker(context, -1L, fullMessage, sender)
        }

        // Record the last time this receiver fired so the UI can show accurate status
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_RECEIVER_FIRE_MS, System.currentTimeMillis())
            .apply()

        Log.d(TAG, "Enqueued realtime worker for queue row: $queueId")
    }

    private fun enqueueProcessWorker(context: Context, queueId: Long, body: String? = null, sender: String = "") {
        val workData = Data.Builder()
            .putLong(SmsProcessWorker.KEY_QUEUE_ID, queueId)
            .putString(SmsProcessWorker.KEY_ORIGIN, SmsProcessWorker.ORIGIN_REALTIME)
            .putString(SmsProcessWorker.KEY_SMS_SENDER, sender)
            .apply { body?.let { putString(SmsProcessWorker.KEY_SMS_BODY, it) } }
            .build()

        val request = OneTimeWorkRequestBuilder<SmsProcessWorker>()
            .setInputData(workData)
            .apply {
                // setExpedited needs OutOfQuotaPolicy on API 31+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                }
            }
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "lifeos-realtime-$queueId",
            ExistingWorkPolicy.KEEP, // idempotent — ignore second broadcast of same body
            request,
        )
    }

    private fun buildFullMessageAndSender(intent: Intent): Pair<String, String>? {
        return try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return null
            val body = messages.mapNotNull { it?.messageBody }.joinToString("").takeIf { it.isNotBlank() } ?: return null
            val sender = messages.firstNotNullOfOrNull { it?.originatingAddress }?.trim() ?: ""
            body to sender
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract SMS PDU: ${e.message}")
            null
        }
    }

    private fun isBackgroundReceiverEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_BACKGROUND_RECEIVER, false) // default: disabled until user opts in
    }

    internal companion object {
        const val TAG = "LifeOS/SmsReceiver"
        const val PREFS_NAME = "lifeos_sms_prefs"
        const val KEY_BACKGROUND_RECEIVER = "background_receiver_enabled"
        const val KEY_LAST_RECEIVER_FIRE_MS = "last_receiver_fire_ms"
    }
}
