import { Router } from 'express';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }
  function sbUrl(p: string) {
    return (process.env.SUPABASE_URL ?? '') + '/rest/v1/' + p;
  }

  // GET /api/in-app-notifications?since=ISO_DATE
  router.get('/in-app-notifications', async (req, res) => {
    const since = req.query.since as string | undefined;
    try {
      let endpoint = 'channel_messages?app_name=eq.sistema&order=created_at.desc&limit=20&select=id,content,created_at';
      if (since) endpoint += '&created_at=gt.' + encodeURIComponent(since);
      const r = await fetch(sbUrl(endpoint), { headers: sbH() });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      return res.json({ notifications: rows });
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  });

  // POST /api/in-app-notifications
  router.post('/in-app-notifications', async (req, res) => {
    const { content, created_by } = req.body as { content?: string; created_by?: string };
    if (!content?.trim()) return res.status(400).json({ error: 'content requerido' });
    try {
      const r = await fetch(sbUrl('channel_messages'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'return=representation' },
        body: JSON.stringify({ app_name: 'sistema', content: content.trim(), created_by: created_by ?? null }),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const [msg] = await r.json();
      return res.json({ ok: true, message: msg });
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  });

  export default router;
  