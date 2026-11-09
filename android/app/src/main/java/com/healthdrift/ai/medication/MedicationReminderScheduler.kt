package com.healthdrift.ai.medication

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object MedicationReminderScheduler {
    private const val TAG = "MedicationScheduler"
    private const val PREFERENCES = "medication_reminders"
    private const val REMINDERS_KEY = "reminders"
    private const val EVENTS_KEY = "pending_events"
    private const val SNOOZES_KEY = "snoozes"

    @Synchronized
    fun replaceReminders(context: Context, remindersJson: String): Boolean {
        val reminders = JSONArray(remindersJson)
        val previous = getReminders(context)
        val replacements = (0 until reminders.length())
            .map(reminders::getJSONObject)
            .associateBy { it.optString("id") }
        previous.forEach { reminder ->
            cancelReminderAlarms(context, reminder)
            val replacement = replacements[reminder.optString("id")]
            if (replacement == null || replacement.toString() != reminder.toString()) {
                cancelSnoozes(context, reminder.optString("id"))
            }
        }

        if (!preferences(context).edit().putString(REMINDERS_KEY, reminders.toString()).commit()) {
            return false
        }

        reminders.forEach { reminder ->
            scheduleNext(context, reminder, System.currentTimeMillis())
        }
        return true
    }

    @Synchronized
    fun restore(context: Context) {
        val reminders = getReminders(context)
        reminders.forEach { reminder -> cancelReminderAlarms(context, reminder) }
        reminders.forEach { reminder -> scheduleNext(context, reminder, System.currentTimeMillis()) }
        val snoozes = getSnoozes(context)
        snoozes.keys().asSequence().forEach { key ->
            val parts = key.split("|")
            if (parts.size != 3) return@forEach
            val reminder = reminders.firstOrNull { it.optString("id") == parts[0] } ?: return@forEach
            if (!reminder.optBoolean("active", false)) return@forEach
            scheduleAlarm(
                context,
                reminder,
                parts[1].toIntOrNull() ?: return@forEach,
                snoozes.optLong(key),
                true,
                parts[2].toLongOrNull(),
            )
        }
    }

    @Synchronized
    fun recordAlarmFired(
        context: Context,
        reminder: JSONObject,
        timeIndex: Int,
        scheduledAtMillis: Long,
    ) {
        val occurrenceId = occurrenceId(reminder, timeIndex, scheduledAtMillis)
        enqueueEvent(
            context,
            JSONObject()
                .put("eventId", eventId())
                .put("type", "scheduled")
                .put("occurrenceId", occurrenceId)
                .put("reminderId", reminder.optString("id"))
                .put("medicineName", reminder.optString("medicineName"))
                .put("dosage", reminder.optString("dosage"))
                .put("scheduledAtMillis", scheduledAtMillis),
        )
    }

    fun getReminder(context: Context, id: String): JSONObject? =
        getReminders(context).firstOrNull { it.optString("id") == id }

    fun getReminders(context: Context): List<JSONObject> {
        val stored = preferences(context).getString(REMINDERS_KEY, "[]") ?: "[]"
        return try {
            JSONArray(stored).let { array -> (0 until array.length()).map(array::getJSONObject) }
        } catch (error: Exception) {
            Log.e(TAG, "Stored medication reminders could not be read", error)
            emptyList()
        }
    }

    fun enqueueAction(
        context: Context,
        type: String,
        reminder: JSONObject,
        timeIndex: Int,
        scheduledAtMillis: Long,
        snoozeUntilMillis: Long? = null,
    ) {
        val event = JSONObject()
            .put("eventId", eventId())
            .put("type", type)
            .put("occurrenceId", occurrenceId(reminder, timeIndex, scheduledAtMillis))
            .put("reminderId", reminder.optString("id"))
            .put("medicineName", reminder.optString("medicineName"))
            .put("dosage", reminder.optString("dosage"))
            .put("scheduledAtMillis", scheduledAtMillis)
            .put("eventAtMillis", System.currentTimeMillis())
        if (snoozeUntilMillis != null) event.put("snoozeUntilMillis", snoozeUntilMillis)
        enqueueEvent(context, event)
    }

    @Synchronized
    fun pendingEvents(context: Context): JSONArray = try {
        JSONArray(preferences(context).getString(EVENTS_KEY, "[]") ?: "[]")
    } catch (error: Exception) {
        Log.e(TAG, "Pending medication actions could not be read", error)
        JSONArray()
    }

    @Synchronized
    fun acknowledgeEvent(context: Context, eventId: String): Boolean {
        val current = pendingEvents(context)
        val remaining = JSONArray()
        for (index in 0 until current.length()) {
            val event = current.optJSONObject(index) ?: continue
            if (event.optString("eventId") != eventId) remaining.put(event)
        }
        return preferences(context).edit().putString(EVENTS_KEY, remaining.toString()).commit()
    }

    fun scheduleNext(
        context: Context,
        reminder: JSONObject,
        afterMillis: Long,
        timeIndex: Int? = null,
    ) {
        if (!reminder.optBoolean("active", false)) return
        val times = reminder.optJSONArray("times") ?: return
        val indexes = if (timeIndex == null) (0 until times.length()).toList() else listOf(timeIndex)
        indexes.forEach { index ->
            val time = times.optString(index)
            val triggerAt = nextTrigger(reminder, time, afterMillis) ?: return@forEach
            scheduleAlarm(context, reminder, index, triggerAt, isSnooze = false, null)
        }
    }

    fun scheduleSnooze(
        context: Context,
        reminder: JSONObject,
        timeIndex: Int,
        scheduledAtMillis: Long,
        triggerAtMillis: Long,
    ) {
        val snoozes = getSnoozes(context)
        snoozes.put(
            snoozeKey(reminder.optString("id"), timeIndex, scheduledAtMillis),
            triggerAtMillis,
        )
        preferences(context).edit().putString(SNOOZES_KEY, snoozes.toString()).apply()
        scheduleAlarm(context, reminder, timeIndex, triggerAtMillis, true, scheduledAtMillis)
    }

    @Synchronized
    fun clearSnooze(context: Context, reminderId: String, timeIndex: Int, scheduledAtMillis: Long) {
        val key = snoozeKey(reminderId, timeIndex, scheduledAtMillis)
        val snoozes = getSnoozes(context)
        if (snoozes.has(key)) {
            snoozes.remove(key)
            preferences(context).edit().putString(SNOOZES_KEY, snoozes.toString()).apply()
        }
    }

    fun occurrenceIdForAction(reminder: JSONObject, timeIndex: Int, scheduledAtMillis: Long): String =
        occurrenceId(reminder, timeIndex, scheduledAtMillis)

    fun notificationId(reminderId: String, timeIndex: Int): Int =
        stableCode("$reminderId|$timeIndex|notification")

    fun actionRequestCode(key: String): Int = stableCode(key)

    fun actionIdentity(key: String): String = digest(key)

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return alarmManager.canScheduleExactAlarms()
    }

    fun openExactAlarmSettings(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val intent = Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    private fun nextTrigger(reminder: JSONObject, time: String, afterMillis: Long): Long? {
        if (!time.matches(Regex("^([01]\\d|2[0-3]):[0-5]\\d$"))) return null
        val startDate = reminder.optString("startDate")
        val endDate = reminder.optString("endDate")
        val frequency = reminder.optString("frequency", "daily")
        val weekdays = reminder.optJSONArray("weekdays") ?: JSONArray()
        val parts = time.split(":").map(String::toInt)
        val day = Calendar.getInstance().apply {
            timeInMillis = afterMillis
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)

        repeat(370) {
            val date = dateFormatter.format(day.time)
            if (startDate.isNotEmpty() && date < startDate) {
                day.add(Calendar.DAY_OF_YEAR, 1)
                return@repeat
            }
            if (endDate.isNotEmpty() && date > endDate) return null
            val isoWeekday = ((day.get(Calendar.DAY_OF_WEEK) + 5) % 7) + 1
            val selectedDay = (0 until weekdays.length()).any { weekdays.optInt(it) == isoWeekday }
            val matchesFrequency = when (frequency) {
                "once" -> startDate.isEmpty() || date == startDate
                "selected_days" -> selectedDay
                else -> true
            }

            if (matchesFrequency) {
                val candidate = (day.clone() as Calendar).apply {
                    set(Calendar.HOUR_OF_DAY, parts[0])
                    set(Calendar.MINUTE, parts[1])
                }.timeInMillis
                if (candidate > afterMillis) return candidate
                if (frequency == "once") return null
            }

            if (frequency == "once" && startDate.isNotEmpty() && date >= startDate) return null
            day.add(Calendar.DAY_OF_YEAR, 1)
        }
        return null
    }

    private fun scheduleAlarm(
        context: Context,
        reminder: JSONObject,
        timeIndex: Int,
        triggerAtMillis: Long,
        isSnooze: Boolean,
        originalScheduledAtMillis: Long?,
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val id = reminder.optString("id")
        val key = alarmKey(id, timeIndex, isSnooze, originalScheduledAtMillis)
        val intent = Intent(context, MedicationReminderReceiver::class.java).apply {
            action = MedicationReminderReceiver.ACTION_FIRE
            data = Uri.parse("healthdrift://medication/alarm/$key")
            putExtra(MedicationReminderReceiver.EXTRA_REMINDER_ID, id)
            putExtra(MedicationReminderReceiver.EXTRA_TIME_INDEX, timeIndex)
            putExtra(MedicationReminderReceiver.EXTRA_TRIGGER_AT, triggerAtMillis)
            putExtra(MedicationReminderReceiver.EXTRA_IS_SNOOZE, isSnooze)
            if (originalScheduledAtMillis != null) {
                putExtra(MedicationReminderReceiver.EXTRA_ORIGINAL_SCHEDULED_AT, originalScheduledAtMillis)
            }
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            stableCode(key),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        try {
            if (canScheduleExactAlarms(context)) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }
        } catch (error: SecurityException) {
            Log.w(TAG, "Exact alarm permission changed; scheduling an inexact reminder", error)
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    private fun cancelReminderAlarms(context: Context, reminder: JSONObject) {
        val times = reminder.optJSONArray("times") ?: return
        for (index in 0 until times.length()) {
            cancelAlarm(context, reminder.optString("id"), index, false, null)
        }
    }

    private fun cancelSnoozes(context: Context, reminderId: String) {
        val snoozes = getSnoozes(context)
        val remaining = JSONObject()
        snoozes.keys().asSequence().forEach { storedKey ->
            val parts = storedKey.split("|")
            if (parts.size == 3 && parts[0] == reminderId) {
                cancelAlarm(
                    context,
                    parts[0],
                    parts[1].toIntOrNull() ?: return@forEach,
                    true,
                    parts[2].toLongOrNull(),
                )
            } else {
                remaining.put(storedKey, snoozes.optLong(storedKey))
            }
        }
        preferences(context).edit().putString(SNOOZES_KEY, remaining.toString()).apply()
    }

    private fun getSnoozes(context: Context): JSONObject = try {
        JSONObject(preferences(context).getString(SNOOZES_KEY, "{}") ?: "{}")
    } catch (error: Exception) {
        Log.e(TAG, "Stored medication snoozes could not be read", error)
        JSONObject()
    }

    private fun cancelAlarm(
        context: Context,
        id: String,
        timeIndex: Int,
        isSnooze: Boolean,
        originalScheduledAtMillis: Long?,
    ) {
        val key = alarmKey(id, timeIndex, isSnooze, originalScheduledAtMillis)
        val intent = Intent(context, MedicationReminderReceiver::class.java).apply {
            action = MedicationReminderReceiver.ACTION_FIRE
            data = Uri.parse("healthdrift://medication/alarm/$key")
        }
        PendingIntent.getBroadcast(
            context,
            stableCode(key),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )?.let { pendingIntent ->
            (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun occurrenceId(reminder: JSONObject, timeIndex: Int, scheduledAtMillis: Long): String {
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(scheduledAtMillis)
        return digest("${reminder.optString("id")}|$timeIndex|$date")
    }

    private fun alarmKey(id: String, timeIndex: Int, snooze: Boolean, scheduledAt: Long?): String =
        if (snooze) "$id|$timeIndex|snooze|$scheduledAt" else "$id|$timeIndex|regular"

    private fun snoozeKey(id: String, timeIndex: Int, scheduledAt: Long): String =
        "$id|$timeIndex|$scheduledAt"

    private fun stableCode(value: String): Int =
        (digest(value).take(7).toLong(16) and 0x7fffffff).toInt()

    private fun digest(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private fun eventId(): String = java.util.UUID.randomUUID().toString()

    @Synchronized
    private fun enqueueEvent(context: Context, event: JSONObject) {
        val events = pendingEvents(context)
        events.put(event)
        if (!preferences(context).edit().putString(EVENTS_KEY, events.toString()).commit()) {
            Log.e(TAG, "Unable to persist medication reminder action")
        }
    }

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
}

private inline fun JSONArray.forEach(action: (JSONObject) -> Unit) {
    for (index in 0 until length()) {
        optJSONObject(index)?.let(action)
    }
}
