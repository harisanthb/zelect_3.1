
const CACHE_NAME = 'zelect-v1';
const DYNAMIC_CACHE_NAME = 'zelect-dynamic-v1';

// App Shell: The core files the app needs to run.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache, caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('zelect-') && 
                 cacheName !== CACHE_NAME && 
                 cacheName !== DYNAMIC_CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve from cache or network, and cache new resources
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // For Google API calls, always go to the network (data must be fresh).
  if (url.hostname.includes('googleapis.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // For other requests (app shell, fonts, images), use a cache-first strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(networkResponse => {
        // Only cache successful GET requests.
        if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(error => {
      console.error('Fetch failed:', error);
      // Optional: You could return a specific "offline" page or image here.
    })
  );
});
