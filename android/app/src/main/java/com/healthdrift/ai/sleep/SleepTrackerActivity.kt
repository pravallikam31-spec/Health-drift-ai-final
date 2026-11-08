
package com.healthdrift.ai.sleep

import android.Manifest
import android.app.TimePickerDialog
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.healthdrift.ai.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class SleepTrackerActivity : AppCompatActivity() {

    private lateinit var sleepTimeText: TextView
    private lateinit var wakeTimeText: TextView
    private lateinit var monitoringStatusText: TextView
    private lateinit var lastSleepText: TextView
    private lateinit var averageSleepText: TextView
    private lateinit var sleepHistoryText: TextView
    private lateinit var sleepHistoryGraph: SleepHistoryGraphView
    private lateinit var graphViewButton: Button
    private lateinit var reportViewButton: Button
    private lateinit var reportView: LinearLayout
    private lateinit var reportEmptyState: TextView
    private lateinit var reportRecordsContainer: LinearLayout

    private lateinit var setSleepButton: Button
    private lateinit var setWakeButton: Button
    private lateinit var startTrackingButton: Button
    private val sleepHistoryListener =
        SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == SleepPreferences.SLEEP_HISTORY_KEY &&
                ::sleepHistoryGraph.isInitialized
            ) {
                updateSleepSummary()
            }
        }

    private val permissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) {
            startSleepMonitoring()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sleep_tracker)

        initializeViews()

        displaySavedSleepTime()
        displaySavedWakeTime()
        updateSleepSummary()

        setSleepButton.setOnClickListener {
            showSleepTimePicker()
        }

        setWakeButton.setOnClickListener {
            showWakeTimePicker()
        }

        startTrackingButton.setOnClickListener {
            checkPermissionsAndStartTracking()
        }

        graphViewButton.setOnClickListener {
            showSleepHistoryView(showGraph = true)
        }

        reportViewButton.setOnClickListener {
            showSleepHistoryView(showGraph = false)
        }

        showSleepHistoryView(showGraph = true)

        scheduleSavedWakeUpAlarm()
        scheduleSavedSleepCheck()
    }

    private fun initializeViews() {
        sleepTimeText = findViewById(R.id.sleepTimeText)
        wakeTimeText = findViewById(R.id.wakeTimeText)
        monitoringStatusText = findViewById(R.id.monitoringStatusText)
        lastSleepText = findViewById(R.id.lastSleepText)
        averageSleepText = findViewById(R.id.averageSleepText)
        sleepHistoryText = findViewById(R.id.sleepHistoryText)
        sleepHistoryGraph = findViewById(R.id.sleepHistoryGraph)
        graphViewButton = findViewById(R.id.graphViewButton)
        reportViewButton = findViewById(R.id.reportViewButton)
        reportView = findViewById(R.id.reportView)
        reportEmptyState = findViewById(R.id.reportEmptyState)
        reportRecordsContainer = findViewById(R.id.reportRecordsContainer)

        setSleepButton = findViewById(R.id.setSleepButton)
        setWakeButton = findViewById(R.id.setWakeButton)
        startTrackingButton = findViewById(R.id.startTrackingButton)
    }

    // BEDTIME SETTINGS

    private fun showSleepTimePicker() {

        val hour = SleepPreferences.getSleepHour(this)
        val minute = SleepPreferences.getSleepMinute(this)

        TimePickerDialog(
            this,
            { _, selectedHour, selectedMinute ->

                SleepPreferences.saveSleepTime(
                    this,
                    selectedHour,
                    selectedMinute
                )

                displaySavedSleepTime()
                scheduleSavedSleepCheck()

                Toast.makeText(
                    this,
                    "Bedtime saved successfully!",
                    Toast.LENGTH_SHORT
                ).show()
            },
            hour,
            minute,
            false
        ).show()
    }

    private fun displaySavedSleepTime() {

        val hour = SleepPreferences.getSleepHour(this)
        val minute = SleepPreferences.getSleepMinute(this)

        sleepTimeText.text =
            "Usual sleep time: ${formatTime(hour, minute)}"
    }

    private fun scheduleSavedSleepCheck() {

        val hour = SleepPreferences.getSleepHour(this)
        val minute = SleepPreferences.getSleepMinute(this)

        SleepAlarmScheduler.scheduleSleepCheck(
            this,
            hour,
            minute
        )
    }

    // WAKE-UP ALARM SETTINGS

    private fun showWakeTimePicker() {

        val hour = SleepPreferences.getWakeHour(this)
        val minute = SleepPreferences.getWakeMinute(this)

        TimePickerDialog(
            this,
            { _, selectedHour, selectedMinute ->

                SleepPreferences.saveWakeTime(
                    this,
                    selectedHour,
                    selectedMinute
                )

                displaySavedWakeTime()

                val scheduled = WakeUpAlarmScheduler.schedule(
                    this,
                    selectedHour,
                    selectedMinute
                )

                if (scheduled) {

                    Toast.makeText(
                        this,
                        "Daily wake-up alarm scheduled!",
                        Toast.LENGTH_LONG
                    ).show()

                } else {

                    Toast.makeText(
                        this,
                        "Please allow Alarms and reminders permission.",
                        Toast.LENGTH_LONG
                    ).show()

                    openExactAlarmSettings()
                }
            },
            hour,
            minute,
            false
        ).show()
    }

    private fun displaySavedWakeTime() {

        val hour = SleepPreferences.getWakeHour(this)
        val minute = SleepPreferences.getWakeMinute(this)

        wakeTimeText.text =
            "Usual wake-up time: ${formatTime(hour, minute)}"
    }

    private fun scheduleSavedWakeUpAlarm() {

        val hour = SleepPreferences.getWakeHour(this)
        val minute = SleepPreferences.getWakeMinute(this)

        val scheduled = WakeUpAlarmScheduler.schedule(
            this,
            hour,
            minute
        )

        if (!scheduled &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
        ) {
            Toast.makeText(
                this,
                "Allow exact alarms in Settings.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun openExactAlarmSettings() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {

            val intent = Intent(
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
            )

            startActivity(intent)
        }
    }

    // SLEEP TRACKING PERMISSIONS

    private fun checkPermissionsAndStartTracking() {

        val permissionsNeeded = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionsNeeded.add(
                Manifest.permission.POST_NOTIFICATIONS
            )
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionsNeeded.add(
                Manifest.permission.ACTIVITY_RECOGNITION
            )
        }

        if (permissionsNeeded.isNotEmpty()) {

            permissionLauncher.launch(
                permissionsNeeded.toTypedArray()
            )

        } else {

            startSleepMonitoring()
        }
    }

    private fun startSleepMonitoring() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) != PackageManager.PERMISSION_GRANTED
        ) {

            monitoringStatusText.text =
                "Activity permission is required."

            return
        }

        try {

            val serviceIntent = Intent(
                this,
                SleepMonitoringService::class.java
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            monitoringStatusText.text =
                "Sleep monitoring is active"

            Toast.makeText(
                this,
                "Sleep tracking started!",
                Toast.LENGTH_SHORT
            ).show()

        } catch (e: Exception) {

            monitoringStatusText.text =
                "Unable to start sleep monitoring"

            Toast.makeText(
                this,
                "Error: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    // SLEEP SUMMARY

    private fun updateSleepSummary() {
        val records = SleepPreferences.getSleepRecords(this)
            .sortedByDescending { it.startTime }

        if (records.isEmpty()) {
            lastSleepText.text = "Last sleep duration: No records yet"
            averageSleepText.text = "Average sleep duration: No records yet"
            sleepHistoryText.text = "No sleep records yet."
        } else {
            lastSleepText.text =
                "Last sleep duration: ${formatDuration(records.first().duration)}"

            val averageDuration =
                SleepPreferences.getAverageSleepDuration(this)
            averageSleepText.text =
                "Average sleep duration: ${formatDuration(averageDuration)}"
            sleepHistoryText.text =
                "${records.size} saved sleep ${if (records.size == 1) "record" else "records"}."
        }

        sleepHistoryGraph.setRecords(records)
        updateSleepReport(records)
    }

    private fun updateSleepReport(records: List<SleepRecord>) {
        reportRecordsContainer.removeAllViews()
        reportEmptyState.visibility =
            if (records.isEmpty()) View.VISIBLE else View.GONE

        records.forEach { record ->
            val item = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundResource(R.drawable.bg_data_field)
                val spacing = (12 * resources.displayMetrics.density).toInt()
                setPadding(spacing, spacing, spacing, spacing)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = (10 * resources.displayMetrics.density).toInt()
                }
            }

            val dateFormat = SimpleDateFormat("MMMM d, yyyy", Locale.getDefault())
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            addReportLine(
                item,
                dateFormat.format(Date(record.startTime)),
                16,
                R.color.sleep_text_primary,
                bold = true
            )
            addReportLine(
                item,
                "Sleep time: ${timeFormat.format(Date(record.startTime))}",
                14,
                R.color.sleep_text_secondary
            )
            addReportLine(
                item,
                "Wake-up time: ${timeFormat.format(Date(record.endTime))}",
                14,
                R.color.sleep_text_secondary
            )
            addReportLine(
                item,
                "Total sleep: ${formatDuration(record.duration)}",
                14,
                R.color.sleep_electric_cyan
            )
            reportRecordsContainer.addView(item)
        }
    }

    private fun addReportLine(
        parent: LinearLayout,
        text: String,
        textSize: Int,
        textColor: Int,
        bold: Boolean = false
    ) {
        val line = TextView(this).apply {
            this.text = text
            setTextSize(textSize.toFloat())
            setTextColor(ContextCompat.getColor(this@SleepTrackerActivity, textColor))
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
        parent.addView(
            line,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (4 * resources.displayMetrics.density).toInt()
            }
        )
    }

    private fun showSleepHistoryView(showGraph: Boolean) {
        if (!::sleepHistoryGraph.isInitialized) return

        sleepHistoryGraph.visibility = if (showGraph) View.VISIBLE else View.GONE
        reportView.visibility = if (showGraph) View.GONE else View.VISIBLE

        graphViewButton.setBackgroundResource(
            if (showGraph) R.drawable.bg_primary_button else R.drawable.bg_data_field
        )
        reportViewButton.setBackgroundResource(
            if (showGraph) R.drawable.bg_data_field else R.drawable.bg_primary_button
        )
        graphViewButton.setTextColor(
            ContextCompat.getColor(
                this,
                if (showGraph) R.color.sleep_text_primary else R.color.sleep_electric_cyan
            )
        )
        reportViewButton.setTextColor(
            ContextCompat.getColor(
                this,
                if (showGraph) R.color.sleep_electric_cyan else R.color.sleep_text_primary
            )
        )
    }

    private fun formatDuration(duration: Long): String {
        val totalMinutes = duration / 60_000L
        return "${totalMinutes / 60}h ${totalMinutes % 60}m"
    }

    // TIME FORMATTING

    private fun formatTime(hour: Int, minute: Int): String {

        val displayHour = when {
            hour == 0 -> 12
            hour > 12 -> hour - 12
            else -> hour
        }

        val period = if (hour < 12) "AM" else "PM"

        return String.format(
            Locale.getDefault(),
            "%02d:%02d %s",
            displayHour,
            minute,
            period
        )
    }

    override fun onResume() {
        super.onResume()

        SleepPreferences.registerHistoryListener(this, sleepHistoryListener)

        if (::wakeTimeText.isInitialized) {
            displaySavedWakeTime()
            scheduleSavedWakeUpAlarm()
            updateSleepSummary()
        }
    }

    override fun onPause() {
        SleepPreferences.unregisterHistoryListener(this, sleepHistoryListener)
        super.onPause()
    }
}
