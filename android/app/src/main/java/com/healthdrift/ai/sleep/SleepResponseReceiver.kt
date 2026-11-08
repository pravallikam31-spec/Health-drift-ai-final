package com.healthdrift.ai.sleep

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

class SleepResponseReceiver : BroadcastReceiver() {

    companion object {

        const val ACTION_WAKE_YES =
            "com.healthdrift.ai.sleep.WAKE_YES"

        const val ACTION_WAKE_NO =
            "com.healthdrift.ai.sleep.WAKE_NO"
    }


    override fun onReceive(
        context: Context,
        intent: Intent?
    ) {

        when (intent?.action) {

            // -----------------------------------------
            // USER CONFIRMED SLEEP
            // -----------------------------------------

            SleepNotification.ACTION_SLEEP_YES -> {

                val sleepStartTime =
                    System.currentTimeMillis()

                SleepPreferences.setSleepStarted(
                    context,
                    true
                )

                SleepPreferences.saveSleepStartTime(
                    context,
                    sleepStartTime
                )

                Toast.makeText(
                    context,
                    "Sleep started. Health Drift AI is tracking.",
                    Toast.LENGTH_LONG
                ).show()
            }


            // -----------------------------------------
            // USER SAID THEY ARE NOT SLEEPING
            // -----------------------------------------

            SleepNotification.ACTION_SLEEP_NO -> {

                SleepPreferences.setSleepStarted(
                    context,
                    false
                )

                Toast.makeText(
                    context,
                    "Okay. We will continue monitoring.",
                    Toast.LENGTH_SHORT
                ).show()
            }


            // -----------------------------------------
            // USER IS NOT SURE
            // -----------------------------------------

            SleepNotification.ACTION_SLEEP_NOT_SURE -> {

                Toast.makeText(
                    context,
                    "No problem. We will continue monitoring.",
                    Toast.LENGTH_SHORT
                ).show()
            }


            // -----------------------------------------
            // USER CONFIRMED THEY ARE AWAKE
            // -----------------------------------------

            ACTION_WAKE_YES -> {

                val sleepStartTime =
                    SleepPreferences.getSleepStartTime(
                        context
                    )

                val sleepEndTime =
                    System.currentTimeMillis()


                // Safety check
                if (sleepStartTime <= 0L) {

                    Toast.makeText(
                        context,
                        "Sleep start time was not found.",
                        Toast.LENGTH_LONG
                    ).show()

                    return
                }


                // Calculate sleep duration
                val sleepDuration =
                    sleepEndTime - sleepStartTime


                /*
                 * For now, use the probability calculated
                 * when sleep was detected.
                 *
                 * We will improve this later by storing
                 * the complete probability history.
                 */

                val probability =
                    0


                // SAVE COMPLETED SLEEP SESSION
                SleepPreferences.saveSleepRecord(
                    context = context,
                    startTime = sleepStartTime,
                    endTime = sleepEndTime,
                    probability = probability
                )


                // Mark current sleep session as finished
                SleepPreferences.setSleepStarted(
                    context,
                    false
                )


                // Calculate readable duration
                val totalMinutes =
                    sleepDuration / 60000L

                val hours =
                    totalMinutes / 60

                val minutes =
                    totalMinutes % 60


                Toast.makeText(
                    context,
                    "Sleep saved: ${hours}h ${minutes}m",
                    Toast.LENGTH_LONG
                ).show()
            }

            // -----------------------------------------
            // USER IS STILL SLEEPING
            // -----------------------------------------

            ACTION_WAKE_NO -> {

                Toast.makeText(
                    context,
                    "Okay. Sleep monitoring continues.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }
}