import { Router } from 'express';

  const router = Router();

  function sbH(): Record<string, string> {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return { apikey: key, Authorization: `Bearer ${key}` };
  }
  function sbUrl(p: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${p}`;
  }

  // POST /api/agent/ensure-code
  // { user_id } → { agent_code }
  // Auto-generates and saves a unique agent_code if the profile doesn't have one yet.
  // Safe to call multiple times — returns existing code if already set.
  router.post('/agent/ensure-code', async (req, res) => {
    const { user_id } = req.body as { user_id?: string }
    if (!user_id) return res.status(400).json({ error: 'user_id requerido' })
    try {
      const checkR = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}&select=agent_code&limit=1`),
        { headers: sbH() }
      )
      if (!checkR.ok) return res.status(checkR.status).json({ error: await checkR.text() })
      const rows = await checkR.json() as { agent_code: string | null }[]
      const existing = rows[0]?.agent_code
      if (existing) return res.json({ agent_code: existing })

      // Generate 6-char uppercase alphanumeric (no ambiguous chars 0/O/1/I)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]

      const patchR = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(user_id)}`),
        {
          method: 'PATCH',
          headers: { ...sbH(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ agent_code: code }),
        }
      )
      if (!patchR.ok) return res.status(patchR.status).json({ error: await patchR.text() })
      return res.json({ agent_code: code })
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'error' })
    }
  })

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
  