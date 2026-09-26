package com.example.forexsignals.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists signal creation timestamps and lifecycle anchors across app launches.
 *
 * Prevents the validation countdown timer from constantly resetting back to the initial duration
 * (e.g., 1h 30m for M15) whenever the user closes and reopens the application.
 */
object SignalPersistenceManager {
    private const val PREFS_NAME = "fx_signal_session_store"
    private const val KEY_PREFIX_CREATED = "sig_created_"

    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        if (prefs == null) {
            prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    /**
     * Retrieves the persistent creation epoch timestamp for a signal ID.
     * If the signal was already anchored in a previous app session, returns that stored timestamp
     * so that the countdown reflects true elapsed real-world time.
     *
     * If the signal setup expired long ago (e.g. more than 3 hours past expiration),
     * it automatically rolls over into a fresh institutional setup cycle.
     */
    fun getOrAnchorCreatedAt(signalId: String, durationMs: Long): Long {
        val sp = prefs ?: return System.currentTimeMillis()
        val key = KEY_PREFIX_CREATED + signalId
        val storedTime = sp.getLong(key, 0L)
        val now = System.currentTimeMillis()

        if (storedTime > 0L) {
            val elapsed = now - storedTime
            if (elapsed < 0L) {
                // System clock changed backwards
                sp.edit().putLong(key, now).apply()
                return now
            }

            // If the signal has been expired for more than 2 hours past its validity duration,
            // roll over to a fresh institutional setup cycle
            val rolloverThreshold = durationMs + (2 * 3600 * 1000L)
            if (elapsed > rolloverThreshold) {
                sp.edit().putLong(key, now).apply()
                return now
            }

            return storedTime
        }

        // First initialization for this signal ID: anchor to current epoch time
        sp.edit().putLong(key, now).apply()
        return now
    }

    /**
     * Renews the anchor timestamp for a signal (e.g. upon manual refresh or new setup generation).
     */
    fun renewSignalAnchor(signalId: String, timestamp: Long = System.currentTimeMillis()) {
        prefs?.edit()?.putLong(KEY_PREFIX_CREATED + signalId, timestamp)?.apply()
    }

    /**
     * Resets all stored signal timestamps so fresh setups start their full countdown.
     */
    fun renewAllSignalAnchors() {
        prefs?.edit()?.clear()?.apply()
    }
}
