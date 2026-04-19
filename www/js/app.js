/* =========================================
   WishReminder — app.js  v2
   - AlarmManager: zero memory while waiting
   - Accessibility Service: auto-taps WhatsApp Send
   - Works on laptop (file://) for UI testing
   ========================================= */
"use strict";

// ── Messages (plain text, no emojis) ──────
var EVENT_MESSAGES = {
  birthday:        function(n){ return "Happy Birthday, "+n+"!\nWishing you a wonderful day filled with joy, laughter, and love. May all your dreams come true this year!\nWith love"; },
  anniversary:     function(n){ return "Happy Anniversary, "+n+"!\nMay your journey together continue to be filled with love, happiness, and beautiful memories. Cheers to many more years!\nWith warm wishes"; },
  wedding:         function(n){ return "Congratulations on your Wedding Day, "+n+"!\nAs you begin this beautiful journey together, may your love grow stronger every single day.\nWith blessings"; },
  graduation:      function(n){ return "Congratulations, "+n+"!\nToday marks the beginning of an exciting new chapter. You have worked so hard and deserve every success!\nSo proud of you!"; },
  newYear:         function(n){ return "Happy New Year, "+n+"!\nMay the coming year bring you health, happiness, prosperity, and all the things your heart desires!\nWith love and best wishes"; },
  diwali:          function(n){ return "Happy Diwali, "+n+"!\nMay the divine light of Diya illuminate your life with peace, prosperity, and happiness.\nShubh Deepawali"; },
  eid:             function(n){ return "Eid Mubarak, "+n+"!\nMay Allah bless you and your family with joy, peace, and prosperity.\nEid Mubarak"; },
  christmas:       function(n){ return "Merry Christmas, "+n+"!\nMay the magic of Christmas fill your home with warmth, love, and laughter.\nSeasons Greetings"; },
  promotion:       function(n){ return "Congratulations on your Promotion, "+n+"!\nYour dedication and hard work have truly paid off. Wishing you even greater success!\nWell deserved!"; },
  newBaby:         function(n){ return "Congratulations, "+n+"!\nWhat a wonderful blessing! Wishing your little one a lifetime of love, health, and happiness.\nWith warm wishes"; },
  farewell:        function(n){ return "Farewell and Best Wishes, "+n+"!\nAs you embark on this exciting new journey, carry all the wonderful memories with you.\nUntil we meet again"; },
  getWell:         function(n){ return "Get Well Soon, "+n+"!\nSending you healing thoughts and warm wishes. Take rest, stay strong, and be back soon!\nTake care"; },
  thankyou:        function(n){ return "Thank You so much, "+n+"!\nYour kindness and generosity mean the world. I am truly grateful to have you in my life!\nWith heartfelt gratitude"; },
  congratulations: function(n){ return "Congratulations, "+n+"!\nYour achievement is truly remarkable and you deserve every bit of recognition.\nKeep shining bright"; },
  other:           function(n,c){ return (c||"Special Wishes")+" to "+n+"!\nSending you the warmest wishes on this special occasion. May it be filled with joy!\nWith lots of love"; },
};

var EVENT_EMOJIS  = { birthday:"🎂",anniversary:"💍",wedding:"💒",graduation:"🎓",newYear:"🎆",diwali:"🪔",eid:"🌙",christmas:"🎄",promotion:"💼",newBaby:"👶",farewell:"✈️",getWell:"🌷",thankyou:"🙏",congratulations:"🏆",other:"🎊" };
var EVENT_LABELS  = { birthday:"Happy Birthday",anniversary:"Anniversary",wedding:"Wedding Day",graduation:"Graduation",newYear:"New Year",diwali:"Diwali",eid:"Eid Mubarak",christmas:"Christmas",promotion:"Job Promotion",newBaby:"New Baby",farewell:"Farewell",getWell:"Get Well Soon",thankyou:"Thank You",congratulations:"Congratulations",other:"Custom Event" };

// ── DOM ────────────────────────────────────
var splash        = document.getElementById("splash");
var appEl         = document.getElementById("app");
var tabs          = document.querySelectorAll(".tab");
var tabContents   = document.querySelectorAll(".tab-content");
var recipientName = document.getElementById("recipientName");
var eventType     = document.getElementById("eventType");
var customGroup   = document.getElementById("customEventGroup");
var customName    = document.getElementById("customEventName");
var eventDate     = document.getElementById("eventDate");
var eventTime     = document.getElementById("eventTime");
var countryCode   = document.getElementById("countryCode");
var mobileNumber  = document.getElementById("mobileNumber");
var previewGroup  = document.getElementById("previewGroup");
var msgPreview    = document.getElementById("messagePreview");
var saveBtn       = document.getElementById("saveBtn");
var eventsList    = document.getElementById("eventsList");
var toast         = document.getElementById("toast");
var accessBanner  = document.getElementById("accessBanner");
var accessBtn     = document.getElementById("accessBtn");

