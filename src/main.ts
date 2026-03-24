import { setupPracticeArea, showPracticeEntry, bindPracticeCallbacks, PracticeDisplayEntry } from './components/practiceArea.js';
import { setupControls, bindControlCallbacks } from './components/controls.js';
import { bindAnswerInput } from './components/practiceArea.js';
import { renderAlphabet, renderMemoryGrid, AlphabetEntry } from './components/alphabetDisplay.js';
import { playAudio } from './utils/audioPlayer.js';
import createModal from './components/modal.js';
import { createNewCard, updateSm2, isDue, SrsCard } from './utils/sm2.js';

type TabId = 'vocab' | 'alphabet' | 'dashboard';
type QuizMode = 'flashcard' | 'multiple-choice' | 'typing';

interface VocabEntry {
    id: string;
    hindi: string;
    transliteration: string;
    german: string;
    category: string;
}

type AlphabetSrsRecord = { mastery_level: number; due_date: string | null };
interface AppState {
    alphabet: AlphabetEntry[];
    srs: Record<string, AlphabetSrsRecord>;
    vocab: VocabEntry[];
    vocabSrs: Record<string, SrsCard>;
}

interface StreakData {
    lastStudyDate: string;
    streak: number;
}

const SRS_STORAGE_KEY = 'hindi_app_srs_v1';
const VOCAB_SRS_KEY = 'hindi_vocab_srs_v2';
const STREAK_KEY = 'hindi_vocab_streak_v1';
const MEMORY_BEST_KEY = 'hindi_app_memory_best_v1';

let appState: AppState = { alphabet: [], srs: {}, vocab: [], vocabSrs: {} };
let activeTab: TabId = 'vocab';
let activeMode: QuizMode = 'flashcard';
let activeCategory = 'all';
let vocabQueue: VocabEntry[] = [];
let vocabIndex = 0;
let cardFlipped = false;

let alphabetQueue: AlphabetEntry[] = [];
let alphabetIndex = -1;
let _memoryHandlerAttached = false;

const CATEGORIES = [
    { key: 'greetings', label: 'Begrüßungen' },
    { key: 'numbers', label: 'Zahlen' },
    { key: 'colors', label: 'Farben' },
    { key: 'family', label: 'Familie' },
    { key: 'body', label: 'Körper' },
    { key: 'food', label: 'Essen' },
    { key: 'drinks_fruits', label: 'Getränke & Früchte' },
    { key: 'animals', label: 'Tiere' },
    { key: 'nature', label: 'Natur' },
    { key: 'home', label: 'Zuhause' },
    { key: 'clothing', label: 'Kleidung' },
    { key: 'verbs', label: 'Verben' },
    { key: 'time', label: 'Zeit' },
    { key: 'places', label: 'Orte & Reisen' },
    { key: 'weather', label: 'Wetter' },
    { key: 'emotions', label: 'Gefühle' },
    { key: 'school_work', label: 'Schule & Arbeit' },
    { key: 'transport', label: 'Transport' },
    { key: 'sports', label: 'Sport & Freizeit' },
    { key: 'adjectives', label: 'Adjektive' },
    { key: 'personal_care', label: 'Körperpflege' },
    { key: 'technology', label: 'Elektronik' }
];

function saveSrs(): void {
    try {
        localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(appState.srs));
    } catch (e) {
        console.warn('Unable to save alphabet SRS', e);
    }
}

function loadSrs(): void {
    try {
        const raw = localStorage.getItem(SRS_STORAGE_KEY);
        appState.srs = raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Unable to load alphabet SRS', e);
        appState.srs = {};
    }
}

function saveVocabSrs(): void {
    try {
        localStorage.setItem(VOCAB_SRS_KEY, JSON.stringify(appState.vocabSrs));
    } catch (e) {
        console.warn('Unable to save vocab SRS', e);
    }
}

function loadVocabSrs(): void {
    try {
        const raw = localStorage.getItem(VOCAB_SRS_KEY);
        appState.vocabSrs = raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Unable to load vocab SRS', e);
        appState.vocabSrs = {};
    }
}

