const LAB_KEY = 'hindi_script_lab_v2';
const GHOST_KEY = 'hindi_ghost_transliteration_v1';
const DEFAULT_LAB_STATE = {
    supportStage: 0,
    correctStreak: 0,
    sessionCorrect: 0,
    sessionTotal: 0,
    focusCount: 0,
    confusions: {}
};
const SUPPORT_LABELS = ['Guided', 'Fading', 'Independent'];
const COMMON_CONFUSIONS = [
    ['क', 'ख'], ['ग', 'घ'], ['च', 'छ'], ['ज', 'झ'], ['ट', 'ठ'], ['ड', 'ढ'],
    ['त', 'थ'], ['द', 'ध'], ['ब', 'व'], ['प', 'फ'], ['स', 'श']
];
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function sample(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }
export function loadScriptLabState() {
    try {
        const raw = localStorage.getItem(LAB_KEY);
        return raw ? { ...DEFAULT_LAB_STATE, ...JSON.parse(raw) } : { ...DEFAULT_LAB_STATE };
    }
    catch {
        return { ...DEFAULT_LAB_STATE };
    }
}
function saveLabState(state) {
    localStorage.setItem(LAB_KEY, JSON.stringify(state));
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
    }
    else {
        state.correctStreak = 0;
        state.supportStage = Math.max(0, state.supportStage - 1);
    }
    saveLabState(state);
}
function registerConfusion(state, expected, picked) {
    const key = `${expected}→${picked}`;
    state.confusions[key] = (state.confusions[key] || 0) + 1;
}
function bestConfusion(state) {
    const entries = Object.entries(state.confusions).sort((a, b) => b[1] - a[1]);
    if (!entries.length)
        return null;
    const [key, value] = entries[0];
    const [expected, picked] = key.split('→');
    return { expected, picked, value };
}
function maybeAddConfusionOptions(alphabet, target) {
    const pair = COMMON_CONFUSIONS.find(([a, b]) => a === target.character || b === target.character);
    if (!pair)
        return [];
    return alphabet.filter(entry => pair.includes(entry.character) && entry.character !== target.character);
}
function supportLabel(stage) {
    return SUPPORT_LABELS[Math.max(0, Math.min(stage, SUPPORT_LABELS.length - 1))];
}
function supportsHidden(stage) {
    return stage >= 1;
}
export function getScriptLabAccuracy(state = loadScriptLabState()) {
    return state.sessionTotal ? Math.round((state.sessionCorrect / state.sessionTotal) * 100) : 0;
}
export function getGhostMode() {
    const raw = localStorage.getItem(GHOST_KEY);
    return raw === 'off' || raw === 'full' ? raw : 'ghost';
}
export function setGhostMode(mode) {
    localStorage.setItem(GHOST_KEY, mode);
    document.body.setAttribute('data-ghost-transliteration', mode);
}
export function applyGhostModeFromStorage() {
    document.body.setAttribute('data-ghost-transliteration', getGhostMode());
}
export function resetScriptLabState() {
    saveLabState({ ...DEFAULT_LAB_STATE });
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
            render(container, onDone) {
                container.innerHTML = `
                  <div class="script-lab-focus"><strong>Focus drill:</strong> You often mix up <strong>${focus.expected}</strong> and <strong>${focus.picked}</strong>.</div>
                  <div class="script-lab-card">
                    <div class="script-lab-prompt">Confusion drill</div>
                    <div class="script-lab-subtarget">${target.transliteration}</div>
                    <div class="script-lab-choice-grid">
                      ${options.map(opt => `<button class="script-lab-choice" data-char="${opt.character}"><span class="big">${opt.character}</span><span class="small">${state.supportStage === 0 ? opt.transliteration : ''}</span></button>`).join('')}
                    </div>
                    <div class="script-lab-feedback" id="script-lab-feedback"></div>
                  </div>`;
                const feedback = container.querySelector('#script-lab-feedback');
                container.querySelectorAll('.script-lab-choice').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const ok = btn.dataset.char === target.character;
                        if (!ok)
                            registerConfusion(state, target.character, btn.dataset.char || '');
                        registerResult(state, ok);
                        feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
                        feedback.textContent = ok ? 'Correct. Good recovery.' : `Correct answer: ${target.character} — ${target.transliteration}`;
                        if (ok)
                            state.focusCount = 0;
                        saveLabState(state);
                        setTimeout(onDone, 900);
                    });
                });
            }
        };
    }
    state.focusCount = 0;
    saveLabState(state);
    const builders = [
        () => {
            const target = sample(data.alphabet, 1)[0];
            return {
                render(container, onDone) {
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
                      </div>`;
                    container.querySelector('#script-lab-reveal')?.addEventListener('click', () => container.querySelector('.script-lab-ghost')?.classList.remove('is-hidden'));
                    container.querySelector('#script-lab-audio')?.addEventListener('click', () => opts.playHindi(target.character));
                    const input = container.querySelector('#script-lab-input');
                    const feedback = container.querySelector('#script-lab-feedback');
                    const check = () => {
                        const ok = input.value.trim().toLowerCase() === String(target.transliteration).trim().toLowerCase();
                        registerResult(state, ok);
                        feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
                        feedback.textContent = ok ? 'Correct. Your decoding is getting faster.' : `Not yet. Correct answer: ${target.transliteration}`;
                        setTimeout(onDone, 900);
                    };
                    container.querySelector('#script-lab-check')?.addEventListener('click', check);
                    input.addEventListener('keydown', ev => { if (ev.key === 'Enter')
                        check(); });
                    input.focus();
                }
            };
        },
        () => {
            const target = sample(data.alphabet, 1)[0];
            const distractors = sample([
                ...maybeAddConfusionOptions(data.alphabet, target),
                ...data.alphabet.filter(a => a.character !== target.character)
            ].filter((entry, idx, arr) => arr.findIndex(x => x.character === entry.character) === idx), 3);
            const options = shuffle([target, ...distractors]).slice(0, 4);
            return {
                render(container, onDone) {
                    container.innerHTML = `
                      <div class="script-lab-card">
                        <div class="script-lab-prompt">Sound → Script</div>
                        <div class="script-lab-subtarget">${target.transliteration}</div>
                        <div class="script-lab-ghost ${supportsHidden(state.supportStage) ? 'is-hidden' : ''}">Choose the correct character.</div>
                        <div class="script-lab-choice-grid">
                          ${options.map(opt => `<button class="script-lab-choice" data-char="${opt.character}"><span class="big">${opt.character}</span><span class="small">${state.supportStage === 0 ? opt.transliteration : ''}</span></button>`).join('')}
                        </div>
                        <div class="script-lab-actions"><button class="script-lab-audio" id="script-lab-audio">Play sound</button></div>
                        <div class="script-lab-feedback" id="script-lab-feedback"></div>
                      </div>`;
                    container.querySelector('#script-lab-audio')?.addEventListener('click', () => opts.playHindi(target.character));
                    const feedback = container.querySelector('#script-lab-feedback');
                    container.querySelectorAll('.script-lab-choice').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const ok = btn.dataset.char === target.character;
                            if (!ok)
                                registerConfusion(state, target.character, btn.dataset.char || '');
                            registerResult(state, ok);
                            feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
                            feedback.textContent = ok ? 'Correct. Good symbol recognition.' : `Correct answer: ${target.character} — ${target.transliteration}`;
                            setTimeout(onDone, 900);
                        });
                    });
                }
            };
        },
        () => {
            const entry = sample(data.phrases, 1)[0];
            const distractors = sample(data.phrases.filter(v => v.id !== entry.id), 3);
            const options = shuffle([entry, ...distractors]).slice(0, 4);
            return {
                render(container, onDone) {
                    container.innerHTML = `
                      <div class="script-lab-card">
                        <div class="script-lab-prompt">Script → Meaning</div>
                        <div class="script-lab-target script-word">${entry.hindi}</div>
                        <div class="script-lab-ghost ${supportsHidden(state.supportStage) ? 'is-hidden' : ''}">${entry.transliteration}</div>
                        <div class="script-lab-choice-grid">
                          ${options.map(opt => `<button class="script-lab-choice" data-id="${opt.id}"><span class="small">${opt.english}</span></button>`).join('')}
                        </div>
                        <div class="script-lab-actions">
                          <button class="script-lab-audio" id="script-lab-audio">Play phrase</button>
                          <button class="script-lab-reveal" id="script-lab-reveal">Reveal transliteration</button>
                        </div>
                        <div class="script-lab-feedback" id="script-lab-feedback"></div>
                      </div>`;
                    container.querySelector('#script-lab-audio')?.addEventListener('click', () => opts.playHindi(entry.hindi));
                    container.querySelector('#script-lab-reveal')?.addEventListener('click', () => container.querySelector('.script-lab-ghost')?.classList.remove('is-hidden'));
                    const feedback = container.querySelector('#script-lab-feedback');
                    container.querySelectorAll('.script-lab-choice').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const ok = btn.dataset.id === entry.id;
                            registerResult(state, ok);
                            feedback.className = `script-lab-feedback ${ok ? 'good' : 'bad'}`;
                            feedback.textContent = ok ? 'Correct. You are linking script directly to meaning.' : `Correct meaning: ${entry.english}`;
                            setTimeout(onDone, 1000);
                        });
                    });
                }
            };
        }
    ];
    return builders[Math.floor(Math.random() * builders.length)]();
}
let opts;
export function renderScriptLab(container, alphabet, vocab, options) {
    opts = options;
    const data = {
        alphabet,
        phrases: vocab.filter(v => ['phrases', 'questions', 'sentences'].includes(v.category))
    };
    const state = loadScriptLabState();
    const focus = bestConfusion(state);
    container.innerHTML = `
      <div class="script-lab-shell">
        <div class="script-lab-header">
          <div>
            <div class="script-lab-kicker">Devanagari Studio</div>
            <h2 class="script-lab-title">Script Lab</h2>
            <p class="script-lab-subtitle">${focus ? `Most common confusion: ${focus.expected} vs ${focus.picked}` : 'Train script recognition, transliteration, and direct meaning without leaving vocabulary study.'}</p>
          </div>
          <div class="script-lab-stage">Support level: ${supportLabel(state.supportStage)}</div>
        </div>
        <div class="script-lab-metrics">
          <div class="script-lab-metric"><span class="script-lab-metric-label">Session</span><span class="script-lab-metric-value">${state.sessionCorrect}/${state.sessionTotal || 0}</span></div>
          <div class="script-lab-metric"><span class="script-lab-metric-label">Accuracy</span><span class="script-lab-metric-value">${getScriptLabAccuracy(state)}%</span></div>
          <div class="script-lab-metric"><span class="script-lab-metric-label">Support</span><span class="script-lab-metric-value">${supportLabel(state.supportStage)}</span></div>
          <div class="script-lab-metric"><span class="script-lab-metric-label">Streak</span><span class="script-lab-metric-value">${state.correctStreak}</span></div>
        </div>
        <div class="script-lab-toolbar">
          <div class="script-lab-toggle-row">
            <button type="button" class="script-lab-toggle ${getGhostMode() === 'ghost' ? 'is-primary' : ''}" data-ghost="ghost">Ghost transliteration</button>
            <button type="button" class="script-lab-toggle ${getGhostMode() === 'off' ? 'is-primary' : ''}" data-ghost="off">Hide transliteration</button>
            <button type="button" class="script-lab-toggle ${getGhostMode() === 'full' ? 'is-primary' : ''}" data-ghost="full">Show transliteration</button>
          </div>
          <div class="script-lab-toggle-row">
            <button type="button" class="script-lab-btn" id="script-lab-reset">Reset Script Lab stats</button>
            <button type="button" class="script-lab-btn" id="script-lab-exit">Back to study modes</button>
          </div>
        </div>
        <div id="script-lab-exercise"></div>
        <div class="script-lab-footer-note">Read first, reveal only when needed, and let support fade over time.</div>
      </div>`;
    container.querySelectorAll('.script-lab-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            setGhostMode(btn.dataset.ghost || 'ghost');
            renderScriptLab(container, alphabet, vocab, options);
        });
    });
    container.querySelector('#script-lab-reset')?.addEventListener('click', () => {
        resetScriptLabState();
        renderScriptLab(container, alphabet, vocab, options);
    });
    container.querySelector('#script-lab-exit')?.addEventListener('click', options.onExit);
    const exercise = chooseExercise(data, state);
    const exerciseHost = container.querySelector('#script-lab-exercise');
    exercise.render(exerciseHost, () => {
        renderScriptLab(container, alphabet, vocab, options);
    });
}
