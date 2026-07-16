package com.lifeos.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
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
 * ALSO performs inbox reconciliation (ported from the REACT sibling's
 * MpesaReconciliationWorker): a delta scan of the SMS inbox catching messages
 * whose SMS_RECEIVED broadcast was dropped by aggressive OEM battery killers
 * (Xiaomi/Tecno/Oppo…) — the one failure mode the receiver + queue can't see.
 *
 * Strain budget (why this is effectively free):
 *  - Runs every 15 min in WorkManager's batched maintenance windows — the
 *    device radio/CPU is already awake; no wakelocks of our own.
 *  - Gated: skips entirely unless the background receiver is enabled AND
 *    READ_SMS is granted.
 *  - Delta scan only: `date > lastScanTs` with a 10-min overlap for clock
 *    skew — the SMS provider's date index makes this a few-row cursor, and
 *    the typical run sees 0 rows and exits in single-digit milliseconds.
 *  - First run bounded to 14 days back; per-run cap of 500 rows.
 *  - Dedupe before any parsing: cheap keyword check, then the queue's UNIQUE
 *    body-hash makes enqueueIngest a no-op for anything already seen, and the
 *    downstream 4-tier dedupe catches anything imported via other paths.
 *  - Zero JS involvement: never wakes the React runtime; the app discovers
 *    new rows via the existing dataVersion bump on next foreground.
 *
 * Runs every 15 minutes plus on demand via [drainNow] (app bootstrap, boot
 * receiver, manual Reconcile).
 */
class IngestSweepWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val db = DbWriter.getInstance(applicationContext)

            // Phase A: inbox reconciliation — catch broadcasts the OS dropped.
            // Feeds the same durable queue; Phase B below drains it.
            try {
                reconcileInbox(db)
            } catch (e: Exception) {
                Log.w(TAG, "Inbox reconciliation skipped: ${e.message}")
            }

            // Phase B: drain the durable queue.
            val candidates = db.getPendingIngest(limit = 100)
            if (candidates.isNotEmpty()) {
                Log.i(TAG, "Sweep found ${candidates.size} ingest row candidate(s)")
            }
            val wm = WorkManager.getInstance(applicationContext)
            var enqueued = 0
            for (row in candidates) {
                if (row.body.isBlank()) {
                    db.markIngestDone(row.id)
                    continue
                }
                if (!db.claimIngestRow(row.id)) {
                    Log.d(TAG, "Skipping already-claimed row ${row.id}")
                    continue
                }
                val request = OneTimeWorkRequestBuilder<SmsProcessWorker>()
                    .setInputData(
                        Data.Builder()
                            .putString(SmsProcessWorker.KEY_SMS_BODY, row.body)
                            .putString(SmsProcessWorker.KEY_SMS_SENDER, row.sender)
                            .putLong(SmsProcessWorker.KEY_QUEUE_ID, row.id)
                            .putString(SmsProcessWorker.KEY_ORIGIN, SmsProcessWorker.ORIGIN_SCAN)
                            .build()
                    )
                    .build()
                wm.enqueueUniqueWork(
                    "lifeos-ingest-retry-${row.id}",
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

    /**
     * Delta-scan the SMS inbox for M-Pesa messages the receiver never saw and
     * persist them to the durable ingest queue. See the class KDoc for the
     * strain budget — the typical run touches 0 rows.
     */
    private fun reconcileInbox(db: DbWriter) {
        val ctx = applicationContext

        // Gate 1: user opted in to background capture.
        val prefs = ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(SmsReceiver.KEY_BACKGROUND_RECEIVER, false)) return

        // Gate 2: READ_SMS granted.
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val now = System.currentTimeMillis()
        val stored = prefs.getLong(KEY_LAST_INBOX_SCAN_MS, 0L)
        // First run: bounded lookback. Subsequent: last scan minus a 10-min
        // overlap for SMS-provider clock skew (queue body-hash dedupes overlap).
        val sinceMs = if (stored == 0L) now - INITIAL_SCAN_WINDOW_MS
                      else stored - SCAN_OVERLAP_MS

        var scanned = 0
        var enqueued = 0
        val cursor = ctx.contentResolver.query(
            "content://sms/inbox".toUri(),
            arrayOf("body", "address", "date"),
            // Only the date filter is applied at the provider level. The sender
            // address is checked in code (MPESA / M-PESA / M_PESA variants) so
            // we don't miss messages that a restrictive LIKE '%MPESA%' would
            // drop, e.g. hyphenated sender IDs or addresses with trailing spaces.
            "date > ?",
            arrayOf(sinceMs.toString()),
            "date ASC",
        )
        cursor?.use { c ->
            val bodyIdx = c.getColumnIndex("body")
            val addressIdx = c.getColumnIndex("address")
            if (bodyIdx < 0) return@use
            while (c.moveToNext() && scanned < MAX_ROWS_PER_SCAN) {
                scanned++
                val body = c.getString(bodyIdx) ?: continue
                val address = if (addressIdx >= 0) c.getString(addressIdx) ?: "" else ""
                // Cheap sender + body signal check before touching the DB.
                if (InstitutionDetector.detect(address, body) == null) continue
                // Skip messages already imported (indexed source-hash lookup) —
                // keeps the FIRST run from re-enqueueing weeks of history that
                // arrived via batch import rather than the queue.
                val sourceHash = SmsParser.sha256(SmsParser.normalizeForHash(body))
                if (db.existsBySourceHash(sourceHash)) continue
                // Idempotent: UNIQUE body-hash makes re-seen messages a no-op,
                // and downstream 4-tier dedupe guards ledger duplicates.
                if (db.enqueueIngestIfNew(body, address)) enqueued++
            }
        }

        prefs.edit().putLong(KEY_LAST_INBOX_SCAN_MS, now).apply()
        if (enqueued > 0) {
            Log.i(TAG, "Inbox reconciliation recovered $enqueued dropped message(s) (scanned $scanned)")
        }
    }

    companion object {
        const val TAG = "LifeOS/IngestSweep"
        private const val PERIODIC_NAME = "lifeos-ingest-sweep"
        private const val ONESHOT_NAME = "lifeos-ingest-sweep-now"

        /** SharedPreferences key (in SmsReceiver.PREFS_NAME) for the last inbox delta scan. */
        const val KEY_LAST_INBOX_SCAN_MS = "last_inbox_scan_ms"

        /** First-ever scan lookback: 14 days. */
        private const val INITIAL_SCAN_WINDOW_MS = 14L * 24 * 60 * 60 * 1000

        /** Re-scan overlap for SMS-provider clock skew. */
        private const val SCAN_OVERLAP_MS = 10L * 60 * 1000

        /** Hard cap per run — keeps a pathological first scan bounded. */
        private const val MAX_ROWS_PER_SCAN = 500

        /**
         * Idempotent registration of the 15-minute sweep (WorkManager's
         * minimum periodic interval, executed inside the OS's batched
         * maintenance windows). UPDATE policy migrates older installs that
         * registered the previous 6-hour spec.
         */
        fun ensureScheduled(context: Context) {
            try {
                val request = PeriodicWorkRequestBuilder<IngestSweepWorker>(15, TimeUnit.MINUTES)
                    .build()
                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    PERIODIC_NAME,
                    ExistingPeriodicWorkPolicy.UPDATE,
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
