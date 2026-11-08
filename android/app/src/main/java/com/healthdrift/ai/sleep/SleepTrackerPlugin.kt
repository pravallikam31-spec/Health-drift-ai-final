package com.healthdrift.ai.sleep

import android.content.Intent
import androidx.activity.result.ActivityResult
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SleepTracker")
class SleepTrackerPlugin : Plugin() {

    @PluginMethod
    fun openTracker(call: PluginCall) {
        startActivityForResult(
            call,
            Intent(context, SleepTrackerActivity::class.java),
            "sleepTrackerActivityResult"
        )
    }

    @ActivityCallback
    private fun sleepTrackerActivityResult(call: PluginCall, result: ActivityResult) {
        call.resolve()
    }
}
