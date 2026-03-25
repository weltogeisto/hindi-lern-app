
// service-worker.js

// Bump the cache name when making changes so browsers install the new SW
const CACHE_NAME = 'hindi-learn-cache-v11';
// Use relative paths (no leading slash) so the cache keys match how we reference files
const essentialAssets = [
    'index.html',
    'dist/output.css',
    'dist/main.js',
    'dist/components/modal.js',
    'dist/components/grammarModule.js',
    'dist/components/alphabetDisplay.js',
    'dist/components/controls.js',
    'dist/components/practiceArea.js',
    'dist/utils/sm2.js',
    'dist/utils/audioPlayer.js',
    'manifest.json',
    // placeholder audio and data files
    'audio/placeholder.mp3',
    'data/alphabets.json',
    'data/vocabulary.json',
    'data/grammar.json',
];

// Install event: Pre-cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Caching essential assets (tolerant mode)');
            // Add assets individually and tolerate failures so install doesn't fail
            return Promise.all(essentialAssets.map((asset) => {
                return cache.add(asset).catch((err) => {
                    // Log and continue
                    console.warn('Service Worker: Failed to cache', asset, err);
                    return Promise.resolve();
                });
            }));
        }).catch((error) => {
            console.error('Service Worker: Failed to open cache', error);
        })
    );
    // Don't auto-skipWaiting — let the page show an "Update" banner first
});

// Fetch event: Serve cached assets if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
    // Serve from cache first; fall back to network; if both fail, try index.html from cache
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Optionally put fetched responses into cache for future visits
                return networkResponse;
            }).catch((err) => {
                console.warn('Service Worker: Network fetch failed for', event.request.url, err);
                // As a last resort, return the cached index.html so the app can boot and then re-fetch assets
                return caches.match('index.html');
            });
        })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                    return Promise.resolve();
                })
            );
        })
    );
    // Take control of uncontrolled clients as soon as this SW activates
    event.waitUntil(self.clients.claim());
});

// Message event: allow the page to trigger skipWaiting on demand
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker script loaded.');
