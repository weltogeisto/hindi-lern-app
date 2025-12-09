// src/utils/audioPlayer.ts
/**
 * Plays an audio file from a given path.
 * @param audioPath - The path to the audio file.
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
            console.log(`Playing audio: ${src}`);
            audio.play().catch(err => console.warn('Playback failed:', err));
            cleanup();
        };
        audio.onerror = (ev) => {
            if (handled)
                return;
            handled = true;
            console.warn(`Failed to load audio: ${src}`, ev);
            cleanup();
            if (fallback && fallback !== src) {
                console.log(`Falling back to placeholder: ${fallback}`);
                attempt(fallback);
            }
        };
        audio.src = src;
        // start loading
        audio.load();
        // set a small timeout in case onerror/oncanplaythrough don't fire (network oddities)
        setTimeout(() => {
            if (!handled) {
                handled = true;
                console.warn(`Audio load timed out for ${src}, trying fallback.`);
                cleanup();
                if (fallback && fallback !== src)
                    attempt(fallback);
            }
        }, 3000);
    };
    attempt(audioPath, placeholder);
}
