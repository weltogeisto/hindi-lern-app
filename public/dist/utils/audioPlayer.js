// src/utils/audioPlayer.ts
/**
 * Plays an audio file from a given path.
 * Falls back to placeholder if the file is missing.
 */
export function playAudio(audioPath) {
    const placeholder = 'audio/placeholder.mp3';
    const attempt = (src, fallback) => {
        const audio = new Audio();
        let handled = false;
        const cleanup = () => {
            audio.removeAttribute('src');
            audio.load();
            audio.oncanplaythrough = null;
            audio.onerror = null;
        };
        audio.oncanplaythrough = () => {
            if (handled)
                return;
            handled = true;
            audio.play().catch(err => console.warn('Playback failed:', err));
            cleanup();
        };
        audio.onerror = () => {
            if (handled)
                return;
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
                if (fallback && fallback !== src)
                    attempt(fallback);
            }
        }, 3000);
    };
    attempt(audioPath, placeholder);
}
// Cache the chosen Hindi voice once resolved
let _hindiVoice = undefined;
function getHindiVoice() {
    if (_hindiVoice !== undefined)
        return _hindiVoice;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    // Prefer an exact hi-IN voice, fall back to any Hindi voice
    _hindiVoice =
        voices.find(v => v.lang === 'hi-IN') ??
            voices.find(v => v.lang.startsWith('hi')) ??
            null;
    return _hindiVoice;
}
/**
 * Shows a brief toast message at the bottom of the screen.
 */
function showAudioToast(message) {
    const existing = document.getElementById('audio-toast');
    if (existing)
        existing.remove();
    const toast = document.createElement('div');
    toast.id = 'audio-toast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:rgba(30,30,46,0.95);color:#e2e8f0;padding:0.6rem 1.2rem;border-radius:10px;font-size:0.85rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity 0.3s';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}
/**
 * Speaks Hindi text using the Web Speech API.
 * Tries hi-IN voice first, then any available voice, then shows a toast.
 */
export function playHindi(text) {
    if (!('speechSynthesis' in window)) {
        showAudioToast('Audio not supported on this browser');
        return;
    }
    const speak = () => {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        // Try Hindi voice first, then any voice
        const hindiVoice = getHindiVoice();
        const fallbackVoice = voices.length > 0 ? voices[0] : null;
        const voice = hindiVoice || fallbackVoice;
        if (!voice) {
            showAudioToast('No text-to-speech voices available');
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = hindiVoice ? 'hi-IN' : voice.lang;
        utterance.rate = 0.85;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            _hindiVoice = undefined;
            speak();
        }, { once: true });
        // If voices don't load within 500ms, try anyway
        setTimeout(() => speak(), 500);
    }
    else {
        speak();
    }
}