function loadStreak(): StreakData {
    try {
        const raw = localStorage.getItem(STREAK_KEY);
        if (!raw) return { lastStudyDate: '', streak: 0 };
        const parsed = JSON.parse(raw) as Partial<StreakData>;
        return {
            lastStudyDate: parsed.lastStudyDate || '',
            streak: Number.isFinite(parsed.streak) ? (parsed.streak as number) : 0
        };
    } catch {
        return { lastStudyDate: '', streak: 0 };
    }
}

function updateStreak(): void {
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
        if (diff === 1) streak = state.streak + 1;
        else if (diff === 0) streak = state.streak;
    }

    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastStudyDate: today, streak }));
}

function setTab(tab: TabId): void {
    activeTab = tab;
    renderApp();
}

function buildVocabQueue(): void {
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

function getDueCount(): number {
    return appState.vocab.filter(v => isDue(appState.vocabSrs[v.id] || createNewCard())).length;
}

function getMasteredCount(): number {
    return appState.vocab.filter(v => (appState.vocabSrs[v.id]?.interval || 0) >= 21).length;
}

function renderApp(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.className = 'app-shell max-w-6xl mx-auto px-6 py-8';
    app.innerHTML = `
        <div class="tab-bar" role="tablist" aria-label="App sections">
            <button class="tab ${activeTab === 'vocab' ? 'active' : ''}" data-tab="vocab">Vokabeln</button>
            <button class="tab ${activeTab === 'alphabet' ? 'active' : ''}" data-tab="alphabet">Alphabet</button>
            <button class="tab ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Dashboard</button>
        </div>
        <div id="tab-content"></div>
    `;

    app.querySelectorAll<HTMLButtonElement>('.tab').forEach(btn => {
        btn.addEventListener('click', () => setTab(btn.dataset.tab as TabId));
    });

    const content = document.getElementById('tab-content');
    if (!content) return;

    if (activeTab === 'vocab') renderVocabTab(content);
    if (activeTab === 'alphabet') renderAlphabetTab(content);
    if (activeTab === 'dashboard') renderDashboardTab(content);
}

function renderVocabTab(container: HTMLElement): void {
    buildVocabQueue();
    const current = vocabQueue[vocabIndex];
    const mastered = getMasteredCount();
    const dueCount = getDueCount();

    container.innerHTML = `
        <section class="panel gradient-card">
            <h1 class="hero-title">Hindi Vokabeltrainer</h1>
            <p class="hero-subtitle">SM-2 Lernsystem mit Karteikarten, Multiple Choice und Tippen.</p>
        </section>
        <div class="category-pills-container" id="category-pills"></div>
        <div class="mode-selector" id="mode-selector">
            <button class="mode-btn ${activeMode === 'flashcard' ? 'active' : ''}" data-mode="flashcard">Flashcard</button>
            <button class="mode-btn ${activeMode === 'multiple-choice' ? 'active' : ''}" data-mode="multiple-choice">Multiple Choice</button>
            <button class="mode-btn ${activeMode === 'typing' ? 'active' : ''}" data-mode="typing">Tippen</button>
        </div>
        <div class="queue-stats"><span>Fällig heute: <strong>${dueCount}</strong></span><span>Queue: <strong>${vocabQueue.length}</strong></span></div>
        <div id="vocab-card-area" class="vocab-card-area"></div>
        <div class="progress-section">
            <div class="progress-label"><span>Fortschritt</span><span>${mastered} / ${appState.vocab.length}</span></div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(mastered / Math.max(1, appState.vocab.length)) * 100}%"></div></div>
        </div>
    `;

    const pills = document.getElementById('category-pills');
    if (pills) {
        const allBtn = `<button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-category="all">Alle</button>`;
        const categoryBtns = CATEGORIES.map(cat => `<button class="category-pill ${activeCategory === cat.key ? 'active' : ''}" data-category="${cat.key}">${cat.label}</button>`).join('');
        pills.innerHTML = allBtn + categoryBtns;
        pills.querySelectorAll<HTMLButtonElement>('.category-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = btn.dataset.category || 'all';
                vocabIndex = 0;
                cardFlipped = false;
                buildVocabQueue();
                renderVocabTab(container);
            });
        });
    }

    container.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeMode = btn.dataset.mode as QuizMode;
            cardFlipped = false;
            renderVocabTab(container);
        });
    });

    const area = document.getElementById('vocab-card-area');
    if (!area) return;

    if (!current) {
        area.innerHTML = '<div class="vocab-empty">Keine Karten in dieser Kategorie.</div>';
        return;
    }

    renderVocabCard(area, current);
}

