/**
 * script.js — HealthSync+ (single-file SPA companion)
 *
 * Full app logic for:
 *  - AI-style wellness insights (rules-based)
 *  - Daily checklist with localStorage persistence
 *  - Mood logging
 *  - Charts (Chart.js expected in HTML)
 *  - Heartbeat simulation + breathing exercise
 *  - Water reminders (2 hours by default)
 *  - Hydration & sleep challenges
 *  - BMI & calorie calculator
 *  - Virtual symptom checker
 *  - Motivational quotes
 *  - Newsletter subscribe (simulated)
 *  - Recent activity log
 *  - Lightweight PWA registration + offline support hook
 *
 * Matches element IDs/classes used in the supplied index.html.
 * Drop this file next to index.html and styles.css and include with:
 *   <script src="script.js"></script>
 *
 * NOTE: For demo convenience some timers use short intervals (e.g., 2 minutes).
 * Change WATER_REMINDER_INTERVAL to 2*60*60*1000 (2 hours) for production.
 */

/* ============================================================
   Config & Utilities
   ============================================================ */
const CONFIG = {
  WATER_REMINDER_INTERVAL: 2 * 60 * 60 * 1000, // 2 hours (ms)
  // For demo/testing, you might want a shorter interval like 2*60*1000 (2 minutes).
  DEMO_MODE_SHORT_REMINDER: true
};

if (CONFIG.DEMO_MODE_SHORT_REMINDER) {
  CONFIG.WATER_REMINDER_INTERVAL = 2 * 60 * 1000; // 2 minutes for demo
}

const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set failed', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

function nowStr() {
  return new Date().toLocaleString();
}

function tidyNumber(v, decimals = 1) {
  return Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/* ============================================================
   SPA Navigation
   ============================================================ */
function initNavigation() {
  const sections = document.querySelectorAll('main section');
  function showSection(id) {
    sections.forEach(s => s.style.display = 'none');
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
    const lastSync = document.getElementById('lastSync');
    if (lastSync) lastSync.textContent = 'Last sync: ' + new Date().toLocaleString();
  }

  // wire sidebar nav items
  document.querySelectorAll('nav li').forEach(li => {
    li.addEventListener('click', () => {
      const text = li.textContent.trim().toLowerCase();
      // map some names to IDs used in markup
      if (text.includes('home')) showSection('home');
      else if (text.includes('dashboard')) showSection('dashboard');
      else if (text.includes('mental')) showSection('mental');
      else if (text.includes('articles')) showSection('articles');
      else if (text.includes('challenges')) showSection('challenges');
      else if (text.includes('tools')) showSection('tools');
    });
  });

  // header / quick controls
  const openDashboardBtn = document.getElementById('openDashboard');
  if (openDashboardBtn) openDashboardBtn.addEventListener('click', () => showSection('dashboard'));

  const fab = document.getElementById('fabQuick');
  if (fab) fab.addEventListener('click', () => {
    showSection('tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // default show home
  showSection('home');
}

/* ============================================================
   Recent activity log helper
   ============================================================ */
function logActivity(text) {
  const arr = Storage.get('recentLogs', []);
  arr.push({ t: new Date().toLocaleString(), text });
  // keep last 50
  Storage.set('recentLogs', arr.slice(-50));
  renderRecentLogs();
}

function renderRecentLogs() {
  const container = document.getElementById('recentLogs');
  if (!container) return;
  const arr = Storage.get('recentLogs', []);
  container.innerHTML = arr.slice().reverse().map(r => `<div style="padding:6px 0">${r.t} — ${escapeHtml(r.text)}</div>`).join('') || 'No activity';
}

/* tiny safe html escape */
function escapeHtml(s) {
  return (s + '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ============================================================
   Checklist / Daily Routine Tracker
   ============================================================ */
function initChecklist() {
  const checkboxes = document.querySelectorAll('#dailyChecklist input[type=checkbox]');
  checkboxes.forEach(cb => {
    const key = cb.dataset.key;
    if (!key) return;
    cb.checked = Storage.get('check_' + key, false);
    cb.addEventListener('change', () => {
      Storage.set('check_' + key, cb.checked);
      updateHydrationProgress();
      logActivity(`Checklist: ${key} set to ${cb.checked}`);
      renderInsights(); // update AI insights based on checklist
    });
  });

  const clearBtn = document.getElementById('clearChecklist');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    checkboxes.forEach(cb => {
      const key = cb.dataset.key;
      if (!key) return;
      cb.checked = false;
      Storage.set('check_' + key, false);
    });
    updateHydrationProgress();
    logActivity('Checklist cleared');
    renderInsights();
  });
}

/* ============================================================
   Newsletter signup simulation
   ============================================================ */
function initNewsletter() {
  const subscribeBtn = document.getElementById('subscribeBtn');
  if (!subscribeBtn) return;
  subscribeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletterEmail');
    const msg = document.getElementById('subscribeMsg');
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      if (msg) { msg.textContent = 'Enter a valid email.'; msg.style.color = '#d97706'; }
      return;
    }
    const list = Storage.get('subscribers', []);
    if (list.includes(email)) {
      if (msg) { msg.textContent = 'Already subscribed.'; msg.style.color = '#6b7280'; }
      return;
    }
    list.push(email);
    Storage.set('subscribers', list);
    if (msg) { msg.textContent = 'Thanks for joining HealthSync+!'; msg.style.color = '#059669'; }
    emailInput.value = '';
    logActivity('Subscribed: ' + email);
  });
}

/* ============================================================
   Mood logging
   ============================================================ */
function initMoodLogging() {
  const addBtn = document.getElementById('addMood');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    const mood = document.getElementById('moodSelect').value;
    const note = document.getElementById('moodNote').value.trim();
    const arr = Storage.get('moodLogs', []);
    arr.push({ mood, note, when: nowStr() });
    Storage.set('moodLogs', arr);
    document.getElementById('moodNote').value = '';
    renderMoodList();
    logActivity('Mood logged: ' + mood + (note ? ' — ' + note : ''));
    renderInsights();
  });
  renderMoodList();
}

