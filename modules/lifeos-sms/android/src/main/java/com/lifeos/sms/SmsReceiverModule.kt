package com.lifeos.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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
            val ctx = appContext.reactContext ?: throw Error("No context")

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

            val output = info?.outputData
            mapOf(
                "total"       to (output?.getInt("total", 0) ?: 0),
                "imported"    to (output?.getInt("imported", 0) ?: 0),
                "duplicates"  to (output?.getInt("duplicates", 0) ?: 0),
                "quarantined" to (output?.getInt("quarantined", 0) ?: 0),
                "failed"      to (output?.getInt("failed", 0) ?: 0),
                "workId"      to workId,
            )
        }

        // ── getStats ──────────────────────────────────────────────────────────

        AsyncFunction("getStats") {
            val ctx = appContext.reactContext ?: throw Error("No context")
            DbWriter.getInstance(ctx).getStats()
        }

        // ── getAuditLog ───────────────────────────────────────────────────────

        AsyncFunction("getAuditLog") { limit: Int ->
            val ctx = appContext.reactContext ?: throw Error("No context")
            DbWriter.getInstance(ctx).getAuditLog(limit.coerceIn(1, 500))
        }

        // ── retryQuarantined ─────────────────────────────────────────────────

        AsyncFunction("retryQuarantined") {
            val ctx = appContext.reactContext ?: throw Error("No context")
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
                if (db.existsByMpesaCode(tx.mpesaCode) || db.existsBySemanticHash(tx.semanticHash)) continue

                val rowId = db.insertTransaction(tx)
                if (rowId >= 0) {
                    db.insertAudit(tx.mpesaCode, rawMsg, tx.amount, tx.counterparty, "retry_imported")
                    importedCount++
                }
            }
            if (ids.isNotEmpty()) db.markAuditRetried(ids)

            mapOf("retried" to quarantined.size, "imported" to importedCount)
        }

        // ── retrySingle ───────────────────────────────────────────────────────
        // Re-parse a single quarantined audit entry by its integer ID and insert
        // the transaction if it now passes the confidence threshold.

        AsyncFunction("retrySingle") { id: Double ->
            val ctx = appContext.reactContext ?: throw Error("No context")
            val db = DbWriter.getInstance(ctx)
            val entry = db.getQuarantinedById(id.toLong())
                ?: return@AsyncFunction mapOf("ok" to false, "error" to "not_found")

            val rawMsg = entry["rawMessage"] as? String ?: return@AsyncFunction mapOf("ok" to false, "error" to "no_message")
            val result = SmsParser.parse(rawMsg)
            if (result !is SmsParser.SmsParseResult.Success) {
                return@AsyncFunction mapOf("ok" to false, "error" to result.let { (it as SmsParser.SmsParseResult.Error).error.reason })
            }
            val tx = result.transaction
            if (tx.parseRoute == SmsParser.ParseRoute.QUARANTINE) {
                return@AsyncFunction mapOf("ok" to false, "error" to "still_quarantined")
            }
            if (db.existsByMpesaCode(tx.mpesaCode) || db.existsBySemanticHash(tx.semanticHash)) {
                db.markAuditRetried(listOf(id.toLong()))
                return@AsyncFunction mapOf("ok" to true, "note" to "already_exists")
            }
            val rowId = db.insertTransaction(tx)
            if (rowId < 0) return@AsyncFunction mapOf("ok" to false, "error" to "insert_failed")
            db.insertAudit(tx.mpesaCode, rawMsg, tx.amount, tx.counterparty, "retry_imported")
            db.markAuditRetried(listOf(id.toLong()))
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
                        "parseRoute"   to tx.parseRoute.name.lowercase(),
                        "semanticHash" to tx.semanticHash,
                        "matchPhase"   to tx.matchedRulePhase,
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
                "enabled" to true,
                "lastFireMs" to 0.0,
            )
            val prefs = ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            mapOf(
                "enabled"    to prefs.getBoolean(SmsReceiver.KEY_BACKGROUND_RECEIVER, true),
                "lastFireMs" to prefs.getLong(SmsReceiver.KEY_LAST_RECEIVER_FIRE_MS, 0L).toDouble(),
            )
        }

        // ── setFulizaLimit ────────────────────────────────────────────────────

        AsyncFunction("setFulizaLimit") { limitKes: Double ->
            val ctx = appContext.reactContext ?: return@AsyncFunction
            ctx.getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putFloat(SmsProcessWorker.KEY_FULIZA_LIMIT, limitKes.toFloat())
                .apply()
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
                )
            )
        } catch (e: Exception) {
            Log.w(TAG, "emitNewTransaction failed: ${e.message}")
        }
    }

    internal fun emitFulizaLimitNeeded(outstandingKes: Double, type: String) {
        try {
            sendEvent(
                "onFulizaLimitNeeded",
                mapOf("outstandingKes" to outstandingKes, "category" to type)
            )
        } catch (e: Exception) {
            Log.w(TAG, "emitFulizaLimitNeeded failed: ${e.message}")
        }
    }

    // ── WorkManager await helper ─────────────────────────────────────────────

    private fun awaitWork(ctx: Context, workId: java.util.UUID): WorkInfo? {
        val wm = WorkManager.getInstance(ctx)
        val deadline = System.currentTimeMillis() + 5 * 60 * 1000L
        while (System.currentTimeMillis() < deadline) {
            val info = wm.getWorkInfoById(workId).get()
            if (info != null && (info.state == WorkInfo.State.SUCCEEDED || info.state == WorkInfo.State.FAILED || info.state == WorkInfo.State.CANCELLED)) {
                return info
            }
            Thread.sleep(400)
        }
        return null
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
    }
}
