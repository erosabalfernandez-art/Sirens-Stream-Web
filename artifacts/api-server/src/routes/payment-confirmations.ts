import { Router } from 'express'

const SB  = process.env.SUPABASE_URL ?? ''
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function h(extra: Record<string, string> = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra }
}

const router = Router()

// GET /api/payment-confirmations?salary_ids=id1,id2,id3
// Returns confirmed salary_ids using service role (bypasses RLS so admin can read all workers' confirmations)
router.get('/payment-confirmations', async (req, res) => {
  const { salary_ids } = req.query as { salary_ids?: string }
  if (!salary_ids) { res.status(400).json({ error: 'salary_ids requerido' }); return }
  const ids = salary_ids.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) { res.json({ confirmations: [] }); return }
  try {
    const filter = ids.map(id => `"${id}"`).join(',')
    const r = await fetch(
      `${SB}/rest/v1/payment_confirmations?salary_id=in.(${filter})&select=salary_id,confirmed_at`,
      { headers: h() }
    )
    if (!r.ok) { res.status(r.status).json({ error: await r.text() }); return }
    const data = await r.json() as { salary_id: string; confirmed_at: string }[]
    res.json({ confirmations: data })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

export default router
