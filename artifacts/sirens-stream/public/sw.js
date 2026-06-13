const CACHE_NAME = 'eclipse-angels-v6';
    const SHELL_ASSETS = ['/index.html'];
    const API_BASE = 'https://eclipse-angels-web-api.onrender.com';
    const VAPID_PUBLIC_KEY = 'BBdr3GZcSw_p6_54VakfGxtgou8XSB1mJBV0btx_aHxpXHI3FZsRaGPd6Fex1fvW7aplnZbCpFow0gdxskYk-S8';

    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      const output = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
      return output;
    }

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

    // ── Web Push (FCM / APNs / Mozilla) ──────────────────────────────────────────
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
          setLastSeen(new Date().toISOString()),
        ])
      );
    });

    // ── Push Subscription Change ──────────────────────────────────────────────────
    // Fires when Firefox/browser rotates the push subscription (e.g. after offline period).
    // Re-subscribes automatically and updates the backend so notifications keep arriving.
    self.addEventListener('pushsubscriptionchange', (event) => {
      event.waitUntil(
        (async () => {
          try {
            const newSub = event.newSubscription
              || await self.registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
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
  