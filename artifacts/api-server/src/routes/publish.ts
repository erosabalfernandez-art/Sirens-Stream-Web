import { Router } from 'express';
    import { dispatchPushIndividual, dispatchPush } from '../lib/push-dispatch';

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
    router.post('/publish-salaries', async (req, res) => {
      const { inserts, app_name, semana, cobradas, noCobro, sinPerfil, total_usd, total_diamantes, file_name } = req.body as {
        inserts: Array<{ user_id: string; app_name: string; semana: string; usd: number; diamantes: number; extras: Record<string, unknown> }>;
        app_name: string; semana: string;
        cobradas: unknown[]; noCobro: unknown[]; sinPerfil: unknown[];
        total_usd: number; total_diamantes: number; file_name: string;
      };

      if (!Array.isArray(inserts)) return res.status(400).json({ error: 'inserts debe ser un arreglo' });

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

        // Auto-detect zero earners for Waha/Howdy → weekly_no_cobro (fire-and-forget)
          if (app_name !== 'Layla') {
            const zeroEarners = valid.filter(r => Number(r.usd) === 0);
            if (zeroEarners.length > 0) {
              setImmediate(async () => {
                try {
                  const ids = zeroEarners.map(w => `"${w.user_id}"`).join(',');
                  const [profRes, workerRes] = await Promise.all([
                    fetch(sbUrl(`profiles?id=in.(${ids})&select=id,email`), { headers: sbHeaders() as Record<string, string> }),
                    fetch(sbUrl(`worker_entries?app_name=eq.${encodeURIComponent(app_name)}&user_id=in.(${ids})&select=user_id,nombre_en_app,nombre_real`), { headers: sbHeaders() as Record<string, string> }),
                  ]);
                  const profs: any[] = profRes.ok ? await profRes.json() : [];
                  const wData: any[] = workerRes.ok ? await workerRes.json() : [];
                  const emailMap: Record<string,string> = Object.fromEntries(profs.map((p:any)=>[p.id, p.email??'']));
                  const workerMap: Record<string,any> = Object.fromEntries(wData.map((w:any)=>[w.user_id, w]));
                  const rows = zeroEarners.map(w => ({
                    user_id: w.user_id, app_name: w.app_name, semana: w.semana,
                    reason: 'zero_salary',
                    nombre_en_app: workerMap[w.user_id]?.nombre_en_app ?? (w.extras?.Apodo ?? w.extras?.apodo ?? null),
                    nombre_real: workerMap[w.user_id]?.nombre_real ?? null,
                    email: emailMap[w.user_id] ?? null,
                  }));
                  await fetch(sbUrl('weekly_no_cobro?on_conflict=user_id,app_name,semana'), {
                    method: 'POST',
                    headers: { ...(sbHeaders() as Record<string,string>), Prefer: 'resolution=merge-duplicates,return=minimal' },
                    body: JSON.stringify(rows),
                  });
                } catch { /* best-effort */ }
              });
            }
          }

            // Auto-detect zero earners for Layla → weekly_no_cobro
            if (app_name === 'Layla') {
              const laylaNoEarners = valid.filter(r => Number(r.diamantes) === 0 && Number((r.extras as any)?.monedas_comerciales ?? 0) === 0);
              if (laylaNoEarners.length > 0) {
                setImmediate(async () => {
                  try {
                    const ids = laylaNoEarners.map(w => `"${w.user_id}"`).join(',');
                    const [profRes, workerRes] = await Promise.all([
                      fetch(sbUrl(`profiles?id=in.(${ids})&select=id,email`), { headers: sbHeaders() as Record<string, string> }),
                      fetch(sbUrl(`worker_entries?app_name=eq.Layla&user_id=in.(${ids})&select=user_id,nombre_en_app,nombre_real`), { headers: sbHeaders() as Record<string, string> }),
                    ]);
                    const profs: any[] = profRes.ok ? await profRes.json() : [];
                    const wData: any[] = workerRes.ok ? await workerRes.json() : [];
                    const emailMap: Record<string,string> = Object.fromEntries(profs.map((p:any)=>[p.id, p.email??'']));
                    const workerMap: Record<string,any> = Object.fromEntries(wData.map((w:any)=>[w.user_id, w]));
                    const rows = laylaNoEarners.map(w => ({
                      user_id: w.user_id, app_name: 'Layla', semana: w.semana,
                      reason: 'zero_salary',
                      nombre_en_app: workerMap[w.user_id]?.nombre_en_app ?? null,
                      nombre_real: workerMap[w.user_id]?.nombre_real ?? null,
                      email: emailMap[w.user_id] ?? null,
                    }));
                    await fetch(sbUrl('weekly_no_cobro?on_conflict=user_id,app_name,semana'), {
                      method: 'POST',
                      headers: { ...(sbHeaders() as Record<string,string>), Prefer: 'resolution=merge-duplicates,return=minimal' },
                      body: JSON.stringify(rows),
                    });
                  } catch { /* best-effort */ }
                });
              }
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

        // Send individual push notifications to each worker (fire-and-forget)
        setImmediate(() => {
          const notifItems = valid.map(insert => ({
            userId: insert.user_id,
            title: `💰 Tu salario de ${insert.app_name} está disponible`,
            body: `Semana ${insert.semana} — ${Number(insert.usd).toFixed(2)} · ${Number(insert.diamantes).toLocaleString('es-ES')} 💎`,
            url: '/salarios',
          }));
          dispatchPushIndividual(notifItems).catch(() => {});
        });

        // Notify agents and colider about new salary publication (fire-and-forget)
        setImmediate(async () => {
          try {
            const [agentsRes, colidersRes] = await Promise.all([
              fetch(sbUrl('profiles?is_agent=eq.true&select=id'), { headers: sbHeaders() as Record<string,string> }),
              fetch(sbUrl('profiles?is_colider=eq.true&select=id'), { headers: sbHeaders() as Record<string,string> }),
            ]);
            const agents: {id:string}[] = agentsRes.ok ? await agentsRes.json() : [];
            const coliders: {id:string}[] = colidersRes.ok ? await colidersRes.json() : [];
            const ids = [...new Set([...agents.map(a => a.id), ...coliders.map(c => c.id)])];
            if (ids.length > 0) {
              await dispatchPush(ids,
                `💰 Nómina de ${app_name} publicada`,
                `Semana ${semana} · ${valid.length} trabajadora${valid.length !== 1 ? 's' : ''}. Entra a revisar.`,
                '/nomina'
              );
            }
          } catch { /* best-effort */ }
        });

        return res.json({ ok: true, saved: valid.length });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        return res.status(500).json({ error: msg });
      }
    });

    // POST /api/publish-agents
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

        // Send individual push notifications per agent per app (fire-and-forget)
        const notifItems = inserts
          .filter(ins => agentIdMap[ins.agent_name])
          .map(ins => ({
            userId: agentIdMap[ins.agent_name],
            title: `💰 Comisiones de ${ins.app_name} disponibles`,
            body: `Semana ${ins.semana} — $${Number(ins.total_commission_usd).toFixed(2)} de comisión — Entra a ver el detalle.`,
            url: '/agente',
          }));
        setImmediate(() => { dispatchPushIndividual(notifItems).catch(() => {}); });

        const agentUserIds = Object.values(agentIdMap).filter(Boolean);
        return res.json({ ok: true, saved: resolved.length, agentUserIds });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        return res.status(500).json({ error: msg });
      }
    });

  // PATCH /api/publish-salaries/tag-cup-rates
  // Saves the exchange rate into published_salaries.extras so CUP amounts persist after unpublish
  router.patch('/publish-salaries/tag-cup-rates', async (req, res) => {
    const { semana, cups } = req.body as { semana: string; cups: Record<string, number> }
    if (!semana || !cups) { res.status(400).json({ error: 'semana and cups required' }); return }
    try {
      const fetchRes = await fetch(sbUrl(`published_salaries?semana=eq.${encodeURIComponent(semana)}&select=id,extras`), {
        headers: sbHeaders() as Record<string, string>,
      })
      const records = await fetchRes.json() as { id: string; extras: Record<string, unknown> | null }[]
      if (!Array.isArray(records) || records.length === 0) { res.json({ ok: true, updated: 0 }); return }
      await Promise.all(records.map(record =>
        fetch(sbUrl(`published_salaries?id=eq.${record.id}`), {
          method: 'PATCH',
          headers: sbHeaders('return=minimal') as Record<string, string>,
          body: JSON.stringify({ extras: { ...(record.extras ?? {}), ...cups } }),
        })
      ))
      res.json({ ok: true, updated: records.length })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error'
      res.status(500).json({ error: msg })
    }
  })

      export default router;
  