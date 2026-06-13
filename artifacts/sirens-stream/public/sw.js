const CACHE_NAME = 'eclipse-angels-v5';
  const SHELL_ASSETS = ['/index.html'];
  const API_BASE = 'https://eclipse-angels-web-api.onrender.com';

  // ── Cache helpers for tracking last-seen notification timestamp ───────────────
  async function getLastSeen() {
    try {
      const cache = await caches.open('ea-notif-meta');
      const r = await cache.match('/ea-last-seen');
      return r ? await r.text() : '';
    } catch { return ''; }
  }
  async function setLastSeen(iso) {
    try {
      const cache = await caches.open('ea-notif-meta');
      await cache.put('/ea-last-seen', new Response(iso));
    } catch { /* ignore */ }
  }

  // ── Check server for new notifications and show them ────────────────────────
  async function checkAndShowNotifications() {
    try {
      const since = await getLastSeen();
      const qs = since ? ('?since=' + encodeURIComponent(since)) : '';
      const res = await fetch(API_BASE + '/api/in-app-notifications' + qs, { credentials: 'omit' });
      if (!res.ok) return;
      const data = await res.json();
      const notifs = data.notifications || [];
      if (!notifs.length) return;

      for (const notif of notifs) {
        await self.registration.showNotification('📢 Eclipse Angels Agency', {
          body: notif.content,
          icon: '/images/eclipse-angels-logo.png',
          badge: '/images/eclipse-angels-logo.png',
          vibrate: [200, 100, 200],
          tag: 'ea-notif-' + notif.id,       // deduplicate: same id = replace, not duplicate
          renotify: false,
          data: { url: '/' },
        });
      }
      await setLastSeen(new Date().toISOString());
    } catch { /* ignore network errors */ }
  }

  // ── Install ───────────────────────────────────────────────────────────────────
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
    );
  });

  // ── Activate ──────────────────────────────────────────────────────────────────
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME && k !== 'ea-notif-meta').map(k => caches.delete(k)))
      )
    );
    self.clients.claim();
  });

  // ── Messages from the React app ───────────────────────────────────────────────
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  });

  // ── Fetch (SPA offline fallback) ──────────────────────────────────────────────
  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match('/index.html'))
      );
    }
  });

  // ── Web Push (FCM / APNs / Mozilla) ──────────────────────────────────────────
  // Works for: iPhone PWA (Apple), Firefox Android (Mozilla), Chrome outside Cuba (Google)
  self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
      body: data.body || 'Tienes una nueva notificación.',
      icon: '/images/eclipse-angels-logo.png',
      badge: '/images/eclipse-angels-logo.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    };
    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title || 'Eclipse Angels Agency', options),
        setLastSeen(new Date().toISOString()), // mark as seen so periodic sync skips these
      ])
    );
  });

  // ── Periodic Background Sync ─────────────────────────────────────────────────
  // Wakes up the SW periodically (every ~1h) to check for new notifications.
  // Works WITHOUT Google FCM — the SW fetches directly from our server.
  // Supported: Chrome 80+ (installed PWA), Firefox 79+, Safari (iOS via background tasks)
  // For Cuba Android users: works if installed as PWA + using Firefox (Mozilla scheduler)
  // For Cuba iOS users: works natively via Apple's background task scheduler
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'ea-check-notifs') {
      event.waitUntil(checkAndShowNotifications());
    }
  });

  // ── Notification click ────────────────────────────────────────────────────────
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  });
  