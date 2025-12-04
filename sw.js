const CACHE_NAME = 'zenpen-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/fonts.css',
  './js/editor.js',
  './js/ui.js',
  './js/utils.js',
  './js/default.js',
  './js/libs/FileSaver.min.js',
  './js/libs/Blob.min.js',
  './js/libs/screenfull.min.js',
  '//fonts.googleapis.com/css?family=Lora:400,700,400italic,700italic'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
