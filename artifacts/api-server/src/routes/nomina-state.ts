import { Router } from 'express';

const router = Router();

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}
function sbUrl(path: string) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

// GET /api/nomina-state?app=Waha
router.get('/nomina-state', async (req, res) => {
  const app = req.query.app as string;
  if (!app || !['Waha', 'Layla', 'Howdy'].includes(app)) {
    return res.status(400).json({ error: 'Invalid app' });
  }
  try {
    const r = await fetch(
      sbUrl(`nomina_history?app_name=eq.${encodeURIComponent(app)}&select=id,app_name,semana,rows_data,file_name,created_at,published&order=created_at.desc&limit=1`),
      { headers: sbHeaders() as Record<string,string> },
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json() as unknown[];
    const entry = (data ?? [])[0] ?? null;
    return res.json({ entry });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return res.status(500).json({ error: msg });
  }
});

// POST /api/nomina-state
router.post('/nomina-state', async (req, res) => {
  const { app_name, semana, cobradas, noCobro, sinPerfil, total_usd, total_diamantes, file_name } = req.body as Record<string,unknown>;
  if (!app_name || !['Waha', 'Layla', 'Howdy'].includes(app_name as string)) {
    return res.status(400).json({ error: 'Invalid app_name' });
  }
  try {
    const cobradasArr = (cobradas as unknown[]) ?? [];
    const noCobroArr  = (noCobro  as unknown[]) ?? [];
    const sinPerfilArr= (sinPerfil as unknown[]) ?? [];
    const payload = {
      app_name,
      semana:           semana    ?? '',
      total_usd:        total_usd ?? 0,
      total_diamantes:  total_diamantes ?? 0,
      cobradas_count:   cobradasArr.length,
      nocobro_count:    noCobroArr.length,
      sinperfil_count:  sinPerfilArr.length,
      rows_data:        { cobradas: cobradasArr, noCobro: noCobroArr, sinPerfil: sinPerfilArr },
      published:        false,
      file_name:        file_name ?? '',
    };
    const r = await fetch(sbUrl('nomina_history'), {
      method:  'POST',
      headers: sbHeaders() as Record<string,string>,
      body:    JSON.stringify(payload),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    return res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return res.status(500).json({ error: msg });
  }
});

export default router;
