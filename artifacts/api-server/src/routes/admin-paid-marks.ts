import { Router } from 'express'

const SB  = process.env.SUPABASE_URL ?? ''
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function h(extra: Record<string, string> = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra }
}

const router = Router()

// GET /api/admin-paid-marks?app_name=Waha&semana=2024-S01
router.get('/admin-paid-marks', async (req, res) => {
  const { app_name, semana } = req.query as { app_name?: string; semana?: string }
  if (!app_name || !semana) { res.status(400).json({ error: 'app_name y semana requeridos' }); return }
  try {
    const r = await fetch(
      `${SB}/rest/v1/admin_paid_marks?app_name=eq.${encodeURIComponent(app_name)}&semana=eq.${encodeURIComponent(semana)}&select=uid`,
      { headers: h() }
    )
    if (!r.ok) { res.status(r.status).json({ error: await r.text() }); return }
    const data = await r.json() as { uid: string }[]
    res.json({ uids: data.map(d => d.uid) })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

// POST /api/admin-paid-marks/toggle
// body: { app_name, semana, uid, paid: boolean }
router.post('/admin-paid-marks/toggle', async (req, res) => {
  const { app_name, semana, uid, paid } = req.body as { app_name: string; semana: string; uid: string; paid: boolean }
  if (!app_name || !semana || !uid) { res.status(400).json({ error: 'app_name, semana y uid requeridos' }); return }
  try {
    if (paid) {
      // Insert mark (upsert to avoid duplicates)
      const r = await fetch(`${SB}/rest/v1/admin_paid_marks`, {
        method: 'POST',
        headers: h({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({ app_name, semana, uid }),
      })
      if (!r.ok) { res.status(r.status).json({ error: await r.text() }); return }
    } else {
      // Delete mark
      const r = await fetch(
        `${SB}/rest/v1/admin_paid_marks?app_name=eq.${encodeURIComponent(app_name)}&semana=eq.${encodeURIComponent(semana)}&uid=eq.${encodeURIComponent(uid)}`,
        { method: 'DELETE', headers: h() }
      )
      if (!r.ok) { res.status(r.status).json({ error: await r.text() }); return }
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

export default router
