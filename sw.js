// ============================================================
//  Vespator Front — Service Worker
//  Permite uso offline y cacheo de recursos
// ============================================================
const CACHE_NAME = 'vespator-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Share+Tech+Mono&display=swap'
];

// Instalar: cachear todos los recursos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        // Si falla alguna URL (ej. fuentes sin conexión), continuar igual
        console.log('SW cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: servir desde cache, con fallback a red
self.addEventListener('fetch', event => {
  // No interceptar peticiones al Apps Script de Drive (necesitan red)
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas y del mismo origen o fuentes Google
        if (
          response &&
          response.status === 200 &&
          (event.request.url.startsWith(self.location.origin) ||
           event.request.url.includes('fonts.googleapis.com') ||
           event.request.url.includes('fonts.gstatic.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin conexión y sin cache: devolver página principal cacheada
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
