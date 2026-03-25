import { setupPracticeArea, showPracticeEntry, bindPracticeCallbacks } from './components/practiceArea.js';
import { setupControls, bindControlCallbacks } from './components/controls.js';
import { bindAnswerInput } from './components/practiceArea.js';
import { renderAlphabet, renderMemoryGrid } from './components/alphabetDisplay.js';
import { playAudio, playHindi } from './utils/audioPlayer.js';
import createModal from './components/modal.js';
import { createNewCard, updateSm2, isDue } from './utils/sm2.js';
import { renderGrammarTab } from './components/grammarModule.js';
const SRS_STORAGE_KEY = 'hindi_app_srs_v1';
const VOCAB_SRS_KEY = 'hindi_vocab_srs_v2';
const STREAK_KEY = 'hindi_vocab_streak_v1';
const MEMORY_BEST_KEY = 'hindi_app_memory_best_v1';
let appState = { alphabet: [], srs: {}, vocab: [], vocabSrs: {} };
let activeTab = 'vocab';
let activeMode = 'flashcard';
let activeCategory = 'all';
let vocabQueue = [];
let vocabIndex = 0;
let cardFlipped = false;
let alphabetQueue = [];
let alphabetIndex = -1;
let _memoryHandlerAttached = false;
const CATEGORIES = [
    { key: 'greetings', label: 'Greetings' },
    { key: 'numbers', label: 'Numbers' },
    { key: 'colors', label: 'Colors' },
    { key: 'family', label: 'Family' },
    { key: 'body', label: 'Body' },
    { key: 'food', label: 'Food' },
    { key: 'drinks_fruits', label: 'Drinks & Fruits' },
    { key: 'animals', label: 'Animals' },
    { key: 'nature', label: 'Nature' },
    { key: 'home', label: 'Home' },
    { key: 'clothing', label: 'Clothing' },
    { key: 'verbs', label: 'Verbs' },
    { key: 'time', label: 'Time' },
    { key: 'places', label: 'Places & Travel' },
    { key: 'weather', label: 'Weather' },
    { key: 'emotions', label: 'Emotions' },
    { key: 'school_work', label: 'School & Work' },
    { key: 'transport', label: 'Transport' },
    { key: 'sports', label: 'Sports & Leisure' },
    { key: 'adjectives', label: 'Adjectives' },
    { key: 'personal_care', label: 'Personal Care' },
    { key: 'technology', label: 'Technology' },
    { key: 'sentences', label: 'Sentences' },
    { key: 'questions', label: 'Questions' },
    { key: 'phrases', label: 'Phrases' },
];
function saveSrs() {
    try {
        localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(appState.srs));
    }
    catch (e) {
        console.warn('Unable to save alphabet SRS', e);
    }
}
function loadSrs() {
    try {
        const raw = localStorage.getItem(SRS_STORAGE_KEY);
        appState.srs = raw ? JSON.parse(raw) : {};
    }
    catch (e) {
        console.warn('Unable to load alphabet SRS', e);
        appState.srs = {};
    }
}
function saveVocabSrs() {
    try {
        localStorage.setItem(VOCAB_SRS_KEY, JSON.stringify(appState.vocabSrs));
    }
    catch (e) {
        console.warn('Unable to save vocab SRS', e);
    }
}
function loadVocabSrs() {
    try {
        const raw = localStorage.getItem(VOCAB_SRS_KEY);
        appState.vocabSrs = raw ? JSON.parse(raw) : {};
    }
    catch (e) {
        console.warn('Unable to load vocab SRS', e);
        appState.vocabSrs = {};
    }
}
function loadStreak() {
    try {
        const raw = localStorage.getItem(STREAK_KEY);
        if (!raw)
            return { lastStudyDate: '', streak: 0 };
        const parsed = JSON.parse(raw);
        return {
            lastStudyDate: parsed.lastStudyDate || '',
            streak: Number.isFinite(parsed.streak) ? parsed.streak : 0
        };
    }
    catch {
        return { lastStudyDate: '', streak: 0 };
    }
}
function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const state = loadStreak();
    if (state.lastStudyDate === today) {
        return;
    }
    let streak = 1;
    if (state.lastStudyDate) {
        const last = new Date(state.lastStudyDate);
        const now = new Date(today);
        const diff = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1)
            streak = state.streak + 1;
        else if (diff === 0)
            streak = state.streak;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastStudyDate: today, streak }));
}
function setTab(tab) {
    activeTab = tab;
    renderApp();
}
function buildVocabQueue() {
    const pool = activeCategory === 'all'
        ? appState.vocab
        : appState.vocab.filter(v => v.category === activeCategory);
    for (const entry of pool) {
        if (!appState.vocabSrs[entry.id]) {
            appState.vocabSrs[entry.id] = createNewCard();
        }
    }
    saveVocabSrs();
    const due = pool.filter(entry => isDue(appState.vocabSrs[entry.id]));
    const later = pool.filter(entry => !isDue(appState.vocabSrs[entry.id]));
    due.sort((a, b) => appState.vocabSrs[a.id].dueDate.localeCompare(appState.vocabSrs[b.id].dueDate));
    later.sort((a, b) => appState.vocabSrs[a.id].dueDate.localeCompare(appState.vocabSrs[b.id].dueDate));
    vocabQueue = [...due, ...later];
    vocabIndex = Math.min(vocabIndex, Math.max(vocabQueue.length - 1, 0));
}
function getDueCount() {
    return appState.vocab.filter(v => isDue(appState.vocabSrs[v.id] || createNewCard())).length;
}
function getMasteredCount() {
    return appState.vocab.filter(v => (appState.vocabSrs[v.id]?.interval || 0) >= 21).length;
}
function renderApp() {
    const app = document.getElementById('app');
    if (!app)
        return;
    app.className = 'app-shell max-w-6xl mx-auto px-6 py-8';
    app.innerHTML = `
        <div class="tab-bar" role="tablist" aria-label="App sections">
            <button class="tab ${activeTab === 'vocab' ? 'active' : ''}" data-tab="vocab">Vocabulary</button>
            <button class="tab ${activeTab === 'alphabet' ? 'active' : ''}" data-tab="alphabet">Alphabet</button>
            <button class="tab ${activeTab === 'grammar' ? 'active' : ''}" data-tab="grammar">Grammar</button>
            <button class="tab ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Dashboard</button>
        </div>
        <div id="tab-content"></div>
    `;
    app.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });
    const content = document.getElementById('tab-content');
    if (!content)
        return;
    if (activeTab === 'vocab')
        renderVocabTab(content);
    if (activeTab === 'alphabet')
        renderAlphabetTab(content);
    if (activeTab === 'grammar')
        void renderGrammarTab(content);
    if (activeTab === 'dashboard')
        renderDashboardTab(content);
}
function renderVocabTab(container) {
    buildVocabQueue();
    const current = vocabQueue[vocabIndex];
    const mastered = getMasteredCount();
    const dueCount = getDueCount();
    container.innerHTML = `
        <section class="panel gradient-card">
            <h1 class="hero-title">Hindi Vocabulary Trainer</h1>
            <p class="hero-subtitle">SM-2 spaced repetition — Flashcards, Multiple Choice and Typing.</p>
        </section>
        <div class="category-pills-container" id="category-pills"></div>
        <div class="mode-selector" id="mode-selector">
            <button class="mode-btn ${activeMode === 'flashcard' ? 'active' : ''}" data-mode="flashcard">Flashcard</button>
            <button class="mode-btn ${activeMode === 'multiple-choice' ? 'active' : ''}" data-mode="multiple-choice">Multiple Choice</button>
            <button class="mode-btn ${activeMode === 'typing' ? 'active' : ''}" data-mode="typing">Typing</button>
        </div>
        <div class="queue-stats"><span>Due today: <strong>${dueCount}</strong></span><span>Queue: <strong>${vocabQueue.length}</strong></span></div>
        <div id="vocab-card-area" class="vocab-card-area"></div>
        <div class="progress-section">
            <div class="progress-label"><span>Progress</span><span>${mastered} / ${appState.vocab.length}</span></div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(mastered / Math.max(1, appState.vocab.length)) * 100}%"></div></div>
        </div>
    `;
    const pills = document.getElementById('category-pills');
    if (pills) {
        const allBtn = `<button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">All</button>`;
        const categoryBtns = CATEGORIES.map(cat => `<button class="category-pill ${activeCategory === cat.key ? 'active' : ''}" data-category="${cat.key}">${cat.label}</button>`).join('');
        pills.innerHTML = allBtn + categoryBtns;
        pills.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = btn.dataset.category || 'all';
                vocabIndex = 0;
                cardFlipped = false;
                buildVocabQueue();
                renderVocabTab(container);
            });
        });
    }
    container.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeMode = btn.dataset.mode;
            cardFlipped = false;
            renderVocabTab(container);
        });
    });
    const area = document.getElementById('vocab-card-area');
    if (!area)
        return;
    if (!current) {
        area.innerHTML = '<div class="vocab-empty">No cards here yet. Pick another category or choose “All” to keep practicing.</div>';
        return;
    }
    renderVocabCard(area, current);
}
function renderVocabCard(cardArea, entry) {
    if (activeMode === 'flashcard')
        renderFlashcard(cardArea, entry);
    if (activeMode === 'multiple-choice')
        renderMultipleChoice(cardArea, entry);
    if (activeMode === 'typing')
        renderTypingCard(cardArea, entry);
}
function renderFlashcard(cardArea, entry) {
    if (!cardFlipped) {
        cardArea.innerHTML = `
            <div class="vocab-card">
                <div class="flashcard-category">${entry.category}</div>
                <div class="flashcard-english">${entry.english}</div>
                <div class="flashcard-hint">Think of the Hindi word.</div>
                <button class="flip-btn" id="flip-btn">Reveal</button>
            </div>
        `;
        document.getElementById('flip-btn')?.addEventListener('click', () => {
            cardFlipped = true;
            renderFlashcard(cardArea, entry);
        });
        return;
    }
    const srsCard = appState.vocabSrs[entry.id];
    const nextReviewDays = srsCard ? srsCard.interval : 1;
    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-english">${entry.english}</div>
            <div class="flashcard-hindi">${entry.hindi}</div>
            <div class="flashcard-translit">${entry.transliteration}</div>
            <button class="play-hindi-btn" data-hindi="${entry.hindi}" title="Listen to pronunciation">🔊 Listen</button>
            <div class="rating-row">
                <button class="rating-btn rating-1" data-quality="0">1 – Again</button>
                <button class="rating-btn rating-2" data-quality="2">2 – Hard</button>
                <button class="rating-btn rating-3" data-quality="3">3 – Good</button>
                <button class="rating-btn rating-4" data-quality="4">4 – Easy</button>
                <button class="rating-btn rating-5" data-quality="5">5 – Perfect</button>
            </div>
            <div class="next-review-hint">Next review: ${nextReviewDays === 1 ? 'tomorrow' : `in ${nextReviewDays} days`}</div>
        </div>
    `;
    cardArea.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', () => submitVocabAnswer(entry, Number(btn.dataset.quality || 0)));
    });
    cardArea.querySelector('.play-hindi-btn')?.addEventListener('click', () => {
        playHindi(entry.hindi);
    });
}
function pickDistractors(entry) {
    const sameCat = appState.vocab.filter(v => v.id !== entry.id && v.category === entry.category);
    const other = appState.vocab.filter(v => v.id !== entry.id && v.category !== entry.category);
    const takeRandom = (arr, count) => [...arr].sort(() => Math.random() - 0.5).slice(0, count);
    const distractors = takeRandom(sameCat, 3);
    if (distractors.length < 3) {
        distractors.push(...takeRandom(other, 3 - distractors.length));
    }
    return distractors.slice(0, 3);
}
function renderMultipleChoice(cardArea, entry) {
    const options = [entry, ...pickDistractors(entry)].sort(() => Math.random() - 0.5);
    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-english">${entry.english}</div>
            <div class="mc-grid">
                ${options.map((opt, idx) => `
                    <button class="mc-option" data-id="${opt.id}" data-index="${idx}">
                        <div class="mc-hindi">${opt.hindi}</div>
                        <div class="mc-translit">${opt.transliteration}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    let answered = false;
    cardArea.querySelectorAll('.mc-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (answered)
                return;
            answered = true;
            const isCorrect = btn.dataset.id === entry.id;
            cardArea.querySelectorAll('.mc-option').forEach(option => {
                option.disabled = true;
                if (option.dataset.id === entry.id)
                    option.classList.add('correct');
                else if (option === btn)
                    option.classList.add('incorrect');
            });
            setTimeout(() => submitVocabAnswer(entry, isCorrect ? 5 : 0), 1500);
        });
    });
}
function renderTypingCard(cardArea, entry) {
    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-english">${entry.english}</div>
            <div class="typing-hint">${entry.hindi}</div>
            <div class="typing-instruction">Type the transliteration (Latin letters). <button class="play-hindi-btn-inline" data-hindi="${entry.hindi}" title="Listen">🔊</button></div>
            <div class="typing-input-row">
                <input id="typing-input" class="typing-input" placeholder="e.g. namaste" />
                <button id="typing-submit" class="typing-submit">Check</button>
            </div>
            <div id="typing-feedback" class="typing-feedback"></div>
        </div>
    `;
    const input = document.getElementById('typing-input');
    const submit = document.getElementById('typing-submit');
    const feedback = document.getElementById('typing-feedback');
    if (!input || !submit || !feedback)
        return;
    cardArea.querySelector('.play-hindi-btn-inline')?.addEventListener('click', () => {
        playHindi(entry.hindi);
    });
    let checked = false;
    let answerCorrect = false;
    const runCheck = () => {
        if (checked)
            return;
        checked = true;
        const typed = input.value.trim().toLowerCase();
        answerCorrect = typed === entry.transliteration.trim().toLowerCase();
        feedback.className = `typing-feedback ${answerCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
        feedback.textContent = answerCorrect
            ? 'Correct — nice work.'
            : `Not yet. Compare your answer with “${entry.transliteration}”, then tap Next.`;
        input.disabled = true;
        submit.textContent = 'Next';
    };
    submit.addEventListener('click', () => {
        if (!checked) {
            runCheck();
            return;
        }
        submitVocabAnswer(entry, answerCorrect ? 4 : 1);
    });
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            submit.click();
        }
    });
}
function submitVocabAnswer(entry, quality) {
    appState.vocabSrs[entry.id] = updateSm2(appState.vocabSrs[entry.id] || createNewCard(), quality);
    saveVocabSrs();
    updateStreak();
    vocabIndex++;
    if (vocabIndex >= vocabQueue.length)
        vocabIndex = 0;
    cardFlipped = false;
    const content = document.getElementById('tab-content');
    if (content)
        renderVocabTab(content);
}
function renderAlphabetTab(container) {
    _memoryHandlerAttached = false;
    const totalChars = appState.alphabet.length || 0;
    const masteredCount = Object.values(appState.srs).filter(s => (s?.mastery_level ?? 0) >= 7).length;
    const bestScore = loadBestMemoryScore();
    container.innerHTML = `
        <div class="layout-grid">
            <section class="panel hero-panel gradient-card">
                <div class="eyebrow">Devanagari Studio</div>
                <h1 class="hero-title">नमस्ते! Learn Hindi Alphabets</h1>
                <p class="hero-subtitle">Audio, SRS and Memory Mode for Devanagari practice.</p>
                <div class="hero-stats">
                    <div class="hero-stat"><span>Letters loaded</span><strong>${totalChars || '…'}</strong></div>
                    <div class="hero-stat"><span>Mastered (lvl ≥ 7)</span><strong>${masteredCount || 0}</strong></div>
                    <div class="hero-stat"><span>Best memory</span><strong>${bestScore ?? '—'}</strong></div>
                </div>
            </section>
            <section class="panel controls-panel">
                <div class="panel-heading"><h2>Session controls</h2></div>
                <div id="controls-container" class="mb-4"></div>
            </section>
            <section class="panel practice-panel">
                <div class="panel-heading"><h2>Spaced repetition</h2></div>
                <div id="practice-container" class="mb-6"></div>
            </section>
            <section class="panel alphabet-panel">
                <div class="panel-heading"><h2>Alphabet deck</h2></div>
                <div id="alphabet-container" class="alphabet-grid"></div>
            </section>
        </div>
    `;
    setupControls('controls-container');
    setupPracticeArea('practice-container');
    renderAlphabet('alphabet-container', appState.alphabet);
    attachAlphabetClickListeners();
    bindAlphabetUI();
    buildPracticeQueue();
    alphabetIndex = -1;
    advanceToNext();
}
function renderDashboardTab(container) {
    const streak = loadStreak().streak;
    const due = getDueCount();
    const mastered = getMasteredCount();
    const total = appState.vocab.length;
    const rows = CATEGORIES.map(category => {
        const words = appState.vocab.filter(v => v.category === category.key);
        const m = words.filter(v => (appState.vocabSrs[v.id]?.interval || 0) >= 21).length;
        const pct = words.length ? (m / words.length) * 100 : 0;
        return `
            <div class="cat-progress-row">
                <div class="cat-progress-label"><span>${category.label}</span><span class="cat-progress-count">${m}/${words.length}</span></div>
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            </div>
        `;
    }).join('');
    container.innerHTML = `
        <section class="dashboard-tab">
            <div class="dash-stats-row">
                <div class="dash-stat"><div class="dash-stat-icon">🔥</div><div class="dash-stat-value">${streak}</div><div class="dash-stat-label">Streak</div></div>
                <div class="dash-stat"><div class="dash-stat-icon">📅</div><div class="dash-stat-value">${due}</div><div class="dash-stat-label">Due today</div></div>
                <div class="dash-stat"><div class="dash-stat-icon">📚</div><div class="dash-stat-value">${mastered}</div><div class="dash-stat-label">Mastered</div></div>
                <div class="dash-stat"><div class="dash-stat-icon">📈</div><div class="dash-stat-value">${total}</div><div class="dash-stat-label">Total</div></div>
            </div>
            <div class="cat-progress-section">
                <div class="cat-progress-title">Category Progress</div>
                ${rows}
            </div>
        </section>
    `;
}
function attachAlphabetClickListeners() {
    const alphabetContainer = document.getElementById('alphabet-container');
    if (!alphabetContainer)
        return;
    alphabetContainer.querySelectorAll('.alphabet-char').forEach(charElement => {
        charElement.addEventListener('click', () => {
            const audioPath = charElement.dataset.audio;
            if (audioPath)
                playAudio(audioPath);
        });
    });
}
function buildPracticeQueue() {
    const withScores = appState.alphabet.map(a => {
        const record = appState.srs[a.character];
        const score = record ? record.mastery_level : 0;
        return { a, score };
    });
    withScores.sort((x, y) => x.score - y.score);
    alphabetQueue = withScores.map(ws => ws.a);
    alphabetIndex = -1;
}
function ensurePracticeQueue() {
    if (!appState.alphabet.length) {
        showToast('Alphabet is still loading. Wait a moment, then try again.');
        return false;
    }
    if (!alphabetQueue.length)
        buildPracticeQueue();
    if (!alphabetQueue.length) {
        showPracticeEntry(null);
        showToast('No practice cards found. Refresh the page to reload your deck.');
        return false;
    }
    return true;
}
function advanceToNext() {
    if (!ensurePracticeQueue())
        return;
    alphabetIndex += 1;
    if (alphabetIndex >= alphabetQueue.length) {
        showPracticeEntry(null);
        showToast('Great session — you reached the end. Tap Start Practice to run another round.');
        return;
    }
    const entry = alphabetQueue[alphabetIndex];
    showPracticeEntry({ character: entry.character, transliteration: entry.transliteration, audio_path: entry.audio_path });
}
function markKnown() {
    if (!ensurePracticeQueue())
        return;
    const entry = alphabetQueue[alphabetIndex];
    const key = entry.character;
    const rec = appState.srs[key] || { mastery_level: 0, due_date: null };
    rec.mastery_level = Math.min(10, rec.mastery_level + 1);
    rec.due_date = new Date(Date.now() + rec.mastery_level * 24 * 60 * 60 * 1000).toISOString();
    appState.srs[key] = rec;
    saveSrs();
    showToast('Nice work. Moving to the next card.');
    advanceToNext();
}
function markUnknown() {
    if (!ensurePracticeQueue())
        return;
    const entry = alphabetQueue[alphabetIndex];
    const key = entry.character;
    const rec = appState.srs[key] || { mastery_level: 0, due_date: null };
    rec.mastery_level = 0;
    rec.due_date = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
    appState.srs[key] = rec;
    saveSrs();
    alphabetQueue.splice(alphabetIndex, 1);
    alphabetQueue.push(entry, { ...entry });
    alphabetIndex = Math.max(-1, alphabetIndex - 1);
    if (entry.audio_path)
        playAudio(entry.audio_path);
    import('./components/practiceArea.js').then(mod => mod.flashIncorrect?.()).catch(() => undefined);
    advanceToNext();
}
function shuffleQueue() {
    for (let i = alphabetQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphabetQueue[i], alphabetQueue[j]] = [alphabetQueue[j], alphabetQueue[i]];
    }
    alphabetIndex = -1;
    advanceToNext();
}
function exportSrs() {
    const blob = new Blob([JSON.stringify(appState.srs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'srs_export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function bindAlphabetUI() {
    const startPractice = () => {
        if (!appState.alphabet.length) {
            showToast('Alphabet is still loading. Wait a moment, then tap Start Practice again.');
            return;
        }
        buildPracticeQueue();
        alphabetIndex = -1;
        advanceToNext();
        showToast('Practice started. Type your answer or use audio for a hint.');
    };
    bindControlCallbacks(startPractice, () => {
        const sel = document.getElementById('pair-count');
        const pc = sel ? parseInt(sel.value, 10) : 8;
        startMemoryMode(pc);
    }, shuffleQueue, exportSrs);
    const newMemBtn = document.getElementById('new-memory');
    if (newMemBtn) {
        newMemBtn.addEventListener('click', () => {
            const sel = document.getElementById('pair-count');
            const pc = sel ? parseInt(sel.value, 10) : 8;
            const modal = createModal();
            modal.show('New memory', `<p>Start a new memory game with ${pc} pairs?</p>`);
            setTimeout(() => newMemoryGame(pc), 300);
        });
    }
    bindPracticeCallbacks((audioPath) => {
        if (audioPath)
            playAudio(audioPath);
    }, markKnown, markUnknown);
    bindAnswerInput((typed) => {
        if (!ensurePracticeQueue())
            return;
        const entry = alphabetQueue[alphabetIndex];
        if (!entry)
            return;
        const guess = typed.trim().toLowerCase();
        const target = entry.transliteration.trim().toLowerCase();
        const translitEl = document.getElementById('practice-translit');
        if (translitEl)
            translitEl.textContent = entry.transliteration || '';
        if (guess === target) {
            showToast('Correct. Keep going!');
            markKnown();
        }
        else {
            showToast(`Not yet. Expected: ${entry.transliteration}. Listen once, then try the next card.`);
            markUnknown();
        }
    });
}
const MEMORY_CONTAINER_ID = 'alphabet-container';
function renderNewMemory(pairCount = 8) {
    renderMemoryGrid(MEMORY_CONTAINER_ID, appState.alphabet, pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    const state = container ? container._memoryState : null;
    if (state)
        state.attempts = 0;
}
function ensureMemoryHandler(container) {
    if (_memoryHandlerAttached)
        return;
    container.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.memory-tile');
        if (!btn)
            return;
        const idx = parseInt(btn.getAttribute('data-game-idx') || '-1', 10);
        const state = container._memoryState;
        if (!state || state.lock || idx < 0)
            return;
        const tileInfo = state.pairs[idx];
        if (!tileInfo || tileInfo.matched)
            return;
        btn.classList.add('revealed');
        tileInfo.revealed = true;
        const revealed = state.pairs.map((p, i) => ({ p, i })).filter((x) => x.p.revealed && !x.p.matched);
        if (revealed.length !== 2)
            return;
        state.lock = true;
        state.attempts += 1;
        const [a, b] = revealed;
        const btnA = container.querySelector(`[data-game-idx='${a.i}']`);
        const btnB = container.querySelector(`[data-game-idx='${b.i}']`);
        if (a.p.pairId === b.p.pairId) {
            a.p.matched = true;
            b.p.matched = true;
            btnA?.classList.add('matched');
            btnB?.classList.add('matched');
            state.lock = false;
            if (state.pairs.every((p) => p.matched)) {
                setTimeout(() => {
                    createModal().show('Well done!', `<p>Memory complete in ${state.attempts} attempts!</p>`);
                    updateBestMemoryScore(state.attempts);
                }, 200);
            }
        }
        else {
            setTimeout(() => {
                btnA?.classList.remove('revealed');
                btnB?.classList.remove('revealed');
                a.p.revealed = false;
                b.p.revealed = false;
                state.lock = false;
            }, 800);
        }
    });
    _memoryHandlerAttached = true;
}
function startMemoryMode(pairCount = 8) {
    if (!appState.alphabet.length) {
        showToast('Alphabet is still loading. Wait a moment, then try Memory again.');
        return;
    }
    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container)
        return;
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ensureMemoryHandler(container);
}
function newMemoryGame(pairCount = 8) {
    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container)
        return;
    ensureMemoryHandler(container);
    container.querySelectorAll('.memory-tile').forEach(el => el.classList.remove('matched', 'revealed'));
    showToast('New memory game is ready.');
}
function showToast(message, duration = 2500) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow-lg';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast?.classList.remove('visible'), duration);
}
function loadBestMemoryScore() {
    try {
        const v = localStorage.getItem(MEMORY_BEST_KEY);
        return v ? parseInt(v, 10) : null;
    }
    catch {
        return null;
    }
}
function updateBestMemoryScore(attempts) {
    const best = loadBestMemoryScore();
    if (best === null || attempts < best) {
        localStorage.setItem(MEMORY_BEST_KEY, String(attempts));
    }
}
async function hydrateData() {
    try {
        loadSrs();
        loadVocabSrs();
        const [alphabetRes, vocabRes] = await Promise.all([
            fetch('data/alphabets.json'),
            fetch('data/vocabulary.json')
        ]);
        if (!alphabetRes.ok || !vocabRes.ok) {
            throw new Error(`Load failed: alphabets ${alphabetRes.status}, vocab ${vocabRes.status}`);
        }
        const [alphabetData, vocabData] = await Promise.all([
            alphabetRes.json(),
            vocabRes.json()
        ]);
        appState.alphabet = alphabetData;
        appState.vocab = vocabData;
        for (const entry of alphabetData) {
            if (!appState.srs[entry.character]) {
                appState.srs[entry.character] = { mastery_level: 0, due_date: null };
            }
        }
        for (const entry of vocabData) {
            if (!appState.vocabSrs[entry.id]) {
                appState.vocabSrs[entry.id] = createNewCard();
            }
        }
        saveSrs();
        saveVocabSrs();
        buildVocabQueue();
        renderApp();
        showOnboarding();
    }
    catch (error) {
        console.error('Failed to hydrate data', error);
        showToast('We couldn’t load your study data. Refresh the page. If this keeps happening, check your connection and try again.');
    }
}
function showOnboarding() {
    const ONBOARDED_KEY = 'hindi_onboarded_v1';
    if (localStorage.getItem(ONBOARDED_KEY))
        return;
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
        <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <div class="onboarding-emoji">🇮🇳</div>
            <h1 id="onboarding-title" class="onboarding-title">Learn to read, hear, and use beginner Hindi in daily situations.</h1>
            <p class="onboarding-body">
                Follow short daily practice to build Devanagari reading, core vocabulary, and simple sentence patterns — even if you’re starting from zero.
            </p>
            <div class="onboarding-steps">
                <div class="onboarding-step"><span class="step-icon">🔤</span><div><strong>Alphabet tab</strong> — Learn Devanagari script with audio &amp; spaced repetition</div></div>
                <div class="onboarding-step"><span class="step-icon">📚</span><div><strong>Vocabulary tab</strong> — 500+ words with flashcards, multiple-choice &amp; typing</div></div>
                <div class="onboarding-step"><span class="step-icon">📖</span><div><strong>Grammar tab</strong> — 12 interactive lessons from sentence structure to past &amp; future tense</div></div>
                <div class="onboarding-step"><span class="step-icon">🔊</span><div><strong>Audio</strong> — Tap any 🔊 button to hear native Hindi pronunciation</div></div>
            </div>
            <p class="onboarding-tip">💡 <em>Tip: Do 10–15 minutes daily. Reviews are auto-scheduled so you remember more with less effort.</em></p>
            <button id="onboarding-start" class="onboarding-btn">Start first session</button>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('onboarding-start')?.addEventListener('click', () => {
        localStorage.setItem(ONBOARDED_KEY, '1');
        overlay.remove();
    });
}
document.addEventListener('DOMContentLoaded', () => {
    void hydrateData();
});
document.addEventListener('mouseover', (e) => {
    const tile = e.target?.closest('.alphabet-char');
    if (!tile)
        return;
    const translit = tile.querySelector('.translit');
    const cover = tile.querySelector('.cover');
    if (translit)
        translit.style.opacity = '1';
    if (cover)
        cover.style.opacity = '0';
});
document.addEventListener('mouseout', (e) => {
    const tile = e.target?.closest('.alphabet-char');
    if (!tile)
        return;
    const translit = tile.querySelector('.translit');
    const cover = tile.querySelector('.cover');
    if (translit)
        translit.style.opacity = '0';
    if (cover)
        cover.style.opacity = '1';
});
document.addEventListener('focusin', (e) => {
    const tile = e.target?.closest('.alphabet-char');
    if (!tile)
        return;
    const translit = tile.querySelector('.translit');
    const cover = tile.querySelector('.cover');
    if (translit)
        translit.style.opacity = '1';
    if (cover)
        cover.style.opacity = '0';
});
document.addEventListener('focusout', (e) => {
    const tile = e.target?.closest('.alphabet-char');
    if (!tile)
        return;
    const translit = tile.querySelector('.translit');
    const cover = tile.querySelector('.cover');
    if (translit)
        translit.style.opacity = '0';
    if (cover)
        cover.style.opacity = '1';
});
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (!active)
        return;
    if (active.classList.contains('alphabet-char') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const audio = active.dataset.audio;
        if (audio)
            playAudio(audio);
    }
    if ((e.key === 'Enter' || e.key === ' ') && active.classList.contains('memory-tile')) {
        e.preventDefault();
        active.click();
    }
});
console.log('main.ts script loaded.');
