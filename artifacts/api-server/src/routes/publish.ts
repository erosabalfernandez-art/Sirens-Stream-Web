import { Router } from 'express';

  const router = Router();

  function sbHeaders(prefer?: string) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer ?? 'return=representation',
    };
  }
  function sbUrl(path: string) {
    return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  }

  // POST /api/publish-salaries
  // Upserts published_salaries using SERVICE ROLE KEY (bypasses RLS completely)
  // Body: { inserts, app_name, semana, cobradas, noCobro, sinPerfil, total_usd, total_diamantes, file_name }
  router.post('/publish-salaries', async (req, res) => {
    const { inserts, app_name, semana, cobradas, noCobro, sinPerfil, total_usd, total_diamantes, file_name } = req.body as {
      inserts: Array<{ user_id: string; app_name: string; semana: string; usd: number; diamantes: number; extras: Record<string, unknown> }>;
      app_name: string; semana: string;
      cobradas: unknown[]; noCobro: unknown[]; sinPerfil: unknown[];
      total_usd: number; total_diamantes: number; file_name: string;
    };

    if (!Array.isArray(inserts)) return res.status(400).json({ error: 'inserts debe ser un arreglo' });

    // Only rows with a valid auth account
    const valid = inserts.filter(r => !!r.user_id);
    if (valid.length === 0) {
      return res.status(400).json({ error: 'Ninguna trabajadora tiene cuenta registrada. Pídeles que se registren primero en la web.' });
    }

    try {
      const r = await fetch(
        sbUrl('published_salaries?on_conflict=user_id,app_name,semana'),
        {
          method: 'POST',
          headers: sbHeaders('resolution=merge-duplicates,return=representation') as Record<string, string>,
          body: JSON.stringify(valid),
        }
      );
      if (!r.ok) {
        const errText = await r.text();
        req.log.warn({ status: r.status, errText }, 'publish-salaries upsert failed');
        return res.status(r.status).json({ error: errText });
      }

      // Save to nomina_history (fire-and-forget)
      void fetch(sbUrl('nomina_history'), {
        method: 'POST',
        headers: sbHeaders() as Record<string, string>,
        body: JSON.stringify({
          app_name, semana, total_usd, total_diamantes,
          cobradas_count: (cobradas ?? []).length,
          nocobro_count:  (noCobro  ?? []).length,
          sinperfil_count:(sinPerfil ?? []).length,
          rows_data: { cobradas, noCobro, sinPerfil },
          published: true,
          file_name,
        }),
      }).catch(() => {});

      return res.json({ ok: true, saved: valid.length });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      return res.status(500).json({ error: msg });
    }
  });

  // POST /api/publish-agents
  // Upserts agent_commissions using SERVICE ROLE KEY (bypasses RLS completely)
  // Body: { inserts: [{ agent_name, app_name, semana, total_commission_usd, workers_data }] }
  router.post('/publish-agents', async (req, res) => {
    const { inserts } = req.body as {
      inserts: Array<{ agent_name: string; app_name: string; semana: string; total_commission_usd: number; workers_data: unknown[] }>;
    };

    if (!Array.isArray(inserts) || inserts.length === 0) {
      return res.status(400).json({ error: 'No hay agentes en esta nómina. Verifica que el archivo tenga una columna de agente y que esté llena.' });
    }

    try {
      // Resolve agent_user_id from profiles (service role)
      const agentNames = [...new Set(inserts.map(i => i.agent_name).filter(Boolean))];
      const encNames   = agentNames.map(n => encodeURIComponent(n)).join(',');
      let agentIdMap: Record<string, string> = {};
      if (encNames) {
        const profilesRes = await fetch(
          sbUrl(`profiles?agent_name=in.(${encNames})&is_agent=eq.true&select=id,agent_name`),
          { headers: sbHeaders() as Record<string, string> }
        );
        if (profilesRes.ok) {
          const profiles = (await profilesRes.json()) as { id: string; agent_name: string }[];
          for (const p of profiles) { if (p.agent_name) agentIdMap[p.agent_name] = p.id; }
        }
      }

      const resolved = inserts.map(row => ({
        ...row,
        agent_user_id: agentIdMap[row.agent_name] ?? null,
      }));

      const r = await fetch(
        sbUrl('agent_commissions?on_conflict=agent_name,app_name,semana'),
        {
          method: 'POST',
          headers: sbHeaders('resolution=merge-duplicates,return=representation') as Record<string, string>,
          body: JSON.stringify(resolved),
        }
      );
      if (!r.ok) {
        const errText = await r.text();
        req.log.warn({ status: r.status, errText }, 'publish-agents upsert failed');
        return res.status(r.status).json({ error: errText });
      }

      const agentUserIds = Object.values(agentIdMap).filter(Boolean);
      return res.json({ ok: true, saved: resolved.length, agentUserIds });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      return res.status(500).json({ error: msg });
    }
  });

  export default router;
  