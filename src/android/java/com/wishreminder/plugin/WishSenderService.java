package com.wishreminder.plugin;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service that:
 * 1. Opens WhatsApp with the pre-filled message via wa.me deep link
 * 2. Signals the WishAccessibilityService to tap the Send button automatically
 * 3. Stops itself when done
 */
public class WishSenderService extends Service {
    private static final String TAG      = "WishReminder";
    private static final String CHANNEL  = "wish_sender_channel";

    // Static fields used by WishAccessibilityService to know what to do
    public static volatile boolean pendingSend    = false;
    public static volatile String  pendingEventId = null;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }

        String eventId = intent.getStringExtra("eventId");
        String phone   = intent.getStringExtra("phone");
        String message = intent.getStringExtra("message");

        Log.d(TAG, "WishSenderService started for event: " + eventId);

        startForegroundWithNotification();

        // Signal accessibility service
        pendingSend    = true;
        pendingEventId = eventId;

        // Open WhatsApp with pre-filled message
        try {
            String encoded = Uri.encode(message);
            Uri waUri = Uri.parse("https://wa.me/" + phone + "?text=" + encoded);
            Intent waIntent = new Intent(Intent.ACTION_VIEW, waUri);
            waIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(waIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open WhatsApp", e);
            pendingSend = false;
        }

        // Stop service after 30 seconds (accessibility service handles the tap)
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override public void run() {
                pendingSend = false;
                stopSelf();
            }
        }, 30000);

        return START_NOT_STICKY;
    }

    private void startForegroundWithNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL, "Wish Sender", NotificationManager.IMPORTANCE_LOW);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("WishReminder")
            .setContentText("Sending your scheduled wish...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        startForeground(1001, notification);
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
