const SCRIPT_MODE = 'script-lab';
const MODE_KEY = 'hindi_ui_mode';
const LAB_KEY = 'hindi_script_lab_v1';
const GHOST_KEY = 'hindi_ghost_transliteration_v1';

const DEFAULT_LAB_STATE = {
  supportStage: 0,
  correctStreak: 0,
  sessionCorrect: 0,
  sessionTotal: 0,
  focusPair: null,
  focusCount: 0,
  confusions: {}
};

const SUPPORT_LABELS = ['Guided', 'Fading', 'Independent'];

const COMMON_CONFUSIONS = [
  ['क', 'ख'],
  ['ग', 'घ'],
  ['च', 'छ'],
  ['ज', 'झ'],
  ['ट', 'ठ'],
  ['ड', 'ढ'],
  ['त', 'थ'],
  ['द', 'ध'],
  ['ब', 'व'],
  ['प', 'फ'],
  ['स', 'श']
];

let cachedData = null;

function loadLabState() {
  try {
    const raw = localStorage.getItem(LAB_KEY);
    return raw ? { ...DEFAULT_LAB_STATE, ...JSON.parse(raw) } : { ...DEFAULT_LAB_STATE };
  } catch {
    return { ...DEFAULT_LAB_STATE };
  }
}

function saveLabState(state) {
  localStorage.setItem(LAB_KEY, JSON.stringify(state));
}

function currentMode() {
  return localStorage.getItem(MODE_KEY) || 'flashcard';
}

function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent('scriptlab:modechange', { detail: mode }));
}

function ghostMode() {
  return localStorage.getItem(GHOST_KEY) || 'ghost';
}

function setGhostMode(value) {
  localStorage.setItem(GHOST_KEY, value);
  document.body.setAttribute('data-ghost-transliteration', value);
}

