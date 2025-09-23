
// src/utils/audioPlayer.ts

/**
 * Plays an audio file from a given path.
 * @param audioPath - The path to the audio file.
 */
export function playAudio(audioPath: string): void {
    try {
        const audio = new Audio(audioPath);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
            // Handle errors, e.g., file not found, permission issues
        });
        console.log(`Attempting to play audio from: ${audioPath}`);
    } catch (error) {
        console.error('Failed to create Audio object:', error);
    }
}
