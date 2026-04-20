/**
 * WishPlugin.js — JavaScript bridge to native Android plugin
 * Exposes: scheduleAlarm, cancelAlarm, isAccessibilityEnabled,
 *          openAccessibilitySettings, isWhatsAppInstalled
 */
var exec = require('cordova/exec');

var WishPlugin = {

  /**
   * Schedule an exact AlarmManager alarm.
   * @param {string} eventId    - unique ID
   * @param {string} phone      - full international number, digits only e.g. "919876543210"
   * @param {string} message    - WhatsApp message text
   * @param {number} timestampMs - Unix milliseconds when to fire
   */
  scheduleAlarm: function(eventId, phone, message, timestampMs, success, error) {
    exec(success, error, 'WishPlugin', 'scheduleAlarm',
         [String(eventId), phone, message, timestampMs]);
  },

  /** Cancel a previously scheduled alarm */
  cancelAlarm: function(eventId, success, error) {
    exec(success, error, 'WishPlugin', 'cancelAlarm', [String(eventId)]);
  },

  /**
   * Returns 1 if WishReminder Accessibility Service is enabled, else 0.
   * If 0, prompt the user to enable it.
   */
  isAccessibilityEnabled: function(success, error) {
    exec(success, error, 'WishPlugin', 'isAccessibilityEnabled', []);
  },

  /** Opens Android Accessibility Settings so user can enable our service */
  openAccessibilitySettings: function(success, error) {
    exec(success, error, 'WishPlugin', 'openAccessibilitySettings', []);
  },

  /** Returns 1 if WhatsApp (or WhatsApp Business) is installed */
  isWhatsAppInstalled: function(success, error) {
    exec(success, error, 'WishPlugin', 'isWhatsAppInstalled', []);
  },
};

module.exports = WishPlugin;
