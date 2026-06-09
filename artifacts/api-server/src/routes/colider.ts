import { Router } from 'express'
  import { dispatchPush, ensureVapid } from '../lib/push-dispatch'

  const SB  = process.env.SUPABASE_URL ?? ''
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  function h(extra: Record<string,string> = {}) {
    return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra }
  }
  async function sbGet(tbl: string): Promise<any[]> {
    const r = await fetch(`${SB}/rest/v1/${tbl}`, { headers: h() })
    if (!r.ok) throw new Error(`SB ${r.status}: ${await r.text()}`)
    return r.json()
  }
  async function sbPost(tbl: string, body: object, prefer = 'return=minimal') {
    const r = await fetch(`${SB}/rest/v1/${tbl}`, { method: 'POST', headers: h({ Prefer: prefer }), body: JSON.stringify(body) })
    if (!r.ok) throw new Error(`SB ${r.status}: ${await r.text()}`)
    return prefer.includes('representation') ? r.json() : { ok: true }
  }
  async function sbDel(tbl: string, filter: string) {
    const r = await fetch(`${SB}/rest/v1/${tbl}?${filter}`, { method: 'DELETE', headers: h() })
    if (!r.ok) throw new Error(`SB ${r.status}: ${await r.text()}`)
  }

  const router = Router()

  router.post('/admin/create-colider', async (req, res) => {
    const { email, password, colider_name, telefono } = req.body as Record<string,string>
    if (!email || !password) { res.status(400).json({ error: 'email y password requeridos' }); return }
    try {
      const ar = await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: h(), body: JSON.stringify({ email, password, email_confirm: true }) })
      if (!ar.ok) { res.status(400).json({ error: await ar.text() }); return }
      const { id } = await ar.json()
      await sbPost('profiles?on_conflict=id', { id, email, is_colider: true, colider_name: colider_name ?? null, telefono: telefono ?? null }, 'resolution=merge-duplicates,return=minimal')
      res.json({ ok: true, userId: id })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/admin/coliders', async (_req, res) => {
    try { res.json({ coliders: await sbGet('profiles?is_colider=eq.true&select=id,email,colider_name,telefono,created_at') }) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/colider/available-weeks', async (_req, res) => {
    try {
      const [salaryData, agentData] = await Promise.all([
        sbGet('published_salaries?select=semana&order=semana.desc&limit=50').catch(() => []),
        sbGet('agent_commissions?select=semana&order=semana.desc&limit=50').catch(() => []),
      ])
      const allWeeks = [...new Set<string>([
        ...salaryData.map((r: any) => r.semana as string),
        ...agentData.map((r: any) => r.semana as string),
      ])].sort((a, b) => b.localeCompare(a))
      res.json({ weeks: allWeeks })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/colider/salary-list', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const salaries = await sbGet(`published_salaries?semana=eq.${encodeURIComponent(semana)}&select=*`)
      const uids = [...new Set<string>(salaries.map((s: any) => s.user_id as string))]
      let workers: any[] = []
      if (uids.length > 0) workers = await sbGet(`worker_entries?user_id=in.(${uids.map(id => '"' + id + '"').join(',')})&select=user_id,app_name,nombre_real,nombre_en_app,telefono,metodo_pago`)
      const wm: Record<string,any> = {}
      for (const w of workers) wm[`${w.user_id}__${w.app_name}`] = w
      const enriched = salaries.map((s: any) => ({ ...s, ...wm[`${s.user_id}__${s.app_name}`] ?? {} }))
      const [agents, rates, settingData] = await Promise.all([
          sbGet(`agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`),
          sbGet('exchange_rates?select=id,rate'),
          sbGet('site_settings?key=eq.exchange_rates_valid_semana&select=value&limit=1').catch(() => [] as any[]),
        ])
        const rm: Record<string,number> = {}
        for (const r of rates) rm[r.id] = r.rate
        const validSemana: string = (settingData[0] as any)?.value ?? ''
        // Fetch agent payment methods from worker_entries via agent_user_id
          const agentUserIds = (agents as any[]).filter((a: any) => a.agent_user_id).map((a: any) => a.agent_user_id as string)
          let agentPayMethods: Record<string, string> = {}
          if (agentUserIds.length > 0) {
            try {
              const agentWorkerData = await sbGet(`worker_entries?user_id=in.(${agentUserIds.map((id: string) => '"' + id + '"').join(',')})&select=user_id,metodo_pago&limit=200`)
              for (const w of agentWorkerData) { if (w.user_id && w.metodo_pago) agentPayMethods[w.user_id] = w.metodo_pago }
            } catch {}
          }
          const enrichedAgents = (agents as any[]).map((a: any) => ({
            ...a,
            metodo_pago: a.agent_user_id ? (agentPayMethods[a.agent_user_id] ?? null) : null,
          }))
          res.json({ workers: enriched, agents: enrichedAgents, exchange_rates: validSemana === semana ? rm : {} })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/colider/marks', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try { res.json({ marks: await sbGet(`colider_marks?semana=eq.${encodeURIComponent(semana)}&select=*`) }) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.post('/colider/mark', async (req, res) => {
    const { semana, person_uid, person_type, paid, person_name, person_real_name, person_phone, person_app, salary_usd, salary_cuba, metodo_pago } = req.body
    if (!semana || !person_uid || !person_type) { res.status(400).json({ error: 'semana, person_uid, person_type required' }); return }
    try {
      await sbPost('colider_marks?on_conflict=semana,person_uid,person_type', { semana, person_uid, person_type, paid: paid ?? false, person_name: person_name ?? null, person_real_name: person_real_name ?? null, person_phone: person_phone ?? null, person_app: person_app ?? null, salary_usd: salary_usd ?? 0, salary_cuba: salary_cuba ?? 0, metodo_pago: metodo_pago ?? null, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/colider/week-status', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const data = await sbGet(`colider_week_status?semana=eq.${encodeURIComponent(semana)}&limit=1`)
      res.json({ status: data[0] ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.post('/colider/notify-admin', async (req, res) => {
    const { semana } = req.body as { semana: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const ex = await sbGet(`colider_week_status?semana=eq.${encodeURIComponent(semana)}&limit=1`)
      if (ex[0]?.notified && !ex[0]?.admin_closed) { res.status(409).json({ error: 'Ya notificado esta semana. Espera al admin.' }); return }
      await sbPost('colider_week_status?on_conflict=semana', { semana, notified: true, notified_at: new Date().toISOString(), admin_closed: false }, 'resolution=merge-duplicates,return=minimal')
      const admins = await sbGet('profiles?is_admin=eq.true&select=id')
      const adminIds: string[] = admins.map((a: any) => a.id as string)
      if (adminIds.length > 0 && ensureVapid()) setImmediate(() => dispatchPush(adminIds, '💸 Pago semanal terminado', `Colider terminó de pagar la semana ${semana}.`, '/nomina').catch(() => {}))
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.get('/admin/colider-progress', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const [marks, status] = await Promise.all([sbGet(`colider_marks?semana=eq.${encodeURIComponent(semana)}&select=*`), sbGet(`colider_week_status?semana=eq.${encodeURIComponent(semana)}&limit=1`)])
      res.json({ marks, status: status[0] ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  router.post('/admin/close-week', async (req, res) => {
    const { semana } = req.body as { semana: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      await sbDel('colider_marks', `semana=eq.${encodeURIComponent(semana)}`)
      await sbPost('colider_week_status?on_conflict=semana', { semana, notified: false, admin_closed: true, admin_closed_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  export default router
  