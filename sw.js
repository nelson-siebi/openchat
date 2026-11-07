/**
 * OpenChat - Service Worker for PWA
 */

const CACHE_NAME = 'openchat-v1.1';
const STATIC_ASSETS = [
    './',
    'index.php',
    'assets/css/app.css',
    'assets/js/app.js',
    'assets/js/qrcode.min.js',
    'assets/icons/icon.svg',
    'manifest.json'
];

// Install: Cache essential shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network first for APIs, cache fallback for assets
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Bypass caching for API endpoints and SSE stream
    if (url.pathname.includes('/api/')) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then((res) => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
