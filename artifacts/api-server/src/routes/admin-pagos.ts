import { Router } from 'express'

const router = Router()

const SB  = process.env.SUPABASE_URL ?? ''
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function h(): Record<string, string> {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
}

/**
 * GET /api/admin/pagos-salaries?apps=Waha,Layla,Howdy
 * Returns latest published_salaries + admin_paid_marks for each app using service role (bypasses RLS).
 */
router.get('/admin/pagos-salaries', async (req, res) => {
  const appsParam = (req.query.apps as string | undefined) ?? 'Waha,Layla,Howdy'
  const apps = appsParam.split(',').map(a => a.trim()).filter(Boolean)
  if (apps.length === 0) { res.json({ appSemanas: [], salaries: [], adminPaidUids: [] }); return }

  try {
    // 1. Get latest semana per app
    const semanaResults = await Promise.all(
      apps.map(app =>
        fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&select=semana&order=semana.desc&limit=1`, { headers: h() })
          .then(r => r.ok ? r.json() : [])
          .then((rows: any[]) => ({ app, semana: rows[0]?.semana ?? null }))
      )
    )
    const appSemanas = semanaResults.filter(x => x.semana !== null) as { app: string; semana: string }[]
    if (appSemanas.length === 0) { res.json({ appSemanas: [], salaries: [], adminPaidUids: [] }); return }

    // 2. Fetch salaries + admin_paid_marks for each (app, semana) in parallel
    const [salaryBatches, marksBatches] = await Promise.all([
      Promise.all(
        appSemanas.map(({ app, semana }) =>
          fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=*`, { headers: h() })
            .then(r => r.ok ? r.json() : [])
            .then((rows: any[]) => rows.map((r: any) => ({ ...r, _app: app, _semana: semana })))
        )
      ),
      Promise.all(
        appSemanas.map(({ app, semana }) =>
          fetch(`${SB}/rest/v1/admin_paid_marks?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=uid`, { headers: h() })
            .then(r => r.ok ? r.json() : [])
            .then((rows: any[]) => rows.map((r: any) => r.uid as string))
        )
      ),
    ])

    const salaries: any[] = salaryBatches.flat()
    const adminPaidUids: string[] = marksBatches.flat().filter(Boolean)

    res.json({ appSemanas, salaries, adminPaidUids })
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

/**
 * GET /api/admin/pagos-salaries/single?app=Waha
 * Returns latest published_salaries + admin_paid_marks for a single app using service role.
 */
router.get('/admin/pagos-salaries/single', async (req, res) => {
  const app = (req.query.app as string | undefined)?.trim()
  if (!app) { res.status(400).json({ error: 'app requerido' }); return }

  try {
    // Latest semana
    const semRes = await fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&select=semana&order=semana.desc&limit=1`, { headers: h() })
    if (!semRes.ok) { res.status(semRes.status).json({ error: await semRes.text() }); return }
    const semRows = await semRes.json() as { semana: string }[]
    if (!semRows[0]) { res.json({ semana: null, salaries: [], adminPaidUids: [] }); return }
    const semana = semRows[0].semana

    // Salaries + admin_paid_marks in parallel
    const [salRes, marksRes] = await Promise.all([
      fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=*`, { headers: h() }),
      fetch(`${SB}/rest/v1/admin_paid_marks?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=uid`, { headers: h() }),
    ])

    if (!salRes.ok) { res.status(salRes.status).json({ error: await salRes.text() }); return }
    const salaries = await salRes.json() as any[]
    const adminPaidUids: string[] = marksRes.ok
      ? (await marksRes.json() as { uid: string }[]).map(m => m.uid)
      : []

    res.json({ semana, salaries, adminPaidUids })
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

export default router
