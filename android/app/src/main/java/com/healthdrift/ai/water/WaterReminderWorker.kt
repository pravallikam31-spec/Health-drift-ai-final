package com.healthdrift.ai.water

import android.Manifest
import android.app.PendingIntent
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.healthdrift.ai.MainActivity
import com.healthdrift.ai.R
import java.util.UUID

class WaterReminderWorker(
    context: Context,
    workerParams: WorkerParameters
) : Worker(context, workerParams) {

    override fun doWork(): Result {
        val context = applicationContext

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w(TAG, "Skipping water reminder because notification permission is not granted")
            return Result.success()
        }

        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            Log.w(TAG, "Skipping water reminder because notifications are disabled")
            return Result.success()
        }

        createNotificationChannel(context)
        val actionToken = UUID.randomUUID().toString()
        val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val yesIntent = Intent(context, MainActivity::class.java).apply {
            action = WaterReminderActionReceiver.ACTION_YES
            putExtra(WaterReminderActionReceiver.EXTRA_ACTION_TOKEN, actionToken)
            data = Uri.parse("healthdrift://water-reminder/$actionToken/yes")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val skipIntent = Intent(context, WaterReminderActionReceiver::class.java).apply {
            action = WaterReminderActionReceiver.ACTION_SKIP
            putExtra(WaterReminderActionReceiver.EXTRA_ACTION_TOKEN, actionToken)
            data = Uri.parse("healthdrift://water-reminder/$actionToken/skip")
        }
        val yesPendingIntent = PendingIntent.getActivity(
            context,
            actionToken.hashCode(),
            yesIntent,
            pendingIntentFlags
        )
        val skipPendingIntent = PendingIntent.getBroadcast(
            context,
            actionToken.hashCode(),
            skipIntent,
            pendingIntentFlags
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Time to drink water 💧")
            .setContentText("Stay hydrated! It's time for your water reminder.")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .addAction(R.mipmap.ic_launcher, "Yes, I drank", yesPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Skip for now", skipPendingIntent)
            .build()

        return try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
            Result.success()
        } catch (error: SecurityException) {
            Log.w(TAG, "Unable to post water reminder notification", error)
            Result.success()
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Scheduled hydration reminders"
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    companion object {
        private const val TAG = "WaterReminderWorker"
        private const val CHANNEL_ID = "water_reminders"
        private const val CHANNEL_NAME = "Water Reminders"
        const val NOTIFICATION_ID = 3001
    }
}
