import { Router } from 'express'

  const router = Router()

  const SB  = process.env.SUPABASE_URL ?? ''
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  function h(): Record<string, string> {
    return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
  }

  /**
   * GET /api/admin/pagos-salaries?apps=Waha,Layla,Howdy
   * Returns latest published_salaries + admin_paid_marks + colider_marks for each app
   * using service role (bypasses RLS completely).
   */
  router.get('/admin/pagos-salaries', async (req, res) => {
    const appsParam = (req.query.apps as string | undefined) ?? 'Waha,Layla,Howdy'
    const apps = appsParam.split(',').map(a => a.trim()).filter(Boolean)
    if (apps.length === 0) { res.json({ appSemanas: [], salaries: [], adminPaidUids: [], coliderPaidUids: [] }); return }

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
      if (appSemanas.length === 0) { res.json({ appSemanas: [], salaries: [], adminPaidUids: [], coliderPaidUids: [] }); return }

      // 2. Build semana list for colider_marks query
      const semanas = [...new Set(appSemanas.map(x => x.semana))]

      // 3. Fetch salaries + admin_paid_marks + colider_marks in parallel
      const [salaryBatches, marksBatches, coliderRes] = await Promise.all([
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
        // colider_marks: fetch all paid workers across all relevant semanas
        fetch(
          `${SB}/rest/v1/colider_marks?person_type=eq.worker&semana=in.(${semanas.map(s => `"${s}"`).join(',')})&select=person_uid,person_app,paid`,
          { headers: h() }
        ).then(r => r.ok ? r.json() : []),
      ])

      const salaries: any[] = salaryBatches.flat()
      const adminPaidUids: string[] = marksBatches.flat().filter(Boolean)
      // coliderPaidUids: array of user_ids where colider marked paid=true
      const coliderPaidUids: string[] = (coliderRes as any[])
        .filter((m: any) => m.paid === true)
        .map((m: any) => m.person_uid as string)

      res.json({ appSemanas, salaries, adminPaidUids, coliderPaidUids })
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  })

  /**
   * GET /api/admin/pagos-salaries/single?app=Waha
   * Returns latest published_salaries + admin_paid_marks + colider_marks for a single app
   * using service role (bypasses RLS completely).
   */
  router.get('/admin/pagos-salaries/single', async (req, res) => {
    const app = (req.query.app as string | undefined)?.trim()
    if (!app) { res.status(400).json({ error: 'app requerido' }); return }

    try {
      // Latest semana
      const semRes = await fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&select=semana&order=semana.desc&limit=1`, { headers: h() })
      if (!semRes.ok) { res.status(semRes.status).json({ error: await semRes.text() }); return }
      const semRows = await semRes.json() as { semana: string }[]
      if (!semRows[0]) { res.json({ semana: null, salaries: [], adminPaidUids: [], coliderPaidUids: [] }); return }
      const semana = semRows[0].semana

      // Salaries + admin_paid_marks + colider_marks in parallel
      const [salRes, marksRes, coliderRes] = await Promise.all([
        fetch(`${SB}/rest/v1/published_salaries?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=*`, { headers: h() }),
        fetch(`${SB}/rest/v1/admin_paid_marks?app_name=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=uid`, { headers: h() }),
        fetch(`${SB}/rest/v1/colider_marks?person_type=eq.worker&person_app=eq.${encodeURIComponent(app)}&semana=eq.${encodeURIComponent(semana)}&select=person_uid,paid`, { headers: h() }),
      ])

      if (!salRes.ok) { res.status(salRes.status).json({ error: await salRes.text() }); return }
      const salaries = await salRes.json() as any[]
      const adminPaidUids: string[] = marksRes.ok
        ? (await marksRes.json() as { uid: string }[]).map(m => m.uid)
        : []
      const coliderPaidUids: string[] = coliderRes.ok
        ? (await coliderRes.json() as { person_uid: string; paid: boolean }[])
            .filter(m => m.paid === true)
            .map(m => m.person_uid)
        : []

      res.json({ semana, salaries, adminPaidUids, coliderPaidUids })
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  })

  /**
   * GET /api/admin/agent-colider-marks?semana=20260601-20260607&agent_uids=uid1,uid2
   * Returns colider_marks + admin_paid_marks for given agent user IDs,
   * using service role to bypass RLS (colider marks are owned by the colider user,
   * not the admin, so RLS would block the admin from reading them directly).
   */
  router.get('/admin/agent-colider-marks', async (req, res) => {
    const semana = (req.query.semana as string | undefined)?.trim()
    const agentUidsParam = (req.query.agent_uids as string | undefined) ?? ''
    const agentUids = agentUidsParam.split(',').map(s => s.trim()).filter(Boolean)
    if (!semana || agentUids.length === 0) { res.json({ coliderMap: {}, adminPaidIds: [] }); return }

    try {
      const uidList = agentUids.map(u => `"${u}"`).join(',')
      const [agColRes, agWorkerRes, agAdminRes] = await Promise.all([
        fetch(`${SB}/rest/v1/colider_marks?person_type=eq.agent&semana=eq.${encodeURIComponent(semana)}&person_uid=in.(${uidList})&select=person_uid,paid`, { headers: h() })
          .then(r => r.ok ? r.json() : []),
        fetch(`${SB}/rest/v1/colider_marks?person_type=eq.worker&semana=eq.${encodeURIComponent(semana)}&person_uid=in.(${uidList})&select=person_uid,paid`, { headers: h() })
          .then(r => r.ok ? r.json() : []),
        fetch(`${SB}/rest/v1/admin_paid_marks?semana=eq.${encodeURIComponent(semana)}&uid=in.(${agentUids.map(u => `"agent_${u}"`).join(',')})&select=uid`, { headers: h() })
          .then(r => r.ok ? r.json() : []),
      ])
      const coliderMap: Record<string, boolean> = {}
      for (const m of agWorkerRes as any[]) coliderMap[(m as any).person_uid] = (m as any).paid
      for (const m of agColRes as any[]) coliderMap[(m as any).person_uid] = (m as any).paid
      const adminPaidIds: string[] = (agAdminRes as any[]).map((a: any) => String(a.uid).replace('agent_', ''))
      res.json({ coliderMap, adminPaidIds })
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
    }
  })

  export default router
  