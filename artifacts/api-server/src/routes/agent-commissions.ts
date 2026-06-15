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

  // GET /api/agent-commissions?agent_id=UUID
  // Fetches agent commissions using service role key (bypasses RLS)
  // Matches by both agent_user_id AND agent_name for robustness
  router.get('/agent-commissions', async (req, res) => {
    const agentId =
      (req.query.agent_id as string) || (req.headers['x-agent-id'] as string);
    if (!agentId) return res.status(400).json({ error: 'Missing agent_id' });

    try {
      // Get the agent's profile (name + is_agent flag)
      const profileRes = await fetch(
        sbUrl(
          `profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_name,is_agent&limit=1`
        ),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!profileRes.ok)
        return res.status(profileRes.status).json({ error: await profileRes.text() });

      const profiles = (await profileRes.json()) as {
        id: string;
        agent_name: string | null;
        is_agent: boolean;
      }[];
      const profile = profiles[0];
      if (!profile?.is_agent || !profile.agent_name) return res.json([]);

      const encId   = encodeURIComponent(agentId);
      const encName = encodeURIComponent(profile.agent_name);

      // Fetch commissions matching by agent_user_id OR agent_name
      // (handles records where agent_user_id was null during publish)
      const r = await fetch(
        sbUrl(
          `agent_commissions?or=(agent_user_id.eq.${encId},agent_name.eq.${encName})&order=created_at.desc`
        ),
        { headers: sbHeaders() as Record<string, string> }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      // Exclude agent's own worker entries from commission calculation
        const rawData = (await r.json()) as Array<{
          id: string; agent_name: string; app_name: string; semana: string;
          total_commission_usd: number;
          workers_data: Array<{ uid: string; nombre: string; salary_usd: number; commission_usd: number }> | null;
          created_at: string;
        }>;
        const data = rawData.map(row => {
          const wd = row.workers_data ?? [];
          const filteredWorkers = wd.filter(w => w.uid !== agentId);
          if (filteredWorkers.length === wd.length) return row as unknown;
          const newTotal = filteredWorkers.reduce((sum, w) => sum + Number(w.commission_usd || 0), 0);
          return { ...row, workers_data: filteredWorkers, total_commission_usd: newTotal } as unknown;
        });

      // Fix any null agent_user_ids in background (fire & forget)
      void fetch(
        sbUrl(`agent_commissions?agent_name=eq.${encName}&agent_user_id=is.null`),
        {
          method: 'PATCH',
          headers: sbHeaders() as Record<string, string>,
          body: JSON.stringify({ agent_user_id: agentId }),
        }
      ).catch(() => {});

      return res.json(data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.status(500).json({ error: msg });
    }
  });

  // GET /api/agent-details — admin stats: commission totals + worker counts per agent
  router.get('/agent-details', async (req, res) => {
    try {
      const [commRes, workersRes] = await Promise.all([
        fetch(sbUrl('agent_commissions?select=agent_name,total_commission_usd,app_name'), {
          headers: sbHeaders() as Record<string, string>,
        }),
        fetch(sbUrl('worker_entries?select=agente,app_name'), {
          headers: sbHeaders() as Record<string, string>,
        }),
      ]);

      const comms = (await commRes.json()) as {
        agent_name: string;
        total_commission_usd: number;
        app_name: string;
      }[];
      const workers = (await workersRes.json()) as {
        agente: string | null;
        app_name: string;
      }[];

      const commTotals: Record<string, number>   = {};
      const commApps:   Record<string, string[]> = {};

      for (const c of comms) {
        commTotals[c.agent_name] =
          (commTotals[c.agent_name] ?? 0) + Number(c.total_commission_usd || 0);
        if (!commApps[c.agent_name]) commApps[c.agent_name] = [];
        if (!commApps[c.agent_name].includes(c.app_name))
          commApps[c.agent_name].push(c.app_name);
      }

      const workerCounts: Record<string, number> = {};
      for (const w of workers) {
        if (w.agente) workerCounts[w.agente] = (workerCounts[w.agente] ?? 0) + 1;
      }

      return res.json({ commTotals, workerCounts, commApps });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      return res.status(500).json({ error: msg });
    }
  });


    // GET /api/agent/worker-salaries?agent_id=UUID
    // Returns workers' published salaries (USD only) linked to this agent via worker_entries.agente
    router.get('/agent/worker-salaries', async (req, res) => {
      const agentId = (req.query.agent_id as string) || '';
      if (!agentId) return res.status(400).json({ error: 'Missing agent_id' });
      try {
        const profileRes = await fetch(
          sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=id,agent_name,agent_code,is_agent&limit=1`),
          { headers: sbHeaders() as Record<string, string> }
        );
        const profiles = (await profileRes.json()) as { id: string; agent_name: string | null; agent_code: string | null; is_agent: boolean }[];
        const profile = profiles[0];
        if (!profile?.is_agent) return res.json({ salaries: [] });

        const identifiers = [profile.agent_code, profile.agent_name].filter((v): v is string => !!v);
        if (identifiers.length === 0) return res.json({ salaries: [] });

        const inClause = identifiers.map(id => `"${id}"`).join(',');
        const workersRes = await fetch(
          sbUrl(`worker_entries?agente=in.(${inClause})&select=user_id,app_name,nombre_en_app,nombre_real`),
          { headers: sbHeaders() as Record<string, string> }
        );
        const workers = (await workersRes.json()) as { user_id: string; app_name: string; nombre_en_app: string | null; nombre_real: string | null }[];
        if (!Array.isArray(workers) || workers.length === 0) return res.json({ salaries: [] });

        const uids = [...new Set(workers.map(w => w.user_id))];
        const workerMap: Record<string, { nombre_en_app: string | null; nombre_real: string | null }> = {};
        for (const w of workers) workerMap[`${w.user_id}__${w.app_name}`] = { nombre_en_app: w.nombre_en_app, nombre_real: w.nombre_real };

        const salariesRes = await fetch(
          sbUrl(`published_salaries?user_id=in.(${uids.map(id => `"${id}"`).join(',')})&select=user_id,app_name,semana,usd,created_at&order=created_at.desc`),
          { headers: sbHeaders() as Record<string, string> }
        );
        const salaries = (await salariesRes.json()) as { user_id: string; app_name: string; semana: string; usd: number; created_at: string }[];
        if (!Array.isArray(salaries)) return res.json({ salaries: [] });

        const enriched = salaries.map(s => ({
          ...s,
          nombre_en_app: workerMap[`${s.user_id}__${s.app_name}`]?.nombre_en_app ?? null,
          nombre_real: workerMap[`${s.user_id}__${s.app_name}`]?.nombre_real ?? null,
        }));

        return res.json({ salaries: enriched });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown';
        return res.status(500).json({ error: msg });
      }
    });

    export default router;
  