function renderMoodList() {
  const container = document.getElementById('moodList');
  if (!container) return;
  const list = Storage.get('moodLogs', []);
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="tiny muted">No mood entries</div>';
    return;
  }
  container.innerHTML = list.slice().reverse().map(m => `<li class="tiny" style="padding:8px 0">${escapeHtml(m.when)} — ${escapeHtml(m.mood)}${m.note ? ' — ' + escapeHtml(m.note) : ''}</li>`).join('');
}

/* ============================================================
   Charts (Chart.js) — init with sample/demo data and update hooks
   ============================================================ */
let stepsChart = null, sleepChart = null, moodChart = null;
function initCharts() {
  // safe guard if Chart not loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not found — charts will not render.');
    return;
  }

  const sampleSteps = Storage.get('stepsWeek', [1200, 3400, 4500, 6700, 2300, 7600, 4200]);
  const stepsCtx = document.getElementById('stepsChart')?.getContext('2d');
  if (stepsCtx) {
    stepsChart = new Chart(stepsCtx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Steps',
          data: sampleSteps,
          borderRadius: 8,
          backgroundColor: '#6ec6ffaa'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  const sleepCtx = document.getElementById('sleepChart')?.getContext('2d');
  if (sleepCtx) {
    sleepChart = new Chart(sleepCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ label: 'Sleep hrs', data: [6, 7.5, 5.5, 8, 7, 6.5, 7], fill: true, tension: 0.4 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }
    });
  }

  const moodCtx = document.getElementById('moodChart')?.getContext('2d');
  if (moodCtx) {
    moodChart = new Chart(moodCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ label: 'Mood (1-5)', data: [3, 4, 2, 5, 4, 3, 4], tension: 0.4 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 5 } } }
    });
  }
}

