package com.healthdrift.ai.sleep

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

object SleepAlarmScheduler {

    private const val REQUEST_CODE = 1001

    fun scheduleSleepCheck(
        context: Context,
        hour: Int,
        minute: Int
    ) {

        val alarmManager =
            context.getSystemService(
                Context.ALARM_SERVICE
            ) as AlarmManager

        val calendar = Calendar.getInstance()

        calendar.set(
            Calendar.HOUR_OF_DAY,
            hour
        )

        calendar.set(
            Calendar.MINUTE,
            minute
        )

        calendar.set(
            Calendar.SECOND,
            0
        )

        calendar.set(
            Calendar.MILLISECOND,
            0
        )

        // If today's sleep time has already passed,
        // schedule the notification for tomorrow.
        if (
            calendar.timeInMillis <=
            System.currentTimeMillis()
        ) {
            calendar.add(
                Calendar.DAY_OF_YEAR,
                1
            )
        }

        val intent = Intent(
            context,
            SleepAlarmReceiver::class.java
        )

        val pendingIntent =
            PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )

        // Android 12+ requires exact-alarm access
        // for exact alarms.
        if (
            android.os.Build.VERSION.SDK_INT >= 31 &&
            !alarmManager.canScheduleExactAlarms()
        ) {
            return
        }

        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            pendingIntent
        )
    }
}