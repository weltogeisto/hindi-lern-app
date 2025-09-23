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

    container.innerHTML = characters.map(entry => `
        <button
            type="button"
            class="alphabet-char p-4 border rounded shadow-sm bg-white hover:bg-gray-100 transition text-center w-24"
            data-char="${entry.character}"
            data-audio="${entry.audio_path}"
        >
            <span class="block text-3xl font-semibold">${entry.character}</span>
            <span class="block text-sm text-gray-600 mt-1">${entry.transliteration}</span>
        </button>
    `).join('');

    console.log(`Alphabet rendered in ${containerId}`);
}

// Additional display helpers can be added here (e.g., highlighting, tooltips).
