// Elements
const input = document.getElementById('secondsInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const permBtn = document.getElementById('permBtn');
const display = document.getElementById('display');

// State
let totalSeconds = 0;
let remaining = 0;
let intervalId = null;
let running = false;

// AudioContext handling
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(e => console.warn('resume failed', e));
}

function prettyBeep(duration = 240, frequency = 900, volume = 0.12) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = frequency;
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration/1000);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + duration/1000 + 0.02);
  } catch (err) {
    console.warn('prettyBeep error:', err);
  }
}

function formatTime(s) {
  s = Math.max(0, Math.floor(s));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function updateDisplay() { display.textContent = formatTime(remaining); }

function notifyFinish() {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification('Timer finished', { body: 'Your timer has completed.' });
      setTimeout(() => n.close(), 6000);
    } catch (e) { console.warn('Notification failed:', e); }
  } else {
    try { alert('Timer finished'); } catch(e) { /* ignore */ }
  }

  // play alert
  prettyBeep(220, 1100, 0.12);
  setTimeout(()=>prettyBeep(180, 1000, 0.11), 260);
  setTimeout(()=>prettyBeep(160, 900, 0.10), 500);
}

function startCountdown() {
  // ensure audio context is created/resumed from this user gesture
  ensureAudioContext();

  if (running) return;
  const val = parseInt(input.value, 10);
  if (!Number.isInteger(val) || val <= 0) { alert('Please enter a positive number of seconds.'); return; }
  totalSeconds = val; remaining = val; updateDisplay();

  intervalId = setInterval(() => {
    remaining -= 1; updateDisplay();
    if (remaining <= 0) {
      clearInterval(intervalId); intervalId = null; running = false; updateButtons(); notifyFinish();
    }
  }, 1000);

  running = true; updateButtons();
}

function pauseCountdown() { if (!running) return; clearInterval(intervalId); intervalId = null; running = false; updateButtons(); }
function resetCountdown() { clearInterval(intervalId); intervalId = null; running = false; remaining = totalSeconds || 0; updateDisplay(); updateButtons(); }

function updateButtons(){ startBtn.textContent = running ? 'Running...' : 'Start'; startBtn.disabled = running; pauseBtn.disabled = !running; resetBtn.disabled = running === false && (remaining === 0 || remaining === totalSeconds); }

startBtn.addEventListener('click', startCountdown);
pauseBtn.addEventListener('click', pauseCountdown);
resetBtn.addEventListener('click', resetCountdown);

permBtn.addEventListener('click', () => {
  ensureAudioContext();
  if (!('Notification' in window)) return alert('Notifications are not supported in your browser.');
  Notification.requestPermission().then(p => { alert('Notification permission: ' + p); });
});

updateDisplay(); updateButtons();

// suspend audio when hidden for better battery
document.addEventListener('visibilitychange', () => { if (document.hidden && audioCtx && audioCtx.state === 'running') audioCtx.suspend(); });
