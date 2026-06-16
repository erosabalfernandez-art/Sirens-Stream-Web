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
        sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_name,colider_name,agent_code,is_agent,is_colider&limit=1`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!profileRes.ok) return res.status(profileRes.status).json({ error: await profileRes.text() });

      const profiles = await profileRes.json() as { id: string; agent_name: string | null; colider_name: string | null; agent_code: string | null; is_agent: boolean; is_colider: boolean }[];
      const profile = profiles[0];
      if (!profile?.is_agent && !profile?.is_colider) return res.json([]);

      // Workers store the agent_code (e.g. EA-3ASQB6DY) in the agente field, not the agent_name
      const agentCode = profile.agent_code ?? '';
      const agentName = profile.agent_name ?? '';
      const agentIdentifiers = [agentCode, agentName].filter(Boolean);
      if (agentIdentifiers.length === 0) return res.json([]);

      // Busca por agent_code O agent_name (para datos legacy guardados con nombre)
      const agOrFilter = agentIdentifiers.map(v => `agente.eq.${encodeURIComponent(v)}`).join(',');
      const workersRes = await fetch(
        sbUrl(`worker_entries?or=(${agOrFilter})&select=id,user_id,app_name,nombre_real,nombre_en_app,telefono,codigo_pais,id_aplicacion,pais,metodo_pago,agente,created_at&order=created_at.desc`),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!workersRes.ok) return res.status(workersRes.status).json({ error: await workersRes.text() });

      const workers = (await workersRes.json()) as { id: string; user_id: string; [key: string]: unknown }[];

        // Exclude entries where the user_id belongs to an agent or colider
        if (workers.length > 0) {
          const userIds = [...new Set(workers.map(w => w.user_id).filter(Boolean))];
          const agentProfilesRes = await fetch(
            sbUrl(`profiles?id=in.(${userIds.map(id => '"' + id + '"').join(',')})&or=(is_agent.eq.true,is_colider.eq.true,agent_code.not.is.null)&select=id`),
            { headers: sbHeaders() as Record<string, string> }
          );
          if (agentProfilesRes.ok) {
            const agentUsers = await agentProfilesRes.json() as { id: string }[];
            const agentUserIds = new Set(agentUsers.map((p: { id: string }) => p.id));
            return res.json(workers.filter(w => !agentUserIds.has(w.user_id as string)));
          }
        }
        return res.json(workers);
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
      if (!profile?.is_agent && !profile?.is_colider) return res.json({ entries: [] });

      const agentCodeForNoCobro = profile.agent_code ?? '';
      const agentNameForNoCobro = profile.agent_name ?? '';
      const ncIdentifiers = [agentCodeForNoCobro, agentNameForNoCobro].filter(Boolean);
      if (ncIdentifiers.length === 0) return res.json({ entries: [] });
      const ncOrFilter = ncIdentifiers.map(v => `agente.eq.${encodeURIComponent(v)}`).join(',');
      const workersRes = await fetch(
        sbUrl(`worker_entries?or=(${ncOrFilter})&select=user_id&order=created_at.desc`),
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

  // GET /api/orphaned-agents?app_name=Layla
  // Lists all unique agente codes in worker_entries that have no matching profile
  router.get('/orphaned-agents', async (req, res) => {
    const app = ((req.query.app_name as string) ?? 'Layla').trim();
    try {
      const [workersRes, agentsRes] = await Promise.all([
        fetch(sbUrl(`worker_entries?app_name=eq.${encodeURIComponent(app)}&agente=not.is.null&select=agente`), { headers: sbHeaders() as Record<string, string> }),
        fetch(sbUrl('profiles?is_agent=eq.true&select=agent_code,agent_name'), { headers: sbHeaders() as Record<string, string> }),
      ]);
      const workers = await workersRes.json() as { agente: string }[];
      const agents = await agentsRes.json() as { agent_code: string; agent_name: string }[];
      const validCodes = new Set(agents.filter(a => a.agent_code).map(a => a.agent_code));
      const allCodes = [...new Set(workers.map(w => w.agente).filter(Boolean))];
      const orphaned = allCodes.filter(c => !validCodes.has(c));
      return res.json({ ok: true, orphaned_codes: orphaned, valid_agents: agents, all_codes: allCodes });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
    }
  });

  // POST /api/fix-orphaned-workers
  // Reassigns worker_entries that reference a deleted agent to a new valid agent_code.
  // Body: { new_agent_code: string, app_name?: string }
  router.post('/fix-orphaned-workers', async (req, res) => {
    const { new_agent_code, app_name = 'Layla' } = req.body as { new_agent_code: string; app_name?: string };
    if (!new_agent_code?.trim()) return res.status(400).json({ error: 'new_agent_code requerido' });

    try {
      const [workersRes, agentsRes, newAgentRes] = await Promise.all([
        fetch(sbUrl(`worker_entries?app_name=eq.${encodeURIComponent(app_name)}&agente=not.is.null&select=id,agente`), { headers: sbHeaders() as Record<string, string> }),
        fetch(sbUrl('profiles?is_agent=eq.true&select=agent_code'), { headers: sbHeaders() as Record<string, string> }),
        fetch(sbUrl(`profiles?agent_code=eq.${encodeURIComponent(new_agent_code)}&is_agent=eq.true&select=agent_name&limit=1`), { headers: sbHeaders() as Record<string, string> }),
      ]);

      const workers = await workersRes.json() as { id: string; agente: string }[];
      const agents = await agentsRes.json() as { agent_code: string }[];
      const newAgentRows = await newAgentRes.json() as { agent_name: string }[];

      if (!newAgentRows[0]) return res.status(404).json({ error: `Agente con código ${new_agent_code} no encontrado en profiles` });

      const validCodes = new Set(agents.filter(a => a.agent_code).map(a => a.agent_code));
      const orphanedCodes = [...new Set(workers.filter(w => w.agente && !validCodes.has(w.agente)).map(w => w.agente))];

      if (orphanedCodes.length === 0) {
        return res.json({ ok: true, updated: 0, message: 'No hay códigos huérfanos — todas las chicas ya tienen un agente válido.' });
      }

      // Update workers for each orphaned code
      const results: { code: string; ok: boolean; error?: string }[] = [];
      for (const code of orphanedCodes) {
        const patchRes = await fetch(
          sbUrl(`worker_entries?agente=eq.${encodeURIComponent(code)}&app_name=eq.${encodeURIComponent(app_name)}`),
          {
            method: 'PATCH',
            headers: { ...sbHeaders(), Prefer: 'return=minimal' } as Record<string, string>,
            body: JSON.stringify({ agente: new_agent_code }),
          }
        );
        results.push({ code, ok: patchRes.ok, error: patchRes.ok ? undefined : await patchRes.text() });
      }

      req.log.info({ orphanedCodes, new_agent_code, results }, 'fix-orphaned-workers complete');
      return res.json({
        ok: true,
        orphaned_codes: orphanedCodes,
        new_agent_code,
        new_agent_name: newAgentRows[0].agent_name,
        results,
        updated: results.filter(r => r.ok).length,
      });
    } catch (e: unknown) {
      req.log.error(e, 'fix-orphaned-workers error');
      return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
    }
  });

    // POST /api/admin/cleanup-agent-self-links
    // One-time (and safe to re-run): nullifies the agente field on worker_entries
    // where the worker themselves is an agent or colider.
    router.post('/admin/cleanup-agent-self-links', async (req, res) => {
      try {
        // 1. Get all agent/colider profile IDs
        const profilesRes = await fetch(
          sbUrl('profiles?or=(is_agent.eq.true,is_colider.eq.true,agent_code.not.is.null)&select=id'),
          { headers: sbHeaders() as Record<string, string> }
        );
        if (!profilesRes.ok) return res.status(500).json({ error: await profilesRes.text() });
        const profiles = await profilesRes.json() as { id: string }[];
        if (profiles.length === 0) return res.json({ ok: true, updated: 0 });

        const ids = profiles.map(p => '"' + p.id + '"').join(',');

        // 2. Find entries where user_id is an agent/colider AND agente is not null
        const entriesRes = await fetch(
          sbUrl(`worker_entries?user_id=in.(${ids})&agente=not.is.null&select=id,user_id,agente`),
          { headers: sbHeaders() as Record<string, string> }
        );
        if (!entriesRes.ok) return res.status(500).json({ error: await entriesRes.text() });
        const entries = await entriesRes.json() as { id: string; user_id: string; agente: string }[];
        if (entries.length === 0) return res.json({ ok: true, updated: 0, message: 'No hay entradas mal vinculadas' });

        // 3. Nullify agente for each entry
        const entryIds = entries.map(e => '"' + e.id + '"').join(',');
        const patchRes = await fetch(
          sbUrl(`worker_entries?id=in.(${entryIds})`),
          {
            method: 'PATCH',
            headers: { ...sbHeaders(), Prefer: 'return=minimal' } as Record<string, string>,
            body: JSON.stringify({ agente: null }),
          }
        );
        if (!patchRes.ok) return res.status(500).json({ error: await patchRes.text() });

        req.log.info({ entries }, 'cleanup-agent-self-links complete');
        return res.json({ ok: true, updated: entries.length, fixed: entries });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
      }
    });

    export default router;