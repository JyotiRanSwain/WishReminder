# WishReminder v2

## Two major improvements over v1

### 1. Zero memory scheduling (AlarmManager)
**Problem:** `setInterval` every 30 seconds runs even when the app is in the background, draining battery and consuming RAM.

**Solution:** Android **AlarmManager with `setExactAndAllowWhileIdle`**
- The alarm is registered once when you save the event
- The OS stores it — your app uses **zero memory** while waiting
- At the exact scheduled time, Android wakes up and fires `AlarmReceiver`
- Works even in Doze mode and after phone restart

### 2. Auto-send WhatsApp (Accessibility Service)
**Problem:** WhatsApp has no public API for sending messages from apps. All the app can do is open WhatsApp with a pre-filled message — but the user still had to tap Send manually.

**Solution:** Android **Accessibility Service** (same technique used by many reminder apps on Play Store)
- User enables WishReminder in `Settings > Accessibility` once
- When the alarm fires, `WishSenderService` opens WhatsApp with the message
- `WishAccessibilityService` watches the WhatsApp window
- It finds the Send button and **taps it automatically**
- Message is sent without user interaction

---

## Project Structure

```
EventReminder2/
├── www/
│   ├── index.html              ← UI with Accessibility banner
│   ├── css/style.css           ← Styles
│   └── js/app.js               ← App logic (no setInterval)
├── src/android/java/com/wishreminder/plugin/
│   ├── WishPlugin.java         ← Cordova bridge (JS ↔ Android)
│   ├── AlarmReceiver.java      ← Fires at exact scheduled time
│   ├── WishSenderService.java  ← Opens WhatsApp, signals accessibility
│   └── WishAccessibilityService.java ← Taps Send button in WhatsApp
├── src/android/res/xml/
│   └── accessibility_service_config.xml
├── www/WishPlugin.js           ← JS API for the plugin
├── plugin.xml                  ← Plugin manifest
├── config.xml                  ← Cordova config
├── package.json
└── .github/workflows/build.yml
```

---

## Build Steps

```bash
# 1. Install Cordova
npm install -g cordova@12

# 2. Install deps
npm install

# 3. Add Android platform
cordova platform add android@13

# 4. Install standard plugins
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-device

# 5. Install our local plugin (this folder)
cordova plugin add .

# 6. Build
cordova build android

# APK: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## First-time User Setup (in the app)

An orange banner appears if Accessibility is not enabled:

> **Enable Auto-Send** — Allow WishReminder to tap Send in WhatsApp automatically.
> [Enable Now] button

Tapping "Enable Now" opens:
`Settings > Accessibility > Downloaded Apps > WishReminder > Toggle ON`

After that, everything is automatic.

---

## How it flows end-to-end

```
User saves event
      ↓
AlarmManager.setExactAndAllowWhileIdle(timestamp)
      ↓           [app uses ZERO memory here]
At exact time → AlarmReceiver fires
      ↓
WishSenderService.startForegroundService()
      ↓
Opens WhatsApp: wa.me/PHONE?text=MESSAGE
      ↓
WishAccessibilityService detects WhatsApp window
      ↓
Finds Send button → performAction(CLICK)
      ↓
Message sent! Broadcasts back to app → marks event as "Sent"
```

---

## Important Notes

- Accessibility permission is a **one-time setup** by the user
- The service only watches WhatsApp/WhatsApp Business windows — nothing else
- On Android 12+ you may also need to grant "Schedule Exact Alarms" in Battery settings
- WhatsApp must be installed on the device
