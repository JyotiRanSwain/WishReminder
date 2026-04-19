package com.wishreminder.plugin;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.List;

/**
 * Accessibility Service that watches for WhatsApp's window.
 * When WishSenderService sets pendingSend=true and WhatsApp is open
 * with a message pre-filled, this service finds the Send button and taps it.
 *
 * The user must enable this once in:
 *   Settings > Accessibility > WishReminder > Enable
 */
public class WishAccessibilityService extends AccessibilityService {
    private static final String TAG = "WishAccessibility";

    // WhatsApp package names (regular + business)
    private static final String WA_PKG  = "com.whatsapp";
    private static final String WAB_PKG = "com.whatsapp.w4b";

    // Known resource IDs for the Send button across WhatsApp versions
    private static final String[] SEND_BUTTON_IDS = {
        "com.whatsapp:id/send",
        "com.whatsapp:id/send_btn",
        "com.whatsapp.w4b:id/send",
        "com.whatsapp.w4b:id/send_btn",
    };

    private boolean hasSentForCurrentEvent = false;
    private String  lastHandledEventId     = null;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!WishSenderService.pendingSend) return;

        String pkg = event.getPackageName() != null ? event.getPackageName().toString() : "";
        if (!pkg.equals(WA_PKG) && !pkg.equals(WAB_PKG)) return;

        // Only act once per pending event
        String currentEventId = WishSenderService.pendingEventId;
        if (currentEventId != null && currentEventId.equals(lastHandledEventId)) return;

        int eventType = event.getEventType();
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {

            // Small delay to let WhatsApp fully render the message
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override public void run() {
                    if (!WishSenderService.pendingSend) return;
                    boolean tapped = tapSendButton();
                    if (tapped) {
                        Log.d(TAG, "Send button tapped successfully!");
                        lastHandledEventId = WishSenderService.pendingEventId;
                        WishSenderService.pendingSend = false;
                        // Notify JS layer that message was sent
                        broadcastSentSuccess(WishSenderService.pendingEventId);
                    }
                }
            }, 1500); // 1.5s delay for WhatsApp to load
        }
    }

    private boolean tapSendButton() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        // Try by resource ID first (fastest)
        for (String resId : SEND_BUTTON_IDS) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(resId);
            if (nodes != null) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node.isEnabled() && node.isClickable()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        Log.d(TAG, "Tapped send via ID: " + resId);
                        return true;
                    }
                }
            }
        }

        // Fallback: search by content description
        String[] descriptions = {"Send", "send", "SEND"};
        for (String desc : descriptions) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(desc);
            if (nodes != null) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node.isClickable()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        Log.d(TAG, "Tapped send via text description: " + desc);
                        return true;
                    }
                }
            }
        }

        Log.w(TAG, "Could not find Send button");
        return false;
    }

    private void broadcastSentSuccess(String eventId) {
        if (eventId == null) return;
        Intent broadcast = new Intent("com.wishreminder.MESSAGE_SENT");
        broadcast.putExtra("eventId", eventId);
        sendBroadcast(broadcast);
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                        | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.packageNames = new String[]{ WA_PKG, WAB_PKG };
        info.notificationTimeout = 100;
        setServiceInfo(info);
        Log.d(TAG, "WishAccessibilityService connected");
    }
}
