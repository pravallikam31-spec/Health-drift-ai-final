package com.healthdrift.ai.sleep

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt

class SleepMonitoringService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null

    private var lastMovementTime =
        System.currentTimeMillis()

    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f

    private var hasPreviousReading = false

    private var currentMovementLevel = 0f

    private var inactivityQuestionShown = false

    private var lastProbabilityCheck =
        System.currentTimeMillis()

    companion object {

        private const val CHANNEL_ID =
            "sleep_monitoring_service"

        private const val NOTIFICATION_ID =
            6001

        // Check probability every 1 minute
        private const val PROBABILITY_CHECK_INTERVAL =
            60 * 1000L

        // Ask after at least 20 minutes of inactivity
        private const val MINIMUM_INACTIVITY =
            20 * 60 * 1000L
    }


    override fun onCreate() {

        super.onCreate()

        createNotificationChannel()

        startForeground(
            NOTIFICATION_ID,
            createForegroundNotification()
        )

        sensorManager =
            getSystemService(
                Context.SENSOR_SERVICE
            ) as SensorManager

        accelerometer =
            sensorManager.getDefaultSensor(
                Sensor.TYPE_ACCELEROMETER
            )

        accelerometer?.let { sensor ->

            sensorManager.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )
        }
    }


    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        return START_STICKY
    }


    override fun onSensorChanged(
        event: SensorEvent?
    ) {

        if (event == null) {
            return
        }

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]


        // First sensor reading
        if (!hasPreviousReading) {

            lastX = x
            lastY = y
            lastZ = z

            hasPreviousReading = true

            lastMovementTime =
                System.currentTimeMillis()

            return
        }


        /*
         * Calculate movement using the difference
         * between consecutive accelerometer readings.
         */

        val movement =
            sqrt(
                (x - lastX) * (x - lastX) +
                        (y - lastY) * (y - lastY) +
                        (z - lastZ) * (z - lastZ)
            )


        currentMovementLevel = movement


        /*
         * Movement threshold.
         *
         * Values below this are treated as
         * relatively low movement.
         */

        val movementThreshold = 0.8f


        if (movement > movementThreshold) {

            lastMovementTime =
                System.currentTimeMillis()

            inactivityQuestionShown = false

            // Send sustained movement to the sleep-end detector
            SleepEndDetector.recordMovement(this)
        }


        lastX = x
        lastY = y
        lastZ = z


        checkSleepProbability()
    }


    private fun checkSleepProbability() {

        val currentTime =
            System.currentTimeMillis()


        /*
         * Don't calculate the score on every sensor
         * event. Check once per minute.
         */

        if (
            currentTime -
            lastProbabilityCheck <
            PROBABILITY_CHECK_INTERVAL
        ) {
            return
        }


        lastProbabilityCheck =
            currentTime


        /*
         * If user already confirmed sleep,
         * monitoring continues but we don't ask
         * the same question again.
         */

        if (
            SleepPreferences.isSleepStarted(
                this
            )
        ) {
            return
        }


        val inactiveMinutes =
            (
                    currentTime -
                            lastMovementTime
                    ) / 60000L


        /*
         * Calculate the personalized sleep
         * probability.
         */

        val probability =
            SleepProbabilityEngine
                .calculateSleepProbability(
                    context = this,
                    movementLevel = currentMovementLevel,
                    phoneInactiveMinutes = inactiveMinutes
                )


        val state =
            SleepProbabilityEngine
                .getSleepState(probability)


        /*
         * We only ask the user when:
         *
         * 1. The phone has been inactive long enough
         * 2. The probability is reasonably high
         * 3. We haven't already asked
         */

        if (
            inactiveMinutes >=
            MINIMUM_INACTIVITY / 60000L &&
            state ==
            SleepProbabilityEngine
                .SleepState.HIGH_SLEEP_PROBABILITY &&
            !inactivityQuestionShown
        ) {

            inactivityQuestionShown = true

            SleepNotification
                .showInactivityQuestion(
                    this
                )
        }
    }


    private fun createForegroundNotification(): Notification {

        return NotificationCompat
            .Builder(
                this,
                CHANNEL_ID
            )
            .setSmallIcon(
                android.R.drawable
                    .ic_menu_info_details
            )
            .setContentTitle(
                "Health Drift AI"
            )
            .setContentText(
                "Sleep monitoring is active"
            )
            .setOngoing(true)
            .setPriority(
                NotificationCompat
                    .PRIORITY_LOW
            )
            .build()
    }


    private fun createNotificationChannel() {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.O
        ) {

            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    "Sleep Monitoring",
                    NotificationManager
                        .IMPORTANCE_LOW
                )

            channel.description =
                "Health Drift AI sleep monitoring"

            val manager =
                getSystemService(
                    NotificationManager::class.java
                )

            manager.createNotificationChannel(
                channel
            )
        }
    }


    override fun onAccuracyChanged(
        sensor: Sensor?,
        accuracy: Int
    ) {
        // Not required
    }


    override fun onDestroy() {

        sensorManager
            .unregisterListener(this)

        super.onDestroy()
    }


    override fun onBind(
        intent: Intent?
    ): IBinder? {

        return null
    }
}