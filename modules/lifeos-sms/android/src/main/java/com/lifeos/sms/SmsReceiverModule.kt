package com.lifeos.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import java.io.File
import androidx.core.content.ContextCompat
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Expo Module exposing the native M-Pesa SMS pipeline to React Native JS.
 *
 * JS API:
 *  hasPermissions()                           → Boolean
 *  checkPermissions()                         → { receive: Boolean, read: Boolean }
 *  importHistoricalSms(fromMs, toMs)          → SmsImportResult
 *  getStats()                                 → SmsStats
 *  getAuditLog(limit)                         → AuditEntry[]
 *  retryQuarantined()                         → { retried: Int, imported: Int }
 *  parseSmsPreview(smsBody)                   → SmsPreviewResult
 *  enableBackgroundReceiver(enabled)          → void
 *  setFulizaLimit(limitKes)                   → void
 *
 * Events:
 *  onNewTransaction   — fired for each realtime SMS import (app foreground)
 *  onFulizaLimitNeeded — fired when Fuliza detected and user limit is 0
 */
class SmsReceiverModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("LifeosSms")

        Events("onNewTransaction", "onFulizaLimitNeeded")

        OnCreate { instance = this@SmsReceiverModule }
        OnDestroy { if (instance === this@SmsReceiverModule) instance = null }

        // ── hasPermissions ────────────────────────────────────────────────────

        AsyncFunction("hasPermissions") {
            val ctx = appContext.reactContext ?: return@AsyncFunction false
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        }

        // ── checkPermissions ──────────────────────────────────────────────────

        AsyncFunction("checkPermissions") {
            val ctx = appContext.reactContext ?: return@AsyncFunction mapOf("receive" to false, "read" to false)
            mapOf(
                "receive" to (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED),
                "read"    to (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS)    == PackageManager.PERMISSION_GRANTED),
            )
        }

        // ── importHistoricalSms ───────────────────────────────────────────────

        AsyncFunction("importHistoricalSms") { fromMs: Double, toMs: Double ->
            // CodedException (not java.lang.Error) so JS receives the actual
            // reason instead of a generic "has been rejected".
            val ctx = appContext.reactContext ?: throw CodedException("no_context")

            val workData = Data.Builder()
                .putLong(SmsImportWorker.KEY_FROM_MS, fromMs.toLong())
                .putLong(SmsImportWorker.KEY_TO_MS, toMs.toLong())
                .build()

            val request = OneTimeWorkRequestBuilder<SmsImportWorker>()
                .setInputData(workData)
                .build()

            val workId = request.id.toString()

            WorkManager.getInstance(ctx).enqueueUniqueWork(
                "lifeos-sms-import-$workId",
                ExistingWorkPolicy.REPLACE,
                request,
            )

            // Block until work completes (max 5 minutes) — AsyncFunction is already suspending
            val info = awaitWork(ctx, request.id)
                ?: throw CodedException("import_timeout: SMS import worker did not complete in time")

            if (info.state == WorkInfo.State.FAILED) {
                val error = info.outputData.getString("error") ?: "import_failed"
                throw CodedException(error)
            }
            if (info.state == WorkInfo.State.CANCELLED) {
                throw CodedException("import_cancelled")
            }

            val output = info.outputData
            mapOf(
                "total"       to (output.getInt("total", 0)),
                "imported"    to (output.getInt("imported", 0)),
                "duplicates"  to (output.getInt("duplicates", 0)),
                "quarantined" to (output.getInt("quarantined", 0)),
                "failed"      to (output.getInt("failed", 0)),
                "workId"      to workId,
            )
        }

        // ── getStats ──────────────────────────────────────────────────────────

        AsyncFunction("getStats") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            DbWriter.getInstance(ctx).getStats()
        }

        // ── getNativeDiagnosticInfo ─────────────────────────────────────────────
        // Exposes the native-side DB path and row counts so the JS UI can confirm
        // both sides are reading/writing the same SQLite file.

        AsyncFunction("getNativeDiagnosticInfo") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            val db = DbWriter.getInstance(ctx)
            mapOf(
                "nativeDbPath" to ctx.filesDir.canonicalPath + File.separator + "SQLite" + File.separator + "lifeos.db",
                "nativeTxCount" to db.getTransactionCount(),
                "nativeAuditCount" to db.getAuditCount(),
            )
        }

        // ── getAuditLog ───────────────────────────────────────────────────────

        AsyncFunction("getAuditLog") { limit: Int ->
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            DbWriter.getInstance(ctx).getAuditLog(limit.coerceIn(1, 500))
        }

        // ── clearAuditLog ─────────────────────────────────────────────────────

        AsyncFunction("clearAuditLog") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            DbWriter.getInstance(ctx).clearAuditLog()
        }

        // ── getRecentRejections ───────────────────────────────────────────────

        AsyncFunction("getRecentRejections") { limit: Int ->
            SmsParser.RejectionLog.recent(limit.coerceIn(1, 50)).map {
                mapOf(
                    "reason" to it.reason,
                    "rawSms" to it.rawSms.take(200),
                    "timestampMs" to it.timestampMs.toDouble(),
                )
            }
        }

        // ── retryQuarantined ─────────────────────────────────────────────────

        AsyncFunction("retryQuarantined") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            val db = DbWriter.getInstance(ctx)
            val quarantined = db.getQuarantinedMessages()
            var importedCount = 0
            val ids = mutableListOf<Long>()

            for (entry in quarantined) {
                val rawMsg = entry["rawMessage"] as? String ?: continue
                val id = entry["id"] as? Long ?: continue
                ids.add(id)

                val result = SmsParser.parse(rawMsg)
                if (result !is SmsParser.SmsParseResult.Success) continue
                val tx = result.transaction
                if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) continue

                val dupReason = SmsDedupeEngine.check(SmsDedupeEngine.Context(), tx, db)
                if (dupReason != SmsDedupeEngine.Result.NEW) continue

                val rowId = db.insertTransaction(tx)
                if (rowId >= 0) {
                    db.insertAudit(tx.mpesaCode, rawMsg, tx.amount, tx.counterparty, "retry_imported")
                    importedCount++
                }
            }
            if (ids.isNotEmpty()) db.markAuditRetried(ids)
            db.checkpoint()

            mapOf("retried" to quarantined.size, "imported" to importedCount)
        }

        // ── retrySingle ───────────────────────────────────────────────────────
        // Re-parse a single quarantined audit entry by its integer ID and insert
        // the transaction if it now passes the confidence threshold.

        AsyncFunction("retrySingle") { id: Double ->
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            val db = DbWriter.getInstance(ctx)
            val entry = db.getQuarantinedById(id.toLong())
                ?: return@AsyncFunction mapOf("ok" to false, "error" to "not_found")

            val outcome = entry["outcome"] as? String ?: ""
            val retryableOutcomes = setOf("quarantined", "batch_pending", "pending")
            if (!retryableOutcomes.any { outcome.contains(it) }) {
                return@AsyncFunction mapOf("ok" to false, "error" to "not_retryable:$outcome")
            }

            val rawMsg = entry["rawMessage"] as? String ?: return@AsyncFunction mapOf("ok" to false, "error" to "no_message")
            val result = SmsParser.parse(rawMsg)
            if (result !is SmsParser.SmsParseResult.Success) {
                return@AsyncFunction mapOf("ok" to false, "error" to result.let { (it as SmsParser.SmsParseResult.Error).error.reason })
            }
            val tx = result.transaction
            if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                return@AsyncFunction mapOf("ok" to false, "error" to "still_quarantined")
            }
            val dupReason = SmsDedupeEngine.check(SmsDedupeEngine.Context(), tx, db)
            if (dupReason != SmsDedupeEngine.Result.NEW) {
                db.markAuditRetried(listOf(id.toLong()))
                return@AsyncFunction mapOf("ok" to true, "note" to "already_exists:${dupReason.name.lowercase()}")
            }
            val rowId = db.insertTransaction(tx)
            if (rowId < 0) return@AsyncFunction mapOf("ok" to false, "error" to "insert_failed")
            db.insertAudit(tx.mpesaCode, rawMsg, tx.amount, tx.counterparty, "retry_imported")
            db.markAuditRetried(listOf(id.toLong()))
            db.checkpoint()
            mapOf("ok" to true)
        }

        // ── parseSmsPreview ───────────────────────────────────────────────────

        AsyncFunction("parseSmsPreview") { smsBody: String ->
            when (val result = SmsParser.parse(smsBody)) {
                is SmsParser.SmsParseResult.Error -> mapOf("ok" to false, "reason" to result.error.reason)
                is SmsParser.SmsParseResult.Success -> {
                    val tx = result.transaction
                    mapOf(
                        "ok"           to true,
                        "mpesaCode"    to tx.mpesaCode,
                        "amount"       to tx.amount,
                        "merchant"     to (tx.counterparty ?: ""),
                        "category"     to (SmsParserConfig.APP_CATEGORY[tx.category] ?: "uncategorized"),
                        "transactionType" to tx.transactionType,
                        "confidence"   to tx.confidence.name.lowercase(),
                        "description"  to tx.description,
                        "dateMs"       to tx.date.toDouble(),
                        "balanceAfter" to tx.balanceAfter,
                        "fee"          to tx.fee,
                        "rawSms"       to tx.rawSms,
                        "parseRoute"   to tx.parseRoute.name.lowercase(),
                        "semanticHash" to tx.semanticHash,
                        "matchPhase"   to tx.matchedRulePhase,
                        "ruleId"       to tx.ruleId,
                        "sourceHash"   to tx.sourceHash,
                    )
                }
            }
        }

        // ── enableBackgroundReceiver ──────────────────────────────────────────

        AsyncFunction("enableBackgroundReceiver") { enabled: Boolean ->
            val ctx = appContext.reactContext ?: return@AsyncFunction
            ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(SmsReceiver.KEY_BACKGROUND_RECEIVER, enabled)
                .apply()
            Log.d(TAG, "Background receiver ${if (enabled) "enabled" else "disabled"}")
        }

        // ── getReceiverStatus ─────────────────────────────────────────────────
        // Returns the enabled flag and the epoch-ms timestamp of the last time
        // SmsReceiver.onReceive() fired — used for accurate realtime-status display.

        AsyncFunction("getReceiverStatus") {
            val ctx = appContext.reactContext ?: return@AsyncFunction mapOf(
                "enabled" to false,
                "lastFireMs" to 0.0,
            )
            val prefs = ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            mapOf(
                "enabled"    to prefs.getBoolean(SmsReceiver.KEY_BACKGROUND_RECEIVER, false),
                "lastFireMs" to prefs.getLong(SmsReceiver.KEY_LAST_RECEIVER_FIRE_MS, 0L).toDouble(),
            )
        }

        // ── Durable ingest queue ─────────────────────────────────────────────

        // Queue health for Import Health: {pending, failed, oldestPendingAt}.
        AsyncFunction("getIngestQueueStatus") {
            val ctx = appContext.reactContext ?: return@AsyncFunction mapOf(
                "pending" to 0L, "failed" to 0L, "oldestPendingAt" to null,
            )
            DbWriter.getInstance(ctx).getIngestQueueStats()
        }

        // Re-arm permanently-failed rows and drain the queue immediately.
        AsyncFunction("retryIngestQueue") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            val requeued = DbWriter.getInstance(ctx).requeueFailedIngest()
            IngestSweepWorker.drainNow(ctx)
            mapOf("requeued" to requeued)
        }

        // Called from app bootstrap: register the 15-minute sweep and drain any
        // rows that accumulated while the app was closed/killed.
        AsyncFunction("ensureIngestSweep") {
            val ctx = appContext.reactContext ?: throw CodedException("no_context")
            IngestSweepWorker.ensureScheduled(ctx)
            IngestSweepWorker.drainNow(ctx)
            null
        }

        // ── Battery optimization ──────────────────────────────────────────────
        // The background receiver toggle doubles as the "run reliably in the
        // background" switch. OEM battery optimization (Doze, app standby,
        // aggressive OEM killers) can delay or drop WorkManager jobs for
        // optimized apps, so the JS side checks/requests an exemption when
        // the user turns the toggle on.

        AsyncFunction("isIgnoringBatteryOptimizations") {
            val ctx = appContext.reactContext ?: return@AsyncFunction false
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            pm.isIgnoringBatteryOptimizations(ctx.packageName)
        }

        AsyncFunction("requestIgnoreBatteryOptimizations") {
            val ctx = appContext.reactContext ?: return@AsyncFunction false
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            if (pm.isIgnoringBatteryOptimizations(ctx.packageName)) return@AsyncFunction true
            return@AsyncFunction try {
                val intent = android.content.Intent(
                    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    android.net.Uri.parse("package:${ctx.packageName}"),
                ).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                ctx.startActivity(intent)
                true // dialog shown — actual grant is re-checked via isIgnoringBatteryOptimizations
            } catch (e: Exception) {
                Log.w(TAG, "Battery optimization request failed: ${e.message}")
                // Fall back to the app's battery settings page
                try {
                    val fallback = android.content.Intent(
                        android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
                    ).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    ctx.startActivity(fallback)
                    true
                } catch (e2: Exception) {
                    false
                }
            }
        }

        // ── setFulizaLimit ────────────────────────────────────────────────────

        AsyncFunction("setFulizaLimit") { limitKes: Double ->
            val ctx = appContext.reactContext ?: return@AsyncFunction
            ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putFloat(SmsProcessWorker.KEY_FULIZA_LIMIT, limitKes.toFloat())
                .apply()
            // Only re-arm the prompt when the user explicitly clears the limit.
            // A positive save should keep the session guard engaged so a running
            // import cannot reopen the modal immediately afterwards.
            if (limitKes == 0.0) {
                fulizaLimitNeededEmitted = false
            }
        }
    }

    // ── Event emitters (called from Workers) ────────────────────────────────

    internal fun emitNewTransaction(tx: SmsParser.ParsedTransaction) {
        try {
            sendEvent(
                "onNewTransaction",
                mapOf(
                    "mpesaCode"      to tx.mpesaCode,
                    "amount"         to tx.amount,
                    "merchant"       to (tx.counterparty ?: ""),
                    "category"       to (SmsParserConfig.APP_CATEGORY[tx.category] ?: "uncategorized"),
                    "transactionType" to tx.transactionType,
                    "confidence"     to tx.confidence.name.lowercase(),
                    "description"    to tx.description,
                    "dateMs"         to tx.date.toDouble(),
                    "balanceAfter"   to tx.balanceAfter,
                    "fee"            to tx.fee,
                    "rawSms"         to tx.rawSms,
                    "parseRoute"     to tx.parseRoute.name.lowercase(),
                    "semanticHash"   to tx.semanticHash,
                    "matchPhase"     to tx.matchedRulePhase,
                    "ruleId"         to tx.ruleId,
                    "sourceHash"     to tx.sourceHash,
                )
            )
        } catch (e: Exception) {
            Log.w(TAG, "emitNewTransaction failed: ${e.message}")
        }
    }

    internal fun emitFulizaLimitNeeded(outstandingKes: Double, type: String) {
        // Fast path: already emitted this process lifetime.
        if (fulizaLimitNeededEmitted) {
            Log.d(TAG, "emitFulizaLimitNeeded skipped: already emitted this session")
            return
        }
        // Persist-aware guard: if the user set a positive limit in a prior session,
        // the in-memory flag starts false after a process kill+restart but the limit
        // is already stored — don't re-open the modal.
        val ctx = appContext.reactContext
        if (ctx != null) {
            val storedLimit = ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                .getFloat(SmsProcessWorker.KEY_FULIZA_LIMIT, 0f)
            if (storedLimit > 0f) {
                fulizaLimitNeededEmitted = true
                Log.d(TAG, "emitFulizaLimitNeeded skipped: limit already persisted ($storedLimit)")
                return
            }
        }
        try {
            sendEvent(
                "onFulizaLimitNeeded",
                mapOf("outstandingKes" to outstandingKes, "category" to type)
            )
            fulizaLimitNeededEmitted = true
            Log.d(TAG, "emitFulizaLimitNeeded sent: outstanding=$outstandingKes type=$type")
        } catch (e: Exception) {
            Log.w(TAG, "emitFulizaLimitNeeded failed: ${e.message}")
        }
    }

    // ── WorkManager await helper ─────────────────────────────────────────────
    // Suspends the calling coroutine (never blocks a thread) until the work
    // reaches a terminal state, or until the 5-minute deadline is exceeded.
    // WorkManager emits a new WorkInfo into the Flow on every state transition,
    // so we are notified the instant the worker finishes — no polling delay.

    private suspend fun awaitWork(ctx: Context, workId: java.util.UUID): WorkInfo? =
        withTimeoutOrNull(5 * 60 * 1000L) {
            WorkManager.getInstance(ctx)
                .getWorkInfoByIdFlow(workId)
                .filterNotNull()
                .filter { it.state.isFinished }
                .first()
        }

    companion object {
        const val TAG = "LifeOS/SmsReceiverModule"

        /**
         * Singleton handle so WorkManager workers can emit events to JS.
         * Null when no JS context is attached (app killed or not yet started).
         */
        @Volatile
        var instance: SmsReceiverModule? = null
            internal set

        /**
         * Process-level guard so onFulizaLimitNeeded is emitted at most once.
         * Reset when the user saves a positive limit via setFulizaLimit.
         */
        @Volatile
        var fulizaLimitNeededEmitted: Boolean = false
            internal set
    }
}