/* ============================================================
   Insights: rule-based "AI" wellness suggestions
   ============================================================ */
function generateInsightsObj() {
  // read stored values with safe defaults
  const sleepHours = Storage.get('lastSleep', 6.2);
  const water = Storage.get('waterCount', 0);
  const moodLogs = Storage.get('moodLogs', []);
  const stepsToday = Storage.get('stepsToday', 3200);

  const insights = [];
  if (sleepHours < 6) insights.push('You slept less than 6 hrs — try a quick nap or a power-rest today.');
  else if (sleepHours < 7) insights.push('Sleep was slightly short — aim for 7–8 hrs.');
  else insights.push('Nice sleep last night — keep it up.');

  if (water < 4) insights.push('You have logged fewer than 4 glasses — have a glass of water now 💧');
  else if (water < 8) insights.push('You’re halfway to your water goal — keep sipping.');
  else insights.push('Great — you reached your hydration goal today!');

  if (!moodLogs || moodLogs.length === 0) insights.push('You haven’t logged any mood entries this week — how are you feeling?');

  if (stepsToday < 3000) insights.push('Try a 15-min walk — short walks can boost mood and circulation.');

  return {
    insights,
    meta: { sleepHours, water, stepsToday }
  };
}

function renderInsights() {
  const container = document.getElementById('insights');
  if (!container) return;
  const obj = generateInsightsObj();
  container.innerHTML = '';
  obj.insights.forEach(s => {
    const d = document.createElement('div');
    d.className = 'tiny';
    d.style.margin = '6px 0';
    d.textContent = '• ' + s;
    container.appendChild(d);
  });
  const timeEl = document.getElementById('insightTime');
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  // update stat boxes
  const sleepEl = document.getElementById('sleepHours');
  const waterEl = document.getElementById('waterCount');
  const stepsEl = document.getElementById('stepsCount');
  if (sleepEl) sleepEl.textContent = Storage.get('lastSleep', 6.2) + ' hr';
  if (waterEl) waterEl.textContent = `${Storage.get('waterCount', 0)} / 8`;
  if (stepsEl) stepsEl.textContent = Storage.get('stepsToday', 0);
}

/* ============================================================
   Heartbeat simulation
   ============================================================ */
function initHeartbeatSimulation() {
  const el = document.getElementById('heartBeat');
  if (!el) return;
  function tick() {
    const hr = Math.floor(60 + Math.random() * 35);
    el.textContent = hr;
    // slightly vary animation speed by applying random duration (CSS animation defined in styles)
    // we manipulate inline style to vary animation speed
    const speed = 0.9 + Math.random() * 0.5; // seconds
    el.style.animationDuration = `${speed}s`;
  }
  tick();
  setInterval(tick, 2500);
}

/* ============================================================
   Breathing / relaxation
   ============================================================ */
let breathInterval = null;
function startBreathing(durationSec = 60, breathingElId = 'breathingCtl', progressElId = null) {
  const el = document.getElementById(breathingElId);
  const prog = progressElId ? document.getElementById(progressElId) : null;
  if (!el) return;
  if (breathInterval) clearInterval(breathInterval);
  const start = Date.now();
  el.textContent = 'Inhale';
  let elapsed = 0;
  breathInterval = setInterval(() => {
    elapsed = Math.floor((Date.now() - start) / 1000);
    if (elapsed >= durationSec) {
      stopBreathing();
      if (prog) prog.textContent = 'Completed';
      logActivity('Completed breathing exercise');
      return;
    }
    const cycle = elapsed % 6; // inhale 3s, exhale 3s
    if (cycle < 3) {
      el.style.transform = 'scale(1.08)';
      el.textContent = 'Inhale';
    } else {
      el.style.transform = 'scale(0.86)';
      el.textContent = 'Exhale';
    }
    if (prog) prog.textContent = `Breathing — ${elapsed}s / ${durationSec}s`;
  }, 600);
}

