package com.healthdrift.ai.sleep

import android.content.Context
import java.util.Calendar

object SleepEndDetector {

    private const val MORNING_START_HOUR = 0
    private const val MORNING_END_HOUR = 24

    private const val REQUIRED_ACTIVE_MINUTES = 10

    private var activeMinutes = 0

    /**
     * Call this whenever meaningful movement is detected.
     *
     * The system requires sustained activity rather than
     * a single movement before considering a possible wake-up.
     */
    fun recordMovement(context: Context) {

        // Sleep must already have started
        if (!SleepPreferences.isSleepStarted(context)) {
            return
        }

        val currentHour =
            Calendar.getInstance()
                .get(Calendar.HOUR_OF_DAY)

        // Only consider waking activity during morning hours
        if (
            currentHour < MORNING_START_HOUR ||
            currentHour >= MORNING_END_HOUR
        ) {
            return
        }

        activeMinutes++

        /*
         * Require sustained activity.
         *
         * This helps prevent a single movement during sleep
         * from being interpreted as waking up.
         */
        if (
            activeMinutes >=
            REQUIRED_ACTIVE_MINUTES
        ) {

            activeMinutes = 0

            SleepNotification.showWakeQuestion(
                context
            )
        }
    }

    /**
     * Reset the activity counter when the user becomes
     * inactive again.
     */
    fun resetActivity() {

        activeMinutes = 0
    }
}