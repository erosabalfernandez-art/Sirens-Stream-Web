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
      const data = (await r.json()) as unknown[];

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

  export default router;
  