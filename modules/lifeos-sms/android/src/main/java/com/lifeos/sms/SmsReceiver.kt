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

/**
 * Static BroadcastReceiver registered in AndroidManifest — fires even when the
 * app process is completely killed.
 *
 * Pipeline:
 *  1. Extract full SMS from PDU messages
 *  2. Quick M-Pesa signal filter (cheap string check — no regex yet)
 *  3. Check background receiver enabled flag (SharedPreferences)
 *  4. Enqueue [SmsProcessWorker] as an expedited OneTimeWork task
 *     keyed by M-Pesa code so duplicate broadcasts are idempotent
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val fullMessage = buildFullMessage(intent) ?: return
        // Pre-filter — avoid WorkManager overhead for non-M-Pesa SMS.
        // Uses the same signal check as the parser (keyword or code+amount).
        if (!SmsParser.isMpesaSms(fullMessage)) return

        // Respect the user's background receiver toggle
        if (!isBackgroundReceiverEnabled(context)) {
            Log.d(TAG, "Background receiver disabled — skipping realtime SMS")
            return
        }

        // Parse just enough to get the code for the unique work key
        val code = SmsParserConfig.CODE_RE.find(fullMessage)?.groupValues?.get(1) ?: "UNKNOWN"

        val workData = Data.Builder()
            .putString(SmsProcessWorker.KEY_SMS_BODY, fullMessage)
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
            "lifeos-realtime-$code",
            ExistingWorkPolicy.KEEP,  // idempotent — ignore second broadcast of same code
            request,
        )

        // Record the last time this receiver fired so the UI can show accurate status
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_RECEIVER_FIRE_MS, System.currentTimeMillis())
            .apply()

        Log.d(TAG, "Enqueued realtime worker for M-Pesa code: $code")
    }

    private fun buildFullMessage(intent: Intent): String? {
        return try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
                ?.mapNotNull { it?.messageBody }
                ?.joinToString("")
                ?.takeIf { it.isNotBlank() }
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
