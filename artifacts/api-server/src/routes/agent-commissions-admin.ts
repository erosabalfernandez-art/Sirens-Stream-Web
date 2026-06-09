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
      const agents = Object.values(agentMap).map(a => ({ agent_name: a.agent_name, agent_user_id: a.agent_user_id, locked: a.agent_user_id ? lockedAgents.has(a.agent_user_id) : false, apps: Object.entries(a.apps).map(([appName, workers]) => ({ app_name: appName, workers })) }))
      res.json({ semana, agents, colider_published: coliderLog.length > 0, colider_published_at: (coliderLog[0] as any)?.published_at ?? null })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  router.post('/admin/publish-agent-commission', async (req, res) => {
    const { semana, agent_user_id, agent_name, commissions } = req.body as { semana: string; agent_user_id: string; agent_name: string; commissions: { worker_uid: string | null; worker_name: string; worker_real_name?: string | null; app_name: string; commission_usd: number }[] }
    if (!semana || !agent_user_id || !agent_name || !Array.isArray(commissions)) { res.status(400).json({ error: 'Faltan campos requeridos' }); return }
    try {
      const existing = await sbGet(`agent_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&agent_user_id=eq.${encodeURIComponent(agent_user_id)}&limit=1`)
      if (existing.length > 0) { res.status(409).json({ error: 'Ya publicado esta semana. Cierra la semana para republicar.' }); return }
      const rows = commissions.map(c => ({ semana, agent_user_id, agent_name, worker_uid: c.worker_uid ?? null, worker_name: c.worker_name, worker_real_name: c.worker_real_name ?? null, app_name: c.app_name, commission_usd: Number(c.commission_usd) || 0, published_at: new Date().toISOString() }))
      await sbPost('published_agent_commissions?on_conflict=semana,agent_user_id,app_name,worker_name', rows, 'resolution=merge-duplicates,return=minimal')
      const total = commissions.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0)
      await sbPost('agent_commission_publish_log?on_conflict=semana,agent_user_id', { semana, agent_user_id, agent_name, total_usd: total, published_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
      if (ensureVapid()) setImmediate(() => { dispatchPush([agent_user_id], '💰 Tu comisión está disponible', `Semana ${semana} — $${total.toFixed(2)} USD. Entra a verla.`, '/agente').catch(() => {}) })
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
      const [comms, rates, settingData] = await Promise.all([
        sbGet(`published_agent_commissions?agent_user_id=eq.${encodeURIComponent(agent_id)}&select=*&order=semana.desc,published_at.desc`),
        sbGet('exchange_rates?select=id,rate'),
        sbGet('site_settings?key=eq.exchange_rates_valid_semana&select=value&limit=1').catch(() => [] as any[]),
      ])
      const rm: Record<string, number> = {}
      for (const r of rates) rm[r.id] = r.rate
      res.json({ commissions: comms, exchange_rates: rm, valid_rate_semana: (settingData[0] as any)?.value ?? '' })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  router.get('/colider/published-agent-commissions', async (req, res) => {
    const { semana } = req.query as { semana?: string }
    if (!semana) { res.status(400).json({ error: 'semana required' }); return }
    try {
      const log = await sbGet(`colider_commission_publish_log?semana=eq.${encodeURIComponent(semana)}&limit=1`)
      if (log.length === 0) { res.json({ published: false, agents: [], exchange_rates: {} }); return }
      const comms = await sbGet(`published_agent_commissions?semana=eq.${encodeURIComponent(semana)}&select=*`)
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
        if ((agentPayMethods[c.agent_user_id] ?? null) !== 'Efectivo (Cuba)') continue
        if (!agentMap[c.agent_user_id]) agentMap[c.agent_user_id] = { agent_user_id: c.agent_user_id, agent_name: c.agent_name, total_usd: 0, workers: [] }
        agentMap[c.agent_user_id].total_usd += Number(c.commission_usd) || 0
        agentMap[c.agent_user_id].workers.push({ worker_name: c.worker_name, app_name: c.app_name, commission_usd: c.commission_usd })
      }
      const [rates, settingData] = await Promise.all([
        sbGet('exchange_rates?select=id,rate'),
        sbGet('site_settings?key=eq.exchange_rates_valid_semana&select=value&limit=1').catch(() => [] as any[]),
      ])
      const rm: Record<string, number> = {}
      for (const r of rates) rm[r.id] = r.rate
      res.json({ published: true, published_at: (log[0] as any).published_at, agents: Object.values(agentMap), exchange_rates: (settingData[0] as any)?.value === semana ? rm : {} })
    } catch (e) { res.status(500).json({ error: String(e) }) }
  })
  export default router
  