package com.lifeos.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Re-arms background work after a device reboot or app update — WITHOUT
 * requiring the user to open the app first.
 *
 * On BOOT_COMPLETED / MY_PACKAGE_REPLACED:
 *  1. Re-register the 6-hourly ingest sweep (WorkManager persists periodic
 *     work across reboots, but re-registering with KEEP is free insurance
 *     and covers app-update edge cases).
 *  2. Drain any pending sms_ingest_queue rows immediately — messages that
 *     arrived right before the reboot get imported now, not hours later.
 *
 * Scheduled *notifications* (reminders/digest) are OS-level and wiped by
 * reboot; they are re-synced by the JS bootstrap on next app launch — that
 * path already exists and needs no work here.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return

        Log.i(TAG, "Boot/update signal ($action) — re-arming SMS pipeline")
        try {
            IngestSweepWorker.ensureScheduled(context)
            IngestSweepWorker.drainNow(context)
        } catch (e: Exception) {
            Log.w(TAG, "Boot re-arm failed: ${e.message}")
        }
    }

    companion object {
        const val TAG = "LifeOS/BootReceiver"
    }
}
