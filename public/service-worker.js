// service-worker.js

// Bump the cache name when making changes so browsers install the new SW
const CACHE_NAME = 'hindi-learn-cache-v14';
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
    'audio/placeholder.mp3',
    'data/alphabets.json',
    'data/vocabulary.json',
    'data/grammar.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Caching essential assets (tolerant mode)');
            return Promise.all(essentialAssets.map((asset) => {
                return cache.add(asset).catch((err) => {
                    console.warn('Service Worker: Failed to cache', asset, err);
                    return Promise.resolve();
                });
            }));
        }).catch((error) => {
            console.error('Service Worker: Failed to open cache', error);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                return networkResponse;
            }).catch((err) => {
                console.warn('Service Worker: Network fetch failed for', event.request.url, err);
                return caches.match('index.html');
            });
        })
    );
});

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
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker script loaded.');