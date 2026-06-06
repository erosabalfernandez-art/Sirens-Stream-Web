const CACHE_NAME = 'eclipse-angels-v3';
const SHELL_ASSETS = ['/index.html'];

self.addEventListener('install', (event) => {
  // Pre-cache the app shell so offline navigation works
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  // Do NOT call self.skipWaiting() here — let the app show an update banner
  // and decide when to apply the new version gracefully
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Listen for SKIP_WAITING message from the React app
// This is triggered when the user clicks "Actualizar" in the update banner
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first for navigation; fall back to cached index.html for offline SPA support
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
  }
  // Let all other requests pass through normally (images, JS, CSS served by CDN/render)
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Tienes una nueva notificación.',
    icon: '/images/eclipse-angels-logo.png',
    badge: '/images/eclipse-angels-logo.png',
    data: { url: data.url || '/salarios' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Eclipse Angels Agency', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
