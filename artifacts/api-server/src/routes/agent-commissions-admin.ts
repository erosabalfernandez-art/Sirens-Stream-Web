import { Router } from 'express'
  import { dispatchPush, ensureVapid } from '../lib/push-dispatch'
  /*
    TABLES REQUIRED IN SUPABASE (run once in SQL editor):
    CREATE TABLE IF NOT EXISTS published_agent_commissions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      semana text NOT NULL, agent_user_id text NOT NULL, agent_name text NOT NULL,
      worker_uid text, worker_name text NOT NULL DEFAULT '', worker_real_name text,
      app_name text NOT NULL, commission_usd numeric(10,2) NOT NULL DEFAULT 0,
      published_at timestamptz DEFAULT now(),
      UNIQUE(semana, agent_user_id, app_name, worker_name)
    );
    CREATE TABLE IF NOT EXISTS agent_commission_publish_log (
      semana text NOT NULL, agent_user_id text NOT NULL,
      agent_name text NOT NULL DEFAULT '', total_usd numeric(10,2) NOT NULL DEFAULT 0,
      published_at timestamptz DEFAULT now(), PRIMARY KEY (semana, agent_user_id)
    );
    CREATE TABLE IF NOT EXISTS colider_commission_publish_log (
      semana text NOT NULL PRIMARY KEY, published_at timestamptz DEFAULT now()
    );
  */
  const SB  = process.env.SUPABASE_URL ?? ''
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  function h(ex: Record<string,string> = {}) { return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...ex } }
  async function sbGet(path: string): Promise<any[]> {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: h() })
    if (!r.ok) throw new Error(`SB GET ${r.status}: ${await r.text()}`)
    return r.json()
  }
  async function sbPost(path: string, body: object, prefer = 'return=minimal') {
    const r = await fetch(`${SB}/rest/v1/${path}`, { method: 'POST', headers: h({ Prefer: prefer }), body: JSON.stringify(body) })
    if (!r.ok) throw new Error(`SB POST ${r.status}: ${await r.text()}`)
    return prefer.includes('representation') ? r.json() : { ok: true }
  }
  const router = Router()
  router.get('/admin/agent-commission-ref', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const [agentComms, laylaRows, published, publishLog, coliderLog] = await Promise.all([
        sbGet(`agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`),
        sbGet(`published_salaries?semana=eq.${encodeURIComponent(semana)}&app_name=eq.Layla&select=user_id,extras`),
        sbGet(`published_agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`),
        sbGet(`agent_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&select=*`),
        sbGet(`colider_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&limit=1`),
      ])
      const laylaMonedas: Record<string, number> = {}
      for (const w of laylaRows) laylaMonedas[w.user_id] = Number((w.extras as any)?.monedas_comerciales ?? 0)
      const lockedAgents = new Set(publishLog.map((l: any) => l.agent_user_id as string))
      const pubMap: Record<string, number> = {}
      for (const p of published) pubMap[`${p.agent_user_id}__${p.app_name}__${p.worker_name}`] = Number(p.commission_usd) || 0
      const agentMap: Record<string, { agent_name: string; agent_user_id: string | null; apps: Record<string, any[]> }> = {}
      for (const ac of agentComms) {
        const key = ac.agent_name as string
        if (!agentMap[key]) agentMap[key] = { agent_name: ac.agent_name, agent_user_id: ac.agent_user_id ?? null, apps: {} }
        if (!agentMap[key].apps[ac.app_name as string]) agentMap[key].apps[ac.app_name] = []
        for (const w of ((ac.workers_data ?? []) as any[])) {
          const pubKey = `${ac.agent_user_id}__${ac.app_name}__${w.nombre ?? ''}`
          agentMap[key].apps[ac.app_name].push({ worker_uid: w.uid ?? null, worker_name: w.nombre ?? '', agc_usd: Number(w.commission_usd) || 0, monedas: ac.app_name === 'Layla' && w.uid ? (laylaMonedas[w.uid] ?? null) : null, published_usd: pubMap[pubKey] ?? null })
        }
      }

      // Step 1: Resolve agent_user_id for agents whose name is actually an agent_code (no user_id yet)
      const unresolvedNames = Object.values(agentMap).filter(a => !a.agent_user_id).map(a => a.agent_name)
      if (unresolvedNames.length > 0) {
        try {
          const resolveRes = await fetch(
            `${SB}/rest/v1/profiles?agent_code=in.(${unresolvedNames.map(n => '"' + n + '"').join(',')})&select=id,agent_code,colider_name,agent_name`,
            { headers: h() }
          )
          if (resolveRes.ok) {
            const resolved = await resolveRes.json() as { id: string; agent_code: string | null; colider_name: string | null; agent_name: string | null }[]
            for (const p of resolved) {
              if (p.agent_code && p.id && agentMap[p.agent_code]) {
                agentMap[p.agent_code].agent_user_id = p.id
                const displayName = p.colider_name ?? p.agent_name
                if (displayName) agentMap[p.agent_code].agent_name = displayName
                setImmediate(async () => {
                  try {
                    await fetch(`${SB}/rest/v1/agent_commissions?agent_name=eq.${encodeURIComponent(p.agent_code!)}&semana=eq.${encodeURIComponent(semana)}&agent_user_id=is.null`, {
                      method: 'PATCH',
                      headers: { ...h(), Prefer: 'return=minimal' },
                      body: JSON.stringify({ agent_user_id: p.id, agent_name: displayName ?? p.agent_code }),
                    })
                  } catch {}
                })
              }
            }
          }
        } catch {}
      }

        // Step 2: Resolve display names for agents that already have agent_user_id but may show code as name
        const agentsWithId = Object.values(agentMap).filter(a => a.agent_user_id)
        if (agentsWithId.length > 0) {
          try {
            const ids = agentsWithId.map(a => a.agent_user_id!)
            const profileRes = await fetch(
              `${SB}/rest/v1/profiles?id=in.(${ids.map(id => '"' + id + '"').join(',')})&select=id,agent_name,colider_name`,
              { headers: h() }
            )
            if (profileRes.ok) {
              const profiles = await profileRes.json() as { id: string; agent_name: string | null; colider_name: string | null }[]
              const toFix: { id: string; realName: string; currentName: string; agentUserId: string }[] = []
              for (const p of profiles) {
                const ag = agentsWithId.find(a => a.agent_user_id === p.id)
                if (ag) {
                  const displayName = p.colider_name ?? p.agent_name
                  if (displayName) {
                    if (ag.agent_name !== displayName) {
                      // Stored name differs from profile real name — queue a background fix
                      toFix.push({ id: ag.agent_user_id!, realName: displayName, currentName: ag.agent_name, agentUserId: ag.agent_user_id! })
                    }
                    ag.agent_name = displayName
                  }
                }
              }
              // Background: fix stored agent_name in agent_commissions so it always shows the real name
              if (toFix.length > 0) {
                setImmediate(async () => {
                  for (const fix of toFix) {
                    try {
                      await fetch(`${SB}/rest/v1/agent_commissions?agent_user_id=eq.${encodeURIComponent(fix.agentUserId)}&semana=eq.${encodeURIComponent(semana)}`,
                        { method: 'PATCH', headers: { ...h(), Prefer: 'return=minimal' }, body: JSON.stringify({ agent_name: fix.realName }) })
                      await fetch(`${SB}/rest/v1/agent_commission_publish_log?agent_user_id=eq.${encodeURIComponent(fix.agentUserId)}&semana=eq.${encodeURIComponent(semana)}`,
                        { method: 'PATCH', headers: { ...h(), Prefer: 'return=minimal' }, body: JSON.stringify({ agent_name: fix.realName }) })
                    } catch {}
                  }
                })
              }
            }
          } catch {}
        }

      const agents = Object.values(agentMap).map(a => ({ agent_name: a.agent_name, agent_user_id: a.agent_user_id, locked: a.agent_user_id ? lockedAgents.has(a.agent_user_id) : lockedAgents.has(`__name__:${a.agent_name}`), apps: Object.entries(a.apps).map(([appName, workers]) => ({ app_name: appName, workers })) }))
      res.json({ semana, agents, colider_published: coliderLog.length > 0, colider_published_at: (coliderLog[0] as any)?.published_at ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  router.post('/admin/publish-agent-commission', async (req, res) => {
      const { semana, agent_user_id: rawAgentId, agent_name: rawAgentName, commissions } = req.body as { semana: string; agent_user_id: string | null; agent_name: string; commissions: { worker_uid: string | null; worker_name: string; worker_real_name?: string | null; app_name: string; commission_usd: number }[] }
      if (!semana) { res.status(400).json({ error: 'Campo requerido faltante: semana' }); return }
      if (!rawAgentName) { res.status(400).json({ error: 'Campo requerido faltante: agent_name' }); return }
      if (!Array.isArray(commissions)) { res.status(400).json({ error: 'Campo requerido faltante: commissions (debe ser array)' }); return }
      // Use synthetic key for agents without a registered profile so PK constraints still work
      const effectiveId = rawAgentId || `__name__:${rawAgentName}`
      // Always resolve the real display name from the profile to avoid storing agent codes as names
      let agent_name = rawAgentName
      if (rawAgentId) {
        try {
          const profData = await sbGet(`profiles?id=eq.${encodeURIComponent(rawAgentId)}&select=agent_name,colider_name&limit=1`)
          const prof = (profData as any[])[0] as { agent_name?: string | null; colider_name?: string | null } | undefined
          if (prof?.colider_name || prof?.agent_name) agent_name = (prof.colider_name ?? prof.agent_name)!
        } catch { /* keep rawAgentName on failure */ }
      }
      try {
        const existing = await sbGet(`agent_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&agent_user_id=eq.${encodeURIComponent(effectiveId)}&limit=1`)
        if (existing.length > 0) { res.status(409).json({ error: 'Ya publicado esta semana. Cierra la semana para republicar.' }); return }
        // Filter out agent's own worker account — agents never earn commission on themselves
        const billableCommissions = rawAgentId
          ? commissions.filter(c => !c.worker_uid || c.worker_uid !== rawAgentId)
          : commissions
        const rows = billableCommissions.map(c => ({ semana, agent_user_id: effectiveId, agent_name, worker_uid: c.worker_uid ?? null, worker_name: c.worker_name, worker_real_name: c.worker_real_name ?? null, app_name: c.app_name, commission_usd: Number(c.commission_usd) || 0, published_at: new Date().toISOString() }))
        await sbPost('published_agent_commissions?on_conflict=semana,agent_user_id,app_name,worker_name', rows, 'resolution=merge-duplicates,return=minimal')
        const total = billableCommissions.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0)
        await sbPost('agent_commission_publish_log?on_conflict=semana,agent_user_id', { semana, agent_user_id: effectiveId, agent_name, total_usd: total, published_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
        if (rawAgentId && ensureVapid()) setImmediate(() => { dispatchPush([rawAgentId], '💰 Tu comisión está disponible', `Semana ${semana} — $${total.toFixed(2)} USD. Entra a verla.`, '/agente').catch(() => {}) })
        res.json({ ok: true, total_usd: total })
      } catch (e) { res.status(500).json({ error: String(e) }) }
    })
  router.post('/admin/publish-agents-to-colider', async (req, res) => {
    const { semana } = req.body as { semana: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      await sbPost('colider_commission_publish_log?on_conflict=semana', { semana, published_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
      const coliders = await sbGet('profiles?is_colider=eq.true&select=id')
      const ids = (coliders as any[]).map((c: any) => c.id as string)
      if (ids.length > 0 && ensureVapid()) setImmediate(() => { dispatchPush(ids, '💰 Comisiones de agentes disponibles', `Semana ${semana} — Entra a tu panel para ver los montos.`, '/colider').catch(() => {}) })
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  router.get('/agent/published-commissions', async (req, res) => {
    const { agent_id } = req.query as { agent_id?: string }
    if (!agent_id) { res.status(400).json({ error: 'agent_id required' }); return }
    try {
      const [comms, rates] = await Promise.all([
        sbGet(`published_agent_commissions?agent_user_id=eq.${encodeURIComponent(agent_id)}&select=*&order=semana.desc,published_at.desc`),
        sbGet('exchange_rates?select=id,rate'),
      ])
      const rm: Record<string, number> = {}
      for (const r of rates) rm[r.id] = r.rate

      const workerUids = [...new Set((comms as any[]).filter((c: any) => c.worker_uid).map((c: any) => c.worker_uid as string))]
      let salaryMap: Record<string, number> = {}
      let customRateMap: Record<string, { efectivo_rate: number; transferencia_rate: number }> = {}
      let methodMap: Record<string, string> = {}

      if (workerUids.length > 0) {
        const semanas = [...new Set((comms as any[]).map((c: any) => c.semana as string))]
        const uidList = workerUids.map((id: string) => `"${id}"`).join(',')
        const semList = semanas.map((s: string) => `"${s}"`).join(',')
        const [salRows, crRows, weRows] = await Promise.all([
          sbGet(`published_salaries?user_id=in.(${uidList})&semana=in.(${semList})&select=user_id,app_name,semana,usd`).catch(() => [] as any[]),
          sbGet(`custom_worker_rates?user_id=in.(${uidList})&select=user_id,app_name,efectivo_rate,transferencia_rate`).catch(() => [] as any[]),
          sbGet(`worker_entries?user_id=in.(${uidList})&select=user_id,app_name,metodo_pago`).catch(() => [] as any[]),
        ])
        for (const s of salRows) salaryMap[`${s.user_id}__${s.app_name}__${s.semana}`] = Number(s.usd)
        for (const cr of crRows) customRateMap[`${cr.user_id}__${cr.app_name}`] = cr
        for (const w of weRows) methodMap[`${w.user_id}__${w.app_name}`] = w.metodo_pago ?? ''
      }

      const enrichedComms = (comms as any[]).map((c: any) => {
        const sal = c.worker_uid ? (salaryMap[`${c.worker_uid}__${c.app_name}__${c.semana}`] ?? 0) : 0
        const cr = c.worker_uid ? (customRateMap[`${c.worker_uid}__${c.app_name}`] ?? null) : null
        const met = c.worker_uid ? (methodMap[`${c.worker_uid}__${c.app_name}`] ?? '') : ''
        return {
          ...c,
          worker_salary_usd: sal,
          custom_efectivo_rate: cr?.efectivo_rate ?? 0,
          custom_transferencia_rate: cr?.transferencia_rate ?? 0,
          worker_metodo_pago: met,
        }
      })

      res.json({ commissions: enrichedComms, exchange_rates: rm })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  router.get('/colider/published-agent-commissions', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const log = await sbGet(`colider_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&limit=1`)
      if (log.length === 0) { res.json({ published: false, agents: [], exchange_rates: {} }); return }
      const comms = await sbGet(`published_agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`)
      // Resolve null agent_user_id via agent_code (Layla stores agent_code as agent_name)
      const nullAgentComms = (comms as any[]).filter((c: any) => !c.agent_user_id && c.agent_name)
      const codeToResolve = [...new Set(nullAgentComms.map((c: any) => c.agent_name as string))]
      const codeToUserId: Record<string, string> = {}
      const codeToDisplayName: Record<string, string> = {}
      if (codeToResolve.length > 0) {
        try {
          const resolveRes = await fetch(`${SB}/rest/v1/profiles?agent_code=in.(${codeToResolve.map(c => '"' + c + '"').join(',')})&select=id,agent_code,colider_name`, { headers: h() })
          if (resolveRes.ok) {
            const resolved = await resolveRes.json() as { id: string; agent_code: string | null; colider_name: string | null }[]
            for (const p of resolved) {
              if (p.agent_code && p.id) {
                codeToUserId[p.agent_code] = p.id
                if (p.colider_name) codeToDisplayName[p.agent_code] = p.colider_name
              }
            }
          }
        } catch {}
        for (const c of (comms as any[])) {
          if (!c.agent_user_id && c.agent_name && codeToUserId[c.agent_name]) {
            c.agent_user_id = codeToUserId[c.agent_name]
            if (codeToDisplayName[c.agent_name]) c.agent_name = codeToDisplayName[c.agent_name]
          }
        }
      }

      const agentIds = [...new Set((comms as any[]).map((c: any) => c.agent_user_id as string).filter(Boolean))]
      const agentPayMethods: Record<string, string> = {}
      if (agentIds.length > 0) {
        try {
          const wData = await sbGet(`worker_entries?user_id=in.(${agentIds.map((id: string) => '"' + id + '"').join(',')})&select=user_id,metodo_pago&limit=200`)
          for (const w of wData) if (w.metodo_pago) agentPayMethods[w.user_id] = w.metodo_pago
        } catch {}
      }
      const agentMap: Record<string, { agent_user_id: string; agent_name: string; total_usd: number; workers: any[] }> = {}
      for (const c of (comms as any[])) {
        const payMethod = c.agent_user_id ? (agentPayMethods[c.agent_user_id] ?? null) : null
        // Show agent if their metodo_pago is 'Efectivo (Cuba)' OR if it is unknown (no worker_entries row).
        // Agents who are pure recruiters (no app) won't have a worker_entries row; we trust the admin
        // to only publish efectivo-cuba agents to the colider in the first place.
        if (payMethod !== null && payMethod !== 'Efectivo (Cuba)') continue
        const key = c.agent_user_id ?? c.agent_name
        if (!agentMap[key]) agentMap[key] = { agent_user_id: c.agent_user_id, agent_name: c.agent_name, total_usd: 0, workers: [] }
        agentMap[key].total_usd += Number(c.commission_usd) || 0
        agentMap[key].workers.push({ worker_name: c.worker_name, app_name: c.app_name, commission_usd: c.commission_usd })
      }
      const [rates] = await Promise.all([
        sbGet('exchange_rates?select=id,rate'),
      ])
      const rm: Record<string, number> = {}
      for (const r of rates) rm[r.id] = r.rate
      // Resolve display names for all agents using their profiles
        const allAgentUserIds = Object.values(agentMap).map((a: any) => a.agent_user_id).filter(Boolean) as string[]
        if (allAgentUserIds.length > 0) {
          try {
            const profRes = await sbGet(`profiles?id=in.(${allAgentUserIds.map((id: string) => '"' + id + '"').join(',')})&select=id,agent_name,colider_name`)
            for (const p of profRes as any[]) {
              const resolvedName = p.colider_name ?? p.agent_name
              if (p.id && resolvedName) {
                for (const ag of Object.values(agentMap) as any[]) {
                  if (ag.agent_user_id === p.id) ag.agent_name = resolvedName
                }
              }
            }
          } catch { /* non-critical */ }
        }
        res.json({ published: true, published_at: (log[0] as any).published_at, agents: Object.values(agentMap), exchange_rates: rm })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  export default router
  