// ── State ──────────────────────────────────
var events = [];
var nativeBridge = null; // will hold WishPlugin when in Cordova

// ── Init ───────────────────────────────────
document.addEventListener("deviceready", function() {
  nativeBridge = window.WishPlugin || null;
  checkAccessibilityBanner();
  // Listen for "message sent" broadcast from accessibility service
  document.addEventListener("wishMessageSent", function(e) {
    markEventSent(e.detail && e.detail.eventId);
  });
  init();
}, false);

// Laptop / browser fallback
if (typeof window.cordova === "undefined") {
  window.addEventListener("load", function() { setTimeout(init, 1100); });
}

function init() {
  splash.classList.add("fade-out");
  setTimeout(function() {
    splash.style.display = "none";
    appEl.classList.remove("hidden");
  }, 650);
  loadEvents();
  renderEvents();
  setDefaultDateTime();
}

// ── Accessibility banner ───────────────────
function checkAccessibilityBanner() {
  if (!nativeBridge) return;
  nativeBridge.isAccessibilityEnabled(function(enabled) {
    if (!enabled) {
      accessBanner.classList.remove("hidden");
    } else {
      accessBanner.classList.add("hidden");
    }
  }, function() {});
}

if (accessBtn) {
  accessBtn.addEventListener("click", function() {
    if (nativeBridge) {
      nativeBridge.openAccessibilitySettings(function() {}, function() {});
    }
  });
}

// ── Default date/time ──────────────────────
function setDefaultDateTime() {
  var now = new Date();
  now.setHours(now.getHours() + 1);
  eventDate.value = now.toISOString().slice(0, 10);
  eventTime.value = pad(now.getHours()) + ":" + pad(now.getMinutes());
}
function pad(n) { return String(n).padStart(2,"0"); }

// ── Tabs ───────────────────────────────────
tabs.forEach(function(tab) {
  tab.addEventListener("click", function() {
    var target = tab.dataset.tab;
    tabs.forEach(function(t){ t.classList.remove("active"); });
    tabContents.forEach(function(c){ c.classList.remove("active"); });
    tab.classList.add("active");
    document.getElementById("tab-"+target).classList.add("active");
    if (target === "events") {
      renderEvents();
      checkAccessibilityBanner();
    }
  });
});

// ── Live preview ───────────────────────────
eventType.addEventListener("change", updatePreview);
recipientName.addEventListener("input", updatePreview);
customName.addEventListener("input", updatePreview);

function updatePreview() {
  var type = eventType.value;
  if (type === "other") { customGroup.classList.remove("hidden"); }
  else { customGroup.classList.add("hidden"); customName.value = ""; }
  var name = recipientName.value.trim() || "[Name]";
  if (type) {
    msgPreview.textContent = buildMessage(type, name, customName.value.trim());
    previewGroup.style.display = "block";
  } else {
    previewGroup.style.display = "none";
  }
}

function buildMessage(type, name, custom) {
  var fn = EVENT_MESSAGES[type];
  return fn ? fn(name, custom||"Special Event") : "";
}

// ── Save Event ─────────────────────────────
saveBtn.addEventListener("click", saveEvent);

function saveEvent() {
  var name   = recipientName.value.trim();
  var type   = eventType.value;
  var custom = customName.value.trim();
  var date   = eventDate.value;
  var time   = eventTime.value;
  var code   = countryCode.value;
  var phone  = mobileNumber.value.trim().replace(/\D/g,"");

  if (!name)                         { showToast("Please enter recipient name"); return; }
  if (!type)                         { showToast("Please select an occasion");   return; }
  if (type==="other" && !custom)     { showToast("Please enter custom event name"); return; }
  if (!date)                         { showToast("Please select a date");        return; }
  if (!time)                         { showToast("Please select a time");        return; }
  if (!phone || phone.length < 7)    { showToast("Please enter WhatsApp number"); return; }

  var scheduledAt = new Date(date+"T"+time);
  if (scheduledAt <= new Date()) { showToast("Please choose a future date and time"); return; }

  var ev = {
    id:          Date.now(),
    name:        name,
    type:        type,
    customName:  custom,
    date:        date,
    time:        time,
    countryCode: code,
    phone:       phone,
    sent:        false,
    message:     buildMessage(type, name, custom),
    scheduledMs: scheduledAt.getTime(),
  };

  events.push(ev);
  saveEvents();

  // Schedule exact alarm (native) or fallback timer (browser)
  scheduleEvent(ev);

  renderEvents();
  tabs[1].click();
  showToast("Reminder saved!");

  recipientName.value=""; eventType.value=""; customName.value="";
  customGroup.classList.add("hidden"); previewGroup.style.display="none";
  mobileNumber.value=""; setDefaultDateTime();
}

