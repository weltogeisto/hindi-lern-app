
# Hindi Alphabet Learning App

A Progressive Web App (PWA) for learning the Hindi (Devanagari) alphabet, built with Vanilla TypeScript and TailwindCSS. This app is designed with a mobile-first approach, offline capabilities, and utilizes spaced repetition principles to aid memorization.

## Features

*   Interactive display of Hindi vowels and consonants.
*   Audio pronunciation for each character.
*   Spaced Repetition System (SRS) to track learning progress (planned/basic implementation).
*   Offline access via Service Worker.
*   Responsive, mobile-first UI styled with TailwindCSS.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and npm installed.

```bash
node -v
npm -v
```

### Installing

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    cd hindi-alphabet-app
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

## Building and Running

### Building the Project

To build the TypeScript code and compile the TailwindCSS:

```bash
npm run build
```

This will generate the compiled JavaScript files in the `dist` directory and the output CSS file in `public/dist`.

### Running Locally

You can serve the `public` directory using a simple local web server (e.g., `http-server`, Python's `http.server`).

Using `http-server`:

```bash
npx http-server public/
```

Using Python (requires Python 3):

```bash
cd public
python -m http.server 8080
```

Open your browser to `http://localhost:8080` (or the port indicated by your server).

### Watching for Changes

For development, you can use the watch script to automatically recompile TypeScript and TailwindCSS on file changes:

```bash
npm run watch
```

This command runs two processes in parallel: one for TailwindCSS and one for TypeScript.

## Deployment

The fastest setup is branch-based GitHub Pages:

1. Go to **GitHub → your repo → Settings → Pages**.
2. Under **Build and deployment**, choose **Source: Deploy from a branch**.
3. Set **Branch: `main`** and **Folder: `/ (root)`**.
4. Save.

This repository now includes a root `index.html` that immediately redirects to `public/index.html`, so `main / root` works even though the app files live under `public/`.

Optional advanced setup: `.github/workflows/deploy.yml` also supports deployment via **GitHub Actions**.

### GitHub Pages Troubleshooting (if you only see the README page)

If `https://<username>.github.io/<repo>/` shows the repository description/README instead of the app UI, GitHub Pages is likely serving from the wrong source.

Use this setup:

1. Go to **GitHub → your repo → Settings → Pages**.
2. Under **Build and deployment**, choose **Source: Deploy from a branch**.
3. Set **Branch: `main`** and **Folder: `/ (root)`**.
4. Save and refresh the site after 1–3 minutes.
5. If it still shows old content, run **Actions → Deploy to GitHub Pages → Run workflow** once, then refresh.

### Using the app on Android

Once the correct Pages source is live:

1. Open the site in **Chrome** on Android.
2. Tap the browser menu (**⋮**).
3. Tap **Add to Home screen** (or **Install app** if shown).
4. Launch it from your home screen like a native app.

Because this project is a PWA (manifest + service worker), it can run offline after first load.

### GitHub Pages Troubleshooting (if you only see the README page)

If `https://<username>.github.io/<repo>/` shows the repository description/README instead of the app UI, GitHub Pages is likely serving from the wrong source.

Use this setup:

1. Go to **GitHub → your repo → Settings → Pages**.
2. Under **Build and deployment**, choose **Source: Deploy from a branch**.
3. Set **Branch: `gh-pages`** and **Folder: `/ (root)`**.
4. Save, then push a new commit to `main` so `.github/workflows/deploy.yml` runs and republishes.
5. Re-open `https://<username>.github.io/<repo>/` after 1–3 minutes.

Optional fallback:

* If you prefer not to use Actions, set Pages to **main / `public`** and ensure built assets are committed there. (Current workflow expects the `gh-pages` branch approach.)

### Using the app on Android

Once the correct Pages source is live:

1. Open the site in **Chrome** on Android.
2. Tap the browser menu (**⋮**).
3. Tap **Add to Home screen** (or **Install app** if shown).
4. Launch it from your home screen like a native app.

Because this project is a PWA (manifest + service worker), it can run offline after first load.

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow for deployment
├── public/
│   ├── audio/              # Placeholder for audio files
│   │   └── placeholder.mp3
│   ├── dist/               # Output directory for compiled CSS/JS (generated)
│   ├── index.html          # Main entry point
│   ├── manifest.json       # Web App Manifest
│   └── service-worker.js   # Service Worker for PWA features
├── src/
│   ├── components/         # UI components (alphabet display, controls, etc.)
│   │   ├── alphabetDisplay.ts
│   │   ├── controls.ts
│   │   └── practiceArea.ts
│   ├── data/               # JSON data files
│   │   ├── alphabets.json    # Alphabet characters and details
│   │   └── srs_state.json    # Spaced Repetition System state
│   ├── utils/              # Utility functions (audio player)
│   │   └── audioPlayer.ts
│   ├── input.css           # Tailwind CSS input file
│   └── main.ts             # Main application logic
├── .gitignore              # Git ignored files
├── package.json            # Project dependencies and scripts
├── README.md              # Project description and instructions
├── single-file.html        # Fallback HTML (optional, for embedding)
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## License

This project is licensed under the ISC License - see the LICENSE.md file for details (Note: LICENSE.md file is not created in this process, add if needed).

## Acknowledgments

*   TailwindCSS for simplifying styling.
*   TypeScript for type safety.
*   GitHub Actions for CI/CD.
