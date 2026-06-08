import { Router } from 'express';

  const router = Router();

  function sbHeaders() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }
  function sbUrl(path: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  }

  // GET /api/agent-workers?agent_id=UUID
  // Returns all worker_entries where agente = agent's agent_code (service role bypasses RLS)
  router.get('/agent-workers', async (req, res) => {
    const agentId = (req.query.agent_id as string) || (req.headers['x-agent-id'] as string);
    if (!agentId) return res.status(400).json({ error: 'Missing agent_id' });

    try {
      const profileRes = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_code,is_agent&limit=1`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!profileRes.ok) return res.status(profileRes.status).json({ error: await profileRes.text() });

      const profiles = await profileRes.json() as { id: string; agent_code: string | null; is_agent: boolean }[];
      const profile = profiles[0];
      if (!profile?.is_agent || !profile.agent_code) return res.json([]);

      const workersRes = await fetch(
        sbUrl(`worker_entries?agente=eq.${encodeURIComponent(profile.agent_code)}&select=id,user_id,app_name,nombre_real,nombre_en_app,pais,metodo_pago,agente,created_at&order=created_at.desc`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!workersRes.ok) return res.status(workersRes.status).json({ error: await workersRes.text() });

      return res.json((await workersRes.json()) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.status(500).json({ error: msg });
    }
  });

  export default router;
  