function renderVocabCard(cardArea: HTMLElement, entry: VocabEntry): void {
    if (activeMode === 'flashcard') renderFlashcard(cardArea, entry);
    if (activeMode === 'multiple-choice') renderMultipleChoice(cardArea, entry);
    if (activeMode === 'typing') renderTypingCard(cardArea, entry);
}

function renderFlashcard(cardArea: HTMLElement, entry: VocabEntry): void {
    if (!cardFlipped) {
        cardArea.innerHTML = `
            <div class="vocab-card">
                <div class="flashcard-category">${entry.category}</div>
                <div class="flashcard-german">${entry.german}</div>
                <div class="flashcard-hint">Denke an das Hindi-Wort.</div>
                <button class="flip-btn" id="flip-btn">Zeigen</button>
            </div>
        `;
        document.getElementById('flip-btn')?.addEventListener('click', () => {
            cardFlipped = true;
            renderFlashcard(cardArea, entry);
        });
        return;
    }

    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-german">${entry.german}</div>
            <div class="flashcard-hindi">${entry.hindi}</div>
            <div class="flashcard-translit">${entry.transliteration}</div>
            <div class="rating-row">
                <button class="rating-btn rating-1" data-quality="0">1 – Nochmal</button>
                <button class="rating-btn rating-2" data-quality="2">2 – Schwer</button>
                <button class="rating-btn rating-3" data-quality="3">3 – Gut</button>
                <button class="rating-btn rating-4" data-quality="4">4 – Leicht</button>
                <button class="rating-btn rating-5" data-quality="5">5 – Perfekt</button>
            </div>
        </div>
    `;

    cardArea.querySelectorAll<HTMLButtonElement>('.rating-btn').forEach(btn => {
        btn.addEventListener('click', () => submitVocabAnswer(entry, Number(btn.dataset.quality || 0)));
    });
}

function pickDistractors(entry: VocabEntry): VocabEntry[] {
    const sameCat = appState.vocab.filter(v => v.id !== entry.id && v.category === entry.category);
    const other = appState.vocab.filter(v => v.id !== entry.id && v.category !== entry.category);
    const takeRandom = (arr: VocabEntry[], count: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, count);

    const distractors = takeRandom(sameCat, 3);
    if (distractors.length < 3) {
        distractors.push(...takeRandom(other, 3 - distractors.length));
    }
    return distractors.slice(0, 3);
}

function renderMultipleChoice(cardArea: HTMLElement, entry: VocabEntry): void {
    const options = [entry, ...pickDistractors(entry)].sort(() => Math.random() - 0.5);
    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-german">${entry.german}</div>
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
    cardArea.querySelectorAll<HTMLButtonElement>('.mc-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            const isCorrect = btn.dataset.id === entry.id;
            cardArea.querySelectorAll<HTMLButtonElement>('.mc-option').forEach(option => {
                option.disabled = true;
                if (option.dataset.id === entry.id) option.classList.add('correct');
                else if (option === btn) option.classList.add('incorrect');
            });
            setTimeout(() => submitVocabAnswer(entry, isCorrect ? 5 : 0), 1500);
        });
    });
}

function renderTypingCard(cardArea: HTMLElement, entry: VocabEntry): void {
    cardArea.innerHTML = `
        <div class="vocab-card">
            <div class="flashcard-category">${entry.category}</div>
            <div class="flashcard-german">${entry.german}</div>
            <div class="typing-hint">${entry.hindi}</div>
            <div class="typing-instruction">Tippe die Transliteration (lateinisch).</div>
            <div class="typing-input-row">
                <input id="typing-input" class="typing-input" placeholder="z.B. namaste" />
                <button id="typing-submit" class="typing-submit">Prüfen</button>
            </div>
            <div id="typing-feedback" class="typing-feedback"></div>
        </div>
    `;

    const input = document.getElementById('typing-input') as HTMLInputElement | null;
    const submit = document.getElementById('typing-submit') as HTMLButtonElement | null;
    const feedback = document.getElementById('typing-feedback') as HTMLDivElement | null;
    if (!input || !submit || !feedback) return;

    let checked = false;
    let answerCorrect = false;

    const runCheck = () => {
        if (checked) return;
        checked = true;
        const typed = input.value.trim().toLowerCase();
        answerCorrect = typed === entry.transliteration.trim().toLowerCase();
        feedback.className = `typing-feedback ${answerCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
        feedback.textContent = answerCorrect
            ? 'Richtig! Sehr gut.'
            : `Nicht ganz. Richtig ist: ${entry.transliteration}`;
        input.disabled = true;
        submit.textContent = 'Weiter →';
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

function submitVocabAnswer(entry: VocabEntry, quality: number): void {
    appState.vocabSrs[entry.id] = updateSm2(appState.vocabSrs[entry.id] || createNewCard(), quality);
    saveVocabSrs();
    updateStreak();
    vocabIndex++;
    if (vocabIndex >= vocabQueue.length) vocabIndex = 0;
    cardFlipped = false;
    const content = document.getElementById('tab-content');
    if (content) renderVocabTab(content);
}

function renderAlphabetTab(container: HTMLElement): void {
    _memoryHandlerAttached = false;

    const totalChars = appState.alphabet.length || 0;
    const masteredCount = Object.values(appState.srs).filter(s => (s?.mastery_level ?? 0) >= 7).length;
    const bestScore = loadBestMemoryScore();

    container.innerHTML = `
        <div class="layout-grid">
            <section class="panel hero-panel gradient-card">
                <div class="eyebrow">Devanagari Studio</div>
                <h1 class="hero-title">नमस्ते! Learn Hindi Alphabets</h1>
                <p class="hero-subtitle">Audio, SRS und Memory Mode für das Devanagari-Training.</p>
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

function renderDashboardTab(container: HTMLElement): void {
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
                <div class="dash-stat"><div class="dash-stat-icon">📅</div><div class="dash-stat-value">${due}</div><div class="dash-stat-label">Fällig heute</div></div>
                <div class="dash-stat"><div class="dash-stat-icon">📚</div><div class="dash-stat-value">${mastered}</div><div class="dash-stat-label">Gemeistert</div></div>
                <div class="dash-stat"><div class="dash-stat-icon">📈</div><div class="dash-stat-value">${total}</div><div class="dash-stat-label">Gesamt</div></div>
            </div>
            <div class="cat-progress-section">
                <div class="cat-progress-title">Kategorie-Fortschritt</div>
                ${rows}
            </div>
        </section>
    `;
}

function attachAlphabetClickListeners(): void {
    const alphabetContainer = document.getElementById('alphabet-container');
    if (!alphabetContainer) return;

    alphabetContainer.querySelectorAll<HTMLElement>('.alphabet-char').forEach(charElement => {
        charElement.addEventListener('click', () => {
            const audioPath = charElement.dataset.audio;
            if (audioPath) playAudio(audioPath);
        });
    });
}

function buildPracticeQueue(): void {
    const withScores = appState.alphabet.map(a => {
        const record = appState.srs[a.character];
        const score = record ? record.mastery_level : 0;
        return { a, score };
    });

    withScores.sort((x, y) => x.score - y.score);
    alphabetQueue = withScores.map(ws => ws.a);
    alphabetIndex = -1;
}

function ensurePracticeQueue(): boolean {
    if (!appState.alphabet.length) {
        showToast('Alphabet data is still loading. Please wait.');
        return false;
    }
    if (!alphabetQueue.length) buildPracticeQueue();
    if (!alphabetQueue.length) {
        showPracticeEntry(null);
        showToast('No cards to study. Try reloading.');
        return false;
    }
    return true;
}

function advanceToNext(): void {
    if (!ensurePracticeQueue()) return;
    alphabetIndex += 1;
    if (alphabetIndex >= alphabetQueue.length) {
        showPracticeEntry(null);
        showToast('Practice complete! Restart to keep going.');
        return;
    }

    const entry = alphabetQueue[alphabetIndex];
    showPracticeEntry({ character: entry.character, transliteration: entry.transliteration, audio_path: entry.audio_path });
}

function markKnown(): void {
    if (!ensurePracticeQueue()) return;
    const entry = alphabetQueue[alphabetIndex];
    const key = entry.character;
    const rec = appState.srs[key] || { mastery_level: 0, due_date: null };
    rec.mastery_level = Math.min(10, rec.mastery_level + 1);
    rec.due_date = new Date(Date.now() + rec.mastery_level * 24 * 60 * 60 * 1000).toISOString();
    appState.srs[key] = rec;
    saveSrs();
    showToast('Nice! Moving to the next card.');
    advanceToNext();
}

function markUnknown(): void {
    if (!ensurePracticeQueue()) return;
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

    if (entry.audio_path) playAudio(entry.audio_path);
    import('./components/practiceArea.js').then(mod => mod.flashIncorrect?.()).catch(() => undefined);

    advanceToNext();
}

function shuffleQueue(): void {
    for (let i = alphabetQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [alphabetQueue[i], alphabetQueue[j]] = [alphabetQueue[j], alphabetQueue[i]];
    }
    alphabetIndex = -1;
    advanceToNext();
}

function exportSrs(): void {
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

function bindAlphabetUI(): void {
    const startPractice = () => {
        if (!appState.alphabet.length) {
            showToast('Alphabet data is still loading.');
            return;
        }
        buildPracticeQueue();
        alphabetIndex = -1;
        advanceToNext();
        showToast('Practice started!');
    };

    bindControlCallbacks(startPractice, () => {
        const sel = document.getElementById('pair-count') as HTMLSelectElement | null;
        const pc = sel ? parseInt(sel.value, 10) : 8;
        startMemoryMode(pc);
    }, shuffleQueue, exportSrs);

    const newMemBtn = document.getElementById('new-memory');
    if (newMemBtn) {
        newMemBtn.addEventListener('click', () => {
            const sel = document.getElementById('pair-count') as HTMLSelectElement | null;
            const pc = sel ? parseInt(sel.value, 10) : 8;
            const modal = createModal();
            modal.show('New memory', `<p>Start a new memory game with ${pc} pairs?</p>`);
            setTimeout(() => newMemoryGame(pc), 300);
        });
    }

    bindPracticeCallbacks((audioPath) => {
        if (audioPath) playAudio(audioPath);
    }, markKnown, markUnknown);

    bindAnswerInput((typed) => {
        if (!ensurePracticeQueue()) return;
        const entry = alphabetQueue[alphabetIndex];
        if (!entry) return;

        const guess = typed.trim().toLowerCase();
        const target = entry.transliteration.trim().toLowerCase();
        const translitEl = document.getElementById('practice-translit');
        if (translitEl) translitEl.textContent = entry.transliteration || '';

        if (guess === target) {
            showToast('Correct!');
            markKnown();
        } else {
            showToast(`Not quite. Expected: ${entry.transliteration}`);
            markUnknown();
        }
    });
}

const MEMORY_CONTAINER_ID = 'alphabet-container';

function renderNewMemory(pairCount = 8): void {
    renderMemoryGrid(MEMORY_CONTAINER_ID, appState.alphabet, pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    const state = container ? (container as any)._memoryState : null;
    if (state) state.attempts = 0;
}

function ensureMemoryHandler(container: HTMLElement): void {
    if (_memoryHandlerAttached) return;

    container.addEventListener('click', (ev) => {
        const btn = (ev.target as HTMLElement).closest('.memory-tile') as HTMLElement | null;
        if (!btn) return;

        const idx = parseInt(btn.getAttribute('data-game-idx') || '-1', 10);
        const state = (container as any)._memoryState;
        if (!state || state.lock || idx < 0) return;

        const tileInfo = state.pairs[idx];
        if (!tileInfo || tileInfo.matched) return;

        btn.classList.add('revealed');
        tileInfo.revealed = true;

        const revealed = state.pairs.map((p: any, i: number) => ({ p, i })).filter((x: any) => x.p.revealed && !x.p.matched);
        if (revealed.length !== 2) return;

        state.lock = true;
        state.attempts += 1;
        const [a, b] = revealed;
        const btnA = container.querySelector(`[data-game-idx='${a.i}']`) as HTMLElement | null;
        const btnB = container.querySelector(`[data-game-idx='${b.i}']`) as HTMLElement | null;

        if (a.p.pairId === b.p.pairId) {
            a.p.matched = true;
            b.p.matched = true;
            btnA?.classList.add('matched');
            btnB?.classList.add('matched');
            state.lock = false;
            if (state.pairs.every((p: any) => p.matched)) {
                setTimeout(() => {
                    createModal().show('Well done!', `<p>Memory complete in ${state.attempts} attempts!</p>`);
                    updateBestMemoryScore(state.attempts);
                }, 200);
            }
        } else {
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

function startMemoryMode(pairCount = 8): void {
    if (!appState.alphabet.length) {
        showToast('Alphabet data is still loading.');
        return;
    }

    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container) return;
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ensureMemoryHandler(container);
}

function newMemoryGame(pairCount = 8): void {
    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container) return;
    ensureMemoryHandler(container);
    container.querySelectorAll('.memory-tile').forEach(el => el.classList.remove('matched', 'revealed'));
    showToast('New memory game ready');
}

function showToast(message: string, duration = 2500): void {
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

function loadBestMemoryScore(): number | null {
    try {
        const v = localStorage.getItem(MEMORY_BEST_KEY);
        return v ? parseInt(v, 10) : null;
    } catch {
        return null;
    }
}

function updateBestMemoryScore(attempts: number): void {
    const best = loadBestMemoryScore();
    if (best === null || attempts < best) {
        localStorage.setItem(MEMORY_BEST_KEY, String(attempts));
    }
}

async function hydrateData(): Promise<void> {
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
            alphabetRes.json() as Promise<AlphabetEntry[]>,
            vocabRes.json() as Promise<VocabEntry[]>
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
    } catch (error) {
        console.error('Failed to hydrate data', error);
        showToast('Daten konnten nicht geladen werden.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    void hydrateData();
});

document.addEventListener('mouseover', (e) => {
    const tile = (e.target as HTMLElement | null)?.closest('.alphabet-char') as HTMLElement | null;
    if (!tile) return;
    const translit = tile.querySelector('.translit') as HTMLElement | null;
    const cover = tile.querySelector('.cover') as HTMLElement | null;
    if (translit) translit.style.opacity = '1';
    if (cover) cover.style.opacity = '0';
});

document.addEventListener('mouseout', (e) => {
    const tile = (e.target as HTMLElement | null)?.closest('.alphabet-char') as HTMLElement | null;
    if (!tile) return;
    const translit = tile.querySelector('.translit') as HTMLElement | null;
    const cover = tile.querySelector('.cover') as HTMLElement | null;
    if (translit) translit.style.opacity = '0';
    if (cover) cover.style.opacity = '1';
});

document.addEventListener('focusin', (e) => {
    const tile = (e.target as HTMLElement | null)?.closest('.alphabet-char') as HTMLElement | null;
    if (!tile) return;
    const translit = tile.querySelector('.translit') as HTMLElement | null;
    const cover = tile.querySelector('.cover') as HTMLElement | null;
    if (translit) translit.style.opacity = '1';
    if (cover) cover.style.opacity = '0';
});

document.addEventListener('focusout', (e) => {
    const tile = (e.target as HTMLElement | null)?.closest('.alphabet-char') as HTMLElement | null;
    if (!tile) return;
    const translit = tile.querySelector('.translit') as HTMLElement | null;
    const cover = tile.querySelector('.cover') as HTMLElement | null;
    if (translit) translit.style.opacity = '0';
    if (cover) cover.style.opacity = '1';
});

document.addEventListener('keydown', (e) => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;

    if (active.classList.contains('alphabet-char') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const audio = active.dataset.audio;
        if (audio) playAudio(audio);
    }

    if ((e.key === 'Enter' || e.key === ' ') && active.classList.contains('memory-tile')) {
        e.preventDefault();
        active.click();
    }
});

console.log('main.ts script loaded.');