function stopBreathing() {
  if (breathInterval) clearInterval(breathInterval);
  breathInterval = null;
  const el = document.getElementById('breathingCtl');
  if (el) { el.style.transform = 'scale(1)'; el.textContent = 'Breathe'; }
  const prog = document.getElementById('breathingProgress');
  if (prog) prog.textContent = 'Stopped';
}

/* ============================================================
   Water reminder + notification
   ============================================================ */
let waterTimerId = null;
const chimeAudio = new Audio('https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg');

function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission !== 'denied') return Notification.requestPermission().then(p => p === 'granted');
  return Promise.resolve(false);
}

function showNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch (e) {
      console.warn('Notification failed', e);
    }
  }
}

function startWaterReminders() {
  if (waterTimerId) return;
  // play immediately then repeat (or show an alert immediately for better demo UX)
  function fireReminder() {
    // audio
    chimeAudio.play().catch(() => { /* ignore play failures */ });
    // show browser notification if permitted
    showNotification('HealthSync+', 'Time to drink water 💧');
    // fallback alert for visibility
    try { alert('Time to drink water 💧'); } catch (e) { /* ignore */ }
    logActivity('Water reminder fired');
  }

  // fire the first reminder now to show effect, then schedule next
  fireReminder();
  waterTimerId = setInterval(fireReminder, CONFIG.WATER_REMINDER_INTERVAL);
  logActivity('Water reminders started');
  // ask for notification permission for future reminders
  requestNotificationPermission();
}

function stopWaterReminders() {
  if (!waterTimerId) return;
  clearInterval(waterTimerId);
  waterTimerId = null;
  logActivity('Water reminders stopped');
}

/* ============================================================
   Hydration challenge progress UI
   ============================================================ */
function updateHydrationProgressUI() {
  const value = Storage.get('challengeHydration', 3);
  const pct = Math.min(100, Math.round((value / 7) * 100));
  const el = document.getElementById('hydrationProgress');
  const el2 = document.getElementById('challengeProg');
  if (el) el.style.width = pct + '%';
  if (el2) el2.style.width = pct + '%';
}

function initChallengeButtons() {
  const joinBtn = document.getElementById('joinChallenge');
  if (joinBtn) joinBtn.addEventListener('click', () => {
    Storage.set('challengeHydration', Storage.get('challengeHydration', 0) + 1);
    updateHydrationProgressUI();
    logActivity('Joined hydration challenge (demo action)');
  });

  const logGlassBtn = document.getElementById('logGlass');
  if (logGlassBtn) logGlassBtn.addEventListener('click', () => {
    const v = Storage.get('challengeHydration', 0) + 1;
    Storage.set('challengeHydration', v);
    const waterCount = Math.min(8, Storage.get('waterCount', 0) + 1);
    Storage.set('waterCount', waterCount);
    updateHydrationProgressUI();
    renderInsights();
    logActivity('Logged a glass of water');
  });
}

/* ============================================================
   BMI & Calorie Calculator
   ============================================================ */
function initBMICalculator() {
  const calcBtn = document.getElementById('calcBtn');
  const clearBtn = document.getElementById('clearCalc');

  if (calcBtn) calcBtn.addEventListener('click', () => {
    const h = parseFloat(document.getElementById('heightInput').value);
    const w = parseFloat(document.getElementById('weightInput').value);
    const activity = parseFloat(document.getElementById('activityLevel').value) || 1.2;
    const res = document.getElementById('bmiResult');
    if (!h || !w) {
      if (res) res.textContent = 'Enter height and weight.';
      return;
    }
    const bmi = tidyNumber((w / ((h / 100) * (h / 100))), 1);
    let category = 'Normal';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';

    // Simple BMR (Mifflin-St Jeor) - genderless demo: assume 25yo male (for demo only)
    const age = Storage.get('demoAge', 25);
    const bmr = Math.round(10 * w + 6.25 * h - 5 * age + 5);
    const calories = Math.round(bmr * activity);
    if (res) res.innerHTML = `BMI: <strong>${bmi}</strong> — ${category}. Estimated daily calories: <strong>${calories}</strong> kcal (approx).`;
    logActivity(`BMI calculated: ${bmi} (${category})`);
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    document.getElementById('heightInput').value = '';
    document.getElementById('weightInput').value = '';
    document.getElementById('bmiResult').textContent = '';
  });
}

