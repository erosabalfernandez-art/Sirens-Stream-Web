import { Router } from 'express';

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

      // GET /api/no-cobro — returns all entries (no period state)
      router.get('/no-cobro', async (_req, res) => {
        try {
          const r = await fetch(sbUrl('weekly_no_cobro?order=app_name.asc,user_id.asc,created_at.desc&select=*'), { headers: sbH() });
          if (!r.ok) {
            const txt = await r.text();
            if (txt.includes('42P01') || txt.includes('does not exist')) return res.status(404).json({ error: txt });
            return res.status(r.status).json({ error: txt });
          }
          const entries = await r.json();
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
      //   - MARCA nomina_history como published=false → desbloquea la página de nómina para nueva semana
      router.post('/cierre-semanal', async (req, res) => {
        const force = !!(req.body as Record<string, unknown>)?.force;
        try {
          // 1. Fetch current active salaries and commissions
          const [salariesRes, commissionsRes] = await Promise.all([
            fetch(sbUrl('published_salaries?select=id,user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
            fetch(sbUrl('agent_commissions?select=id,agent_name,agent_user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
          ]);
          const allSalaries: any[] = salariesRes.ok ? await salariesRes.json() : [];
          const allCommissions: any[] = commissionsRes.ok ? await commissionsRes.json() : [];

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

            const [coliderRes, wConfRes, aConfRes] = await Promise.all([
              fetch(sbUrl(`colider_week_status?semana=eq.${encodeURIComponent(latestSemana)}&limit=1&select=notified,admin_closed`), { headers: sbH() }),
              salaryIds.length > 0
                ? fetch(sbUrl(`payment_confirmations?salary_id=in.(${salaryIds.map((id: string) => `"${id}"`).join(',')})&select=salary_id`), { headers: sbH() })
                : Promise.resolve(null),
              commissionIds.length > 0
                ? fetch(sbUrl(`agent_payment_confirmations?commission_id=in.(${commissionIds.map((id: string) => `"${id}"`).join(',')})&select=commission_id`), { headers: sbH() })
                : Promise.resolve(null),
            ]);

            const coliderData: any[] = coliderRes.ok ? await coliderRes.json() : [];
            const coliderStatus = coliderData[0] ?? null;
            const coliderNotified = !!(coliderStatus?.notified && !coliderStatus?.admin_closed);

            const wConfs: any[] = wConfRes && wConfRes.ok ? await wConfRes.json() : [];
            const aConfs: any[] = aConfRes && aConfRes.ok ? await aConfRes.json() : [];

            const confirmedWorkers = new Set(wConfs.map((c: any) => c.salary_id));
            const confirmedAgents  = new Set(aConfs.map((c: any) => c.commission_id));

            const unconfirmedWorkers = latestSalaries.filter((s: any) => !confirmedWorkers.has(s.id));
            const unconfirmedAgents  = latestCommissions.filter((c: any) => c.agent_user_id && !confirmedAgents.has(c.id));

            if (!coliderNotified || unconfirmedWorkers.length > 0 || unconfirmedAgents.length > 0) {
              const pending: any[] = [];

              if (!coliderNotified) {
                pending.push({ type: 'colider', name: 'El colider aún no notificó que terminó los pagos', app: '—' });
              }

              if (unconfirmedWorkers.length > 0) {
                const uids = [...new Set(unconfirmedWorkers.map((s: any) => s.user_id))];
                const uidStr = uids.map((id: string) => `"${id}"`).join(',');
                const [profRes, workerRes] = await Promise.all([
                  fetch(sbUrl(`profiles?id=in.(${uidStr})&select=id,email`), { headers: sbH() }),
                  fetch(sbUrl(`worker_entries?user_id=in.(${uidStr})&select=user_id,nombre_en_app,nombre_real,app_name`), { headers: sbH() }),
                ]);
                const profiles: any[] = profRes.ok ? await profRes.json() : [];
                const workerData: any[] = workerRes.ok ? await workerRes.json() : [];
                const emailMap: Record<string,string> = Object.fromEntries(profiles.map((p: any) => [p.id, p.email ?? '']));
                const workerMap: Record<string,any> = {};
                for (const w of workerData) workerMap[`${w.user_id}_${w.app_name}`] = w;
                for (const s of unconfirmedWorkers) {
                  const w = workerMap[`${s.user_id}_${s.app_name}`] ?? {};
                  pending.push({ type: 'trabajadora', app: s.app_name, name: w.nombre_en_app ?? w.nombre_real ?? emailMap[s.user_id] ?? s.user_id });
                }
              }

              pending.push(...unconfirmedAgents.map((c: any) => ({ type: 'agente', app: c.app_name, name: c.agent_name })));
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
            // Mark nomina_history entries for this semana as published=false
            // so the nomina page unlocks for the next week on page reload
            fetch(sbUrl(`nomina_history?semana=eq.${encodeURIComponent(latestSemana)}`), {
              method: 'PATCH',
              headers: { ...sbH(), Prefer: 'return=minimal' },
              body: JSON.stringify({ published: false }),
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

          await Promise.all(cleanupOps);

          return res.json({ ok: true, allConfirmed: true, semana: latestSemana, forced: force });
        } catch (e: unknown) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
        }
      });


  // POST /api/admin/reset-all-history
  // ⚠️ NUCLEAR RESET — deletes ALL payroll history permanently.
  // Tables cleared: published_salaries, agent_commissions, published_agent_commissions,
  //   agent_commission_publish_log, colider_commission_publish_log, weekly_no_cobro,
  //   colider_marks, colider_week_status, payment_confirmations,
  //   agent_payment_confirmations, direct_payment_notifications, nomina_history
  router.post('/admin/reset-all-history', async (req, res) => {
    const { confirm } = req.body as { confirm?: string }
    if (confirm !== 'BORRAR TODO') {
      return res.status(400).json({ error: 'Se requiere confirmación: { confirm: "BORRAR TODO" }' })
    }

    const TABLES = [
      'published_salaries',
      'agent_commissions',
      'published_agent_commissions',
      'agent_commission_publish_log',
      'colider_commission_publish_log',
      'weekly_no_cobro',
      'colider_marks',
      'colider_week_status',
      'payment_confirmations',
      'agent_payment_confirmations',
      'direct_payment_notifications',
      'nomina_history',
    ]

    const results: Record<string, string> = {}

    await Promise.all(
      TABLES.map(async (table) => {
        try {
          // PostgREST requires a filter to DELETE; neq=null deletes all rows
          const r = await fetch(
            sbUrl(`${table}?id=neq.00000000-0000-0000-0000-000000000000`),
            { method: 'DELETE', headers: { ...sbH(), Prefer: 'return=minimal' } }
          )
          if (!r.ok) {
            const txt = await r.text()
            // Table may not exist — treat as success
            if (txt.includes('42P01') || txt.includes('does not exist')) {
              results[table] = 'skipped (table does not exist)'
            } else {
              results[table] = `error: ${txt.substring(0, 120)}`
            }
          } else {
            results[table] = 'cleared'
          }
        } catch (e: unknown) {
          results[table] = `exception: ${e instanceof Error ? e.message : String(e)}`
        }
      })
    )

    return res.json({ ok: true, results })
  })
  
      export default router;
