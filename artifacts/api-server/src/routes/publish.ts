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
                  // Notify each no-cobro worker (fire-and-forget)
                  dispatchPushIndividual(zeroEarners.map(w => ({
                    userId: w.user_id,
                    title: `⚠️ Sin cobro registrado — ${app_name}`,
                    body: `No se registró ningún cobro para la semana ${semana}. Si crees que es un error, comunícate con tu agente.`,
                    url: '/salarios',
                  }))).catch(() => {});
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
                    // Notify each Layla no-cobro worker (fire-and-forget)
                    dispatchPushIndividual(laylaNoEarners.map(w => ({
                      userId: w.user_id,
                      title: '⚠️ Sin cobro registrado — Layla',
                      body: `No se registró ningún cobro para la semana ${semana} en Layla. Si crees que es un error, comunícate con tu agente.`,
                      url: '/salarios',
                    }))).catch(() => {});
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
            title: `💰 Tu salario de ${insert.app_name} está listo`,
                        body: `Tu pago de la semana ${insert.semana} ya está disponible.`,
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
                `💰 Nómina publicada — ${app_name}`,
                `Los salarios de la semana ${semana} han sido publicados.`,
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

        // Also try resolving by agent_code (Layla publishes with agent_name = agent_code like "EA-XXXXXXXX")
        const unresolvedNames = agentNames.filter(n => !agentIdMap[n])
        const agentDisplayNameMap: Record<string, string> = {}
        if (unresolvedNames.length > 0) {
            const codeRes = await fetch(
              sbUrl(`profiles?agent_code=in.(${unresolvedNames.map(n => '"' + n + '"').join(',')})&select=id,agent_code,agent_name,colider_name`),
              { headers: sbHeaders() as Record<string, string> }
            )
            if (codeRes.ok) {
              const codeProfiles = await codeRes.json() as { id: string; agent_code: string | null; agent_name: string | null; colider_name: string | null }[]
              for (const p of codeProfiles) {
                if (p.agent_code && p.id) {
                  agentIdMap[p.agent_code] = p.id
                  // Use colider_name first, then agent_name — never fall back to the raw agent_code as display name
                  const displayName = p.colider_name ?? p.agent_name
                  if (displayName) agentDisplayNameMap[p.agent_code] = displayName
                }
              }
            }
          }

        const resolved = inserts.map(row => ({
          ...row,
          agent_user_id: agentIdMap[row.agent_name] ?? null,
          agent_name: agentDisplayNameMap[row.agent_name] ?? row.agent_name,
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

          // Auto-detect agents with zero commission → weekly_no_cobro (fire-and-forget)
          setImmediate(async () => {
            try {
              const zeroAgents = inserts.filter(ins => Number(ins.total_commission_usd) === 0 && agentIdMap[ins.agent_name]);
              if (zeroAgents.length > 0) {
                const rows = zeroAgents.map(ins => ({
                  user_id: agentIdMap[ins.agent_name],
                  app_name: ins.app_name,
                  semana: ins.semana,
                  reason: 'zero_commission',
                  nombre_en_app: ins.agent_name,
                  nombre_real: ins.agent_name,
                  email: null,
                }));
                await fetch(sbUrl('weekly_no_cobro?on_conflict=user_id,app_name,semana'), {
                  method: 'POST',
                  headers: { ...(sbHeaders() as Record<string,string>), Prefer: 'resolution=merge-duplicates,return=minimal' },
                  body: JSON.stringify(rows),
                });
              }
            } catch { /* best-effort */ }
          });
  
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
      // Notify workers that their CUP salary is now ready (fire-and-forget)
        setImmediate(async () => {
          try {
            const userIds = Object.keys(cups);
            if (!userIds.length) return;
            const salRes = await fetch(
              sbUrl(`published_salaries?semana=eq.${encodeURIComponent(semana)}&user_id=in.(${userIds.map((id: string) => '"' + id + '"').join(',')})&select=user_id,app_name`),
              { headers: sbHeaders() as Record<string, string> }
            );
            if (!salRes.ok) return;
            const salRows = (await salRes.json()) as { user_id: string; app_name: string }[];
            if (!salRows.length) return;
            await dispatchPushIndividual(salRows.map(r => ({
              userId: r.user_id,
              title: `💰 Tu salario de ${r.app_name} está listo`,
              body: 'Entra a la web para ver tu pago.',
              url: '/salarios',
            })));
          } catch { /* best-effort */ }
        });
          // Notify workers that their CUP salary is ready (fire-and-forget)
        setImmediate(async () => {
          try {
            const userIds = Object.keys(cups);
            if (!userIds.length) return;
            const salRes = await fetch(
              sbUrl(`published_salaries?semana=eq.${encodeURIComponent(semana)}&user_id=in.(${userIds.map((id: string) => '"' + id + '"').join(',')})&select=user_id,app_name`),
              { headers: sbHeaders() as Record<string, string> }
            );
            if (!salRes.ok) return;
            const salRows = (await salRes.json()) as { user_id: string; app_name: string }[];
            if (!salRows.length) return;
            await dispatchPushIndividual(salRows.map(r => ({
              userId: r.user_id,
              title: `💰 Tu salario de ${r.app_name} está listo`,
              body: `Tu pago de la semana ${semana} ya está disponible.`,
              url: '/salarios',
            })));
          } catch { /* best-effort */ }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown error'
        res.status(500).json({ error: msg })
      }
    })


      // GET /api/no-cobro — admin: all no-cobro entries enriched with worker + agent data
      router.get('/no-cobro', async (req, res) => {
        try {
          const h = sbHeaders() as Record<string, string>;

          // 1. No-cobro entries
          const r = await fetch(sbUrl('weekly_no_cobro?select=*&order=semana.desc,created_at.desc'), { headers: h });
          if (!r.ok) { const e = await r.text(); return res.status(r.status).json({ error: e }); }
          const entries: any[] = await r.json();
          if (!entries.length) return res.json({ ok: true, entries: [] });

          // 2. Worker entries for this set of users (id_aplicacion, telefono, agente code)
          const userIds = [...new Set(entries.map((e: any) => e.user_id))];
          const wRes = await fetch(
            sbUrl(`worker_entries?user_id=in.(${userIds.join(',')})&select=user_id,app_name,id_aplicacion,telefono,codigo_pais,agente`),
            { headers: h }
          );
          const workers: any[] = wRes.ok ? await wRes.json() : [];

          // 3. Agent profiles by code (name + phone)
          const agentCodes = [...new Set(workers.map((w: any) => w.agente).filter(Boolean))];
          let agentProfiles: any[] = [];
          if (agentCodes.length) {
            const aRes = await fetch(
              sbUrl(`profiles?agent_code=in.(${agentCodes.join(',')})&select=agent_code,agent_name,colider_name,telefono,phone`),
              { headers: h }
            );
            if (aRes.ok) agentProfiles = await aRes.json();
          }

          // 4. Lookup maps
          const workerMap: Record<string, any> = {};
          for (const w of workers) workerMap[`${w.user_id}_${w.app_name}`] = w;
          const agentMap: Record<string, any> = {};
          for (const a of agentProfiles) agentMap[a.agent_code] = a;

          // 5. Enrich
          const enriched = entries.map((e: any) => {
            const w = workerMap[`${e.user_id}_${e.app_name}`] || {};
            const ag = agentMap[w.agente] || {};
            return {
              ...e,
              id_aplicacion:       w.id_aplicacion ?? null,
              telefono_worker:     w.telefono ?? null,
              codigo_pais_worker:  w.codigo_pais ?? null,
              agente_code:         w.agente ?? null,
              agente_name:         ag.agent_name ?? ag.colider_name ?? null,
              agente_phone:        ag.telefono ?? ag.phone ?? null,
            };
          });

          return res.json({ ok: true, entries: enriched });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
        }
      });

        // GET /api/agent/no-cobro — agents & coliders: filtered to their girls + enriched
      router.get('/agent/no-cobro', async (req, res) => {
        try {
          const agentId = req.query.agent_id as string | undefined;
          if (!agentId) return res.json({ ok: true, entries: [] });

          const h = sbHeaders() as Record<string, string>;

          // 1. Get agent_code from profile
          const profR = await fetch(sbUrl(`profiles?id=eq.${encodeURIComponent(agentId)}&select=agent_code`), { headers: h });
          if (!profR.ok) return res.status(500).json({ error: 'profile lookup failed' });
          const profs = await profR.json() as Array<{ agent_code: string | null }>;
          const prof = profs[0];
          const agentCode = prof?.agent_code ?? null;
          if (!agentCode) return res.json({ ok: true, entries: [] });

          // 2. Get worker user_ids that belong to this agent
          const weR = await fetch(sbUrl(`worker_entries?agente=eq.${encodeURIComponent(agentCode)}&select=user_id,id_aplicacion,telefono,codigo_pais`), { headers: h });
          if (!weR.ok) return res.json({ ok: true, entries: [] });
          const workers = await weR.json() as Array<{ user_id: string; id_aplicacion: string | null; telefono: string | null; codigo_pais: string | null }>;
          if (!workers.length) return res.json({ ok: true, entries: [] });

          const workerMap: Record<string, { id_aplicacion: string | null; telefono: string | null; codigo_pais: string | null }> = {};
          for (const w of workers) workerMap[w.user_id] = { id_aplicacion: w.id_aplicacion, telefono: w.telefono, codigo_pais: w.codigo_pais };

          // 3. Fetch no-cobro for those user_ids (OR filter)
          const uids = workers.map(w => w.user_id);
          const orFilter = uids.map(id => `user_id.eq.${id}`).join(',');
          const ncR = await fetch(sbUrl(`weekly_no_cobro?or=(${encodeURIComponent(orFilter)})&order=semana.desc,created_at.desc`), { headers: h });
          if (!ncR.ok) { const e = await ncR.text(); return res.status(ncR.status).json({ error: e }); }
          const rawEntries = await ncR.json() as Array<Record<string, unknown>>;

          // 4. Enrich with worker phone + id_aplicacion
          const entries = rawEntries.map(e => {
            const wk = workerMap[e.user_id as string] ?? {};
            return { ...e, id_aplicacion: wk.id_aplicacion ?? null, telefono_worker: wk.telefono ?? null, codigo_pais_worker: wk.codigo_pais ?? null };
          });

          return res.json({ ok: true, entries });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
        }
      });

    // PATCH /api/toggle-justified — toggle justified flag
    router.patch('/toggle-justified', async (req, res) => {
        const { id, justified } = req.body as { id: string; justified: boolean };
        if (!id) return res.status(400).json({ error: 'id requerido' });
        try {
          // Fetch entry to get user_id/app_name for notification
          const ncRes = await fetch(sbUrl(`weekly_no_cobro?id=eq.${encodeURIComponent(id)}&select=user_id,app_name,semana`), { headers: sbHeaders() as Record<string, string> });
          const ncRows = ncRes.ok ? await ncRes.json() as { user_id: string; app_name: string; semana: string }[] : [];
          const ncEntry = ncRows[0];

          const r = await fetch(
            sbUrl(`weekly_no_cobro?id=eq.${encodeURIComponent(id)}`),
            {
              method: 'PATCH',
              headers: sbHeaders('return=minimal') as Record<string, string>,
              body: JSON.stringify({ justified: !!justified }),
            }
          );
          if (!r.ok) { const e = await r.text(); return res.status(r.status).json({ error: e }); }
          // Notify worker of justification change (fire-and-forget)
          if (ncEntry?.user_id) {
            setImmediate(() => {
              dispatchPushIndividual([{
                userId: ncEntry.user_id,
                title: justified ? 'ℹ️ Ausencia de cobro justificada' : '⚠️ Sin cobro registrado',
                body: justified
                  ? 'El estado de tu cobro ha sido actualizado. Entra a la web para verlo.'
                  : 'El estado de tu cobro ha cambiado. Entra a la web para verlo.',
                url: '/salarios',
              }]).catch(() => {});
            });
          }
          return res.json({ ok: true });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
      }
    });

  

      // POST /api/confirm-payment — worker confirms payment received; notifies their colider/agent
      router.post('/confirm-payment', async (req, res) => {
        try {
          const { salary_id, user_id, app_name, semana } = req.body as {
            salary_id: string; user_id: string; app_name: string; semana: string;
          };
          if (!salary_id || !user_id || !app_name || !semana)
            return res.status(400).json({ error: 'Missing fields' });
          const h = sbHeaders() as Record<string, string>;
          const iRes = await fetch(sbUrl('payment_confirmations'), {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ salary_id, user_id, app_name, semana }),
          });
          if (!iRes.ok) {
            const errText = await iRes.text();
            if (!errText.includes('23505') && !errText.includes('duplicate'))
              return res.status(iRes.status).json({ error: errText });
          }
          setImmediate(async () => {
            try {
              const weRes = await fetch(sbUrl(`worker_entries?user_id=eq.${encodeURIComponent(user_id)}&app_name=eq.${encodeURIComponent(app_name)}&select=agente`), { headers: h });
              if (!weRes.ok) return;
              const workers = await weRes.json() as Array<{ agente: string | null }>;
              const agentCode = workers[0]?.agente;
              if (!agentCode) return;
              const profRes = await fetch(sbUrl(`profiles?agent_code=eq.${encodeURIComponent(agentCode)}&select=id`), { headers: h });
              if (!profRes.ok) return;
              const profs = await profRes.json() as Array<{ id: string }>;
              if (!profs[0]) return;
              await dispatchPushIndividual([{
                userId: profs[0].id,
                title: '✅ Pago confirmado',
                body: 'Se ha confirmado un pago. Entra a la web para verlo.',
                url: '/agente',
              }]);
            } catch { /* fire-and-forget */ }
          });
          return res.json({ ok: true });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'error' });
        }
      });
  
      export default router;
  