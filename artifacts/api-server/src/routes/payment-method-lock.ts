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

// GET /api/payment-method-lock?user_id=...
// Returns { locked: boolean, setup_needed: boolean }
router.get('/payment-method-lock', async (req, res) => {
  const user_id = req.query.user_id as string | undefined;
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
  try {
    const r = await fetch(
      sbUrl(`payment_method_locks?user_id=eq.${encodeURIComponent(user_id)}&select=locked`),
      { headers: sbH() }
    );
    if (!r.ok) {
      const txt = await r.text();
      if (txt.includes('42P01') || txt.includes('does not exist')) {
        return res.json({ locked: false, setup_needed: true });
      }
      return res.status(r.status).json({ error: txt });
    }
    const rows = await r.json() as Array<{ locked: boolean }>;
    return res.json({ locked: rows.length > 0 && rows[0].locked === true, setup_needed: false });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
  }
});

// POST /api/payment-method-lock
// Body: { user_id: string }
// Sets locked=true for the user (upsert)
router.post('/payment-method-lock', async (req, res) => {
  const { user_id } = req.body as { user_id?: string };
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
  try {
    const r = await fetch(sbUrl('payment_method_locks'), {
      method: 'POST',
      headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id, locked: true, locked_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      const txt = await r.text();
      if (txt.includes('42P01') || txt.includes('does not exist')) {
        return res.json({ ok: false, setup_needed: true });
      }
      return res.status(r.status).json({ error: txt });
    }
    return res.json({ ok: true });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'unknown' });
  }
});

export default router;
