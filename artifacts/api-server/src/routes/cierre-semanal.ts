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

  // GET /api/no-cobro
  router.get('/no-cobro', async (_req, res) => {
    try {
      const [stateRes, listRes] = await Promise.all([
        fetch(sbUrl('weekly_period_state?id=eq.1&select=*'), { headers: sbH() }),
        fetch(sbUrl('weekly_no_cobro?order=app_name.asc,created_at.desc&select=*'), { headers: sbH() }),
      ]);
      const stateArr = stateRes.ok ? await stateRes.json() : [];
      const entries  = listRes.ok  ? await listRes.json()  : [];
      const period   = stateArr[0] ?? { state: 'open', semana: null };
      return res.json({ ok: true, period, entries });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
    }
  });

  // POST /api/cierre-semanal
  router.post('/cierre-semanal', async (req, res) => {
    const { semana } = req.body as { semana: string };
    if (!semana) return res.status(400).json({ error: 'semana requerida' });

    try {
      const [workersRes, notifsRes] = await Promise.all([
        fetch(sbUrl('worker_entries?app_name=eq.Layla&select=user_id,nombre_en_app,nombre_real'), { headers: sbH() }),
        fetch(sbUrl(`direct_payment_notifications?app_name=eq.Layla&semana=eq.${encodeURIComponent(semana)}&select=user_id`), { headers: sbH() }),
      ]);
      const workers: any[] = workersRes.ok ? await workersRes.json() : [];
      const notifs: any[]  = notifsRes.ok  ? await notifsRes.json()  : [];
      const confirmed = new Set(notifs.map((n: any) => n.user_id));
      const noConfirmed = workers.filter((w: any) => !confirmed.has(w.user_id));

      if (noConfirmed.length > 0) {
        const ids = noConfirmed.map((w: any) => `"${w.user_id}"`).join(',');
        const profRes = await fetch(sbUrl(`profiles?id=in.(${ids})&select=id,email`), { headers: sbH() });
        const profs: any[] = profRes.ok ? await profRes.json() : [];
        const emailMap: Record<string, string> = Object.fromEntries(profs.map((p: any) => [p.id, p.email ?? '']));

        const rows = noConfirmed.map((w: any) => ({
          user_id: w.user_id,
          app_name: 'Layla',
          semana,
          reason: 'layla_no_confirm',
          nombre_en_app: w.nombre_en_app ?? null,
          nombre_real: w.nombre_real ?? null,
          email: emailMap[w.user_id] ?? null,
        }));
        await fetch(sbUrl('weekly_no_cobro?on_conflict=user_id,app_name,semana'), {
          method: 'POST',
          headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows),
        });
      }

      // Close the period
      await fetch(sbUrl('weekly_period_state?id=eq.1'), {
        method: 'PATCH',
        headers: { ...sbH(), Prefer: 'return=minimal' },
        body: JSON.stringify({ state: 'closed', semana, closed_at: new Date().toISOString() }),
      });

      return res.json({ ok: true, added: noConfirmed.length, total_layla: workers.length, semana });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
    }
  });

  // POST /api/empezar-pagar
  router.post('/empezar-pagar', async (_req, res) => {
    try {
      await fetch(sbUrl('weekly_period_state?id=eq.1'), {
        method: 'PATCH',
        headers: { ...sbH(), Prefer: 'return=minimal' },
        body: JSON.stringify({ state: 'open', semana: null, closed_at: null, opened_at: new Date().toISOString() }),
      });
      // Clear the no-cobro list when starting fresh
      await fetch(sbUrl('weekly_no_cobro'), {
        method: 'DELETE',
        headers: sbH('return=minimal'),
      });
      return res.json({ ok: true });
    } catch (e: unknown) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
    }
  });

  export default router;
  