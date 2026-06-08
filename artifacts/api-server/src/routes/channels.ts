import { Router } from 'express';
  import { dispatchPush } from '../lib/push-dispatch';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }
  function sbUrl(p: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
  }

  // GET /api/channel-access?user_id=X
  router.get('/channel-access', async (req, res) => {
    const user_id = req.query.user_id as string | undefined;
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
    try {
      const r = await fetch(
        sbUrl(`channel_requests?user_id=eq.${encodeURIComponent(user_id)}&select=app_name,status`),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const requests = await r.json();
      return res.json({ requests });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // GET /api/channel-approved-users?app=X
  router.get('/channel-approved-users', async (req, res) => {
    const app = req.query.app as string | undefined;
    if (!app) return res.status(400).json({ error: 'app requerido' });
    try {
      const r = await fetch(
        sbUrl(`channel_requests?app_name=eq.${encodeURIComponent(app)}&status=eq.approved&select=user_id`),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows: { user_id: string }[] = await r.json();
      return res.json({ user_ids: rows.map((row) => row.user_id) });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  // POST /api/post-channel-message
  router.post('/post-channel-message', async (req, res) => {
    const { app_name, content, image_url, created_by } = req.body as {
      app_name?: string; content?: string; image_url?: string; created_by?: string;
    };
    if (!app_name) return res.status(400).json({ error: 'app_name requerido' });
    if (!content?.trim() && !image_url?.trim()) return res.status(400).json({ error: 'content o image_url requerido' });
    try {
      // Insert message via service role
      const msgR = await fetch(sbUrl('channel_messages'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'return=representation' },
        body: JSON.stringify({
          app_name,
          content: content?.trim() ?? null,
          image_url: image_url?.trim() ?? null,
          created_by: created_by ?? null,
        }),
      });
      if (!msgR.ok) return res.status(msgR.status).json({ error: await msgR.text() });
      const [msg] = await msgR.json();

      // Get all approved users (service role — bypasses RLS)
      const usersR = await fetch(
        sbUrl(`channel_requests?app_name=eq.${encodeURIComponent(app_name)}&status=eq.approved&select=user_id`),
        { headers: sbH() }
      );
      const usersRows: { user_id: string }[] = usersR.ok ? await usersR.json() : [];
      const ids = usersRows.map((u) => u.user_id).filter(Boolean);

      // Send push notifications to workers + agents (fire-and-forget)
      setImmediate(async () => {
        try {
          const preview = content?.trim().slice(0, 80) ?? '📷 Imagen';
          // Get agent IDs to include in channel notifications
          const agentsRes = await fetch(sbUrl('profiles?is_agent=eq.true&select=id'), { headers: sbH() });
          const agentRows: {id:string}[] = agentsRes.ok ? await agentsRes.json() : [];
          const agentIds = agentRows.map(a => a.id);
          const allIds = [...new Set([...ids, ...agentIds])];
          if (allIds.length > 0) {
            await dispatchPush(allIds, `📢 Nuevo comunicado — ${app_name}`, preview, '/canales');
          }
        } catch {}
      });

      return res.json({ ok: true, message: msg, notified: ids.length });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  export default router;
  