async function loadScriptData() {
  if (cachedData) return cachedData;
  const [alphabetRes, vocabRes] = await Promise.all([
    fetch('data/alphabets.json'),
    fetch('data/vocabulary.json')
  ]);
  const [alphabet, vocabulary] = await Promise.all([alphabetRes.json(), vocabRes.json()]);
  const phrases = vocabulary.filter(v => ['phrases', 'questions', 'sentences'].includes(v.category));
  cachedData = { alphabet, vocabulary, phrases };
  return cachedData;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function sample(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function ensureModeButton(selectorRoot = document) {
  const modeSelector = selectorRoot.querySelector('#mode-selector');
  if (!modeSelector) return;
  if (modeSelector.querySelector('[data-mode="script-lab"]')) return;

  const btn = document.createElement('button');
  btn.className = 'mode-btn';
  btn.dataset.mode = SCRIPT_MODE;
  btn.type = 'button';
  btn.textContent = 'Script Lab';
  btn.setAttribute('aria-pressed', currentMode() === SCRIPT_MODE ? 'true' : 'false');
  btn.addEventListener('click', () => {
    setMode(SCRIPT_MODE);
    renderMaybe();
  });
  modeSelector.appendChild(btn);
  updateModeButtonStyles();
}

function updateModeButtonStyles() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const active = btn.dataset.mode === currentMode();
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function injectQueueStats() {
  const stats = document.querySelector('.queue-stats');
  if (!stats || stats.dataset.enhanced === 'true') return;

  const original = [...stats.querySelectorAll('span')];
  if (original.length < 2) return;
  const due = original[0].innerHTML;
  const reviewed = original[1].innerHTML;
  const streak = (() => {
    try {
      const raw = localStorage.getItem('hindi_vocab_streak_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.streak || 0;
    } catch {
      return 0;
    }
  })();
  const lab = loadLabState();
  const accuracy = lab.sessionTotal ? Math.round((lab.sessionCorrect / lab.sessionTotal) * 100) : 0;

  stats.innerHTML = `
    <span><span>Due today</span><strong>${extractStrongValue(due)}</strong></span>
    <span><span>Reviewed</span><strong>${extractStrongValue(reviewed)}</strong></span>
    <span><span>Streak</span><strong>${streak}</strong></span>
    <span><span>Accuracy</span><strong>${accuracy}%</strong></span>
  `;
  stats.dataset.enhanced = 'true';
}

function extractStrongValue(html) {
  const match = html.match(/<strong>(.*?)<\/strong>/i);
  return match ? match[1] : html.replace(/<[^>]+>/g, '').trim();
}

function ensureGhostToggle() {
  document.body.setAttribute('data-ghost-transliteration', ghostMode());
  const panel = document.querySelector('.vocab-controls-panel');
  if (!panel || panel.querySelector('.script-lab-toggle-row')) return;

  const row = document.createElement('div');
  row.className = 'script-lab-toggle-row';
  row.innerHTML = `
    <button type="button" class="script-lab-toggle" data-ghost="ghost">Ghost transliteration</button>
    <button type="button" class="script-lab-toggle" data-ghost="off">Hide transliteration</button>
    <button type="button" class="script-lab-toggle" data-ghost="full">Show transliteration</button>
  `;
  row.querySelectorAll('[data-ghost]').forEach(btn => {
    btn.addEventListener('click', () => {
      setGhostMode(btn.dataset.ghost);
      ensureGhostToggleState();
    });
  });
  panel.appendChild(row);
  ensureGhostToggleState();
}

function ensureGhostToggleState() {
  const current = ghostMode();
  document.body.setAttribute('data-ghost-transliteration', current);
  document.querySelectorAll('.script-lab-toggle').forEach(btn => {
    btn.classList.toggle('is-primary', btn.dataset.ghost === current);
  });
}

function registerConfusion(state, expected, picked) {
  const key = `${expected}→${picked}`;
  state.confusions[key] = (state.confusions[key] || 0) + 1;
}

function bestConfusion(state) {
  const entries = Object.entries(state.confusions || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [key, value] = entries[0];
  const [expected, picked] = key.split('→');
  return { expected, picked, value };
}

function registerResult(state, ok) {
  state.sessionTotal += 1;
  if (ok) {
    state.sessionCorrect += 1;
    state.correctStreak += 1;
    if (state.correctStreak >= 5 && state.supportStage < 2) {
      state.supportStage += 1;
      state.correctStreak = 0;
    }
  } else {
    state.correctStreak = 0;
    if (state.supportStage > 0) state.supportStage -= 1;
  }
  saveLabState(state);
}

function supportLabel(stage) {
  return SUPPORT_LABELS[Math.max(0, Math.min(stage, SUPPORT_LABELS.length - 1))];
}

function supportsHidden(stage) {
  return stage >= 1;
}

function maybeAddConfusionOptions(alphabet, target) {
  const pair = COMMON_CONFUSIONS.find(([a, b]) => a === target.character || b === target.character);
  if (!pair) return [];
  return alphabet.filter(entry => pair.includes(entry.character) && entry.character !== target.character);
}

function buildDecodeExercise(data, state) {
  const target = sample(data.alphabet, 1)[0];
  return {
    render(container) {
      container.innerHTML = `
        <div class="script-lab-card">
          <div class="script-lab-prompt">Decode</div>
          <div class="script-lab-target">${target.character}</div>
          <div class="script-lab-ghost ${supportsHidden(state.supportStage) ? 'is-hidden' : ''}">${target.transliteration}</div>
          <input class="script-lab-input" id="script-lab-input" placeholder="Type transliteration" autocomplete="off" />
          <div class="script-lab-actions">
            <button class="script-lab-btn is-primary" id="script-lab-check">Check</button>
            <button class="script-lab-reveal" id="script-lab-reveal">Reveal</button>
            <button class="script-lab-audio" id="script-lab-audio">Play audio</button>
          </div>
          <div class="script-lab-feedback" id="script-lab-feedback"></div>
        </div>
      `;
      container.querySelector('#script-lab-reveal').addEventListener('click', () => {
        container.querySelector('.script-lab-ghost').classList.remove('is-hidden');
      });
      container.querySelector('#script-lab-audio').addEventListener('click', () => speakHindi(target.character));
      const input = container.querySelector('#script-lab-input');
      const feedback = container.querySelector('#script-lab-feedback');
      const check = () => {
        const value = input.value.trim().toLowerCase();
        const ok = value === String(target.transliteration).trim().toLowerCase();
        feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
        feedback.textContent = ok ? 'Correct. Your decoding is getting faster.' : `Not yet. Correct answer: ${target.transliteration}`;
        registerResult(state, ok);
        saveLabState(state);
        setTimeout(renderMaybe, 950);
      };
      container.querySelector('#script-lab-check').addEventListener('click', check);
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') check();
      });
    }
  };
}

function buildChoiceExercise(data, state) {
  const target = sample(data.alphabet, 1)[0];
  const distractors = sample([
    ...maybeAddConfusionOptions(data.alphabet, target),
    ...data.alphabet.filter(a => a.character !== target.character)
  ].filter((entry, idx, arr) => arr.findIndex(x => x.character === entry.character) === idx), 3);
  const options = shuffle([target, ...distractors]).slice(0, 4);

  return {
    render(container) {
      container.innerHTML = `
        <div class="script-lab-card">
          <div class="script-lab-prompt">Sound → Script</div>
          <div class="script-lab-subtarget">${target.transliteration}</div>
          <div class="script-lab-ghost ${supportsHidden(state.supportStage) ? 'is-hidden' : ''}">Choose the correct character.</div>
          <div class="script-lab-choice-grid">
            ${options.map(opt => `
              <button class="script-lab-choice" data-char="${opt.character}" data-translit="${opt.transliteration}">
                <span class="big">${opt.character}</span>
                <span class="small">${state.supportStage === 0 ? opt.transliteration : ''}</span>
              </button>
            `).join('')}
          </div>
          <div class="script-lab-actions">
            <button class="script-lab-audio" id="script-lab-audio">Play sound</button>
          </div>
          <div class="script-lab-feedback" id="script-lab-feedback"></div>
        </div>
      `;
      container.querySelector('#script-lab-audio').addEventListener('click', () => speakHindi(target.character));
      const feedback = container.querySelector('#script-lab-feedback');
      container.querySelectorAll('.script-lab-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const ok = btn.dataset.char === target.character;
          if (!ok) registerConfusion(state, target.character, btn.dataset.char);
          registerResult(state, ok);
          feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
          feedback.textContent = ok ? 'Correct. Good symbol recognition.' : `That was ${btn.dataset.char}. Correct answer: ${target.character} — ${target.transliteration}`;
          saveLabState(state);
          setTimeout(renderMaybe, 1000);
        });
      });
    }
  };
}

