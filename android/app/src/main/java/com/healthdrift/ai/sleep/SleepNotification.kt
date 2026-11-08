package com.healthdrift.ai.sleep

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object SleepNotification {

    const val CHANNEL_ID = "sleep_tracking"

    const val ACTION_SLEEP_YES =
        "com.healthdrift.ai.sleep.SLEEP_YES"

    const val ACTION_SLEEP_NO =
        "com.healthdrift.ai.sleep.SLEEP_NO"

    const val ACTION_SLEEP_NOT_SURE =
        "com.healthdrift.ai.sleep.SLEEP_NOT_SURE"


    // Create notification channel
    fun createChannel(context: Context) {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.O
        ) {

            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sleep Tracking",
                NotificationManager.IMPORTANCE_HIGH
            )

            channel.description =
                "Health Drift AI sleep confirmations"

            val manager =
                context.getSystemService(
                    NotificationManager::class.java
                )

            manager.createNotificationChannel(
                channel
            )
        }
    }


    // Show notification at user's selected sleep time
    fun showSleepQuestion(
        context: Context
    ) {

        createChannel(context)

        // YES button
        val yesIntent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = ACTION_SLEEP_YES
        }

        // NO button
        val noIntent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = ACTION_SLEEP_NO
        }

        // NOT SURE button
        val unsureIntent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = ACTION_SLEEP_NOT_SURE
        }


        val yesPendingIntent =
            PendingIntent.getBroadcast(
                context,
                201,
                yesIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val noPendingIntent =
            PendingIntent.getBroadcast(
                context,
                202,
                noIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val unsurePendingIntent =
            PendingIntent.getBroadcast(
                context,
                203,
                unsureIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val notification =
            NotificationCompat.Builder(
                context,
                CHANNEL_ID
            )
                .setSmallIcon(
                    android.R.drawable.ic_lock_idle_alarm
                )
                .setContentTitle(
                    "Health Drift AI"
                )
                .setContentText(
                    "Are you going to sleep now?"
                )
                .setPriority(
                    NotificationCompat.PRIORITY_HIGH
                )
                .setAutoCancel(true)

                .addAction(
                    0,
                    "YES 😴",
                    yesPendingIntent
                )

                .addAction(
                    0,
                    "NO 📚",
                    noPendingIntent
                )

                .addAction(
                    0,
                    "NOT SURE",
                    unsurePendingIntent
                )

                .build()


        val manager =
            context.getSystemService(
                NotificationManager::class.java
            )

        manager.notify(
            5001,
            notification
        )
    }


    // Notification used when phone has been inactive
    fun showInactivityQuestion(
        context: Context
    ) {

        createChannel(context)

        val intent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = ACTION_SLEEP_YES
        }


        val pendingIntent =
            PendingIntent.getBroadcast(
                context,
                301,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val notification =
            NotificationCompat.Builder(
                context,
                CHANNEL_ID
            )
                .setSmallIcon(
                    android.R.drawable.ic_lock_idle_alarm
                )
                .setContentTitle(
                    "Health Drift AI"
                )
                .setContentText(
                    "Your phone has been inactive. Are you sleeping?"
                )
                .setPriority(
                    NotificationCompat.PRIORITY_HIGH
                )
                .setAutoCancel(true)

                .addAction(
                    0,
                    "YES 😴",
                    pendingIntent
                )

                .build()


        val manager =
            context.getSystemService(
                NotificationManager::class.java
            )

        manager.notify(
            5002,
            notification
        )
    }
    fun showWakeQuestion(
        context: Context
    ) {

        createChannel(context)

        val yesIntent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = SleepResponseReceiver.ACTION_WAKE_YES
        }

        val noIntent = Intent(
            context,
            SleepResponseReceiver::class.java
        ).apply {
            action = SleepResponseReceiver.ACTION_WAKE_NO
        }


        val yesPendingIntent =
            PendingIntent.getBroadcast(
                context,
                401,
                yesIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val noPendingIntent =
            PendingIntent.getBroadcast(
                context,
                402,
                noIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )


        val notification =
            NotificationCompat.Builder(
                context,
                CHANNEL_ID
            )
                .setSmallIcon(
                    android.R.drawable.ic_lock_idle_alarm
                )
                .setContentTitle(
                    "Health Drift AI"
                )
                .setContentText(
                    "Are you awake now?"
                )
                .setPriority(
                    NotificationCompat.PRIORITY_HIGH
                )
                .setAutoCancel(true)

                .addAction(
                    0,
                    "YES ☀️",
                    yesPendingIntent
                )

                .addAction(
                    0,
                    "NO 😴",
                    noPendingIntent
                )

                .build()


        val manager =
            context.getSystemService(
                NotificationManager::class.java
            )

        manager.notify(
            5003,
            notification
        )
    }
}