
// src/components/controls.ts

/**
 * Sets up event listeners for control buttons (e.g., next, previous, start lesson).
 * @param controlContainerId - The ID of the HTML element containing the controls.
 */
export function setupControls(controlContainerId: string): void {
    const container = document.getElementById(controlContainerId);
    if (!container) {
        console.error(`Control container with ID "${controlContainerId}" not found.`);
        return;
    }

    container.innerHTML = `
        <div class="controls-toolbar flex flex-wrap items-center justify-start gap-3" role="toolbar" aria-label="Practice controls">
            <button id="start-practice" class="btn-primary px-3 py-2" aria-pressed="false">Start Practice</button>
            <button id="start-memory" class="btn-secondary px-3 py-2">Memory</button>
            <button id="new-memory" class="btn-secondary px-3 py-2">New Memory</button>
            <label for="pair-count" class="sr-only">Pairs</label>
            <select id="pair-count" class="app-select px-2 py-1 text-sm">
                <option value="4">4 pairs</option>
                <option value="6">6 pairs</option>
                <option value="8" selected>8 pairs</option>
                <option value="12">12 pairs</option>
            </select>
            <button id="shuffle" class="btn-secondary px-3 py-2">Shuffle</button>
            <button id="export-srs" class="btn-secondary px-3 py-2">Export SRS</button>
            <div id="memory-scoreboard" class="ml-4 flex items-center gap-2 text-sm helper-text">
                <span id="memory-best">Best: -</span>
                <button id="reset-memory-score" class="btn-secondary px-2 py-1 text-xs">Reset</button>
            </div>
        </div>
    `;

    console.log(`Controls rendered in ${controlContainerId}`);
}

// You might add functions to update control states (e.g., disable buttons).

export function bindControlCallbacks(onStart: () => void, onMemory: () => void, onShuffle: () => void, onExport: () => void): void {
    const startBtn = document.getElementById('start-practice');
    const memoryBtn = document.getElementById('start-memory');
    const newMemoryBtn = document.getElementById('new-memory');
    const shuffleBtn = document.getElementById('shuffle');
    const exportBtn = document.getElementById('export-srs');

    if (startBtn) startBtn.addEventListener('click', onStart);
        if (memoryBtn) memoryBtn.addEventListener('click', onMemory); // Keeping this line
    if (shuffleBtn) shuffleBtn.addEventListener('click', onShuffle);
    if (exportBtn) exportBtn.addEventListener('click', onExport);
}
