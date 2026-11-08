
package com.healthdrift.ai.sleep

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

class WakeUpAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val CHANNEL_ID = "health_drift_wakeup"
        private const val NOTIFICATION_ID = 2001
    }

    override fun onReceive(context: Context, intent: Intent?) {

        createNotificationChannel(context)

        val openIntent = Intent(context, SleepTrackerActivity::class.java)

        val openPendingIntent = PendingIntent.getActivity(
            context,
            2002,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
        )

        val notification =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Health Drift AI - Wake-up Alarm")
                .setContentText("Good morning! It's time to wake up.")
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setAutoCancel(true)
                .setContentIntent(openPendingIntent)
                .setVibrate(longArrayOf(0, 700, 400, 700, 400, 1000))
                .build()

        val manager = context.getSystemService(
            Context.NOTIFICATION_SERVICE
        ) as NotificationManager

        manager.notify(NOTIFICATION_ID, notification)

        // Schedule the next day's alarm
        val hour = SleepPreferences.getWakeHour(context)
        val minute = SleepPreferences.getWakeMinute(context)

        WakeUpAlarmScheduler.schedule(
            context,
            hour,
            minute
        )
    }

    private fun createNotificationChannel(context: Context) {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            val alarmSound =
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(
                    AudioAttributes.CONTENT_TYPE_SONIFICATION
                )
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                "Wake-up Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Daily Health Drift AI wake-up alarm"
                setSound(alarmSound, audioAttributes)
                enableVibration(true)
            }

            val manager = context.getSystemService(
                Context.NOTIFICATION_SERVICE
            ) as NotificationManager

            manager.createNotificationChannel(channel)
        }
    }
}
