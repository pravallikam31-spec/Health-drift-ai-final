package com.healthdrift.ai.medication

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray

@CapacitorPlugin(
    name = "MedicationReminders",
    permissions = [
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications"),
    ],
)
class MedicationReminderPlugin : Plugin() {
    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED
        ) {
            call.resolve(permissionResult())
            return
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult")
    }

    @PermissionCallback
    private fun notificationPermissionResult(call: PluginCall) {
        call.resolve(permissionResult())
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        call.resolve(permissionResult())
    }

    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        try {
            MedicationReminderScheduler.openExactAlarmSettings(context)
            call.resolve()
        } catch (error: Exception) {
            call.reject("Unable to open Android alarm permission settings", error)
        }
    }

    @PluginMethod
    fun scheduleReminders(call: PluginCall) {
        val remindersJson = call.getString("reminders")
        if (remindersJson.isNullOrBlank()) {
            call.reject("A medication reminder list is required")
            return
        }

        try {
            JSONArray(remindersJson)
            if (!MedicationReminderScheduler.replaceReminders(context, remindersJson)) {
                call.reject("Unable to persist medication reminders on this device")
                return
            }
            call.resolve(permissionResult())
        } catch (error: Exception) {
            call.reject("Unable to schedule medication reminders", error)
        }
    }

    @PluginMethod
    fun getPendingActions(call: PluginCall) {
        val events = JSArray()
        val pending = MedicationReminderScheduler.pendingEvents(context)
        for (index in 0 until pending.length()) {
            pending.optJSONObject(index)?.let { events.put(it.toString()) }
        }
        call.resolve(JSObject().put("events", events))
    }

    @PluginMethod
    fun hasPendingActions(call: PluginCall) {
        call.resolve(JSObject().put("pending", MedicationReminderScheduler.pendingEvents(context).length() > 0))
    }

    @PluginMethod
    fun acknowledgeAction(call: PluginCall) {
        val eventId = call.getString("eventId")
        if (eventId.isNullOrBlank()) {
            call.reject("A medication action event ID is required")
            return
        }
        if (!MedicationReminderScheduler.acknowledgeEvent(context, eventId)) {
            call.reject("Unable to acknowledge the medication action")
            return
        }
        call.resolve()
    }

    private fun permissionResult(): JSObject {
        val notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        val notificationsEnabled = notificationsGranted &&
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        return JSObject()
            .put("notificationsGranted", notificationsGranted)
            .put("notificationsEnabled", notificationsEnabled)
            .put("exactAlarmAvailable", MedicationReminderScheduler.canScheduleExactAlarms(context))
    }
}
