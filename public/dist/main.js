import { setupPracticeArea } from './components/practiceArea.js';
import { setupControls } from './components/controls.js';
import { renderAlphabet } from './components/alphabetDisplay.js';
import { playAudio } from './utils/audioPlayer.js';
let appState = {
    currentLesson: null,
    alphabet: []
};
function updateState(newState) {
    appState = { ...appState, ...newState };
    console.log('State updated:', appState);
    renderUI();
}
function getNextCharacter() {
    if (appState.alphabet.length === 0) {
        return null;
    }
    // TODO: Replace with spaced-repetition logic once available.
    return appState.alphabet[0].character;
}
function renderUI() {
    const appDiv = document.getElementById('app');
    if (!appDiv) {
        console.error('Root app container not found.');
        return;
    }
    appDiv.innerHTML = `
        <h1 class="text-2xl font-bold text-center mb-4">नमस्ते! Learn Hindi Alphabets</h1>
        <div id="controls-container" class="mb-4"></div>
        <div id="practice-container" class="mb-6"></div>
        <div id="alphabet-container" class="flex flex-wrap justify-center gap-2"></div>
    `;
    setupControls('controls-container');
    setupPracticeArea('practice-container');
    renderAlphabet('alphabet-container', appState.alphabet);
    attachAlphabetClickListeners();
}
function attachAlphabetClickListeners() {
    const alphabetContainer = document.getElementById('alphabet-container');
    if (!alphabetContainer) {
        return;
    }
    alphabetContainer.querySelectorAll('.alphabet-char').forEach(charElement => {
        charElement.addEventListener('click', () => {
            const character = charElement.dataset.char;
            const audioPath = charElement.dataset.audio;
            if (audioPath) {
                playAudio(audioPath);
                return;
            }
            if (character) {
                console.warn(`No audio path found for character: ${character}`);
            }
        });
    });
    console.log('Alphabet character click listeners attached.');
}
function setupEventListeners() {
    // Placeholder for future global event listeners.
}
async function hydrateAlphabetData() {
    try {
        const response = await fetch('/data/alphabets.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} when fetching alphabet data.`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Alphabet data is not an array.');
        }
        updateState({ alphabet: data });
        console.log(`Loaded ${data.length} alphabet entries.`);
    }
    catch (error) {
        console.error('Failed to load alphabet data.', error);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized!');
    renderUI();
    void hydrateAlphabetData();
    setupEventListeners();
});
console.log('main.ts script loaded.');
