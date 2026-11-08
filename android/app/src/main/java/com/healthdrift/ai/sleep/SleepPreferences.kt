
package com.healthdrift.ai.sleep

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

object SleepPreferences {

    const val SLEEP_HISTORY_KEY = "sleep_history"

    private const val PREF_NAME = "health_drift_sleep"

    private const val SLEEP_HOUR = "sleep_hour"
    private const val SLEEP_MINUTE = "sleep_minute"

    private const val WAKE_HOUR = "wake_hour"
    private const val WAKE_MINUTE = "wake_minute"

    private const val SLEEP_STARTED = "sleep_started"
    private const val SLEEP_START_TIME = "sleep_start_time"
    private fun prefs(context: Context) =
        context.getSharedPreferences(
            PREF_NAME,
            Context.MODE_PRIVATE
        )

    // ---------------- USUAL SLEEP TIME ----------------

    fun saveSleepTime(
        context: Context,
        hour: Int,
        minute: Int
    ) {
        prefs(context).edit()
            .putInt(SLEEP_HOUR, hour)
            .putInt(SLEEP_MINUTE, minute)
            .apply()
    }

    fun getSleepHour(context: Context): Int =
        prefs(context).getInt(SLEEP_HOUR, 23)

    fun getSleepMinute(context: Context): Int =
        prefs(context).getInt(SLEEP_MINUTE, 0)

    // ---------------- EXPECTED WAKE-UP TIME ----------------

    fun saveWakeTime(
        context: Context,
        hour: Int,
        minute: Int
    ) {
        prefs(context).edit()
            .putInt(WAKE_HOUR, hour)
            .putInt(WAKE_MINUTE, minute)
            .apply()
    }

    fun getWakeHour(context: Context): Int =
        prefs(context).getInt(WAKE_HOUR, 7)

    fun getWakeMinute(context: Context): Int =
        prefs(context).getInt(WAKE_MINUTE, 0)

    // ---------------- CURRENT SLEEP SESSION ----------------

    fun setSleepStarted(
        context: Context,
        started: Boolean
    ) {
        prefs(context).edit()
            .putBoolean(SLEEP_STARTED, started)
            .apply()
    }

    fun isSleepStarted(context: Context): Boolean =
        prefs(context).getBoolean(SLEEP_STARTED, false)

    fun saveSleepStartTime(
        context: Context,
        timestamp: Long
    ) {
        prefs(context).edit()
            .putLong(SLEEP_START_TIME, timestamp)
            .apply()
    }

    fun getSleepStartTime(context: Context): Long =
        prefs(context).getLong(SLEEP_START_TIME, 0L)

    // ---------------- SAVE COMPLETED SLEEP RECORD ----------------

    fun saveSleepRecord(
        context: Context,
        startTime: Long,
        endTime: Long,
        probability: Int
    ) {
        if (startTime <= 0L || endTime <= startTime) {
            return
        }

        val history = getSleepHistory(context)

        val record = JSONObject().apply {
            put("startTime", startTime)
            put("endTime", endTime)
            put("duration", endTime - startTime)
            put("probability", probability.coerceIn(0, 100))
        }

        history.put(record)

        prefs(context).edit()
            .putString(SLEEP_HISTORY_KEY, history.toString())
            .apply()
    }

    // ---------------- GET SLEEP HISTORY ----------------

    fun getSleepRecords(context: Context): List<SleepRecord> {
        val history = getSleepHistory(context)
        val records = mutableListOf<SleepRecord>()

        for (i in 0 until history.length()) {
            val item = history.optJSONObject(i) ?: continue
            val startTime = item.optLong("startTime", 0L)
            val endTime = item.optLong("endTime", 0L)
            val duration = item.optLong("duration", endTime - startTime)

            if (startTime > 0L && endTime > startTime && duration > 0L) {
                records.add(
                    SleepRecord(
                        startTime = startTime,
                        endTime = endTime,
                        duration = duration,
                        probability = item.optInt("probability", 0)
                    )
                )
            }
        }

        return records
    }

    fun registerHistoryListener(
        context: Context,
        listener: SharedPreferences.OnSharedPreferenceChangeListener
    ) {
        prefs(context).registerOnSharedPreferenceChangeListener(listener)
    }

    fun unregisterHistoryListener(
        context: Context,
        listener: SharedPreferences.OnSharedPreferenceChangeListener
    ) {
        prefs(context).unregisterOnSharedPreferenceChangeListener(listener)
    }

    fun getSleepHistory(context: Context): JSONArray {
        val savedHistory =
            prefs(context).getString(SLEEP_HISTORY_KEY, "[]")
                ?: "[]"

        return try {
            JSONArray(savedHistory)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    // ---------------- AVERAGE SLEEP DURATION ----------------

    fun getAverageSleepDuration(context: Context): Long {
        val history = getSleepHistory(context)

        if (history.length() == 0) return 0L

        var totalDuration = 0L
        var validRecords = 0

        for (i in 0 until history.length()) {
            val duration = history
                .getJSONObject(i)
                .optLong("duration", 0L)

            if (duration > 0L) {
                totalDuration += duration
                validRecords++
            }
        }

        return if (validRecords > 0) {
            totalDuration / validRecords
        } else {
            0L
        }
    }
}
