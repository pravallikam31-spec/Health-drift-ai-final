package com.healthdrift.ai.sleep

import android.content.Context
import java.util.Calendar
import kotlin.math.abs

object SleepProbabilityEngine {

    /**
     * Calculates an estimated probability that the user
     * is entering a sleep period.
     *
     * IMPORTANT:
     * This is an estimation, not a medical diagnosis.
     *
     * Score: 0 - 100
     */

    fun calculateSleepProbability(
        context: Context,
        movementLevel: Float,
        phoneInactiveMinutes: Long
    ): Int {

        var score = 0


        // --------------------------------------------------
        // 1. TIME OF DAY
        // --------------------------------------------------

        val calendar = Calendar.getInstance()

        val currentHour =
            calendar.get(Calendar.HOUR_OF_DAY)

        val currentMinute =
            calendar.get(Calendar.MINUTE)

        val currentTimeMinutes =
            currentHour * 60 + currentMinute


        val usualSleepHour =
            SleepPreferences.getSleepHour(context)

        val usualSleepMinute =
            SleepPreferences.getSleepMinute(context)

        val usualSleepTimeMinutes =
            usualSleepHour * 60 + usualSleepMinute


        val timeDifference =
            circularTimeDifference(
                currentTimeMinutes,
                usualSleepTimeMinutes
            )


        /*
         * Highest score when current time is close
         * to the user's normal bedtime.
         */
        when {

            timeDifference <= 30 ->
                score += 25

            timeDifference <= 60 ->
                score += 20

            timeDifference <= 120 ->
                score += 12

            timeDifference <= 180 ->
                score += 5
        }


        // --------------------------------------------------
        // 2. PHONE INACTIVITY
        // --------------------------------------------------

        when {

            phoneInactiveMinutes >= 60 ->
                score += 25

            phoneInactiveMinutes >= 30 ->
                score += 20

            phoneInactiveMinutes >= 20 ->
                score += 15

            phoneInactiveMinutes >= 10 ->
                score += 8
        }


        // --------------------------------------------------
        // 3. PHYSICAL MOVEMENT
        // --------------------------------------------------

        /*
         * Lower movement = higher sleep probability.
         */

        when {

            movementLevel < 0.2f ->
                score += 20

            movementLevel < 0.5f ->
                score += 15

            movementLevel < 0.8f ->
                score += 8

            movementLevel < 1.2f ->
                score += 3
        }


        // --------------------------------------------------
        // 4. PERSONAL BASELINE
        // --------------------------------------------------

        /*
         * If the current time is close to the user's
         * usual bedtime, give additional confidence.
         *
         * This allows the system to become personalized
         * instead of using one fixed bedtime for everyone.
         */

        when {

            timeDifference <= 15 ->
                score += 5

            timeDifference <= 30 ->
                score += 3
        }


        // --------------------------------------------------
        // LIMIT SCORE
        // --------------------------------------------------

        return score.coerceIn(0, 100)
    }


    /**
     * Calculates the smallest difference between two
     * times on a 24-hour clock.
     *
     * Example:
     *
     * Current = 23:50
     * Bedtime = 00:10
     *
     * Difference = 20 minutes
     */
    private fun circularTimeDifference(
        time1: Int,
        time2: Int
    ): Int {

        val difference =
            abs(time1 - time2)

        return minOf(
            difference,
            1440 - difference
        )
    }


    /**
     * Returns a simple interpretation of the score.
     */
    fun getSleepState(
        probability: Int
    ): SleepState {

        return when {

            probability < 40 ->
                SleepState.LIKELY_AWAKE

            probability < 75 ->
                SleepState.POSSIBLE_SLEEP

            else ->
                SleepState.HIGH_SLEEP_PROBABILITY
        }
    }


    enum class SleepState {

        LIKELY_AWAKE,

        POSSIBLE_SLEEP,

        HIGH_SLEEP_PROBABILITY
    }
}