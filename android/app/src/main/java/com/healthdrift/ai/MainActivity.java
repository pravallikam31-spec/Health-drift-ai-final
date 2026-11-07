package com.healthdrift.ai;

import android.content.Intent;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;
import com.healthdrift.ai.water.WaterReminderActionReceiver;
import com.healthdrift.ai.water.WaterReminderPendingActions;
import com.healthdrift.ai.water.WaterReminderPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(WaterReminderPlugin.class);
        handleWaterReminderAction(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWaterReminderAction(intent);
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
}