function buildWordBridgeExercise(data, state) {
  const entry = sample(data.phrases, 1)[0];
  const distractors = sample(data.phrases.filter(v => v.id !== entry.id), 3);
  const options = shuffle([entry, ...distractors]).slice(0, 4);

  return {
    render(container) {
      container.innerHTML = `
        <div class="script-lab-card">
          <div class="script-lab-prompt">Script → Meaning</div>
          <div class="script-lab-target" style="font-size:clamp(2rem,5vw,3rem)">${entry.hindi}</div>
          <div class="script-lab-ghost ${supportsHidden(state.supportStage) ? 'is-hidden' : ''}">${entry.transliteration}</div>
          <div class="script-lab-choice-grid">
            ${options.map(opt => `
              <button class="script-lab-choice" data-id="${opt.id}">
                <span class="small" style="font-size:0.95rem;color:#0f172a">${opt.english}</span>
              </button>
            `).join('')}
          </div>
          <div class="script-lab-actions">
            <button class="script-lab-audio" id="script-lab-audio">Play phrase</button>
            <button class="script-lab-reveal" id="script-lab-reveal">Reveal transliteration</button>
          </div>
          <div class="script-lab-feedback" id="script-lab-feedback"></div>
        </div>
      `;
      container.querySelector('#script-lab-audio').addEventListener('click', () => speakHindi(entry.hindi));
      container.querySelector('#script-lab-reveal').addEventListener('click', () => {
        container.querySelector('.script-lab-ghost').classList.remove('is-hidden');
      });
      const feedback = container.querySelector('#script-lab-feedback');
      container.querySelectorAll('.script-lab-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const ok = btn.dataset.id === entry.id;
          registerResult(state, ok);
          feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
          feedback.textContent = ok ? 'Correct. You are linking script directly to meaning.' : `Correct meaning: ${entry.english}`;
          saveLabState(state);
          setTimeout(renderMaybe, 1100);
        });
      });
    }
  };
}

function chooseExercise(data, state) {
  const focus = bestConfusion(state);
  if (focus && state.focusCount < 2) {
    state.focusCount += 1;
    saveLabState(state);
    const target = data.alphabet.find(a => a.character === focus.expected) || sample(data.alphabet, 1)[0];
    const wrong = data.alphabet.find(a => a.character === focus.picked);
    const others = sample(data.alphabet.filter(a => a.character !== target.character && (!wrong || a.character !== wrong.character)), 2);
    const options = shuffle([target, wrong, ...others].filter(Boolean)).slice(0, 4);
    return {
      render(container) {
        container.innerHTML = `
          <div class="script-lab-focus">
            <strong>Focus drill:</strong> you often mix up <strong>${focus.expected}</strong> and <strong>${focus.picked}</strong>. Let's fix that now.
          </div>
          <div class="script-lab-card">
            <div class="script-lab-prompt">Confusion drill</div>
            <div class="script-lab-subtarget">${target.transliteration}</div>
            <div class="script-lab-choice-grid">
              ${options.map(opt => `
                <button class="script-lab-choice" data-char="${opt.character}">
                  <span class="big">${opt.character}</span>
                  <span class="small">${state.supportStage === 0 ? opt.transliteration : ''}</span>
                </button>
              `).join('')}
            </div>
            <div class="script-lab-feedback" id="script-lab-feedback"></div>
          </div>
        `;
        const feedback = container.querySelector('#script-lab-feedback');
        container.querySelectorAll('.script-lab-choice').forEach(btn => {
          btn.addEventListener('click', () => {
            const ok = btn.dataset.char === target.character;
            if (!ok) registerConfusion(state, target.character, btn.dataset.char);
            registerResult(state, ok);
            feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
            feedback.textContent = ok ? 'Correct. Good recovery.' : `Correct answer: ${target.character} — ${target.transliteration}`;
            if (ok) state.focusCount = 0;
            saveLabState(state);
            setTimeout(renderMaybe, 900);
          });
        });
      }
    };
  }

  state.focusCount = 0;
  saveLabState(state);

  const pool = [buildDecodeExercise, buildChoiceExercise, buildWordBridgeExercise];
  return pool[Math.floor(Math.random() * pool.length)](data, state);
}

