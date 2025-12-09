// src/components/alphabetDisplay.ts

export interface AlphabetEntry {
    character: string;
    transliteration: string;
    audio_path: string;
}

/**
 * Renders the Hindi alphabet characters to a specified container.
 * @param containerId - The ID of the HTML element where the alphabet should be displayed.
 * @param characters - An array of alphabet entries to display.
 */
export function renderAlphabet(containerId: string, characters: AlphabetEntry[]): void {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID "${containerId}" not found.`);
        return;
    }

    if (characters.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center w-full">Loading alphabet data...</p>';
        return;
    }

    // default grid of covered tiles: reveal transliteration only on hover
    container.innerHTML = characters.map((entry, idx) => `
        <button
            type="button"
            class="alphabet-char relative p-4 border rounded shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-center w-24 h-24 flex flex-col justify-center items-center overflow-hidden"
            data-char="${entry.character}"
            data-audio="${entry.audio_path}"
            data-idx="${idx}"
            aria-label="Play pronunciation for ${entry.transliteration}"
            tabindex="0"
        >
            <span class="block text-3xl font-semibold" aria-hidden="true">${entry.character}</span>
            <span class="block text-sm text-gray-600 mt-1 translit absolute bottom-2 opacity-0 transition-opacity duration-200">${entry.transliteration}</span>
            <span class="cover absolute inset-0 bg-white" aria-hidden="true"></span>
        </button>
    `).join('');

    console.log(`Alphabet rendered in ${containerId}`);
}

/**
 * Render a simple memory game grid: creates pairs from random entries and shuffles them.
 * @param containerId - element id to render the memory grid
 * @param characters - array of alphabet entries
 */
export function renderMemoryGrid(containerId: string, characters: AlphabetEntry[], pairCount = 6): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    // pick random entries (unique) up to pairCount
    const shuffled = [...characters].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(pairCount, characters.length));

    // For each picked entry create two complementary tiles:
    // - a 'char' tile that displays the Devanagari character
    // - a 'translit' tile that displays the Latin transliteration
    // Each pair has a shared pairId for matching.
    const tiles: Array<{ pairId: number; tileType: 'char' | 'translit'; content: string; matched: boolean; revealed: boolean }>
        = [];

    picked.forEach((entry, i) => {
        tiles.push({ pairId: i, tileType: 'char', content: entry.character, matched: false, revealed: false });
        tiles.push({ pairId: i, tileType: 'translit', content: entry.transliteration || entry.character, matched: false, revealed: false });
    });

    // shuffle tiles
    tiles.sort(() => Math.random() - 0.5);

    container.innerHTML = tiles.map((t, idx) => {
        const contentHtml = t.tileType === 'char'
            ? `<span class="block text-3xl font-semibold">${t.content}</span>`
            : `<span class="block text-sm font-medium">${t.content}</span>`;
        // make tiles keyboard-focusable and include data attributes for game logic
        return `
        <button data-game-idx="${idx}" data-pair-id="${t.pairId}" data-tile-type="${t.tileType}"
            class="memory-tile w-28 h-28 m-2 bg-white rounded shadow-sm flex items-center justify-center text-center relative focus:outline-none focus:ring-2 focus:ring-indigo-300"
            tabindex="0" aria-label="Memory tile ${t.tileType === 'char' ? 'letter' : 'transliteration'}">
            <span class="face absolute inset-0 flex items-center justify-center">${contentHtml}</span>
            <span class="back absolute inset-0 bg-white"></span>
        </button>
    `;
    }).join('');

    // attach simple game state to container for handlers
    (container as any)._memoryState = { pairs: tiles, lock: false, attempts: 0 };

    console.log('Memory grid rendered with', tiles.length, 'tiles (', picked.length, 'pairs )');
}

// Additional display helpers can be added here (e.g., highlighting, tooltips).
