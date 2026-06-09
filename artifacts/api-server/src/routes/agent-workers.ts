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

  // GET /api/agent-code-info?code=EA-XXXXXX
  // Validate an agent/colider code and return the name — used by workers when linking
  router.get('/agent-code-info', async (req, res) => {
    const code = ((req.query.code as string) ?? '').trim().toUpperCase()
    if (!code) return res.status(400).json({ error: 'code requerido' })
    try {
      const r = await fetch(
        sbUrl(`profiles?agent_code=eq.${encodeURIComponent(code)}&select=id,agent_name,colider_name,is_agent,is_colider&limit=1`),
        { headers: sbHeaders() as Record<string, string> }
      )
      if (!r.ok) return res.status(r.status).json({ error: await r.text() })
      const rows = await r.json() as {
        id: string; agent_name: string | null; colider_name: string | null;
        is_agent: boolean; is_colider: boolean
      }[]
      if (!rows[0]) return res.status(404).json({ error: 'Código de agente no encontrado' })
      const row = rows[0]
      const name = row.colider_name ?? row.agent_name ?? 'Agente'
      return res.json({ ok: true, name, is_agent: row.is_agent ?? false, is_colider: row.is_colider ?? false })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown'
      return res.status(500).json({ error: msg })
    }
  })

  // GET /api/agent-workers?agent_id=UUID
  // Returns all worker_entries where agente = agent's agent_code (service role bypasses RLS)
  router.get('/agent-workers', async (req, res) => {
    const agentId = (req.query.agent_id as string) || (req.headers['x-agent-id'] as string);
    if (!agentId) return res.status(400).json({ error: 'Missing agent_id' });

    try {
      const profileRes = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_code,is_agent,is_colider&limit=1`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!profileRes.ok) return res.status(profileRes.status).json({ error: await profileRes.text() });

      const profiles = await profileRes.json() as { id: string; agent_code: string | null; is_agent: boolean; is_colider: boolean }[];
      const profile = profiles[0];
      if ((!profile?.is_agent && !profile?.is_colider) || !profile.agent_code) return res.json([]);

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

  // GET /api/agent/no-cobro?agent_id=UUID
  // Returns weekly_no_cobro entries for workers belonging to this agent or colider
  router.get('/agent/no-cobro', async (req, res) => {
    const agentId = (req.query.agent_id as string);
    if (!agentId) return res.status(400).json({ error: 'Missing agent_id' });
    try {
      const profileRes = await fetch(
        sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_code,is_agent,is_colider&limit=1`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!profileRes.ok) return res.status(profileRes.status).json({ error: await profileRes.text() });
      const profiles = await profileRes.json() as { id: string; agent_code: string | null; is_agent: boolean; is_colider: boolean }[];
      const profile = profiles[0];
      if ((!profile?.is_agent && !profile?.is_colider) || !profile.agent_code) return res.json({ entries: [] });

      const workersRes = await fetch(
        sbUrl(`worker_entries?agente=eq.${encodeURIComponent(profile.agent_code)}&select=user_id&order=created_at.desc`),
        { headers: sbHeaders() as Record<string, string> }
      );
      const workers = await workersRes.json() as { user_id: string }[];
      const userIds = [...new Set(workers.map((w: any) => w.user_id as string))];
      if (userIds.length === 0) return res.json({ entries: [] });

      const noCobroRes = await fetch(
        sbUrl(`weekly_no_cobro?user_id=in.(${userIds.map(id => '"' + id + '"').join(',')})&select=*&order=semana.desc`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!noCobroRes.ok) return res.status(noCobroRes.status).json({ error: await noCobroRes.text() });
      const entries = await noCobroRes.json();
      return res.json({ entries });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.status(500).json({ error: msg });
    }
  });

  export default router;
  