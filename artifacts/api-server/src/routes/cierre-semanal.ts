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

    // POST /api/cierre-semanal — check all confirmations, if all confirmed clear nomina state
    router.post('/cierre-semanal', async (_req, res) => {
      try {
        const [salariesRes, commissionsRes] = await Promise.all([
          fetch(sbUrl('published_salaries?select=id,user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
          fetch(sbUrl('agent_commissions?select=id,agent_name,agent_user_id,app_name,semana&order=semana.desc'), { headers: sbH() }),
        ]);
        const allSalaries: any[] = salariesRes.ok ? await salariesRes.json() : [];
        const allCommissions: any[] = commissionsRes.ok ? await commissionsRes.json() : [];

        if (allSalaries.length === 0 && allCommissions.length === 0) {
          return res.json({ ok: true, allConfirmed: true, message: 'No hay nóminas publicadas.' });
        }

        // Most recent semana across both tables
        const semanas = [...new Set([
          ...allSalaries.map((s: any) => s.semana),
          ...allCommissions.map((c: any) => c.semana),
        ])].sort().reverse();
        const latestSemana = semanas[0];

        const latestSalaries = allSalaries.filter((s: any) => s.semana === latestSemana);
        const latestCommissions = allCommissions.filter((c: any) => c.semana === latestSemana);

        const salaryIds = latestSalaries.map((s: any) => s.id);
        const commissionIds = latestCommissions.filter((c: any) => c.agent_user_id).map((c: any) => c.id);

        const [wConfRes, aConfRes] = await Promise.all([
          salaryIds.length > 0
            ? fetch(sbUrl(`payment_confirmations?salary_id=in.(${salaryIds.map((id: string) => `"${id}"`).join(',')})&select=salary_id`), { headers: sbH() })
            : Promise.resolve(null),
          commissionIds.length > 0
            ? fetch(sbUrl(`agent_payment_confirmations?commission_id=in.(${commissionIds.map((id: string) => `"${id}"`).join(',')})&select=commission_id`), { headers: sbH() })
            : Promise.resolve(null),
        ]);

        const wConfs: any[] = wConfRes && wConfRes.ok ? await wConfRes.json() : [];
        const aConfs: any[] = aConfRes && aConfRes.ok ? await aConfRes.json() : [];

        const confirmedWorkers = new Set(wConfs.map((c: any) => c.salary_id));
        const confirmedAgents  = new Set(aConfs.map((c: any) => c.commission_id));

        const unconfirmedWorkers = latestSalaries.filter((s: any) => !confirmedWorkers.has(s.id));
        const unconfirmedAgents  = latestCommissions.filter((c: any) => c.agent_user_id && !confirmedAgents.has(c.id));

        if (unconfirmedWorkers.length > 0 || unconfirmedAgents.length > 0) {
          const wList: any[] = [];
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
              wList.push({ type: 'trabajadora', app: s.app_name, name: w.nombre_en_app ?? w.nombre_real ?? emailMap[s.user_id] ?? s.user_id });
            }
          }
          const aList = unconfirmedAgents.map((c: any) => ({ type: 'agente', app: c.app_name, name: c.agent_name }));
          return res.json({ ok: false, allConfirmed: false, pending: [...wList, ...aList] });
        }

        // All confirmed — clear nomina_history for all apps this week
        await Promise.all(['Waha', 'Howdy', 'Layla'].map(app =>
          fetch(sbUrl(`nomina_history?app_name=eq.${app}&semana=eq.${encodeURIComponent(latestSemana)}`), {
            method: 'DELETE',
            headers: { ...sbH(), Prefer: 'return=minimal' },
          })
        ));

        return res.json({ ok: true, allConfirmed: true, semana: latestSemana });
      } catch (e: unknown) {
        return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
      }
    });

    export default router;
    