package com.healthdrift.ai.medication

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.healthdrift.ai.MainActivity
import com.healthdrift.ai.R

class MedicationReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        when (intent.action) {
            ACTION_FIRE -> showReminder(context, intent)
            ACTION_TAKEN -> recordAction(context, intent, "taken")
            ACTION_SNOOZE -> recordAction(context, intent, "snoozed")
        }
    }

    private fun showReminder(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val timeIndex = intent.getIntExtra(EXTRA_TIME_INDEX, -1)
        val scheduledAt = intent.getLongExtra(EXTRA_TRIGGER_AT, 0L)
        val isSnooze = intent.getBooleanExtra(EXTRA_IS_SNOOZE, false)
        if (timeIndex < 0 || scheduledAt <= 0L) return
        val doseScheduledAt = if (isSnooze) {
            intent.getLongExtra(EXTRA_ORIGINAL_SCHEDULED_AT, scheduledAt)
        } else {
            scheduledAt
        }

        val reminder = MedicationReminderScheduler.getReminder(context, reminderId) ?: return
        if (!reminder.optBoolean("active", false)) return

        if (!isSnooze) {
            MedicationReminderScheduler.recordAlarmFired(context, reminder, timeIndex, scheduledAt)
            MedicationReminderScheduler.scheduleNext(
                context,
                reminder,
                System.currentTimeMillis(),
                timeIndex,
            )
        } else {
            val originalScheduledAt = intent.getLongExtra(EXTRA_ORIGINAL_SCHEDULED_AT, 0L)
            MedicationReminderScheduler.clearSnooze(
                context,
                reminderId,
                timeIndex,
                originalScheduledAt,
            )
        }

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        createNotificationChannel(context)
        val name = reminder.optString("medicineName", "your medicine")
        val dosage = reminder.optString("dosage").trim()
        val body = "It is time to take $name${if (dosage.isNotEmpty()) " ($dosage)" else ""}."
        val notificationId = MedicationReminderScheduler.notificationId(reminderId, timeIndex)
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            notificationId,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val actionBase = "$reminderId|$timeIndex|$doseScheduledAt"
        val takenIntent = actionIntent(context, ACTION_TAKEN, actionBase).apply {
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_TIME_INDEX, timeIndex)
            putExtra(EXTRA_ORIGINAL_SCHEDULED_AT, doseScheduledAt)
        }
        val snoozeIntent = actionIntent(context, ACTION_SNOOZE, actionBase).apply {
            putExtra(EXTRA_REMINDER_ID, reminderId)
            putExtra(EXTRA_TIME_INDEX, timeIndex)
            putExtra(EXTRA_ORIGINAL_SCHEDULED_AT, doseScheduledAt)
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Health Drift AI – Medication Reminder")
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .addAction(R.mipmap.ic_launcher, "Mark as Taken", pendingAction(context, takenIntent, actionBase, "taken"))
            .addAction(R.mipmap.ic_launcher, "Snooze 10 min", pendingAction(context, snoozeIntent, actionBase, "snooze"))
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (_: SecurityException) {
            // Permission may have been revoked after the alarm was scheduled.
        }
    }

    fun recordAction(context: Context, intent: Intent, action: String) {
        val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val timeIndex = intent.getIntExtra(EXTRA_TIME_INDEX, -1)
        val scheduledAt = intent.getLongExtra(EXTRA_ORIGINAL_SCHEDULED_AT, 0L)
        if (timeIndex < 0 || scheduledAt <= 0L) return
        val reminder = MedicationReminderScheduler.getReminder(context, reminderId) ?: return
        val notificationId = MedicationReminderScheduler.notificationId(reminderId, timeIndex)
        NotificationManagerCompat.from(context).cancel(notificationId)

        val snoozeUntil = if (action == "snoozed") System.currentTimeMillis() + SNOOZE_MILLIS else null
        MedicationReminderScheduler.enqueueAction(
            context,
            action,
            reminder,
            timeIndex,
            scheduledAt,
            snoozeUntil,
        )
        if (snoozeUntil != null) {
            MedicationReminderScheduler.scheduleSnooze(
                context,
                reminder,
                timeIndex,
                scheduledAt,
                snoozeUntil,
            )
        }
    }

    private fun actionIntent(context: Context, action: String, key: String): Intent =
        Intent(context, MainActivity::class.java).apply {
            this.action = action
            data = Uri.parse(
                "healthdrift://medication/action/$action/${MedicationReminderScheduler.actionIdentity(key)}",
            )
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

    private fun pendingAction(context: Context, intent: Intent, key: String, action: String): PendingIntent =
        PendingIntent.getActivity(
            context,
            MedicationReminderScheduler.actionRequestCode("$key|$action"),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Scheduled medication reminders. Device Do Not Disturb and notification settings apply."
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val ACTION_FIRE = "com.healthdrift.ai.medication.FIRE"
        const val ACTION_TAKEN = "com.healthdrift.ai.medication.TAKEN"
        const val ACTION_SNOOZE = "com.healthdrift.ai.medication.SNOOZE"
        const val EXTRA_REMINDER_ID = "medicationReminderId"
        const val EXTRA_TIME_INDEX = "medicationTimeIndex"
        const val EXTRA_TRIGGER_AT = "medicationTriggerAt"
        const val EXTRA_IS_SNOOZE = "medicationIsSnooze"
        const val EXTRA_ORIGINAL_SCHEDULED_AT = "medicationOriginalScheduledAt"
        private const val CHANNEL_ID = "medication_reminders"
        private const val CHANNEL_NAME = "Medication Reminders"
        private const val SNOOZE_MILLIS = 10 * 60 * 1000L
    }
}
