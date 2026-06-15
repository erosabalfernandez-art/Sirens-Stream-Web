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

  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  function generateAgentCode(): string {
    let code = 'EA-'
    for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    return code
  }

  /** Look up the agent_code for a colider by their user ID */
  async function getColiderAgentCode(coliderUserId: string): Promise<string | null> {
    if (!coliderUserId) return null
    try {
      const r = await fetch(
        `${SB}/rest/v1/profiles?id=eq.${encodeURIComponent(coliderUserId)}&select=agent_code,is_colider&limit=1`,
        { headers: h() }
      )
      if (!r.ok) return null
      const rows = await r.json() as { agent_code: string | null; is_colider: boolean }[]
      const row = rows[0]
      if (!row?.is_colider || !row.agent_code) return null
      return row.agent_code
    } catch { return null }
  }

  const router = Router()

  // POST /admin/create-colider — create a colider with an auto-generated agent_code
  router.post('/admin/create-colider', async (req, res) => {
    const { email, password, colider_name, telefono } = req.body as Record<string,string>
    if (!email || !password) { res.status(400).json({ error: 'email y password requeridos' }); return }
    try {
      const ar = await fetch(`${SB}/auth/v1/admin/users`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ email, password, email_confirm: true })
      })
      if (!ar.ok) { res.status(400).json({ error: await ar.text() }); return }
      const { id } = await ar.json()

      // Generate unique agent_code for this colider
      let agentCode = generateAgentCode()
      for (let i = 0; i < 10; i++) {
        const checkRes = await fetch(`${SB}/rest/v1/profiles?agent_code=eq.${agentCode}&select=id&limit=1`, { headers: h() })
        const existing = checkRes.ok ? await checkRes.json() as unknown[] : []
        if (existing.length === 0) break
        agentCode = generateAgentCode()
      }

      await sbPost('profiles?on_conflict=id', {
        id, email, is_colider: true,
        colider_name: colider_name ?? null,
        telefono: telefono ?? null,
        agent_code: agentCode,
      }, 'resolution=merge-duplicates,return=minimal')

      res.json({ ok: true, userId: id, agent_code: agentCode })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /admin/coliders — list all coliders (includes agent_code)
  router.get('/admin/coliders', async (_req, res) => {
    try {
      res.json({
        coliders: await sbGet(
          'profiles?is_colider=eq.true&select=id,email,colider_name,telefono,agent_code,created_at'
        )
      })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // POST /admin/assign-colider-code — assign agent_code to existing colider who doesn't have one
  router.post('/admin/assign-colider-code', async (req, res) => {
    const { colider_user_id } = req.body as { colider_user_id: string }
    if (!colider_user_id) { res.status(400).json({ error: 'colider_user_id requerido' }); return }
    try {
      // Check if already has code
      const existing = await sbGet(`profiles?id=eq.${encodeURIComponent(colider_user_id)}&select=id,agent_code,is_colider&limit=1`)
      const row = existing[0] as { id: string; agent_code: string | null; is_colider: boolean } | undefined
      if (!row?.is_colider) { res.status(400).json({ error: 'El usuario no es colider' }); return }
      if (row.agent_code) { res.json({ ok: true, agent_code: row.agent_code, already_had: true }); return }

      let agentCode = generateAgentCode()
      for (let i = 0; i < 10; i++) {
        const checkRes = await fetch(`${SB}/rest/v1/profiles?agent_code=eq.${agentCode}&select=id&limit=1`, { headers: h() })
        const ex = checkRes.ok ? await checkRes.json() as unknown[] : []
        if (ex.length === 0) break
        agentCode = generateAgentCode()
      }

      const r = await fetch(`${SB}/rest/v1/profiles?id=eq.${encodeURIComponent(colider_user_id)}`, {
        method: 'PATCH',
        headers: h({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ agent_code: agentCode }),
      })
      if (!r.ok) { res.status(r.status).json({ error: await r.text() }); return }
      res.json({ ok: true, agent_code: agentCode })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /colider/available-weeks — filtered to this colider's workers
  router.get('/colider/available-weeks', async (req, res) => {
    const coliderUserId = req.query.colider_user_id as string | undefined
    try {
      if (coliderUserId) {
        const agentCode = await getColiderAgentCode(coliderUserId)
        if (agentCode) {
          const workerRes = await fetch(
            `${SB}/rest/v1/worker_entries?agente=eq.${encodeURIComponent(agentCode)}&select=user_id&limit=500`,
            { headers: h() }
          )
          const workerRows = workerRes.ok ? await workerRes.json() as { user_id: string }[] : []
          const uids = [...new Set(workerRows.map(w => w.user_id))]

          let salaryWeeks: string[] = []
          if (uids.length > 0) {
            const salaryData = await sbGet(
              `published_salaries?user_id=in.(${uids.map(id => '"' + id + '"').join(',')})&select=semana&order=semana.desc&limit=100`
            ).catch(() => [])
            salaryWeeks = salaryData.map((r: any) => r.semana as string)
          }
          // Agent commissions for this colider — query by agent_name (Layla stores agent_code as agent_name)
          // AND by agent_user_id (Waha/Howdy stores the resolved user ID)
          const [agentByName, agentByUserId] = await Promise.all([
            sbGet(`agent_commissions?agent_name=eq.${encodeURIComponent(agentCode)}&select=semana&order=semana.desc&limit=50`).catch(() => []),
            coliderUserId ? sbGet(`agent_commissions?agent_user_id=eq.${encodeURIComponent(coliderUserId)}&select=semana&order=semana.desc&limit=50`).catch(() => []) : Promise.resolve([]),
          ])
          const agentData = [...agentByName, ...agentByUserId]

          const allWeeks = [...new Set<string>([
            ...salaryWeeks,
            ...agentData.map((r: any) => r.semana as string),
          ])].sort((a, b) => b.localeCompare(a))

          // Only show weeks where nomina is still published/open
          const pubNominas = await sbGet('nomina_history?published=eq.true&select=semana').catch(() => [])
          const pubSemanas = new Set(pubNominas.map((r: any) => r.semana as string))
          // If no workers directly linked to colider code, fall back to ALL published weeks
          const weeksToReturn = allWeeks.length > 0
            ? allWeeks.filter((w: string) => pubSemanas.has(w))
            : [...pubSemanas].sort((a, b) => b.localeCompare(a))
          res.json({ weeks: weeksToReturn, agent_code: agentCode })
          return
        }
        // Colider exists but has no agent_code yet — fall back to all published weeks
          try {
            const pubNominas2 = await sbGet('nomina_history?published=eq.true&select=semana').catch(() => [])
            const [salData2, agData2] = await Promise.all([
              sbGet('published_salaries?select=semana&order=semana.desc&limit=50').catch(() => []),
              sbGet(`agent_commissions?agent_user_id=eq.${encodeURIComponent(coliderUserId)}&select=semana&order=semana.desc&limit=50`).catch(() => []),
            ])
            const pubSet2 = new Set(pubNominas2.map((r: any) => r.semana as string))
            const allW2 = [...new Set<string>([...salData2.map((r: any) => r.semana as string), ...agData2.map((r: any) => r.semana as string)])]
              .filter((w: string) => pubSet2.has(w))
              .sort((a, b) => b.localeCompare(a))
            const finalW = allW2.length > 0 ? allW2 : [...pubSet2].sort((a, b) => b.localeCompare(a))
            res.json({ weeks: finalW, agent_code: null })
          } catch {
            res.json({ weeks: [], agent_code: null })
          }
          return
      }

      // Admin / unscoped fallback
      const [salaryData, agentData] = await Promise.all([
        sbGet('published_salaries?select=semana&order=semana.desc&limit=50').catch(() => []),
        sbGet('agent_commissions?select=semana&order=semana.desc&limit=50').catch(() => []),
      ])
      const allWeeks = [...new Set<string>([
        ...salaryData.map((r: any) => r.semana as string),
        ...agentData.map((r: any) => r.semana as string),
      ])].sort((a, b) => b.localeCompare(a))
      // Only show weeks where nomina is still published/open
      const pubNominasAdmin = await sbGet('nomina_history?published=eq.true&select=semana').catch(() => [])
      const pubSemanasAdmin = new Set(pubNominasAdmin.map((r: any) => r.semana as string))
      res.json({ weeks: allWeeks.filter((w: string) => pubSemanasAdmin.has(w)) })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /colider/salary-list — only workers whose `agente` = colider's agent_code
  router.get('/colider/salary-list', async (req, res) => {
    const { semana, colider_user_id } = req.query as { semana?: string; colider_user_id?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      let agentCode: string | null = null
      if (colider_user_id) agentCode = await getColiderAgentCode(colider_user_id)

      // Get worker user_ids linked to this colider's agent_code
      let workerUids: string[] = []
      if (agentCode) {
        const workerRes = await fetch(
          `${SB}/rest/v1/worker_entries?agente=eq.${encodeURIComponent(agentCode)}&select=user_id&limit=500`,
          { headers: h() }
        )
        const workerRows = workerRes.ok ? await workerRes.json() as { user_id: string }[] : []
        workerUids = [...new Set(workerRows.map(w => w.user_id))]
      }

      // Fetch salaries filtered by this colider's workers
      let salaries: any[]
      if (agentCode && workerUids.length === 0) {
        // No workers directly linked to colider code — show ALL published salaries for this week
        salaries = await sbGet(`published_salaries?semana=eq.${encodeURIComponent(semana)}&select=*`)
      } else if (agentCode && workerUids.length > 0) {
        salaries = await sbGet(
          `published_salaries?semana=eq.${encodeURIComponent(semana)}&user_id=in.(${workerUids.map(id => '"' + id + '"').join(',')})&select=*`
        )
      } else {
        salaries = await sbGet(`published_salaries?semana=eq.${encodeURIComponent(semana)}&select=*`)
      }

      const uids = [...new Set<string>(salaries.map((s: any) => s.user_id as string))]
      let workers: any[] = []
      if (uids.length > 0) {
        workers = await sbGet(
          `worker_entries?user_id=in.(${uids.map(id => '"' + id + '"').join(',')})&select=user_id,app_name,nombre_real,nombre_en_app,id_aplicacion,telefono,codigo_pais,metodo_pago,agente`
        )
      }
      const wm: Record<string,any> = {}
      for (const w of workers) wm[`${w.user_id}__${w.app_name}`] = w
      // Fetch per-worker custom exchange rates
        let customRateMap: Record<string, any> = {}
        if (uids.length > 0) {
          try {
            const crRows = await sbGet(`custom_worker_rates?user_id=in.(${uids.map((id: string) => '"' + id + '"').join(',')})&select=user_id,app_name,efectivo_rate,transferencia_rate`)
            for (const c of crRows) customRateMap[`${c.user_id}__${c.app_name}`] = c
          } catch { /* table may not exist yet */ }
        }
        const enriched = salaries.map((s: any) => {
          const cr = customRateMap[`${s.user_id}__${s.app_name}`] ?? null
          return { ...s, ...wm[`${s.user_id}__${s.app_name}`] ?? {}, custom_efectivo_rate: cr?.efectivo_rate ?? 0, custom_transferencia_rate: cr?.transferencia_rate ?? 0 }
        })

      // Agent commissions for this colider
        // Derive agent codes from the salary data workers (their 'agente' field)
        // then look up agent_commissions by those codes AND by resolved agent_user_ids
        let agents: any[] = []
        {
          const agenteCodesFromWorkers = [...new Set<string>(enriched.map((s: any) => s.agente as string).filter(Boolean))]
          const codesToSearch = agentCode
            ? [...new Set([...agenteCodesFromWorkers, agentCode])]
            : agenteCodesFromWorkers
          if (codesToSearch.length > 0) {
            // Resolve agent_user_ids for these codes via profiles
            const agProfiles: any[] = await sbGet(
              `profiles?agent_code=in.(${codesToSearch.map((c: string) => `"${c}"`).join(',')})&select=id,agent_code&is_agent=eq.true`
            ).catch(() => [])
            const agentUidsByCode: string[] = agProfiles.map((p: any) => p.id as string)
            const [byCode, byUserId] = await Promise.all([
              sbGet(`agent_commissions?semana=eq.${encodeURIComponent(semana)}&agent_name=in.(${codesToSearch.map((c: string) => `"${c}"`).join(',')})&select=*`).catch(() => []),
              agentUidsByCode.length > 0
                ? sbGet(`agent_commissions?semana=eq.${encodeURIComponent(semana)}&agent_user_id=in.(${agentUidsByCode.map((id: string) => `"${id}"`).join(',')})&select=*`).catch(() => [])
                : Promise.resolve([]),
            ])
            const seen = new Set<string>()
            agents = [...byCode, ...byUserId].filter((a: any) => {
              const key = `${a.agent_name ?? ''}__${a.app_name ?? ''}`
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
          } else {
            try { agents = await sbGet(`agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`) } catch {}
          }
        }

      // Published agent commissions for colider view (queried by separate dedicated endpoint — kept minimal here)
      const publishedAgents: { published: boolean; agents: any[]; exchange_rates: Record<string,number> } = { published: false, agents: [], exchange_rates: {} }

      const rates = await sbGet('exchange_rates?select=id,rate')
      const rm: Record<string,number> = {}
      for (const r of rates) rm[r.id] = r.rate

      // Fetch agent payment methods
      const agentUserIds = (agents as any[]).filter((a: any) => a.agent_user_id).map((a: any) => a.agent_user_id as string)
      let agentPayMethods: Record<string, string> = {}
      if (agentUserIds.length > 0) {
        try {
          const agentWorkerData = await sbGet(
            `worker_entries?user_id=in.(${agentUserIds.map((id: string) => '"' + id + '"').join(',')})&select=user_id,metodo_pago&limit=200`
          )
          for (const w of agentWorkerData) { if (w.user_id && w.metodo_pago) agentPayMethods[w.user_id] = w.metodo_pago }
        } catch {}
      }
      // Resolve real agent display names from profiles (agent_commissions may store agent_code as agent_name)
        const agentProfileNameMap: Record<string, string> = {}
        try {
          const idsForNames = (agents as any[]).filter((a: any) => a.agent_user_id).map((a: any) => a.agent_user_id as string)
          const codesForNames = (agents as any[]).filter((a: any) => !a.agent_user_id && a.agent_name).map((a: any) => a.agent_name as string)
          const [byIdProfs, byCodeProfs] = await Promise.all([
            idsForNames.length > 0
              ? sbGet(`profiles?id=in.(${idsForNames.map((id: string) => '"' + id + '"').join(',')})&select=id,agent_name,colider_name`)
              : Promise.resolve([]),
            codesForNames.length > 0
              ? sbGet(`profiles?agent_code=in.(${codesForNames.map((c: string) => '"' + c + '"').join(',')})&select=agent_code,agent_name,colider_name`)
              : Promise.resolve([]),
          ])
          for (const p of byIdProfs as any[]) {
            const name = p.colider_name ?? p.agent_name
            if (p.id && name) agentProfileNameMap[p.id] = name
          }
          for (const p of byCodeProfs as any[]) {
            const name = p.colider_name ?? p.agent_name
            if (p.agent_code && name) agentProfileNameMap[`__code__:${p.agent_code}`] = name
          }
        } catch { /* non-critical: keep raw agent_name if resolution fails */ }

        const enrichedAgents = (agents as any[]).map((a: any) => {
          let resolvedName: string = a.agent_name ?? ''
          if (a.agent_user_id && agentProfileNameMap[a.agent_user_id]) {
            resolvedName = agentProfileNameMap[a.agent_user_id]
          } else if (!a.agent_user_id && agentProfileNameMap[`__code__:${a.agent_name}`]) {
            resolvedName = agentProfileNameMap[`__code__:${a.agent_name}`]
          }
          return {
            ...a,
            agent_name: resolvedName || a.agent_name,
            metodo_pago: a.agent_user_id ? (agentPayMethods[a.agent_user_id] ?? null) : null,
          }
        })

      res.json({
        workers: enriched,
        agents: enrichedAgents,
        published_agent_commissions: publishedAgents,
        exchange_rates: rm,
        agent_code: agentCode,
      })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /colider/marks
  router.get('/colider/marks', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try { res.json({ marks: await sbGet(`colider_marks?semana=eq.${encodeURIComponent(semana)}&select=*`) }) }
    catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // POST /colider/mark
  router.post('/colider/mark', async (req, res) => {
    const { semana, person_uid, person_type, paid, person_name, person_real_name, person_phone, person_app, salary_usd, salary_cuba, metodo_pago } = req.body
    if (!semana || !person_uid || !person_type) { res.status(400).json({ error: 'semana, person_uid, person_type required' }); return }
    if (person_type !== 'worker' && person_type !== 'agent') { res.status(400).json({ error: "person_type debe ser 'worker' o 'agent'" }); return }
    try {
      await sbPost('colider_marks?on_conflict=semana,person_uid,person_app', {
        semana, person_uid, person_type, paid: paid ?? false,
        person_name: person_name ?? null, person_real_name: person_real_name ?? null,
        person_phone: person_phone ?? null, person_app: person_app ?? null,
        salary_usd: salary_usd ?? 0, salary_cuba: salary_cuba ?? 0,
        metodo_pago: metodo_pago ?? null, updated_at: new Date().toISOString()
      }, 'resolution=merge-duplicates,return=minimal')
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /colider/week-status — scoped per colider
  router.get('/colider/week-status', async (req, res) => {
    const { semana, colider_user_id } = req.query as { semana?: string; colider_user_id?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      let filter = `colider_week_status?semana=eq.${encodeURIComponent(semana)}`
      if (colider_user_id) filter += `&colider_user_id=eq.${encodeURIComponent(colider_user_id)}`
      filter += '&limit=1'
      const data = await sbGet(filter)
      res.json({ status: data[0] ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // POST /colider/notify-admin — scoped per colider
  router.post('/colider/notify-admin', async (req, res) => {
    const { semana, colider_user_id } = req.body as { semana: string; colider_user_id?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      let filter = `colider_week_status?semana=eq.${encodeURIComponent(semana)}`
      if (colider_user_id) filter += `&colider_user_id=eq.${encodeURIComponent(colider_user_id)}`
      filter += '&limit=1'
      const ex = await sbGet(filter)
      if (ex[0]?.notified && !ex[0]?.admin_closed) {
        res.status(409).json({ error: 'Ya notificado esta semana. Espera al admin.' }); return
      }

      const statusPayload: Record<string, unknown> = {
        semana, notified: true, notified_at: new Date().toISOString(), admin_closed: false,
      }
      if (colider_user_id) statusPayload.colider_user_id = colider_user_id

      // DELETE + INSERT because colider_week_status may not have a unique constraint
      let delFilter = `semana=eq.${encodeURIComponent(semana)}`
      if (colider_user_id) delFilter += `&colider_user_id=eq.${encodeURIComponent(colider_user_id)}`
      await sbDel('colider_week_status', delFilter)
      await sbPost('colider_week_status', statusPayload, 'return=minimal')

      const admins = await sbGet('profiles?is_admin=eq.true&select=id')
      const adminIds: string[] = admins.map((a: any) => a.id as string)
      if (adminIds.length > 0 && ensureVapid())
        setImmediate(() => dispatchPush(
          adminIds, '💸 Pago semanal terminado',
          `Colider terminó de pagar la semana ${semana}.`,
          '/nomina'
        ).catch(() => {}))
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // GET /admin/colider-progress
  router.get('/admin/colider-progress', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const [marks, status] = await Promise.all([
        sbGet(`colider_marks?semana=eq.${encodeURIComponent(semana)}&select=*`),
        sbGet(`colider_week_status?semana=eq.${encodeURIComponent(semana)}&select=*`),
      ])
      res.json({ marks, status: status[0] ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  // POST /admin/close-week
  router.post('/admin/close-week', async (req, res) => {
    const { semana } = req.body as { semana: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      // NOTE: colider_marks are intentionally preserved — they are the payment history.
      // DELETE + INSERT because colider_week_status may not have a unique constraint on semana
      await sbDel('colider_week_status', `semana=eq.${encodeURIComponent(semana)}`)
      await sbPost('colider_week_status', {
        semana, notified: false, admin_closed: true, admin_closed_at: new Date().toISOString()
      }, 'return=minimal')
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })

  export default router
  