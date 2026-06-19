import { Router } from 'express';
      import { dispatchPush, dispatchPushAll, deleteSubscription, ensureVapid } from '../lib/push-dispatch';

      const SUPABASE_URL  = process.env.SUPABASE_URL      ?? '';
      const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

      const router = Router();

      // POST /api/push/subscribe — saves subscription via service role (bypasses RLS)
      router.post('/push/subscribe', async (req, res) => {
        const { userId, subscription } = req.body as { userId: string; subscription: object };
        if (!userId || !subscription) {
          res.status(400).json({ error: 'Missing userId or subscription' });
          return;
        }
        if (!SUPABASE_URL || !SERVICE_KEY) {
          res.status(503).json({ error: 'Not configured' });
          return;
        }
        try {
          // ?on_conflict=user_id is required for PostgREST to resolve the upsert
          // correctly when a row for this user_id already exists.
          const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=user_id`, {
            method: 'POST',
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({ user_id: userId, subscription }),
          });
          if (!r.ok) {
            const text = await r.text();
            console.error(`[push] subscribe failed ${r.status}: ${text}`);
            res.status(r.status).json({ error: text });
            return;
          }
          console.log(`[push] subscribed user_id=${userId}`);
          res.json({ ok: true });
        } catch (e) {
          res.status(500).json({ error: String(e) });
        }
      });

      // POST /api/push/notify
      router.post('/push/notify', async (req, res) => {
        if (!ensureVapid() || !SUPABASE_URL || !SERVICE_KEY) {
          res.status(503).json({ error: 'Push not configured' });
          return;
        }
        const { userIds, title, body, url, fire = false } = req.body as {
          userIds: string[];
          title: string;
          body: string;
          url: string;
          fire?: boolean;
        };
        if (!Array.isArray(userIds) || userIds.length === 0) {
          res.json({ sent: 0 });
          return;
        }

        if (fire) {
          res.status(202).json({ queued: userIds.length });
          setImmediate(() => { dispatchPush(userIds, title, body, url).catch(() => {}); });
          return;
        }

        const sent = await dispatchPush(userIds, title, body, url);
        res.json({ sent });
      });

      // POST /api/push/test — sends to ALL subscribers, no userId filter
      router.post('/push/test', async (req, res) => {
        if (!ensureVapid() || !SUPABASE_URL || !SERVICE_KEY) {
          res.status(503).json({ error: 'Push not configured' });
          return;
        }
        const { title = '🔔 Notificación de prueba', body = 'El sistema de notificaciones funciona correctamente.', url = '/' } =
          (req.body ?? {}) as { title?: string; body?: string; url?: string };
        const sent = await dispatchPushAll(title, body, url);
        res.json({ sent, ok: sent > 0 });
      });

      // GET /api/push/status — diagnostic
      router.get('/push/status', async (req, res) => {
        const vapidOk = ensureVapid();
        const hasSupabase = !!(SUPABASE_URL && SERVICE_KEY);
        let tableOk = false;
        let subCount = 0;
        if (hasSupabase) {
          try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=count`, {
              headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                Prefer: 'count=exact',
              },
            });
            tableOk = r.ok;
            if (r.ok) {
              const ct = r.headers.get('content-range');
              subCount = ct ? parseInt(ct.split('/')[1] ?? '0', 10) : 0;
            }
          } catch { /* ignore */ }
        }
        res.json({
          vapid: vapidOk,
          supabase: hasSupabase,
          table: tableOk,
          subscriptions: subCount,
          ok: vapidOk && hasSupabase && tableOk,
        });
      });

      export default router;

