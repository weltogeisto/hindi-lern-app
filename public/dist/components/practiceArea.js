// src/components/practiceArea.ts
/**
 * Manages the interactive practice area where users can test their knowledge.
 * @param practiceContainerId - The ID of the HTML element for the practice area.
 */
export function setupPracticeArea(practiceContainerId) {
    const container = document.getElementById(practiceContainerId);
    if (!container) {
        console.error(`Practice container with ID "${practiceContainerId}" not found.`);
        return;
    }
    container.innerHTML = `
        <div id="practice-card" class="w-full max-w-lg mx-auto p-8 flex flex-col items-center bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg" role="region" aria-label="Practice area">
            <div id="practice-char" tabindex="0" 
                class="p-8 mb-2 bg-white border-2 border-indigo-50 rounded-2xl shadow-lg transition-all duration-300 
                       hover:shadow-xl hover:scale-105 hover:border-indigo-100
                       text-center w-48 h-48 flex items-center justify-center text-6xl font-bold tracking-wide
                       text-slate-700" 
                aria-live="polite"></div>
            <div id="practice-translit" class="text-lg text-slate-500 font-medium mt-4 tracking-wide" aria-live="polite"></div>
            <form id="answer-form" class="w-full max-w-sm mt-4 flex gap-2">
                <label for="answer-input" class="sr-only">Type the transliteration</label>
                <input id="answer-input" name="answer-input" type="text" autocomplete="off" placeholder="Type the transliteration..."
                    class="flex-1 px-3 py-2 rounded-lg border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button id="check-answer" type="submit"
                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    Check
                </button>
            </form>
            <div class="mt-8 flex flex-wrap gap-4 justify-center">
                <button id="play-audio" 
                    class="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium
                           transition-all duration-200 transform hover:scale-105 hover:bg-indigo-500 hover:shadow-lg
                           active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2" 
                    aria-label="Play audio">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Play</span>
                    </div>
                </button>
                <button id="knew-btn" 
                    class="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium
                           transition-all duration-200 transform hover:scale-105 hover:bg-emerald-500 hover:shadow-lg
                           active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                           focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>I knew it</span>
                    </div>
                </button>
                <button id="didnt-btn"
                    class="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium
                           transition-all duration-200 transform hover:scale-105 hover:bg-rose-500 hover:shadow-lg
                           active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                           focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>I didn't</span>
                    </div>
                </button>
            </div>
        </div>
    `;
    console.log(`Practice area initialized in ${practiceContainerId}`);
}
/**
 * Render a practice card for a single character (or clear when null).
 */
export function showPracticeEntry(entry) {
    const charEl = document.getElementById('practice-char');
    const translitEl = document.getElementById('practice-translit');
    const playBtn = document.getElementById('play-audio');
    const container = document.getElementById('practice-card');
    if (!container || !charEl || !translitEl || !playBtn)
        return;
    if (!entry) {
        charEl.textContent = '';
        translitEl.textContent = '';
        translitEl.removeAttribute('data-answer');
        playBtn.disabled = true;
        const knewBtn = document.getElementById('knew-btn');
        const didntBtn = document.getElementById('didnt-btn');
        if (knewBtn)
            knewBtn.disabled = true;
        if (didntBtn)
            didntBtn.disabled = true;
        const ans = document.getElementById('answer-input');
        if (ans)
            ans.value = '';
        return;
    }
    charEl.textContent = entry.character;
    translitEl.textContent = '';
    translitEl.setAttribute('data-answer', entry.transliteration || '');
    playBtn.disabled = !entry.audio_path;
    playBtn.dataset.audio = entry.audio_path || '';
    const knewBtnEl = document.getElementById('knew-btn');
    const didntBtnEl = document.getElementById('didnt-btn');
    const knewBtn = knewBtnEl instanceof HTMLButtonElement ? knewBtnEl : null;
    const didntBtn = didntBtnEl instanceof HTMLButtonElement ? didntBtnEl : null;
    if (knewBtn)
        knewBtn.disabled = false;
    if (didntBtn)
        didntBtn.disabled = false;
    const ans = document.getElementById('answer-input');
    if (ans)
        ans.value = '';
}
// keyboard support: Enter or Space on the char element should play audio when available
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (!active)
        return;
    if (active.id === 'practice-char' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const playBtn = document.getElementById('play-audio');
        playBtn?.click();
    }
});
/**
 * Register callbacks for practice button actions.
 */
export function bindPracticeCallbacks(onPlay, onKnown, onUnknown) {
    const playBtn = document.getElementById('play-audio');
    const knewBtn = document.getElementById('knew-btn');
    const didntBtn = document.getElementById('didnt-btn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            const path = playBtn.dataset.audio;
            onPlay(path || undefined);
        });
    }
    if (knewBtn) {
        knewBtn.addEventListener('click', () => onKnown());
        if (knewBtn instanceof HTMLButtonElement)
            knewBtn.disabled = true; // default until an entry is shown
    }
    if (didntBtn) {
        didntBtn.addEventListener('click', () => onUnknown());
        if (didntBtn instanceof HTMLButtonElement)
            didntBtn.disabled = true;
    }
}
/**
 * Bind the free-text answer form to a callback.
 */
export function bindAnswerInput(onSubmit) {
    const form = document.getElementById('answer-form');
    const input = document.getElementById('answer-input');
    if (!form || !input)
        return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        onSubmit(input.value || '');
    });
    const btn = document.getElementById('check-answer');
    if (btn)
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            onSubmit(input.value || '');
        });
}
/**
 * Briefly animate the practice card to indicate an incorrect answer.
 * Uses the Web Animations API when available, falls back to a simple transform sequence.
 */
export function flashIncorrect() {
    const card = document.getElementById('practice-card');
    const charEl = document.getElementById('practice-char');
    if (!card || !charEl)
        return;
    // Temporarily change border color to a soft red and animate a shake
    const originalBorder = charEl.style.borderColor;
    try {
        // Web Animations API for a quick shake
        if (charEl.animate) {
            charEl.animate([
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-8px)' },
                { transform: 'translateX(8px)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(0px)' }
            ], { duration: 420, easing: 'ease-out' });
        }
        else {
            // fallback: quick JS toggles
            charEl.style.transform = 'translateX(-8px)';
            setTimeout(() => charEl.style.transform = 'translateX(8px)', 80);
            setTimeout(() => charEl.style.transform = 'translateX(-6px)', 160);
            setTimeout(() => charEl.style.transform = 'translateX(6px)', 240);
            setTimeout(() => charEl.style.transform = 'translateX(0px)', 320);
        }
    }
    catch (e) {
        // ignore animation errors
    }
    charEl.style.borderColor = '#fecaca'; // red-200
    setTimeout(() => {
        charEl.style.borderColor = originalBorder || '';
    }, 600);
}
