package com.wishreminder.plugin;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Cordova Plugin Bridge
 * Exposes to JavaScript:
 *   WishPlugin.scheduleAlarm(eventId, phoneNumber, message, timestampMs)
 *   WishPlugin.cancelAlarm(eventId)
 *   WishPlugin.isAccessibilityEnabled()
 *   WishPlugin.openAccessibilitySettings()
 *   WishPlugin.isWhatsAppInstalled()
 */
public class WishPlugin extends CordovaPlugin {
    private static final String TAG = "WishPlugin";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cb)
            throws JSONException {

        switch (action) {
            case "scheduleAlarm":      scheduleAlarm(args, cb);         return true;
            case "cancelAlarm":        cancelAlarm(args, cb);           return true;
            case "isAccessibilityEnabled": isAccessibilityEnabled(cb);  return true;
            case "openAccessibilitySettings": openAccessibilitySettings(cb); return true;
            case "isWhatsAppInstalled": isWhatsAppInstalled(cb);        return true;
        }
        return false;
    }

    // ── Schedule exact alarm ──────────────────────────────────────────────
    private void scheduleAlarm(JSONArray args, CallbackContext cb) throws JSONException {
        String eventId  = args.getString(0);
        String phone    = args.getString(1);   // e.g. "919876543210"
        String message  = args.getString(2);
        long   triggerMs = args.getLong(3);    // Unix ms

        Context ctx = cordova.getActivity().getApplicationContext();
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) { cb.error("AlarmManager unavailable"); return; }

        Intent intent = new Intent(ctx, AlarmReceiver.class);
        intent.putExtra("eventId", eventId);
        intent.putExtra("phone",   phone);
        intent.putExtra("message", message);

        int reqCode = eventId.hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Use setExactAndAllowWhileIdle for Doze mode compatibility
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi);
        }

        Log.d(TAG, "Alarm scheduled: eventId=" + eventId + " at=" + triggerMs);
        cb.success("Alarm scheduled");
    }

    // ── Cancel alarm ──────────────────────────────────────────────────────
    private void cancelAlarm(JSONArray args, CallbackContext cb) throws JSONException {
        String eventId = args.getString(0);
        Context ctx = cordova.getActivity().getApplicationContext();
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) { cb.error("AlarmManager unavailable"); return; }

        Intent intent = new Intent(ctx, AlarmReceiver.class);
        int reqCode = eventId.hashCode();
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx, reqCode, intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pi != null) am.cancel(pi);
        cb.success("Alarm cancelled");
    }

    // ── Check accessibility service status ────────────────────────────────
    private void isAccessibilityEnabled(CallbackContext cb) {
        Context ctx = cordova.getActivity().getApplicationContext();
        String serviceName = ctx.getPackageName() + "/"
            + WishAccessibilityService.class.getCanonicalName();
        boolean enabled = false;
        try {
            String enabledServices = Settings.Secure.getString(
                ctx.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            if (enabledServices != null) {
                enabled = enabledServices.contains(serviceName);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking accessibility", e);
        }
        cb.success(enabled ? 1 : 0);
    }

    // ── Open accessibility settings ───────────────────────────────────────
    private void openAccessibilitySettings(CallbackContext cb) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        cordova.getActivity().startActivity(intent);
        cb.success("Opened settings");
    }

    // ── Check WhatsApp installed ──────────────────────────────────────────
    private void isWhatsAppInstalled(CallbackContext cb) {
        Context ctx = cordova.getActivity().getApplicationContext();
        PackageManager pm = ctx.getPackageManager();
        boolean installed = false;
        try {
            pm.getPackageInfo("com.whatsapp", 0);
            installed = true;
        } catch (PackageManager.NameNotFoundException e) {
            try {
                pm.getPackageInfo("com.whatsapp.w4b", 0);
                installed = true;
            } catch (PackageManager.NameNotFoundException e2) {
                // not installed
            }
        }
        cb.success(installed ? 1 : 0);
    }
}
