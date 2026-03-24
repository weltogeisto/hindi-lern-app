
// src/utils/audioPlayer.ts

/**
 * Plays an audio file from a given path.
 * Falls back to placeholder if the file is missing.
 */
export function playAudio(audioPath: string): void {
    const placeholder = 'audio/placeholder.mp3';

    const attempt = (src: string, fallback?: string) => {
        const audio = new Audio();
        let handled = false;

        const cleanup = () => {
            audio.removeAttribute('src');
            audio.load();
            audio.oncanplaythrough = null;
            audio.onerror = null;
        };

        audio.oncanplaythrough = () => {
            if (handled) return;
            handled = true;
            audio.play().catch(err => console.warn('Playback failed:', err));
            cleanup();
        };

        audio.onerror = () => {
            if (handled) return;
            handled = true;
            cleanup();
            if (fallback && fallback !== src) {
                attempt(fallback);
            }
        };

        audio.src = src;
        audio.load();
        setTimeout(() => {
            if (!handled) {
                handled = true;
                cleanup();
                if (fallback && fallback !== src) attempt(fallback);
            }
        }, 3000);
    };

    attempt(audioPath, placeholder);
}

// Cache the chosen Hindi voice once resolved
let _hindiVoice: SpeechSynthesisVoice | null | undefined = undefined;

function getHindiVoice(): SpeechSynthesisVoice | null {
    if (_hindiVoice !== undefined) return _hindiVoice;

    const voices = window.speechSynthesis?.getVoices() ?? [];
    // Prefer an exact hi-IN voice, fall back to any Hindi voice
    _hindiVoice =
        voices.find(v => v.lang === 'hi-IN') ??
        voices.find(v => v.lang.startsWith('hi')) ??
        null;
    return _hindiVoice;
}

/**
 * Speaks Hindi text using the Web Speech API (hi-IN voice).
 * If no Hindi voice is available, silently does nothing.
 */
export function playHindi(text: string): void {
    if (!('speechSynthesis' in window)) return;

    // Voices may not be loaded yet — load them and retry once
    const speak = () => {
        const voice = getHindiVoice();
        if (!voice) return; // no Hindi voice on this device

        window.speechSynthesis.cancel(); // stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = 'hi-IN';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        // Voices haven't loaded yet; wait for the event
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            _hindiVoice = undefined; // reset cache
            speak();
        }, { once: true });
    } else {
        speak();
    }
}
