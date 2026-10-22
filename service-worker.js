/**
 * Service Worker for Tamil IPTV Player
 * Caches core app shell for fast loading and offline capabilities.
 */

const CACHE_NAME = 'tamil-iptv-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/channels.js',
  './js/epg.js',
  './js/playlist-parser.js',
  './js/player.js',
  './js/remote.js',
  './js/app.js',
  './assets/manifest.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("Service worker cache asset add skipped:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let live media streams pass through directly without caching
  if (
    event.request.url.includes('.m3u8') || 
    event.request.url.includes('.ts') || 
    event.request.url.includes('.mp4') || 
    event.request.url.includes('corsproxy.io')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
