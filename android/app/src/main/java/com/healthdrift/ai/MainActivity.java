package com.healthdrift.ai;

import android.content.Intent;
import android.util.Log;
import android.webkit.WebSettings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;
import com.healthdrift.ai.medication.MedicationReminderPlugin;
import com.healthdrift.ai.medication.MedicationReminderReceiver;
import com.healthdrift.ai.sleep.SleepTrackerPlugin;
import com.healthdrift.ai.water.WaterReminderActionReceiver;
import com.healthdrift.ai.water.WaterReminderPendingActions;
import com.healthdrift.ai.water.WaterReminderPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MedicationReminderPlugin.class);
        registerPlugin(WaterReminderPlugin.class);
        registerPlugin(SleepTrackerPlugin.class);
        handleWaterReminderAction(getIntent());
        handleMedicationReminderAction(getIntent());
        super.onCreate(savedInstanceState);

        // Allow cleartext HTTP API calls from the WebView to local development server on LAN
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWaterReminderAction(intent);
        handleMedicationReminderAction(intent);
    }

    private void handleWaterReminderAction(Intent intent) {
        if (intent == null || !WaterReminderActionReceiver.ACTION_YES.equals(intent.getAction())) {
            return;
        }

        String token = intent.getStringExtra(WaterReminderActionReceiver.EXTRA_ACTION_TOKEN);
        if (token == null || token.trim().isEmpty()) {
            Log.e(TAG, "Water reminder action did not include an action token");
            return;
        }

        if (!WaterReminderPendingActions.enqueue(this, token)) {
            Log.e(TAG, "Unable to persist water reminder action");
            return;
        }

        NotificationManagerCompat.from(this).cancel(
            com.healthdrift.ai.water.WaterReminderWorker.NOTIFICATION_ID
        );
    }

    private void handleMedicationReminderAction(Intent intent) {
        if (intent == null) {
            return;
        }

        MedicationReminderReceiver receiver = new MedicationReminderReceiver();
        if (MedicationReminderReceiver.ACTION_TAKEN.equals(intent.getAction())) {
            receiver.recordAction(this, intent, "taken");
        } else if (MedicationReminderReceiver.ACTION_SNOOZE.equals(intent.getAction())) {
            receiver.recordAction(this, intent, "snoozed");
        }
    }
}
