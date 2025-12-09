# Copilot Instructions for Hindi Alphabet Learning App

## Project Overview
- **Purpose:** Progressive Web App (PWA) for learning the Hindi (Devanagari) alphabet, with audio, spaced repetition, and offline support.
- **Tech Stack:** Vanilla TypeScript, TailwindCSS, PWA features (Service Worker), Node.js build tooling.
- **Structure:**
  - `src/` — TypeScript source code, organized by `components/`, `data/`, and `utils/`.
  - `public/` — Static assets, compiled JS/CSS, entry HTML, manifest, service worker, and audio files.
  - `sample_data/` — Example datasets (not used in app logic).

## Key Workflows
- **Install dependencies:** `npm install`
- **Build app:** `npm run build` (compiles TypeScript and TailwindCSS)
- **Watch for changes:** `npm run watch` (parallel TypeScript & TailwindCSS in dev)
- **Serve locally:** `npx http-server public/` or `python -m http.server 8080` from `public/`
- **Deploy:** Push to `main` branch triggers GitHub Actions workflow (`.github/workflows/deploy.yml`) to deploy `public/` to GitHub Pages.

## Architectural Patterns
- **Component-based UI:**
  - `src/components/` contains UI logic split by feature (e.g., `alphabetDisplay.ts`, `controls.ts`, `practiceArea.ts`).
  - Main entry: `src/main.ts` wires up components and app logic.
- **Data-driven:**
  - Alphabet and spaced repetition state in `src/data/alphabets.json` and `src/data/srs_state.json`.
  - Audio files referenced by data, loaded from `public/audio/`.
- **Utilities:**
  - `src/utils/audioPlayer.ts` handles audio playback logic.
- **Styling:**
  - TailwindCSS via `src/input.css` and `tailwind.config.js`.

## Project Conventions
- **No frameworks:** Pure TypeScript, no React/Vue/Angular.
- **Mobile-first:** All UI is designed for mobile usability.
- **PWA:** Service worker (`public/service-worker.js`) enables offline use.
- **Data files:** Only edit `src/data/alphabets.json` for alphabet content; do not hardcode in components.
- **Audio:** Place new audio files in `public/audio/` and reference them in data.
- **Testing:** No formal test suite; manual testing via local server.

## Examples
- To add a new alphabet character:
  1. Update `src/data/alphabets.json` with new entry.
  2. Add corresponding audio file to `public/audio/`.
  3. UI updates automatically via data-driven rendering.

- To debug UI logic:
  - Edit relevant file in `src/components/` and reload local server.

## References
- Main build logic: `package.json`, `tsconfig.json`, `tailwind.config.js`
- Deployment: `.github/workflows/deploy.yml`
- App entry: `public/index.html`, `src/main.ts`

---

**If unclear on a workflow or convention, check `README.md` or ask for clarification.**
