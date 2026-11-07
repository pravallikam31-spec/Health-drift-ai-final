package com.healthdrift.ai.water

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

class WaterReminderActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ACTION_SKIP) return

        NotificationManagerCompat.from(context).cancel(WaterReminderWorker.NOTIFICATION_ID)
    }

    companion object {
        const val ACTION_YES = "com.healthdrift.ai.water.REMINDER_YES"
        const val ACTION_SKIP = "com.healthdrift.ai.water.REMINDER_SKIP"
        const val EXTRA_ACTION_TOKEN = "waterReminderActionToken"
    }
}