/* ============================================================
   Symptom checker (simulated)
   ============================================================ */
function initSymptomChecker() {
  const btn = document.getElementById('checkSymptom');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const s = document.getElementById('symptomSel').value;
    const box = document.getElementById('symptomAdvice');
    if (!s) {
      if (box) box.textContent = 'Choose a symptom to get simulated advice.';
      return;
    }
    let txt = '';
    switch (s) {
      case 'Headache':
        txt = 'Headache → consider hydration, eye breaks, and rest; if severe or persistent, consult a doctor.';
        break;
      case 'Fatigue':
        txt = 'Fatigue → ensure 7–8 hrs sleep, balanced diet; consider checking iron levels if persistent.';
        break;
      case 'Cough':
        txt = 'Cough → rest, fluids, monitor for fever; seek care if breathing difficulty.';
        break;
      case 'Stomach ache':
        txt = 'Stomach ache → try bland foods and rest; see a clinician if severe or prolonged.';
        break;
      case 'Back pain':
        txt = 'Back pain → gentle stretches and posture correction; seek physiotherapy if ongoing.';
        break;
      default:
        txt = 'No advice available for that symptom in demo.';
    }
    if (box) box.textContent = txt;
    logActivity('Symptom checked: ' + s);
  });
}

/* ============================================================
   Motivational quotes rotation
   ============================================================ */
const QUOTES = [
  "Health is the greatest wealth.",
  "Consistency beats intensity.",
  "Small daily habits lead to big changes.",
  "Take care of your body — it’s the only place you have to live.",
  "A short walk is better than no walk.",
  "Sleep, hydrate, move — repeat."
];

function initQuotes() {
  const quoteEl = document.getElementById('quoteText');
  const newQuoteBtn = document.getElementById('newQuote');
  if (!quoteEl) return;
  // daily rotating default
  quoteEl.textContent = QUOTES[new Date().getDate() % QUOTES.length];
  if (newQuoteBtn) newQuoteBtn.addEventListener('click', () => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteEl.textContent = q;
    logActivity('Quote refreshed');
  });
}

/* ============================================================
   Add Log quick action (console-like prompt for demo)
   ============================================================ */
function initAddLogQuick() {
  const addLogBtn = document.getElementById('addLogBtn');
  if (!addLogBtn) return;
  addLogBtn.addEventListener('click', () => {
    const type = prompt('Add log type (steps/sleep/water):', 'steps');
    if (!type) return;
    if (type === 'steps') {
      const v = parseInt(prompt('Enter steps number:', '3500') || '0', 10);
      Storage.set('stepsToday', v);
      // update charts if present (put into Sunday slot)
      if (stepsChart) {
        const dayIndex = (new Date()).getDay() - 1;
        const idx = dayIndex >= 0 ? dayIndex : 6;
        stepsChart.data.datasets[0].data[idx] = v;
        stepsChart.update();
      }
      renderInsights();
      logActivity('Steps set to ' + v);
    } else if (type === 'sleep') {
      const v = parseFloat(prompt('Hours of sleep:', '6.5') || '0');
      Storage.set('lastSleep', v);
      renderInsights();
      logActivity('Sleep set to ' + v);
    } else if (type === 'water') {
      const v = parseInt(prompt('Number of glasses:', '3') || '0', 10);
      Storage.set('waterCount', v);
      renderInsights();
      updateHydrationProgressUI();
      logActivity('Water set to ' + v);
    } else {
      alert('Unknown type');
    }
  });
}

