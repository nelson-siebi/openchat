/**
 * OpenChat - Service Worker
 * - App shell caching (stale-while-revalidate for static assets, network-first for pages)
 * - PWA Share Target: receives content shared from other apps (WhatsApp, Gallery, Files...)
 * - Notification clicks focus/open the right room
 */

const VERSION = 'v2.0.0';
const CACHE_NAME = `openchat-${VERSION}`;
const SHARE_CACHE = 'openchat-share';
const STATIC_ASSETS = [
    './',
    'index.php',
    'assets/css/app.css',
    'assets/js/core.js',
    'assets/js/media.js',
    'assets/js/app.js',
    'assets/js/qrcode.min.js',
    'assets/icons/icon.svg',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/img/logo.svg',
    'assets/stickers/heart_beat.svg',
    'assets/stickers/laugh_tears.svg',
    'assets/stickers/fire_blast.svg',
    'assets/stickers/party_popper.svg',
    'assets/stickers/thumbs_up.svg',
    'assets/stickers/rocket_blast.svg',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.all(STATIC_ASSETS.map((url) => cache.add(url).catch(() => null))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith('openchat-v') && key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Share target: keep the shared files in Cache Storage and hand over to the UI
// ---------------------------------------------------------------------------
async function handleShareTarget(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files').filter((f) => f && typeof f === 'object' && f.size > 0);
        const cache = await caches.open(SHARE_CACHE);

        // Clear any previous unconsumed share
        const oldKeys = await cache.keys();
        await Promise.all(oldKeys.map((k) => cache.delete(k)));

        const fileEntries = [];
        for (let i = 0; i < Math.min(files.length, 10); i++) {
            const file = files[i];
            const key = `share-file-${i}`;
            await cache.put(new Request(`./__share__/${key}`), new Response(file, {
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'X-File-Name': encodeURIComponent(file.name || `fichier-${i + 1}`),
                    'X-File-Size': String(file.size)
                }
            }));
            fileEntries.push({ key, name: file.name || `fichier-${i + 1}`, type: file.type || '', size: file.size });
        }

        const meta = {
            title: (formData.get('title') || '').toString().slice(0, 300),
            text: (formData.get('text') || '').toString().slice(0, 4000),
            url: (formData.get('url') || '').toString().slice(0, 2000),
            files: fileEntries,
            at: Date.now()
        };
        await cache.put(new Request('./__share__/meta.json'), new Response(JSON.stringify(meta), {
            headers: { 'Content-Type': 'application/json' }
        }));

        return Response.redirect('./index.php?shared=1', 303);
    } catch (err) {
        return Response.redirect('./index.php?shared=error', 303);
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;

    if (request.method === 'POST' && url.pathname.endsWith('/share.php')) {
        event.respondWith(handleShareTarget(request));
        return;
    }

    if (request.method !== 'GET') return;

    // Never cache API calls, SSE or uploaded files
    if (url.pathname.includes('/api/') || url.pathname.includes('/uploads/') || url.pathname.includes('/__share__/')) {
        return;
    }

    // Pages: network first, cached shell when offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('index.php', copy));
                    }
                    return res;
                })
                .catch(() => caches.match('index.php').then((r) => r || caches.match('./')))
        );
        return;
    }

    // Static assets: stale-while-revalidate
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const network = fetch(request)
                .then((res) => {
                    if (res.ok && res.type === 'basic') cache.put(request, res.clone());
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || './index.php';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(target.replace('./', '')) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.length > 0 && 'navigate' in clients[0]) {
                return clients[0].navigate(target).then((c) => c && c.focus());
            }
            return self.clients.openWindow(target);
        })
    );
});
