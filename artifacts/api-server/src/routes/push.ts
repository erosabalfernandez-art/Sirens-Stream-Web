import { Router } from 'express';
    import { dispatchPush, deleteSubscription, ensureVapid } from '../lib/push-dispatch';

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
        const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
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
          res.status(r.status).json({ error: text });
          return;
        }
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });

    // POST /api/push/notify
    // Body: { userIds, title, body, url, fire? }
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

    // GET /api/push/status — diagnostic endpoint
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
  