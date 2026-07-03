package com.lifeos.sms

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Self-healing drain for the durable SMS ingest queue.
 *
 * [SmsReceiver] persists every incoming M-Pesa SMS to `sms_ingest_queue`
 * BEFORE scheduling processing. If the process is killed (or the worker
 * crashes) between receive and ledger-insert, the row stays 'pending' and
 * this periodic worker re-enqueues it — no message is ever lost.
 *
 * Runs every 6 hours (WorkManager minimum-friendly cadence), plus on demand
 * via [drainNow] (called from app bootstrap and manual Reconcile).
 */
class IngestSweepWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val db = DbWriter.getInstance(applicationContext)
            val candidates = db.getPendingIngest(limit = 100)
            if (candidates.isNotEmpty()) {
                Log.i(TAG, "Sweep found ${candidates.size} ingest row candidate(s)")
            }
            val wm = WorkManager.getInstance(applicationContext)
            var enqueued = 0
            for ((queueId, body) in candidates) {
                if (body.isBlank()) {
                    db.markIngestDone(queueId)
                    continue
                }
                // Claim atomically before enqueuing. If the realtime worker already
                // claimed it (or another sweep iteration did), skip this row.
                if (!db.claimIngestRow(queueId)) {
                    Log.d(TAG, "Skipping already-claimed row $queueId")
                    continue
                }
                val request = OneTimeWorkRequestBuilder<SmsProcessWorker>()
                    .setInputData(
                        Data.Builder()
                            .putString(SmsProcessWorker.KEY_SMS_BODY, body)
                            .putLong(SmsProcessWorker.KEY_QUEUE_ID, queueId)
                            .build()
                    )
                    .build()
                wm.enqueueUniqueWork(
                    "lifeos-ingest-retry-$queueId",
                    ExistingWorkPolicy.KEEP, // idempotent — don't double-schedule
                    request,
                )
                enqueued++
            }
            if (enqueued > 0) {
                Log.i(TAG, "Enqueued $enqueued ingest worker(s) from sweep")
            }
            db.pruneIngestQueue(days = 30)
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Ingest sweep failed: ${e.message}", e)
            Result.retry()
        }
    }

    companion object {
        const val TAG = "LifeOS/IngestSweep"
        private const val PERIODIC_NAME = "lifeos-ingest-sweep"
        private const val ONESHOT_NAME = "lifeos-ingest-sweep-now"

        /** Idempotent registration of the 6-hourly sweep. Safe to call often. */
        fun ensureScheduled(context: Context) {
            try {
                val request = PeriodicWorkRequestBuilder<IngestSweepWorker>(6, TimeUnit.HOURS)
                    .build()
                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    PERIODIC_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request,
                )
            } catch (e: Exception) {
                Log.w(TAG, "ensureScheduled failed: ${e.message}")
            }
        }

        /** Immediate one-shot drain — used on app bootstrap and manual retry. */
        fun drainNow(context: Context) {
            try {
                val request = OneTimeWorkRequestBuilder<IngestSweepWorker>().build()
                WorkManager.getInstance(context).enqueueUniqueWork(
                    ONESHOT_NAME,
                    ExistingWorkPolicy.REPLACE,
                    request,
                )
            } catch (e: Exception) {
                Log.w(TAG, "drainNow failed: ${e.message}")
            }
        }
    }
}
