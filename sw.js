// Este cache guarda só os arquivos do app. Os dados do usuário ficam no
// localStorage e não são afetados quando a versão muda.
const CACHE = 'kiloss-v4';
const ASSETS = [
  './index.html',
  './css/style.css',
  './bundle.js',
  './manifest.json',
  './logo-kiloss.svg',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
const NETWORK_TIMEOUT = 3000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Rede primeiro (para receber atualizações), cache como fallback offline.
function networkFirst(request, cacheKey = request) {
  const network = fetch(request).then(res => {
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then(cache => cache.put(cacheKey, clone));
    }
    return res;
  });
  const timeout = new Promise((_, reject) => setTimeout(reject, NETWORK_TIMEOUT));

  return Promise.race([network, timeout])
    .catch(() => caches.match(cacheKey).then(cached => cached || network));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Para navegação, serve o index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst('./index.html'));
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Recursos externos (fontes): cache primeiro
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ?? fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      })
    )
  );
});
