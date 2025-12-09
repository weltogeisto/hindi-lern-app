import { setupPracticeArea, showPracticeEntry, bindPracticeCallbacks } from './components/practiceArea.js';
import { setupControls, bindControlCallbacks } from './components/controls.js';
import { bindAnswerInput } from './components/practiceArea.js';
import { renderAlphabet, renderMemoryGrid } from './components/alphabetDisplay.js';
import { playAudio } from './utils/audioPlayer.js';
import createModal from './components/modal.js';
const SRS_STORAGE_KEY = 'hindi_app_srs_v1';
let appState = {
    alphabet: [],
    srs: {}
};
function ensurePracticeQueue() {
    if (!appState.alphabet.length) {
        showToast('Alphabet data is still loading. Please wait.');
        return false;
    }
    if (!practiceQueue.length) {
        buildPracticeQueue();
    }
    if (!practiceQueue.length) {
        showPracticeEntry(null);
        showToast('No cards to study. Try reloading.');
        return false;
    }
    if (currentIndex < -1)
        currentIndex = -1;
    return true;
}
function saveSrs() {
    try {
        localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(appState.srs));
    }
    catch (e) {
        console.warn('Unable to save SRS to localStorage', e);
    }
}
function loadSrs() {
    try {
        const raw = localStorage.getItem(SRS_STORAGE_KEY);
        if (raw) {
            appState.srs = JSON.parse(raw);
        }
    }
    catch (e) {
        console.warn('Unable to load SRS from localStorage', e);
        appState.srs = {};
    }
}
function updateUI() {
    const appDiv = document.getElementById('app');
    if (!appDiv)
        return;
    const totalChars = appState.alphabet.length || 0;
    const masteredCount = Object.values(appState.srs).filter(s => (s?.mastery_level ?? 0) >= 7).length;
    const bestScore = loadBestMemoryScore();
    appDiv.className = 'app-shell max-w-6xl mx-auto px-6 py-8';
    appDiv.innerHTML = `
        <div class="layout-grid">
            <section class="panel hero-panel gradient-card">
                <div class="eyebrow">Devanagari Studio</div>
                <h1 class="hero-title">नमस्ते! Learn Hindi Alphabets</h1>
                <p class="hero-subtitle">A sensory-first deck that pairs spaced repetition, crisp audio, and a bold memory game so you can see, hear, and remember every glyph.</p>
                <div class="hero-stats">
                    <div class="hero-stat">
                        <span>Letters loaded</span>
                        <strong>${totalChars || '…'}</strong>
                    </div>
                    <div class="hero-stat">
                        <span>Mastered (lvl ≥ 7)</span>
                        <strong>${masteredCount || 0}</strong>
                    </div>
                    <div class="hero-stat">
                        <span>Best memory</span>
                        <strong>${bestScore ?? '—'}</strong>
                    </div>
                </div>
            </section>

            <section class="panel controls-panel">
                <div class="panel-heading">
                    <h2>Session controls</h2>
                    <p>Start practice, jump into memory mode, or export your SRS.</p>
                </div>
                <div id="controls-container" class="mb-4"></div>
            </section>

            <section class="panel practice-panel">
                <div class="panel-heading">
                    <h2>Spaced repetition</h2>
                    <p>Play the audio, mark what you know, and let the queue reorder itself.</p>
                </div>
                <div id="practice-container" class="mb-6"></div>
            </section>

            <section class="panel alphabet-panel">
                <div class="panel-heading">
                    <h2>Alphabet deck</h2>
                    <p>Tap to hear each sound; hover or focus to reveal the transliteration.</p>
                </div>
                <div id="alphabet-container" class="alphabet-grid"></div>
            </section>
        </div>
    `;
    setupControls('controls-container');
    setupPracticeArea('practice-container');
    renderAlphabet('alphabet-container', appState.alphabet);
    attachAlphabetClickListeners();
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
// --- Simple SRS practice queue ---
let practiceQueue = [];
let currentIndex = -1;
function buildPracticeQueue() {
    // Order by mastery_level (ascending) so low mastery appear first.
    const withScores = appState.alphabet.map(a => {
        const record = appState.srs[a.character];
        const score = record ? record.mastery_level : 0;
        return { a, score };
    });
    withScores.sort((x, y) => x.score - y.score);
    practiceQueue = withScores.map(ws => ws.a);
    currentIndex = -1;
}
function advanceToNext() {
    if (!ensurePracticeQueue())
        return;
    currentIndex += 1;
    if (currentIndex >= practiceQueue.length) {
        // finished
        showPracticeEntry(null);
        showToast('Practice complete! Restart to keep going.');
        console.log('Practice finished. No more items in queue.');
        return;
    }
    const entry = practiceQueue[currentIndex];
    showPracticeEntry({ character: entry.character, transliteration: entry.transliteration, audio_path: entry.audio_path });
    console.log(`Advancing to index ${currentIndex}: ${entry.character} (${entry.transliteration})`);
}
function markKnown() {
    if (!ensurePracticeQueue())
        return;
    const entry = practiceQueue[currentIndex];
    const key = entry.character;
    const rec = appState.srs[key] || { mastery_level: 0, due_date: null };
    rec.mastery_level = Math.min(10, rec.mastery_level + 1);
    rec.due_date = new Date(Date.now() + rec.mastery_level * 24 * 60 * 60 * 1000).toISOString();
    appState.srs[key] = rec;
    saveSrs();
    showToast('Nice! Moving to the next card.');
    console.log(`Marked known: ${key} -> mastery_level=${rec.mastery_level}`);
    advanceToNext();
}
function markUnknown() {
    if (!ensurePracticeQueue())
        return;
    const entry = practiceQueue[currentIndex];
    const key = entry.character;
    const rec = appState.srs[key] || { mastery_level: 0, due_date: null };
    // Stronger penalty: reset mastery and schedule a near-term review so the item repeats immediately
    rec.mastery_level = 0;
    // set due date to one hour from now so it appears as an imminent review in any future scheduling
    rec.due_date = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
    appState.srs[key] = rec;
    saveSrs();
    // Move the current card to the back twice so we advance to a new card now, but see this one again soon.
    practiceQueue.splice(currentIndex, 1);
    practiceQueue.push(entry, { ...entry });
    currentIndex = Math.max(-1, currentIndex - 1);
    console.log(`Marked unknown: ${key} -> mastery_level=${rec.mastery_level} (will repeat immediately)`);
    // If an audio file exists for this entry, play it to help the learner hear the pronunciation
    if (entry.audio_path) {
        try {
            playAudio(entry.audio_path);
        }
        catch (e) {
            // playAudio already handles errors; this is defensive
            console.warn('Failed to autoplay audio for unknown item', e);
        }
    }
    // Provide immediate visual feedback for incorrect answers
    try {
        // dynamic import the flash function from the built component module
        import('./components/practiceArea.js').then(mod => {
            if (mod && typeof mod.flashIncorrect === 'function') {
                mod.flashIncorrect();
            }
        }).catch(() => {
            // ignore import errors in older environments
        });
    }
    catch (e) {
        // silent
    }
    // Advance to the next item (which will likely be the repeated copy we just inserted)
    advanceToNext();
}
function shuffleQueue() {
    for (let i = practiceQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [practiceQueue[i], practiceQueue[j]] = [practiceQueue[j], practiceQueue[i]];
    }
    currentIndex = -1;
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
// --- Bind UI callbacks ---
function bindUI() {
    const startPractice = () => {
        if (!appState.alphabet.length) {
            showToast('Alphabet data is still loading. Please try again in a moment.');
            return;
        }
        buildPracticeQueue();
        currentIndex = -1;
        advanceToNext();
        showToast('Practice started! Use the buttons or Space/Enter.');
    };
    bindControlCallbacks(() => {
        startPractice();
    }, () => {
        // memory mode start
        const sel = document.getElementById('pair-count');
        const pc = sel ? parseInt(sel.value, 10) : 8;
        startMemoryMode(pc);
    }, () => {
        shuffleQueue();
    }, () => {
        exportSrs();
    });
    // Wire the New Memory button to reset/randomize the memory grid
    const newMemBtn = document.getElementById('new-memory');
    if (newMemBtn)
        newMemBtn.addEventListener('click', () => {
            if (!appState.alphabet.length) {
                showToast('Alphabet data is still loading. Please try again in a moment.');
                return;
            }
            const sel = document.getElementById('pair-count');
            const pc = sel ? parseInt(sel.value, 10) : 8;
            // show modal confirmation offering to also reset best score
            const modal = createModal();
            modal.show('New memory', `<p>Start a new memory game with ${pc} pairs?</p><p style="margin-top:.5rem;">Click OK to start. To also reset best score, press Reset first.</p>`);
            // on OK, simply start a new game (modal has OK focused which will hide)
            // small delay to allow modal to dismiss
            setTimeout(() => {
                newMemoryGame(pc);
                // ensure focus remains sensible
                const mn = document.getElementById('start-memory');
                if (mn)
                    mn.focus();
            }, 300);
        });
    bindPracticeCallbacks((audioPath) => {
        if (audioPath)
            playAudio(audioPath);
    }, () => {
        markKnown();
    }, () => {
        markUnknown();
    });
    bindAnswerInput((typed) => {
        if (!ensurePracticeQueue())
            return;
        const entry = practiceQueue[currentIndex];
        if (!entry) {
            showToast('No card selected. Start practice first.');
            return;
        }
        const guess = (typed || '').trim().toLowerCase();
        if (!guess) {
            showToast('Type your answer first.');
            return;
        }
        const target = (entry.transliteration || '').trim().toLowerCase();
        // reveal the correct transliteration on the card after a guess
        const translitEl = document.getElementById('practice-translit');
        if (translitEl)
            translitEl.textContent = entry.transliteration || '';
        if (guess === target) {
            showToast('Correct! Moving on.');
            markKnown();
        }
        else {
            showToast(`Not quite. Expected: ${entry.transliteration}`);
            markUnknown();
        }
    });
}
async function hydrateAlphabetData() {
    try {
        const response = await fetch('data/alphabets.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} when fetching alphabet data.`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Alphabet data is not an array.');
        }
        appState.alphabet = data;
        // Ensure SRS has entries for all characters
        data.forEach(d => {
            if (!appState.srs[d.character]) {
                appState.srs[d.character] = { mastery_level: 0, due_date: null };
            }
        });
        updateUI();
        bindUI();
        // Auto-start a session so the first card is ready without extra clicks
        buildPracticeQueue();
        currentIndex = -1;
        advanceToNext();
        console.log(`Loaded ${data.length} alphabet entries.`);
    }
    catch (error) {
        console.error('Failed to load alphabet data.', error);
        showToast('Failed to load alphabet data. Please refresh.');
        const container = document.getElementById('alphabet-container');
        if (container) {
            container.innerHTML = '<p class="text-center text-rose-600 w-full">Could not load alphabet data. Please check your connection and refresh.</p>';
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    loadSrs();
    updateUI();
    void hydrateAlphabetData();
});
// Hover uncover: reveal transliteration only while hovering the tile
document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target)
        return;
    const tile = target.closest('.alphabet-char');
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
    const target = e.target;
    if (!target)
        return;
    const tile = target.closest('.alphabet-char');
    if (!tile)
        return;
    const translit = tile.querySelector('.translit');
    const cover = tile.querySelector('.cover');
    if (translit)
        translit.style.opacity = '0';
    if (cover)
        cover.style.opacity = '1';
});
// keyboard accessibility: reveal on focus and allow Enter/Space to activate tiles
document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (!target)
        return;
    const tile = target.closest('.alphabet-char');
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
    const target = e.target;
    if (!target)
        return;
    const tile = target.closest('.alphabet-char');
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
    // Allow keyboard to flip memory tiles
    if ((e.key === 'Enter' || e.key === ' ') && active && active.classList.contains('memory-tile')) {
        e.preventDefault();
        active.click();
    }
});
// Memory game controller helpers
const MEMORY_CONTAINER_ID = 'alphabet-container';
let _memoryHandlerAttached = false;
function renderNewMemory(pairCount = 8) {
    // re-render memory grid with new random pairs
    renderMemoryGrid(MEMORY_CONTAINER_ID, appState.alphabet, pairCount);
    // reset attempts display in state
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container)
        return;
    const state = container._memoryState;
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
        const idxAttr = btn.getAttribute('data-game-idx');
        if (!idxAttr)
            return;
        const idx = parseInt(idxAttr, 10);
        const state = container._memoryState;
        if (!state || state.lock)
            return;
        const tileInfo = state.pairs[idx];
        if (!tileInfo || tileInfo.matched)
            return;
        // reveal tile
        btn.classList.add('revealed');
        tileInfo.revealed = true;
        // find other revealed but unmatched tile
        const revealed = state.pairs.map((p, i) => ({ p, i })).filter((x) => x.p.revealed && !x.p.matched);
        if (revealed.length === 2) {
            state.lock = true;
            state.attempts += 1;
            const [a, b] = revealed;
            const btnA = container.querySelector(`[data-game-idx='${a.i}']`);
            const btnB = container.querySelector(`[data-game-idx='${b.i}']`);
            if (a.p.pairId === b.p.pairId) {
                // match
                a.p.matched = true;
                b.p.matched = true;
                if (btnA)
                    btnA.classList.add('matched');
                if (btnB)
                    btnB.classList.add('matched');
                state.lock = false;
                // check for win
                if (state.pairs.every((p) => p.matched)) {
                    // Memory complete: show modal and update best score
                    setTimeout(() => {
                        const modal = createModal();
                        modal.show('Well done!', `<p>Memory complete in ${state.attempts} attempts!</p>`);
                        updateBestMemoryScore(state.attempts);
                    }, 200);
                }
            }
            else {
                // not a match: hide again
                setTimeout(() => {
                    if (btnA)
                        btnA.classList.remove('revealed');
                    if (btnB)
                        btnB.classList.remove('revealed');
                    a.p.revealed = false;
                    b.p.revealed = false;
                    state.lock = false;
                }, 800);
            }
        }
    });
    _memoryHandlerAttached = true;
}
function startMemoryMode(pairCount = 8) {
    const appDiv = document.getElementById('app');
    if (!appDiv)
        return;
    if (!appState.alphabet.length) {
        showToast('Alphabet data is still loading. Please start after it finishes.');
        return;
    }
    // render initial memory grid
    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container)
        return;
    // bring grid into view for the user
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // attach a single click handler once; guard so repeated starts don't add multiple listeners
    ensureMemoryHandler(container);
}
// Expose a small helper for controls to reset/randomize the memory grid
function newMemoryGame(pairCount = 8) {
    renderNewMemory(pairCount);
    const container = document.getElementById(MEMORY_CONTAINER_ID);
    if (!container)
        return;
    ensureMemoryHandler(container);
    // remove any matched/revealed classes
    container.querySelectorAll('.memory-tile').forEach((el) => el.classList.remove('matched', 'revealed'));
    showToast('New memory game ready');
}
// Toast helper
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
    setTimeout(() => {
        toast?.classList.remove('visible');
        // keep element for reuse
    }, duration);
}
// Best memory score persistence
const MEMORY_BEST_KEY = 'hindi_app_memory_best_v1';
function loadBestMemoryScore() {
    try {
        const v = localStorage.getItem(MEMORY_BEST_KEY);
        return v ? parseInt(v, 10) : null;
    }
    catch (e) {
        return null;
    }
}
function updateBestMemoryScore(attempts) {
    const best = loadBestMemoryScore();
    if (best === null || attempts < best) {
        localStorage.setItem(MEMORY_BEST_KEY, String(attempts));
        refreshScoreboard();
    }
}
function refreshScoreboard() {
    const el = document.getElementById('memory-best');
    if (!el)
        return;
    const best = loadBestMemoryScore();
    el.textContent = `Best: ${best === null ? '—' : best}`;
}
// Reset scoreboard button handler
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target)
        return;
    if (target.id === 'reset-memory-score') {
        const modal = createModal();
        modal.show('Reset best score', `<p>Are you sure you want to reset the best memory score?</p><div class="actions"><button id="confirm-reset" class="px-3 py-1 bg-rose-600 text-white rounded">Reset</button><button id="cancel-reset" class="px-3 py-1 bg-gray-100 rounded">Cancel</button></div>`);
        setTimeout(() => {
            const confirm = document.getElementById('confirm-reset');
            const cancel = document.getElementById('cancel-reset');
            if (confirm)
                confirm.addEventListener('click', () => {
                    localStorage.removeItem(MEMORY_BEST_KEY);
                    refreshScoreboard();
                    modal.show('Reset', `<p>Best score cleared.</p>`);
                    setTimeout(() => modal.hide(), 900);
                });
            if (cancel)
                cancel.addEventListener('click', () => modal.hide());
        }, 50);
    }
});
// Refresh scoreboard initially
document.addEventListener('DOMContentLoaded', () => refreshScoreboard());
console.log('main.ts script loaded.');
