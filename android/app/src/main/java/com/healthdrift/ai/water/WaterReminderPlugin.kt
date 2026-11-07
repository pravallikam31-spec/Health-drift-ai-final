package com.healthdrift.ai.water

import android.Manifest
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequest
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.PermissionState
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.util.concurrent.TimeUnit

@CapacitorPlugin(
    name = "WaterReminder",
    permissions = [
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")
    ]
)
class WaterReminderPlugin : Plugin() {

    @PluginMethod
    fun scheduleReminder(call: PluginCall) {
        val hours = call.getInt("hours")
        val minutes = call.getInt("minutes")
        if (hours == null || hours < 0 || minutes == null || minutes !in 0..59) {
            call.reject("hours must be non-negative and minutes must be 0..59")
            return
        }

        val intervalMinutes = hours.toLong() * 60L + minutes.toLong()
        if (intervalMinutes <= 0L) {
            call.reject("Reminder interval must be greater than zero")
            return
        }
        if (intervalMinutes * 60_000L < PeriodicWorkRequest.MIN_PERIODIC_INTERVAL_MILLIS) {
            call.reject("Reminder interval must be at least 15 minutes")
            return
        }

        try {
            val workManager = WorkManager.getInstance(context.applicationContext)
            val request = PeriodicWorkRequestBuilder<WaterReminderWorker>(
                intervalMinutes,
                TimeUnit.MINUTES
            ).build()

            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                request
            )
            call.resolve()
        } catch (error: Exception) {
            call.reject("Unable to schedule water reminder", error)
        }
    }

    @PluginMethod
    fun cancelReminder(call: PluginCall) {
        try {
            WorkManager.getInstance(context.applicationContext)
                .cancelUniqueWork(WORK_NAME)
            call.resolve()
        } catch (error: Exception) {
            call.reject("Unable to cancel water reminder", error)
        }
    }

    @PluginMethod
    fun hasPendingWaterReminderAction(call: PluginCall) {
        call.resolve(JSObject().put("pending", WaterReminderPendingActions.hasPending(context)))
    }

    @PluginMethod
    fun getPendingWaterReminderActions(call: PluginCall) {
        val actions = JSArray()
        for (token in WaterReminderPendingActions.getPending(context)) {
            actions.put(token)
        }
        call.resolve(JSObject().put("tokens", actions))
    }

    @PluginMethod
    fun acknowledgeWaterReminderAction(call: PluginCall) {
        val token = call.getString("token")
        if (token.isNullOrBlank()) {
            call.reject("A water reminder action token is required")
            return
        }

        if (!WaterReminderPendingActions.acknowledge(context, token)) {
            call.reject("Unable to acknowledge water reminder action")
            return
        }

        call.resolve()
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED
        ) {
            call.resolve()
            return
        }

        requestPermissionForAlias("notifications", call, "notificationPermissionResult")
    }

    @PermissionCallback
    private fun notificationPermissionResult(call: PluginCall) {
        if (getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Notification permission is required for water reminders")
            return
        }

        call.resolve()
    }

    companion object {
        private const val WORK_NAME = "water-reminder"
    }
}
