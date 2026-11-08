package com.healthdrift.ai.sleep

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SleepAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(
        context: Context,
        intent: Intent?
    ) {

        // Show the sleep confirmation notification
        SleepNotification.showSleepQuestion(
            context
        )

        // Get the user's saved sleep time
        val hour =
            SleepPreferences.getSleepHour(
                context
            )

        val minute =
            SleepPreferences.getSleepMinute(
                context
            )

        // Schedule the next day's sleep check
        SleepAlarmScheduler.scheduleSleepCheck(
            context,
            hour,
            minute
        )
    }
}