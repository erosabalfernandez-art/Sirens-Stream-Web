import { Router } from 'express';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}` };
  }
  function sbUrl(p: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
  }

  // GET /api/profile?user_id=UUID
  // Returns full profile via service role — bypasses PostgREST schema cache and RLS
  router.get('/profile', async (req, res) => {
    const user_id = req.query.user_id as string | undefined;
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
    try {
      const r = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=id,email,is_admin,is_agent,is_colider,agent_name,agent_code,colider_name,phone,telefono,created_at&limit=1`),
        { headers: sbH() }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json() as unknown[];
      if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'not found' });
      return res.json(rows[0]);
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });

  export default router;
  