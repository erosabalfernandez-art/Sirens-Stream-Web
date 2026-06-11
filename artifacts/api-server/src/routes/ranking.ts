import { Router } from 'express';

const router = Router();

function sbH(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}
function sbUrl(path: string) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

// GET /api/ranking?user_id=<optional>
router.get('/ranking', async (req, res) => {
  const userId = req.query.user_id as string | undefined;
  try {
    // 1. Get last manual reset from site_settings
    const resetRes = await fetch(sbUrl('site_settings?key=eq.ranking_reset_at&select=value&limit=1'), { headers: sbH() });
    const resetData: { value: string }[] = resetRes.ok ? (await resetRes.json()) as { value: string }[] : [];
    const resetAt = resetData[0]?.value ?? null;

    // 2. Start of current calendar month (UTC)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // 3. Effective start = later of monthStart and last manual reset
    let effectiveStart = monthStart;
    if (resetAt) {
      const rd = new Date(resetAt);
      if (!isNaN(rd.getTime()) && rd > effectiveStart) effectiveStart = rd;
    }

    // 4. Fetch published_salaries since effectiveStart
    const salariesRes = await fetch(
      sbUrl(`published_salaries?created_at=gte.${encodeURIComponent(effectiveStart.toISOString())}&select=user_id,app_name,usd,apodo`),
      { headers: sbH() }
    );
    if (!salariesRes.ok) return res.status(500).json({ error: await salariesRes.text() });
    const salaries = (await salariesRes.json()) as { user_id: string; app_name: string; usd: number | null; apodo?: string }[];

    if (salaries.length === 0) {
      return res.json({ ok: true, ranking: [], userRank: null, monthStart: effectiveStart.toISOString(), totalParticipants: 0 });
    }

    // 5. Aggregate by user_id tracking per-app totals
    const userMap: Record<string, { user_id: string; total_usd: number; apps: Record<string, number>; lastApodo: string }> = {};
    for (const s of salaries) {
      const usd = s.usd ?? 0;
      if (!userMap[s.user_id]) {
        userMap[s.user_id] = { user_id: s.user_id, total_usd: 0, apps: {}, lastApodo: s.apodo ?? '' };
      }
      userMap[s.user_id].total_usd += usd;
      userMap[s.user_id].apps[s.app_name] = (userMap[s.user_id].apps[s.app_name] ?? 0) + usd;
      if (s.apodo) userMap[s.user_id].lastApodo = s.apodo;
    }

    // 6. Fetch worker display names
    const userIds = Object.keys(userMap);
    const workerRes = await fetch(
      sbUrl(`worker_entries?user_id=in.(${userIds.join(',')})&select=user_id,nombre_en_app,nombre_real`),
      { headers: sbH() }
    );
    const workers: { user_id: string; nombre_en_app?: string; nombre_real?: string }[] = workerRes.ok
      ? (await workerRes.json()) as { user_id: string; nombre_en_app?: string; nombre_real?: string }[]
      : [];
    const nameMap: Record<string, { nombre: string; nombre_real?: string }> = {};
    for (const w of workers) {
      if (!nameMap[w.user_id] && w.nombre_en_app) {
        nameMap[w.user_id] = { nombre: w.nombre_en_app, nombre_real: w.nombre_real };
      }
    }

    // 7. Build ranked list sorted by total USD descending
    const ranking = Object.values(userMap)
      .sort((a, b) => b.total_usd - a.total_usd)
      .map((entry, i) => {
        const info = nameMap[entry.user_id];
        return {
          rank: i + 1,
          user_id: entry.user_id,
          nombre: info?.nombre ?? entry.lastApodo ?? 'Trabajadora',
          nombre_real: info?.nombre_real ?? null,
          total_usd: Math.round(entry.total_usd * 100) / 100,
          apps: Object.entries(entry.apps)
            .sort((a, b) => b[1] - a[1])
            .map(([app_name, usd]) => ({ app_name, usd: Math.round(usd * 100) / 100 })),
        };
      });

    const totalParticipants = ranking.length;
    const top10 = ranking.slice(0, 10);

    // 8. User-specific rank (if logged in)
    let userRank = null;
    if (userId) {
      const found = ranking.find(r => r.user_id === userId);
      if (found) {
        userRank = { rank: found.rank, total_usd: found.total_usd, apps: found.apps, nombre: found.nombre };
      }
    }

    return res.json({ ok: true, ranking: top10, userRank, monthStart: effectiveStart.toISOString(), totalParticipants });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
  }
});

// POST /api/ranking/reset — admin manual reset
router.post('/ranking/reset', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const r = await fetch(sbUrl('site_settings?on_conflict=key'), {
      method: 'POST',
      headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: 'ranking_reset_at', value: now }),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    return res.json({ ok: true, reset_at: now });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
  }
});

export default router;
