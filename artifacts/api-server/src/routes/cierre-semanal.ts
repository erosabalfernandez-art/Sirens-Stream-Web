import { Router } from 'express';
import { dispatchPush } from '../lib/push-dispatch';

      const router = Router();

      function sbH(prefer?: string): Record<string, string> {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
        return {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: prefer ?? 'return=representation',
        };
      }
      function sbUrl(path: string): string {
        return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
      }

            // GET /api/no-cobro — returns all entries enriched with agent display names
        router.get('/no-cobro', async (_req, res) => {
          try {
            const r = await fetch(sbUrl('weekly_no_cobro?order=app_name.asc,user_id.asc,created_at.desc&select=*'), { headers: sbH() });
            if (!r.ok) {
              const txt = await r.text();
              if (txt.includes('42P01') || txt.includes('does not exist')) return res.status(404).json({ error: txt });
              return res.status(r.status).json({ error: txt });
            }
            const entries = await r.json() as Array<Record<string, unknown>>;

            // Resolve agente_name for entries where it is null but agente_code is present
            const missingNameCodes = [...new Set(
              entries
                .filter((e) => e.agente_code && !e.agente_name)
                .map((e) => e.agente_code as string)
            )];
            if (missingNameCodes.length > 0) {
              const codes = missingNameCodes.map(c => '"' + c + '"').join(',');
              const profRes = await fetch(
                sbUrl(`profiles?agent_code=in.(${codes})&select=agent_code,agent_name,colider_name`),
                { headers: sbH() }
              );
              if (profRes.ok) {
                const profs = await profRes.json() as Array<{ agent_code: string; agent_name: string | null; colider_name: string | null }>;
                const nameMap: Record<string, string> = {};
                for (const p of profs) {
                  if (p.agent_code) nameMap[p.agent_code] = p.agent_name ?? p.colider_name ?? p.agent_code;
                }
                for (const entry of entries) {
                  if (entry.agente_code && !entry.agente_name) {
                    entry.agente_name = nameMap[entry.agente_code as string] ?? entry.agente_code;
                  }
                }
              }
            }

            return res.json({ ok: true, entries });
          } catch (e: unknown) {
            return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
          }
        });

      // PATCH /api/toggle-justified — toggle justified flag on a no-cobro entry
      router.patch('/toggle-justified', async (req, res) => {
        const { id, justified } = req.body as { id: string; justified: boolean };
        if (!id) return res.status(400).json({ error: 'id requerido' });
        try {
          const r = await fetch(sbUrl(`weekly_no_cobro?id=eq.${encodeURIComponent(id)}`), {
            method: 'PATCH',
            headers: { ...sbH(), Prefer: 'return=minimal' },
            body: JSON.stringify({ justified: !!justified }),
          });
          if (!r.ok) return res.status(r.status).json({ error: await r.text() });
          return res.json({ ok: true });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
        }
      });

      // POST /api/cierre-semanal
      // Body: { force?: boolean }
      //
      // Qué hace el cierre:
      //   - CONSERVA published_salaries  → historial permanente de cada trabajadora en /salarios
      //   - CONSERVA agent_commissions   → historial permanente de cada agente en /agente
      //   - CONSERVA nomina_history      → archivo del admin
      //   - BORRA payment_confirmations  (para los salarios de esa semana) → resetea confirmaciones
      //   - BORRA agent_payment_confirmations (para las comisiones de esa semana)
      //   - BORRA colider_week_status    → resetea estado del colider
      //   - BORRA weekly_no_cobro        → resetea lista de no-cobro
      //   - BORRA colider_marks          → resetea marcas de pago del colider
      //   - BORRA direct_payment_notifications → resetea notificaciones de pago directo (Layla)
      //   - PONE exchange_rates a 0  → oculta cambio a trabajadoras, colider y agentes hasta nueva publicación
      //   - MARCA nomina_history como published=false → desbloquea la página de nómina para nueva semana
      router.post('/cierre-semanal', async (req, res) => {
        const force = !!(req.body as Record<string, unknown>)?.force;
        try {
          // 1. Fetch current active salaries and commissions
          const [salariesRes, commissionsRes] = await Promise.all([
            fetch(sbUrl('published_salaries?select=id,user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
            fetch(sbUrl('agent_commissions?select=id,agent_name,agent_user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
          ]);
          const allSalaries: any[] = salariesRes.ok ? (await salariesRes.json()) as any[] : [];
          const allCommissions: any[] = commissionsRes.ok ? (await commissionsRes.json()) as any[] : [];

          if (allSalaries.length === 0 && allCommissions.length === 0) {
            return res.json({ ok: true, allConfirmed: true, message: 'No hay nóminas activas esta semana.' });
          }

          // Most recent semana across both tables
          const semanas = [...new Set([
            ...allSalaries.map((s: any) => s.semana),
            ...allCommissions.map((c: any) => c.semana),
          ])].sort().reverse();
          const latestSemana = semanas[0];

          // 2. If normal cierre, verify all confirmations before proceeding
          if (!force) {
            const latestSalaries = allSalaries.filter((s: any) => s.semana === latestSemana);
            const latestCommissions = allCommissions.filter((c: any) => c.semana === latestSemana);
            const salaryIds = latestSalaries.map((s: any) => s.id);
            const commissionIds = latestCommissions.filter((c: any) => c.agent_user_id).map((c: any) => c.id);

            const [coliderMarksRes, wConfRes, aConfRes] = await Promise.all([
              fetch(sbUrl(`colider_marks?semana=eq.${encodeURIComponent(latestSemana)}&select=person_uid,person_name,person_real_name,person_app,person_type,paid`), { headers: sbH() }),
              salaryIds.length > 0
                ? fetch(sbUrl(`payment_confirmations?salary_id=in.(${salaryIds.map((id: string) => `"${id}"`).join(',')})&select=salary_id`), { headers: sbH() })
                : Promise.resolve(null),
              commissionIds.length > 0
                ? fetch(sbUrl(`agent_payment_confirmations?commission_id=in.(${commissionIds.map((id: string) => `"${id}"`).join(',')})&select=commission_id`), { headers: sbH() })
                : Promise.resolve(null),
            ]);

            const coliderMarks: any[] = coliderMarksRes.ok ? (await coliderMarksRes.json()) as any[] : [];
            const unpaidMarks = coliderMarks.filter((m: any) => !m.paid);
            const allColiderPaid = coliderMarks.length > 0 && unpaidMarks.length === 0;

            const wConfs: any[] = wConfRes && wConfRes.ok ? (await wConfRes.json()) as any[] : [];
            const aConfs: any[] = aConfRes && aConfRes.ok ? (await aConfRes.json()) as any[] : [];

            const confirmedWorkers = new Set(wConfs.map((c: any) => c.salary_id));
            const confirmedAgents  = new Set(aConfs.map((c: any) => c.commission_id));

            const unconfirmedWorkers = latestSalaries.filter((s: any) => !confirmedWorkers.has(s.id));
            const unconfirmedAgents  = latestCommissions.filter((c: any) => c.agent_user_id && !confirmedAgents.has(c.id));

            if (!allColiderPaid || unconfirmedWorkers.length > 0 || unconfirmedAgents.length > 0) {
              const pending: any[] = [];

                // --- Colider section ---
                if (!allColiderPaid) {
                  if (coliderMarks.length === 0) {
                    pending.push({ type: 'colider', name: 'El colider aún no ha marcado ningún pago', app: '\u2014', phone: null });
                  } else {
                    // Fetch phones for unpaid persons
                    const coliderPersonUids = [...new Set(unpaidMarks.filter((m: any) => m.person_uid).map((m: any) => m.person_uid as string))];
                    const coliderPhoneMap: Record<string, string | null> = {};
                    if (coliderPersonUids.length > 0) {
                      const cpUidStr = coliderPersonUids.map((id: string) => '"' + id + '"').join(',');
                      const phoneRes = await fetch(sbUrl('profiles?id=in.(' + cpUidStr + ')&select=id,telefono,phone'), { headers: sbH() });
                      const phoneProfs: any[] = phoneRes.ok ? (await phoneRes.json()) as any[] : [];
                      for (const pp of phoneProfs) coliderPhoneMap[pp.id] = pp.telefono ?? pp.phone ?? null;
                    }
                    for (const m of unpaidMarks) {
                      pending.push({ type: 'colider_pendiente', app: m.person_app ?? m.person_type ?? '\u2014', name: m.person_real_name ?? m.person_name ?? m.person_uid, phone: coliderPhoneMap[m.person_uid] ?? null });
                    }
                  }
                }

                // --- Workers section ---
                if (unconfirmedWorkers.length > 0) {
                  const uids = [...new Set(unconfirmedWorkers.map((s: any) => s.user_id))];
                  const uidStr = uids.map((id: string) => '"' + id + '"').join(',');
                  const [profRes, workerRes] = await Promise.all([
                    fetch(sbUrl('profiles?id=in.(' + uidStr + ')&select=id,email'), { headers: sbH() }),
                    fetch(sbUrl('worker_entries?user_id=in.(' + uidStr + ')&select=user_id,nombre_en_app,nombre_real,app_name,telefono,codigo_pais'), { headers: sbH() }),
                  ]);
                  const profiles: any[] = profRes.ok ? (await profRes.json()) as any[] : [];
                  const workerData: any[] = workerRes.ok ? (await workerRes.json()) as any[] : [];
                  const emailMap: Record<string,string> = Object.fromEntries(profiles.map((p: any) => [p.id, p.email ?? '']));
                  const workerMap: Record<string,any> = {};
                  for (const w of workerData) workerMap[w.user_id + '_' + w.app_name] = w;
                  // Group by user — collect all unconfirmed apps per person
                  const byUser: Record<string, { name: string; apps: string[]; phone: string | null; codigoPais: string }> = {};
                  for (const s of unconfirmedWorkers) {
                    const w = workerMap[s.user_id + '_' + s.app_name] ?? {};
                    const uid = s.user_id as string;
                    if (!byUser[uid]) {
                      byUser[uid] = { name: w.nombre_en_app ?? w.nombre_real ?? emailMap[uid] ?? uid, apps: [], phone: w.telefono ?? null, codigoPais: w.codigo_pais ?? '+1' };
                    }
                    byUser[uid].apps.push(s.app_name);
                    if (!byUser[uid].phone && w.telefono) { byUser[uid].phone = w.telefono; byUser[uid].codigoPais = w.codigo_pais ?? '+1'; }
                  }
                  for (const info of Object.values(byUser)) {
                    pending.push({ type: 'trabajadora', app: info.apps.join(' \u00B7 '), apps: info.apps, name: info.name, phone: info.phone, codigoPais: info.codigoPais });
                  }
                }

                // --- Agents section: fetch real names + phones from profiles ---
                const agentUids = [...new Set(unconfirmedAgents.filter((c: any) => c.agent_user_id).map((c: any) => c.agent_user_id as string))];
                if (agentUids.length > 0) {
                  const agUidStr = agentUids.map((id: string) => '"' + id + '"').join(',');
                  const agProfRes = await fetch(sbUrl('profiles?id=in.(' + agUidStr + ')&select=id,agent_name,phone'), { headers: sbH() });
                  const agentProfs: any[] = agProfRes.ok ? (await agProfRes.json()) as any[] : [];
                  const agentProfMap: Record<string, any> = Object.fromEntries(agentProfs.map((p: any) => [p.id, p]));
                  const byAgent: Record<string, { name: string; apps: string[]; phone: string | null }> = {};
                  for (const c of unconfirmedAgents) {
                    if (!c.agent_user_id) continue;
                    const uid = c.agent_user_id as string;
                    const prof = agentProfMap[uid] ?? {};
                    if (!byAgent[uid]) {
                      byAgent[uid] = { name: prof.agent_name ?? c.agent_name ?? uid, apps: [], phone: prof.phone ?? null };
                    }
                    byAgent[uid].apps.push(c.app_name);
                  }
                  for (const info of Object.values(byAgent)) {
                    pending.push({ type: 'agente', app: info.apps.join(' \u00B7 '), apps: info.apps, name: info.name, phone: info.phone });
                  }
                } else if (unconfirmedAgents.length > 0) {
                  // fallback for agents without agent_user_id
                  for (const c of unconfirmedAgents) {
                    pending.push({ type: 'agente', app: c.app_name, name: c.agent_name, phone: null });
                  }
                }

                return res.json({ ok: false, allConfirmed: false, pending });
            }
          }

          // 3. All confirmed (or force) — reset weekly state
          //
          //    published_salaries   → KEPT (permanent worker history visible in /salarios)
          //    agent_commissions    → KEPT (permanent agent history visible in /agente)
          //    nomina_history       → KEPT (permanent admin archive)
          //
          //    What gets cleared:
          //      - payment_confirmations for this week's salaries
          //      - agent_payment_confirmations for this week's commissions
          //      - colider_week_status for this week
          //      - weekly_no_cobro for this week
          //      - colider_marks for this week
          //      - direct_payment_notifications (all — weekly operational data, semana format differs)

          const latestSalaryIds = allSalaries
            .filter((s: any) => s.semana === latestSemana)
            .map((s: any) => s.id);

          const latestCommissionIds = allCommissions
            .filter((c: any) => c.semana === latestSemana)
            .map((c: any) => c.id);

          const cleanupOps: Promise<any>[] = [
            // Clear colider status
            fetch(sbUrl(`colider_week_status?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear no-cobro records for this week
            fetch(sbUrl(`weekly_no_cobro?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear colider marks for this week (payment tracking by colider)
            fetch(sbUrl(`colider_marks?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear admin paid marks for this week
            fetch(sbUrl(`admin_paid_marks?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear direct payment notifications (Layla weekly resets)
            // Note: direct_payment_notifications uses YYYYMMDD semana format so we delete all
            fetch(sbUrl(`direct_payment_notifications?id=gte.00000000-0000-0000-0000-000000000000`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Mark nomina_history entries for this semana as published=false
            // so the nomina page unlocks for the next week on page reload
            fetch(sbUrl(`nomina_history?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'PATCH',
              headers: { ...sbH(), Prefer: 'return=minimal' },
              body: JSON.stringify({ published: false }),
            }),
            // Clear agent commission publish log so agents unlock for next cycle
            fetch(sbUrl(`agent_commission_publish_log?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear published agent commissions for this semana
            fetch(sbUrl(`published_agent_commissions?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Clear colider commission publish log for this semana
            fetch(sbUrl(`colider_commission_publish_log?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'DELETE',
              headers: { ...sbH(), Prefer: 'return=minimal' },
            }),
            // Zero out exchange_rates → weekClosed=true for agents/workers until new rates are published
            fetch(sbUrl(`exchange_rates?id=not.is.null`), {
              method: 'PATCH',
              headers: { ...sbH(), Prefer: 'return=minimal' },
              body: JSON.stringify({ rate: 0 }),
            }),
          ];

          if (latestSalaryIds.length > 0) {
            cleanupOps.push(
              fetch(sbUrl(`payment_confirmations?salary_id=in.(${latestSalaryIds.map((id: string) => `"${id}"`).join(',')})`), {
                method: 'DELETE',
                headers: { ...sbH(), Prefer: 'return=minimal' },
              })
            );
          }

          if (latestCommissionIds.length > 0) {
            cleanupOps.push(
              fetch(sbUrl(`agent_payment_confirmations?commission_id=in.(${latestCommissionIds.map((id: string) => `"${id}"`).join(',')})`), {
                method: 'DELETE',
                headers: { ...sbH(), Prefer: 'return=minimal' },
              })
            );
          }

          // Reset all exchange rates to 0 — workers, colider, and agents won't see rates until admin re-publishes
            cleanupOps.push(
              fetch(sbUrl('exchange_rates?rate=gte.0'), {
                method: 'PATCH',
                headers: { ...sbH(), Prefer: 'return=minimal' },
                body: JSON.stringify({ rate: 0, updated_at: new Date().toISOString() }),
              }).catch(() => Promise.resolve(new Response()))
            );

            // Delete all custom_worker_rates on cierre — removes per-worker assignments entirely
            // (ghost records from deleted users and stale rate=0 rows are fully cleaned up)
            cleanupOps.push(
              fetch(sbUrl('custom_worker_rates?id=gte.00000000-0000-0000-0000-000000000000'), {
                method: 'DELETE',
                headers: { ...sbH(), Prefer: 'return=minimal' },
              }).catch(() => Promise.resolve(new Response()))
            );

            // Unlock payment method for all users — they can choose again next week
            cleanupOps.push(
              fetch(sbUrl('payment_method_locks?locked=eq.true'), {
                method: 'PATCH',
                headers: { ...sbH(), Prefer: 'return=minimal' },
                body: JSON.stringify({ locked: false }),
              }).catch(() => Promise.resolve(new Response()))
            );

            // Clear baked-in CUP rates from published_salaries.extras for the closed semana.
            // salarios.tsx checks storedRate (extras.cup_*_rate) first — must clear on cierre
            // so Cuba workers stop seeing CUP until admin re-publishes rates for the new week.
            cleanupOps.push(
              (async () => {
                try {
                  const cupSalsRes = await fetch(
                    sbUrl(`published_salaries?semana=eq.${encodeURIComponent(latestSemana)}&select=id,extras`),
                    { headers: sbH() }
                  );
                  if (!cupSalsRes.ok) return;
                  const cupSals = await cupSalsRes.json() as Array<{ id: string; extras: Record<string, unknown> | null }>;
                  const toUpdate = cupSals.filter(s =>
                    s.extras && (
                      (typeof s.extras.cup_efectivo_rate === 'number' && (s.extras.cup_efectivo_rate as number) > 0) ||
                      (typeof s.extras.cup_transferencia_rate === 'number' && (s.extras.cup_transferencia_rate as number) > 0)
                    )
                  );
                  await Promise.all(toUpdate.map(s => {
                    const { cup_efectivo_rate: _a, cup_transferencia_rate: _b, ...rest } = s.extras ?? {};
                    return fetch(sbUrl(`published_salaries?id=eq.${s.id}`), {
                      method: 'PATCH',
                      headers: { ...sbH(), Prefer: 'return=minimal' },
                      body: JSON.stringify({ extras: Object.keys(rest).length ? rest : null }),
                    });
                  }));
                } catch { /* best-effort — never block cierre for rate cleanup */ }
              })()
            );


            await Promise.all(cleanupOps);

            // Notify workers, agents, and coliders that the week was officially closed (fire-and-forget)
            setImmediate(async () => {
              try {
                const workerIds = [...new Set(allSalaries.filter((s: any) => s.semana === latestSemana).map((s: any) => s.user_id as string))];
                const agentIds  = [...new Set(allCommissions.filter((c: any) => c.semana === latestSemana && c.agent_user_id).map((c: any) => c.agent_user_id as string))];
                const colRes = await fetch(sbUrl('profiles?is_colider=eq.true&select=id'), { headers: sbH() });
                const coliders: any[] = colRes.ok ? await colRes.json() : [];
                const coliderIds = coliders.map((r: any) => r.id as string).filter(Boolean);
                const semLabel = latestSemana ?? '';
                const notifs: Promise<any>[] = [];
                if (workerIds.length > 0) notifs.push(dispatchPush(workerIds, '🔒 Cierre de semana', `La semana ${semLabel} ha sido cerrada. Tu historial de pagos está disponible en la sección Salarios.`, '/salarios'));
                if (agentIds.length  > 0) notifs.push(dispatchPush(agentIds,  '🔒 Cierre de semana', `La semana ${semLabel} ha concluido. El nuevo ciclo de trabajo ha comenzado.`, '/agente'));
                if (coliderIds.length > 0) notifs.push(dispatchPush(coliderIds, '🔒 Cierre de semana', `La semana ${semLabel} ha sido cerrada por el administrador. El nuevo ciclo está activo.`, '/colider'));
                await Promise.all(notifs);
              } catch { /* ignore push errors */ }
            });

            return res.json({ ok: true, allConfirmed: true, semana: latestSemana, forced: force });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
        }
      });


  // POST /api/admin/reset-all-history
  // ⚠️ NUCLEAR RESET — deletes ALL payroll history permanently.
  router.post('/admin/reset-all-history', async (req, res) => {
    const { confirm } = req.body as { confirm?: string }
    if (confirm !== 'BORRAR TODO') {
      return res.status(400).json({ error: 'Se requiere confirmación: { confirm: "BORRAR TODO" }' })
    }

    // Each entry: [table, filter] — PostgREST needs a filter to allow DELETE
    // UUID-id tables: id=gte.00000000-0000-0000-0000-000000000000  (matches every valid UUID)
    // semana-only tables: semana=like.*  (matches every non-null text)
    const TABLES: [string, string][] = [
      ['published_salaries',            'id=gte.00000000-0000-0000-0000-000000000000'],
      ['agent_commissions',             'id=gte.00000000-0000-0000-0000-000000000000'],
      ['published_agent_commissions',   'id=gte.00000000-0000-0000-0000-000000000000'],
      ['agent_commission_publish_log',  'semana=like.*'],
      ['colider_commission_publish_log','semana=like.*'],
      ['weekly_no_cobro',               'id=gte.00000000-0000-0000-0000-000000000000'],
      ['colider_marks',                 'id=gte.00000000-0000-0000-0000-000000000000'],
        ['admin_paid_marks',               'id=gte.00000000-0000-0000-0000-000000000000'],
      ['colider_week_status',           'id=gte.00000000-0000-0000-0000-000000000000'],
      ['payment_confirmations',         'id=gte.00000000-0000-0000-0000-000000000000'],
      ['agent_payment_confirmations',   'id=gte.00000000-0000-0000-0000-000000000000'],
      ['direct_payment_notifications',  'id=gte.00000000-0000-0000-0000-000000000000'],
      ['nomina_history',                'id=gte.00000000-0000-0000-0000-000000000000'],
      ['channel_messages',             'id=gte.00000000-0000-0000-0000-000000000000'],
      ['payment_sticker_events',        'id=gte.00000000-0000-0000-0000-000000000000'],
    ]

    const results: Record<string, string> = {}

    await Promise.all(
      TABLES.map(async ([table, filter]) => {
        try {
          const r = await fetch(
            sbUrl(`${table}?${filter}`),
            { method: 'DELETE', headers: { ...sbH(), Prefer: 'return=minimal' } }
          )
          if (!r.ok) {
            const txt = await r.text()
            if (txt.includes('42P01') || txt.includes('does not exist')) {
              results[table] = 'skipped (no existe)'
            } else {
              results[table] = `error: ${txt.substring(0, 200)}`
            }
          } else {
            results[table] = 'cleared'
          }
        } catch (e: unknown) {
          results[table] = `exception: ${e instanceof Error ? e.message : String(e)}`
        }
      })
    )

    // Also reset ranking timestamp
    try {
      await fetch(
        sbUrl('site_settings'),
        {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' } as Record<string, string>,
          body: JSON.stringify({ key: 'ranking_reset_at', value: new Date().toISOString() }),
        }
      )
      results['ranking_reset'] = 'reset'
    } catch (e: unknown) {
      results['ranking_reset'] = `exception: ${e instanceof Error ? e.message : String(e)}`
    }

    const errors = Object.entries(results).filter(([,v]) => v.startsWith('error') || v.startsWith('exception'))
    return res.json({ ok: errors.length === 0, results })
  })
  
      export default router;
