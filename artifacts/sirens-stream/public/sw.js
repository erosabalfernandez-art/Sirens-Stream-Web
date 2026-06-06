const CACHE_NAME = 'eclipse-angels-v1';

  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    );
    self.clients.claim();
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
  