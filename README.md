# WishReminder v2 - Fixed Build

## What was fixed

### Bug: `Cannot read properties of null (reading 'replace')`
**Cause:** The <name>name</name> tag in config.xml and plugin.xml was
accidentally saved as <n> (an HTML tag) instead of
<name>name</name> because the chat interface rendered it invisibly.
Cordova reads the app name to generate file paths - when it's null, the
.replace() call crashes.

**Fix applied in this package:**
- config.xml line 8:  <name>WishReminder</name>  (correct)
- plugin.xml line 8:  <name>WishSender</name>    (correct)

### Bug: cordova-android@13 compatibility issue
**Fix:** Pinned to cordova@12.0.0 + cordova-android@12.0.1 which is a
proven stable combination.

---

## Quick start

### GitHub Actions (easiest)
1. Push this folder to a GitHub repo
2. Go to Actions tab - build runs automatically
3. Download APK from the Artifacts section

### Local build
```bash
npm install -g cordova@12.0.0
npm install
cordova platform add android@12.0.1
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-inappbrowser
cordova plugin add cordova-plugin-device
cordova plugin add .
cordova build android
```
APK: platforms/android/app/build/outputs/apk/debug/app-debug.apk

---

## First time in the app

An orange banner will appear:
> **Enable Auto-Send** [Enable Now]

Tap it → Settings > Accessibility > WishReminder > Toggle ON

After that every reminder sends automatically with zero manual steps.

---

## How it works end to end

1. Save a reminder → AlarmManager stores the exact timestamp (zero RAM used)
2. At the scheduled time → Android wakes AlarmReceiver
3. WishSenderService opens WhatsApp with the message pre-filled
4. WishAccessibilityService finds the Send button and taps it
5. Message sent, reminder marked as Sent