// ── Schedule alarm ─────────────────────────
function scheduleEvent(ev) {
  var fullPhone = (ev.countryCode + ev.phone).replace(/\D/g,"");

  if (nativeBridge) {
    // Use Android AlarmManager — ZERO memory while waiting
    nativeBridge.scheduleAlarm(
      String(ev.id), fullPhone, ev.message, ev.scheduledMs,
      function() { console.log("Alarm set for event", ev.id); },
      function(e){ console.error("Alarm error", e); }
    );
  } else {
    // Browser fallback: setTimeout (only works while tab is open)
    var delay = ev.scheduledMs - Date.now();
    if (delay > 0 && delay < 2147483647) {
      setTimeout(function() { sendWhatsApp(ev.id); }, delay);
    }
  }
}

// ── Cancel alarm when deleting ─────────────
function cancelAlarm(ev) {
  if (nativeBridge) {
    nativeBridge.cancelAlarm(String(ev.id), function(){}, function(){});
  }
}

// ── Mark event as sent (called by accessibility broadcast) ─
function markEventSent(eventId) {
  if (!eventId) return;
  var id = parseInt(eventId, 10) || eventId;
  events.forEach(function(ev) {
    if (ev.id == id) ev.sent = true;
  });
  saveEvents();
  renderEvents();
  showToast("Message sent on WhatsApp!");
}

// ── Render Events List ─────────────────────
function renderEvents() {
  if (events.length === 0) {
    eventsList.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">🗓️</div>' +
        '<p>No reminders yet.<br>Add your first one!</p>' +
      '</div>';
    return;
  }
  var sorted = events.slice().sort(function(a,b){ return a.scheduledMs - b.scheduledMs; });
  eventsList.innerHTML = sorted.map(function(ev) {
    var emoji = EVENT_EMOJIS[ev.type]||"🎊";
    var label = ev.type==="other" ? ev.customName : (EVENT_LABELS[ev.type]||ev.type);
    var statusBadge = ev.sent
      ? '<span class="badge badge-sent">Sent</span>'
      : '<span class="badge badge-pending">Scheduled</span>';
    return (
      '<div class="event-card" id="card-'+ev.id+'">' +
        '<div class="event-emoji">'+emoji+'</div>' +
        '<div class="event-info">' +
          '<div class="event-name">'+ev.name+'  '+statusBadge+'</div>' +
          '<div class="event-occasion">'+label+'</div>' +
          '<div class="event-meta">' +
            '<span>'+formatDate(ev.date)+'</span>' +
            '<span>'+formatTime(ev.time)+'</span>' +
            '<span>'+ev.countryCode+' '+ev.phone+'</span>' +
          '</div>' +
        '</div>' +
        '<div class="event-actions">' +
          '<button class="btn-wa" onclick="sendWhatsApp('+ev.id+')">'+
            (ev.sent?"Resend":"Send Now")+
          '</button>' +
          '<button class="btn-del" onclick="deleteEvent('+ev.id+')">Delete</button>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}

// ── Manual / auto WhatsApp send ────────────
function sendWhatsApp(id) {
  var ev = events.find(function(e){ return e.id===id; });
  if (!ev) return;
  var fullPhone = (ev.countryCode+ev.phone).replace(/\D/g,"");
  var url = "https://wa.me/"+fullPhone+"?text="+encodeURIComponent(ev.message);

  if (typeof cordova!=="undefined" && cordova.InAppBrowser) {
    cordova.InAppBrowser.open(url,"_system");
  } else {
    window.open(url,"_blank");
  }
  // Mark sent only for manual send; auto-send is marked via broadcast
  ev.sent = true;
  saveEvents(); renderEvents();
}
window.sendWhatsApp = sendWhatsApp;

// ── Delete Event ───────────────────────────
function deleteEvent(id) {
  var ev = events.find(function(e){ return e.id===id; });
  if (ev) cancelAlarm(ev);
  events = events.filter(function(e){ return e.id!==id; });
  saveEvents(); renderEvents();
  showToast("Reminder deleted");
}
window.deleteEvent = deleteEvent;

// ── Storage ────────────────────────────────
function saveEvents() {
  try { localStorage.setItem("wr_events", JSON.stringify(events)); } catch(e){}
}
function loadEvents() {
  try { var r=localStorage.getItem("wr_events"); events=r?JSON.parse(r):[]; } catch(e){ events=[]; }
}

// ── Helpers ────────────────────────────────
function formatDate(d) {
  return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function formatTime(t) {
  var p=t.split(":"); var h=parseInt(p[0],10); var m=p[1];
  return (h%12||12)+":"+m+" "+(h>=12?"PM":"AM");
}
function showToast(msg,dur) {
  dur=dur||2500;
  toast.textContent=msg; toast.classList.remove("hidden"); toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t=setTimeout(function(){ toast.classList.remove("show"); toast.classList.add("hidden"); },dur);
}
