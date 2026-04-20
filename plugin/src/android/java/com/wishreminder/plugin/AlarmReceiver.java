package com.wishreminder.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Fires when AlarmManager triggers at the exact scheduled time.
 * Starts WishSenderService which handles the actual WhatsApp auto-send.
 * NO setInterval — zero memory used while waiting.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "WishReminder";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "AlarmReceiver fired for event: " + intent.getStringExtra("eventId"));

        String eventId  = intent.getStringExtra("eventId");
        String phone    = intent.getStringExtra("phone");      // full number e.g. 919876543210
        String message  = intent.getStringExtra("message");

        if (eventId == null || phone == null || message == null) return;

        // Start the foreground service that opens WhatsApp + uses Accessibility to tap Send
        Intent serviceIntent = new Intent(context, WishSenderService.class);
        serviceIntent.putExtra("eventId",  eventId);
        serviceIntent.putExtra("phone",    phone);
        serviceIntent.putExtra("message",  message);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