function accuracy(state) {
  return state.sessionTotal ? Math.round((state.sessionCorrect / state.sessionTotal) * 100) : 0;
}

function renderHeader(container, state, focus) {
  const focusCopy = focus
    ? `Most common confusion: ${focus.expected} vs ${focus.picked}`
    : 'Train script recognition, transliteration, and direct meaning.';
  container.innerHTML = `
    <div class="script-lab-shell">
      <div class="script-lab-header">
        <div>
          <div class="script-lab-kicker">Devanagari Studio</div>
          <h2 class="script-lab-title">Script Lab</h2>
          <p class="script-lab-subtitle">${focusCopy}</p>
        </div>
        <div class="script-lab-stage">Support level: ${supportLabel(state.supportStage)}</div>
      </div>
      <div class="script-lab-metrics">
        <div class="script-lab-metric"><span class="script-lab-metric-label">Session</span><span class="script-lab-metric-value">${state.sessionCorrect}/${state.sessionTotal || 0}</span></div>
        <div class="script-lab-metric"><span class="script-lab-metric-label">Accuracy</span><span class="script-lab-metric-value">${accuracy(state)}%</span></div>
        <div class="script-lab-metric"><span class="script-lab-metric-label">Support</span><span class="script-lab-metric-value">${supportLabel(state.supportStage)}</span></div>
        <div class="script-lab-metric"><span class="script-lab-metric-label">Streak</span><span class="script-lab-metric-value">${state.correctStreak}</span></div>
      </div>
      <div class="script-lab-toolbar">
        <div class="script-lab-toggle-row">
          <button type="button" class="script-lab-toggle ${ghostMode() === 'ghost' ? 'is-primary' : ''}" data-ghost="ghost">Ghost transliteration</button>
          <button type="button" class="script-lab-toggle ${ghostMode() === 'off' ? 'is-primary' : ''}" data-ghost="off">Hide transliteration</button>
          <button type="button" class="script-lab-toggle ${ghostMode() === 'full' ? 'is-primary' : ''}" data-ghost="full">Show transliteration</button>
        </div>
        <button type="button" class="script-lab-btn" id="script-lab-reset">Reset Script Lab stats</button>
      </div>
      <div id="script-lab-exercise"></div>
      <div class="script-lab-footer-note">Best practice: try to read first, reveal only when needed, and let the support level fade as you improve.</div>
    </div>
  `;

  container.querySelectorAll('.script-lab-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      setGhostMode(btn.dataset.ghost);
      renderMaybe();
    });
  });
  container.querySelector('#script-lab-reset').addEventListener('click', () => {
    localStorage.setItem(LAB_KEY, JSON.stringify(DEFAULT_LAB_STATE));
    renderMaybe();
  });
}

async function renderScriptLab(cardArea) {
  const data = await loadScriptData();
  const state = loadLabState();
  const focus = bestConfusion(state);
  renderHeader(cardArea, state, focus);
  const exercise = chooseExercise(data, state);
  const target = cardArea.querySelector('#script-lab-exercise');
  exercise.render(target);
}

function speakHindi(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {}
}

function renderMaybe() {
  updateModeButtonStyles();
  injectQueueStats();
  ensureGhostToggle();
  const area = document.querySelector('#vocab-card-area');
  if (!area) return;
  if (currentMode() !== SCRIPT_MODE) return;
  renderScriptLab(area).catch(() => {
    area.innerHTML = '<div class="vocab-empty">Script Lab could not load right now. Refresh once and try again.</div>';
  });
}

function observe() {
  const app = document.querySelector('#app');
  if (!app) return;
  const observer = new MutationObserver(() => {
    ensureModeButton(document);
    renderMaybe();
  });
  observer.observe(app, { childList: true, subtree: true });
}

function syncClickedMode() {
  document.addEventListener('click', event => {
    const btn = event.target.closest('.mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (!mode) return;
    setMode(mode);
    if (mode === SCRIPT_MODE) setTimeout(renderMaybe, 0);
  });
}

function bootEnhancements() {
  setGhostMode(ghostMode());
  ensureModeButton(document);
  injectQueueStats();
  ensureGhostToggle();
  syncClickedMode();
  observe();
  window.addEventListener('scriptlab:modechange', renderMaybe);
  renderMaybe();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootEnhancements);
} else {
  bootEnhancements();
}