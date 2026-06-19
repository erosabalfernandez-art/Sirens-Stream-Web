const CACHE_NAME = 'eclipse-angels-v6';
    const SHELL_ASSETS = ['/index.html'];
    const API_BASE = 'https://eclipse-angels-web-api.onrender.com';

    // ── Cache helpers ─────────────────────────────────────────────────────────────
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
    async function getCachedUserId() {
      try {
        const cache = await caches.open('ea-notif-meta');
        const r = await cache.match('/ea-user-id');
        return r ? await r.text() : null;
      } catch { return null; }
    }
    async function setCachedUserId(userId) {
      try {
        const cache = await caches.open('ea-notif-meta');
        await cache.put('/ea-user-id', new Response(userId));
      } catch { /* ignore */ }
    }

    // ── Check server for new notifications and show them ─────────────────────────
    // Used by both periodicsync and Background Sync (ea-reconnect-check).
    // No auth required — endpoint uses service role key server-side.
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
            tag: 'ea-notif-' + notif.id,
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
      if (event.data?.type === 'STORE_USER_ID' && event.data.userId) {
        setCachedUserId(event.data.userId);
      }
    });

    // ── Fetch (SPA offline fallback) ──────────────────────────────────────────────
    self.addEventListener('fetch', (event) => {
      if (event.request.mode === 'navigate') {
        event.respondWith(
          fetch(event.request).catch(() => caches.match('/index.html'))
        );
      }
    });
            const userId = await getCachedUserId();
            if (!userId) return; // app will re-subscribe when opened
            await fetch(API_BASE + '/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, subscription: newSub.toJSON() }),
            });
          } catch { /* ignore — app will fix on next open */ }
        })()
      );
    });

    // ── Background Sync ───────────────────────────────────────────────────────────
    // Fires when the device reconnects to internet (even with app closed).
    // Immediately checks server for missed notifications — bypasses Mozilla push queuing.
    // Cuba users: this is the primary delivery mechanism when push queuing fails.
    self.addEventListener('sync', (event) => {
      if (event.tag === 'ea-reconnect-check') {
        event.waitUntil(checkAndShowNotifications());
      }
    });

    // ── Periodic Background Sync ─────────────────────────────────────────────────
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
  