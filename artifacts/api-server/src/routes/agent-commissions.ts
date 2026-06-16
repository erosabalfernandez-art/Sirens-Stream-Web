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
      if (!profile?.is_agent) return res.json([]);

      const encId   = encodeURIComponent(agentId);

      // Build query: always match by agent_user_id; also match by agent_name if available
      let commsQuery: string;
      if (profile.agent_name) {
        const encName = encodeURIComponent(profile.agent_name);
        commsQuery = `agent_commissions?or=(agent_user_id.eq.${encId},agent_name.eq.${encName})&order=created_at.desc`;
      } else {
        commsQuery = `agent_commissions?agent_user_id=eq.${encId}&order=created_at.desc`;
      }

      // Fetch commissions matching by agent_user_id OR agent_name
      // (handles records where agent_user_id was null during publish)
      const r = await fetch(
        sbUrl(commsQuery),
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
    // Returns workers' published salaries with metodo_pago, custom exchange rates, global exchange rates
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
        if (!profile?.is_agent) return res.json({ salaries: [], exchange_rates: {} });

        const identifiers = [profile.agent_code, profile.agent_name].filter((v): v is string => !!v);
        if (identifiers.length === 0) return res.json({ salaries: [], exchange_rates: {} });

        // Fetch workers with metodo_pago
        const inClause = identifiers.map(id => `"${id}"`).join(',');
        const workersRes = await fetch(
          sbUrl(`worker_entries?agente=in.(${inClause})&select=user_id,app_name,nombre_en_app,nombre_real,metodo_pago`),
          { headers: sbHeaders() as Record<string, string> }
        );
        const workers = (await workersRes.json()) as { user_id: string; app_name: string; nombre_en_app: string | null; nombre_real: string | null; metodo_pago: string | null }[];
        if (!Array.isArray(workers) || workers.length === 0) return res.json({ salaries: [], exchange_rates: {} });

        const uids = [...new Set(workers.map(w => w.user_id))];
        const workerMap: Record<string, { nombre_en_app: string | null; nombre_real: string | null; metodo_pago: string | null }> = {};
        for (const w of workers) workerMap[`${w.user_id}__${w.app_name}`] = { nombre_en_app: w.nombre_en_app, nombre_real: w.nombre_real, metodo_pago: w.metodo_pago };

        const uidList = uids.map(id => `"${id}"`).join(',');

        // Fetch published salaries + custom per-worker rates + global exchange rates in parallel
        const [salariesRes, customRatesRes, exchangeRatesRes] = await Promise.all([
          fetch(sbUrl(`published_salaries?user_id=in.(${uidList})&select=user_id,app_name,semana,usd,created_at&order=created_at.desc`), { headers: sbHeaders() as Record<string, string> }),
          fetch(sbUrl(`custom_worker_rates?user_id=in.(${uidList})&select=user_id,app_name,efectivo_rate,transferencia_rate`), { headers: sbHeaders() as Record<string, string> }).catch(() => null),
          fetch(sbUrl('exchange_rates?select=id,rate'), { headers: sbHeaders() as Record<string, string> }).catch(() => null),
        ]);

        const salaries = (await salariesRes.json()) as { user_id: string; app_name: string; semana: string; usd: number; created_at: string }[];
        if (!Array.isArray(salaries)) return res.json({ salaries: [], exchange_rates: {} });

        // Build custom rates map (per-worker exclusive rates)
        const customRateMap: Record<string, { efectivo_rate: number; transferencia_rate: number }> = {};
        if (customRatesRes && customRatesRes.ok) {
          const crRows = await customRatesRes.json().catch(() => []) as { user_id: string; app_name: string; efectivo_rate: number; transferencia_rate: number }[];
          if (Array.isArray(crRows)) for (const c of crRows) customRateMap[`${c.user_id}__${c.app_name}`] = { efectivo_rate: Number(c.efectivo_rate) || 0, transferencia_rate: Number(c.transferencia_rate) || 0 };
        }

        // Build global exchange rates map
        const exchangeRates: Record<string, number> = {};
        if (exchangeRatesRes && exchangeRatesRes.ok) {
          const erRows = await exchangeRatesRes.json().catch(() => []) as { id: string; rate: number }[];
          if (Array.isArray(erRows)) for (const r of erRows) exchangeRates[r.id] = Number(r.rate) || 0;
        }

        // If all exchange rates are 0, the week was closed via cierre-semanal.
        // Agents must not see any salary data until admin re-publishes for the new week.
        const allRatesZero = Object.keys(exchangeRates).length === 0 ||
          Object.values(exchangeRates).every((v) => (v as number) === 0);
        if (allRatesZero) return res.json({ salaries: [], exchange_rates: {} });

        // Enrich each salary row with worker info + rates
        const enriched = salaries.map(s => {
          const wInfo = workerMap[`${s.user_id}__${s.app_name}`] ?? {};
          const cr = customRateMap[`${s.user_id}__${s.app_name}`] ?? { efectivo_rate: 0, transferencia_rate: 0 };
          return {
            ...s,
            nombre_en_app: wInfo.nombre_en_app ?? null,
            nombre_real: wInfo.nombre_real ?? null,
            metodo_pago: wInfo.metodo_pago ?? null,
            custom_efectivo_rate: cr.efectivo_rate,
            custom_transferencia_rate: cr.transferencia_rate,
          };
        });

        return res.json({ salaries: enriched, exchange_rates: exchangeRates });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown';
        return res.status(500).json({ error: msg });
      }
    });

    export default router;
    