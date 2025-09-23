
// service-worker.js

const CACHE_NAME = 'hindi-alphabet-cache-v1';
const essentialAssets = [
    '/', // Cache the root path which typically serves index.html
    '/index.html',
    '/dist/output.css',
    '/dist/main.js',
    '/manifest.json',
    // Add specific audio files or data files you want to pre-cache
    // For now, we can add the placeholder audio and data file
    '/audio/placeholder.mp3',
    '/src/data/alphabets.json',
    // Add any other assets crucial for offline functionality
];

// Install event: Pre-cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching essential assets');
                return cache.addAll(essentialAssets);
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache essential assets', error);
            })
    );
});

// Fetch event: Serve cached assets if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }

                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request);
            })
            .catch((error) => {
                console.error('Service Worker: Fetch failed', error);
                // You could serve a fallback page here if needed
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
});

console.log('Service Worker script loaded.');