/* ============================================================
   Small periodic updates (simulate heartbeat, charts random walk)
   ============================================================ */
function startPeriodicSimulations() {
  // update insights every minute
  setInterval(renderInsights, 60 * 1000);

  // simulate steps chart random updates
  setInterval(() => {
    if (!stepsChart) return;
    const idx = new Date().getDay() - 1; // 0-6
    if (idx < 0) return;
    const delta = Math.round((Math.random() - 0.4) * 1000);
    stepsChart.data.datasets[0].data[idx] = Math.max(0, (stepsChart.data.datasets[0].data[idx] || 2000) + delta);
    stepsChart.update();
  }, 45 * 1000);
}

/* ============================================================
   PWA: register service worker if present
   ============================================================ */
function tryRegisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('Service worker registered', reg);
      logActivity('Service worker registered (if available)');
    }).catch(err => {
      console.warn('Service worker register failed', err);
    });
  }
}

/* ============================================================
   Hydration / initial demo state loading
   ============================================================ */
function bootstrapDemoData() {
  if (!Storage.get('hasDemo')) {
    Storage.set('stepsToday', 3200);
    Storage.set('lastSleep', 6.2);
    Storage.set('waterCount', 2);
    Storage.set('challengeHydration', 3);
    Storage.set('moodLogs', [{ mood: 'Neutral', note: 'Busy day', when: nowStr() }]);
    Storage.set('hasDemo', true);
    logActivity('Demo data loaded');
  } else {
    logActivity('App opened');
  }
}

/* ============================================================
   Hydration progress UI refresh
   ============================================================ */
function updateHydrationProgress() {
  updateHydrationProgressUI();
}

/* ============================================================
   Rendering helpers
   ============================================================ */
function renderRecentLogsAndUI() {
  renderRecentLogs();
  renderMoodList();
  renderInsights();
  updateHydrationProgressUI();
}

/* ============================================================
   Symptom checker keyboard shortcut & accessibility tweaks
   ============================================================ */
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && e.ctrlKey) {
      const tools = document.getElementById('tools');
      if (tools) {
        // show tools section
        document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
        tools.style.display = 'block';
        const sel = document.getElementById('symptomSel');
        if (sel) sel.focus();
      }
    }
  });
}

/* ============================================================
   Virtual DOM-ready init that wires everything up
   ============================================================ */
function initApp() {
  initNavigation();
  initChecklist();
  initNewsletter();
  initMoodLogging();
  initCharts();
  renderInsights();
  initHeartbeatSimulation();
  initQuotes();
  initBMICalculator();
  initSymptomChecker();
  initChallengeButtons();
  initAddLogQuick();
  initShortcuts();
  startPeriodicSimulations();
  bootstrapDemoData();
  renderRecentLogsAndUI();

  // wire breath buttons
  const startB = document.getElementById('startBreath');
  const stopB = document.getElementById('stopBreath');
  const startB2 = document.getElementById('startBreath2');
  const stopB2 = document.getElementById('stopBreath2');
  if (startB) startB.addEventListener('click', () => startBreathing(60, 'breathingCtl'));
  if (stopB) stopB.addEventListener('click', stopBreathing);
  if (startB2) startB2.addEventListener('click', () => startBreathing(60, 'breathingCtl', 'breathingProgress'));
  if (stopB2) stopB2.addEventListener('click', stopBreathing);

  // water reminders UI
  const startRemBtn = document.getElementById('startRemBtn');
  const stopRemBtn = document.getElementById('stopRemBtn');
  if (startRemBtn) startRemBtn.addEventListener('click', startWaterReminders);
  if (stopRemBtn) stopRemBtn.addEventListener('click', stopWaterReminders);

  // try to register service worker (if you add service-worker.js)
  tryRegisterServiceWorker();

  // accessibility: role attributes
  document.querySelectorAll('button').forEach(b => b.setAttribute('role', 'button'));
}

/* ============================================================
   Small polyfills / safe startup
   ============================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
