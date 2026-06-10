import { Router } from 'express';

  const router = Router();

  function sbH(): Record<string,string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  }
  function sbUrl(path: string) { return `${process.env.SUPABASE_URL}/rest/v1/${path}`; }

  // GET /api/site-settings — returns all settings as { key: value } map
  router.get('/site-settings', async (req, res) => {
    try {
      const r = await fetch(sbUrl('site_settings?select=key,value'), { headers: sbH() });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const data = await r.json() as { key: string; value: string }[];
      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value;
      res.json(map);
    } catch (e: unknown) { res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' }); }
  });

  // GET /api/site-settings/:key
  router.get('/site-settings/:key', async (req, res) => {
    try {
      const r = await fetch(sbUrl(`site_settings?key=eq.${encodeURIComponent(req.params.key)}&select=value&limit=1`), { headers: sbH() });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const data = await r.json();
      res.json({ value: data[0]?.value ?? null });
    } catch (e: unknown) { res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' }); }
  });

  // POST /api/site-settings — upsert key/value using service role (bypasses RLS)
  router.post('/site-settings', async (req, res) => {
    const { key, value } = req.body as { key: string; value: string };
    if (!key) return res.status(400).json({ error: 'key requerido' });
    try {
      const r = await fetch(sbUrl('site_settings?on_conflict=key'), {
        method: 'POST',
        headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key, value: String(value) }),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      res.json({ ok: true });
    } catch (e: unknown) { res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' }); }
  });

  export default router;
  