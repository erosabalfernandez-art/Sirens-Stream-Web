import React, { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, ChevronDown, ChevronUp, Bell, BellOff, Users, BarChart3, Copy, Check, TrendingUp, Star, Calendar, CheckCircle2, MessageSquare, AlertTriangle, FileDown } from 'lucide-react'
  import { PushNotificationCard } from '@/components/layout/PushNotificationCard'

  interface AgentCommission {
    id: string; agent_name: string; app_name: string; semana: string
    total_commission_usd: number
    workers_data: { uid: string; nombre: string; salary_usd: number; commission_usd: number }[]
    created_at: string
  }

  interface WorkerEntry {
    id: string
    user_id: string
    app_name: string
    nombre_real: string | null
    nombre_en_app: string | null
    pais: string | null
    metodo_pago: string | null
    agente: string | null
    created_at: string
  }

  interface WorkerCard {
    key: string
    nombre: string
    apps: string[]
    totalComm: number
    isActive: boolean
  }

  interface NoCobro {
      id: string
      user_id: string
      app_name: string
      semana: string
      nombre_en_app: string | null
      nombre_real: string | null
      email: string | null
      justified: boolean
      created_at: string
      id_aplicacion?: string | null
      telefono_worker?: string | null
      codigo_pais_worker?: string | null
    }

    function fmt(n: number) { return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  function CopyCode({ code }: { code: string }) {
    const [copied, setCopied] = useState(false)
    function copy() {
      navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }
    return (
      <button onClick={copy}
        className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 active:scale-95 rounded-xl px-4 py-2.5 transition-all group cursor-copy">
        <span className="text-amber-300 font-mono font-extrabold text-base tracking-widest select-all">{code}</span>
        {copied
          ? <Check className="w-4 h-4 text-green-400 shrink-0" />
          : <Copy className="w-4 h-4 text-amber-400/50 group-hover:text-amber-400 shrink-0 transition-colors" />}
      </button>
    )
  }

  export default function AgentePanel() {
    const { profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [commissions, setCommissions] = useState<AgentCommission[]>([])
    const [workerEntries, setWorkerEntries] = useState<WorkerEntry[]>([])
    const [commLoading, setCommLoading] = useState(true)
    const [workersLoading, setWorkersLoading] = useState(true)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filterApp, setFilterApp] = useState(() => { try { return localStorage.getItem('ea_agent_filterapp') ?? '' } catch { return '' } })

  const [mainTab, setMainTab] = useState<'comisiones'|'trabajadoras'|'rendimiento'|'nocobro'>(() => { try { return (localStorage.getItem('ea_agent_tab') as any) || 'comisiones' } catch { return 'comisiones' } })
  const [workerAppFilter, setWorkerAppFilter] = useState(() => { try { return localStorage.getItem('ea_agent_workerapp') ?? '' } catch { return '' } })
    const [exchangeRates, setExchangeRates] = useState<Record<string,number>>({})
    const [agentPayMethod, setAgentPayMethod] = useState<'efectivo' | 'transferencia' | null>(null)
      const [agentConfirmed, setAgentConfirmed] = useState<Set<string>>(new Set())
      const [agentConfirming, setAgentConfirming] = useState<string | null>(null)
    const [noCobro, setNoCobro] = useState<NoCobro[]>([])
    const [noCobroLoading, setNoCobroLoading] = useState(false)
    const [publishedComms, setPublishedComms] = useState<any[]>([])
    const [pubCommsLoading, setPubCommsLoading] = useState(true)
  const [localAgentCode, setLocalAgentCode] = useState<string | null>(null)

  // Persist tab and filter selections
  useEffect(() => { try { localStorage.setItem('ea_agent_tab', mainTab) } catch {} }, [mainTab])
  useEffect(() => { try { localStorage.setItem('ea_agent_filterapp', filterApp) } catch {} }, [filterApp])
  useEffect(() => { try { localStorage.setItem('ea_agent_workerapp', workerAppFilter) } catch {} }, [workerAppFilter])

    useEffect(() => { if (!loading && profile !== undefined && !profile?.is_agent && !profile?.is_colider) navigate('/') }, [loading, profile])
    useEffect(() => {
      if (profile?.is_agent || profile?.is_colider) {
        fetchCommissions()
        fetchPublishedCommissions()
        fetchWorkers()
        fetchExchangeRates()
      }
    }, [profile])

  // Auto-generate agent_code if not set yet (handles coliders and new agents)
  useEffect(() => {
    if (!profile || (profile as any).agent_code || localAgentCode) return
    if (!profile.is_agent && !(profile as any).is_colider) return
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
    fetch(`${apiBase}/api/agent/ensure-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: (profile as any).id }),
    }).then(r => r.json()).then((d: { agent_code?: string }) => {
      if (d.agent_code) setLocalAgentCode(d.agent_code)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Reset panel when admin does weekly cierre (same as colider.tsx)
  useEffect(() => {
    function onCierre() {
      setCommissions([])
      setPublishedComms([])
      setWorkerEntries([])
      setWorkersByApp(new Map())
      setAllWorkerCards([])
    }
    window.addEventListener('ea_cierre_done', onCierre)
    return () => window.removeEventListener('ea_cierre_done', onCierre)
  }, [])

    async function fetchCommissions() {
      setCommLoading(true)
      try {
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/agent-commissions?agent_id=${profile?.id ?? ''}`)
        if (res.ok) { setCommissions(await res.json() as AgentCommission[]); setCommLoading(false); return }
      } catch {}
      const { data } = await supabase.from('agent_commissions').select('*').order('created_at', { ascending: false })
      setCommissions((data ?? []) as AgentCommission[])
      setCommLoading(false)
    }

    async function fetchPublishedCommissions() {
      setPubCommsLoading(true)
      try {
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/agent/published-commissions?agent_id=${profile?.id ?? ''}`)
        if (res.ok) {
          const data = await res.json()
          setPublishedComms(data.commissions ?? [])
          if (data.exchange_rates) setExchangeRates(data.exchange_rates)
        }
      } catch {}
      setPubCommsLoading(false)
    }

    async function fetchWorkers() {
      setWorkersLoading(true)
      try {
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/agent-workers?agent_id=${profile?.id ?? ''}`)
        if (res.ok) { setWorkerEntries(await res.json() as WorkerEntry[]); setWorkersLoading(false); return }
      } catch {}
      setWorkersLoading(false)
    }

    async function fetchExchangeRates() {
      const ratesRes = await supabase.from('exchange_rates').select('id, rate')
      const r: Record<string,number> = {}
      for (const row of (ratesRes.data ?? []) as {id:string;rate:number}[]) r[row.id] = row.rate
      setExchangeRates(r)
    }

    async function fetchNoCobro() {
        setNoCobroLoading(true)
        try {
          const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
          const res = await fetch(`${apiBase}/api/agent/no-cobro?agent_id=${profile?.id ?? ''}`)
          if (res.ok) {
            const d = await res.json() as { entries: NoCobro[] }
            setNoCobro(d.entries ?? [])
          }
        } catch {}
        setNoCobroLoading(false)
      }

      async function fetchAgentConfirmed() {
        const { data } = await supabase
          .from('agent_payment_confirmations')
          .select('commission_id')
          .eq('user_id', profile!.id)
        setAgentConfirmed(new Set(((data ?? []) as any[]).map((r: any) => r.commission_id)))
      }

      async function confirmAgentPayment(commId: string, semana: string, appName: string) {
        setAgentConfirming(commId)
        await supabase.from('agent_payment_confirmations').insert({
          commission_id: commId,
          user_id: profile!.id,
          agent_name: profile!.agent_name ?? '',
          semana,
          app_name: appName,
        })
        try {
          const _apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
          await fetch(`${_apiUrl}/api/payment-sticker`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: profile!.id, app_name: appName, nombre_en_app: (profile as any)?.agent_name ?? (profile as any)?.email ?? '', sticker_index: 0 }) })
        } catch {}
        setAgentConfirmed(prev => new Set([...prev, commId]))
        setAgentConfirming(null)
      }

      function selectPayMethod(method: 'efectivo' | 'transferencia') {
        setAgentPayMethod(method)
        if (profile?.id) localStorage.setItem(`apm_${profile.id}`, method)
      }


    function toggleExpand(id: string) {
      setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    }

    function exportCommissionPDF() {
      if (commissions.length === 0) return
      const agentName = profile?.agent_name ?? profile?.email ?? 'Agente'
      const apps = [...new Set(commissions.map(c => c.app_name))]
      const totalUSD = commissions.reduce((sum, c) => sum + Number(c.total_commission_usd || 0), 0)
      const now = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

      const appSections = apps.map(app => {
        const appComms = commissions.filter(c => c.app_name === app).sort((a, b) => b.semana.localeCompare(a.semana))
        const appTotal = appComms.reduce((sum, c) => sum + Number(c.total_commission_usd || 0), 0)
        const weekRows = appComms.map(c => {
          const workers = (c.workers_data ?? [])
          const workerRows = workers.map((w: any) =>
            `<tr class="worker-row">
              <td class="worker-name-cell">${w.nombre || w.uid || '—'}</td>
              <td class="worker-usd-cell">$${Number(w.salary_usd || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</td>
              <td class="worker-comm-cell">$${Number(w.commission_usd || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</td>
            </tr>`).join('')
          return `
            <tr class="week-row">
              <td colspan="2" style="padding:0">
                <table class="inner-table" style="width:100%">
                  <tr class="week-header-row">
                    <td class="week-header-cell">Semana ${c.semana}</td>
                    <td class="week-total-cell">Comisión total: <strong>$${Number(c.total_commission_usd || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</strong></td>
                  </tr>
                  ${workers.length > 0 ? `
                  <tr><td colspan="3" style="padding:0">
                    <table style="width:100%; border-collapse:collapse; font-size:11px">
                      <thead><tr>
                        <th style="padding:5px 12px 5px 24px; text-align:left; color:#9ca3af; font-weight:700; background:#fafafa; border-bottom:1px solid #f3f4f6">Trabajadora</th>
                        <th style="padding:5px 12px; text-align:left; color:#9ca3af; font-weight:700; background:#fafafa; border-bottom:1px solid #f3f4f6">Salario USD</th>
                        <th style="padding:5px 12px; text-align:left; color:#d97706; font-weight:700; background:#fafafa; border-bottom:1px solid #f3f4f6">Comisión USD</th>
                      </tr></thead>
                      <tbody>${workerRows}</tbody>
                    </table>
                  </td></tr>` : ''}
                </table>
              </td>
            </tr>`
        }).join('')
        return `
          <div class="app-section">
            <div class="app-header">
              <span class="app-name">${app}</span>
              <span class="app-total">Total acumulado: $${appTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span>
            </div>
            <table class="week-table" style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-top:none">
              <tbody>${weekRows}</tbody>
            </table>
          </div>`
      }).join('')

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mis Comisiones - Eclipse Angels</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 36px; font-size: 13px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #d97706; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 900; color: #d97706; letter-spacing: -0.5px; }
  .brand span { color: #f59e0b; }
  .doc-title { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .meta { text-align: right; font-size: 11px; color: #9ca3af; line-height: 1.6; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; }
  .summary-card .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #d97706; margin-bottom: 4px; }
  .summary-card .value { font-size: 20px; font-weight: 900; color: #1a1a2e; }
  .summary-card .sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .app-section { margin-bottom: 28px; }
  .app-header { display: flex; align-items: center; justify-content: space-between; background: #d97706; color: #fff; border-radius: 8px 8px 0 0; padding: 10px 16px; }
  .app-name { font-weight: 900; font-size: 14px; letter-spacing: 0.03em; }
  .app-total { font-weight: 700; font-size: 13px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; }
  .week-header-row { background: #fef9ee; }
  .week-header-cell { padding: 10px 16px; font-weight: 700; color: #1a1a2e; font-size: 13px; border-bottom: 1px solid #fde68a; }
  .week-total-cell { padding: 10px 16px; color: #059669; font-size: 13px; text-align: right; border-bottom: 1px solid #fde68a; }
  .inner-table { border-bottom: 2px solid #fde68a; }
  .worker-row td { padding: 5px 12px; border-bottom: 1px solid #f3f4f6; }
  .worker-row:last-child td { border-bottom: none; }
  .worker-name-cell { padding-left: 24px !important; color: #374151; }
  .worker-usd-cell { color: #059669; font-weight: 700; }
  .worker-comm-cell { color: #d97706; font-weight: 700; }
  .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Eclipse <span>Angels</span> Agency</div>
      <div class="doc-title">Historial de Comisiones — ${agentName} — Solo en USD</div>
    </div>
    <div class="meta">
      Generado: ${now}<br>
      Total de semanas: ${commissions.length}<br>
      Total de apps: ${apps.length}
    </div>
  </div>
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total comisiones (USD)</div>
      <div class="value">$${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</div>
      <div class="sub">Suma de todos los períodos</div>
    </div>
    <div class="summary-card">
      <div class="label">Semanas registradas</div>
      <div class="value">${commissions.length}</div>
      <div class="sub">En ${apps.length} aplicación${apps.length !== 1 ? 'es' : ''}</div>
    </div>
    <div class="summary-card">
      <div class="label">Trabajadoras activas</div>
      <div class="value">${allWorkerCards.length}</div>
      <div class="sub">Con al menos una semana cobrada</div>
    </div>
  </div>
  ${appSections}
  <div class="footer">Eclipse Angels Agency · Documento generado automáticamente · Todos los montos en USD</div>
</body>
</html>`

      const win = window.open('', '_blank')
      if (!win) { alert('Permite las ventanas emergentes para exportar el PDF'); return }
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 400)
    }

    // Merge worker_entries + commission data into unified worker cards
    const allWorkerCards = React.useMemo(() => {
      const map = new Map<string, WorkerCard>()
      for (const w of workerEntries) {
        const key = w.user_id
        if (!map.has(key)) map.set(key, { key, nombre: w.nombre_en_app || w.nombre_real || w.user_id.slice(0, 8), apps: [], totalComm: 0, isActive: false })
        const card = map.get(key)!
        if (!card.apps.includes(w.app_name)) card.apps.push(w.app_name)
      }
      for (const c of commissions) {
        for (const w of (c.workers_data ?? [])) {
          let found = map.get(w.uid)
          if (!found) {
            for (const v of map.values()) { if (v.nombre === w.nombre) { found = v; break } }
          }
          if (!found) continue // Trabajadora borrada de worker_entries → no se muestra en ningún lado
          found.isActive = true
          found.totalComm += w.commission_usd || 0
          if (!found.apps.includes(c.app_name)) found.apps.push(c.app_name)
        }
      }
      return [...map.values()].sort((a, b) => b.totalComm - a.totalComm)
    }, [workerEntries, commissions])

    const workersByApp = React.useMemo(() => {
      const map = new Map<string, WorkerCard[]>()
      for (const w of allWorkerCards) {
        for (const app of w.apps) {
          if (!map.has(app)) map.set(app, [])
          if (!map.get(app)!.find(x => x.key === w.key)) map.get(app)!.push(w)
        }
      }
      return map
    }, [allWorkerCards])

    const appStats = React.useMemo(() => {
      const stats = new Map<string, { totalComm: number; weekCount: number; bestWeek: number; workerCount: number; weeks: {semana: string; comm: number}[] }>()
      for (const c of commissions) {
        if (!stats.has(c.app_name)) stats.set(c.app_name, { totalComm: 0, weekCount: 0, bestWeek: 0, workerCount: 0, weeks: [] })
        const s = stats.get(c.app_name)!
        s.totalComm += c.total_commission_usd || 0
        s.weekCount++
        if ((c.total_commission_usd || 0) > s.bestWeek) s.bestWeek = c.total_commission_usd || 0
        const wc = new Set((c.workers_data ?? []).map(w => w.uid)).size
        if (wc > s.workerCount) s.workerCount = wc
        s.weeks.push({ semana: c.semana, comm: c.total_commission_usd || 0 })
      }
      return stats
    }, [commissions])

    if (loading || profile === undefined) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-sm">Cargando...</div>
      </div>
    )
    if (!profile?.is_agent && !profile?.is_colider) return null

    const agentCode = localAgentCode || ((profile as any).agent_code as string | undefined)
    const commApps = [...new Set(commissions.map(c => c.app_name))]
    const allApps = [...new Set([...workerEntries.map(w => w.app_name), ...commApps])]
    const filtered = commissions.filter(c => !filterApp || c.app_name === filterApp)
    const totalUSD = commissions.reduce((s, c) => s + (c.total_commission_usd || 0), 0)
    const pubTotalUSD = publishedComms.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0)
    const pubSemanas = [...new Set(publishedComms.map(c => c.semana))]
    const pubApps = [...new Set(publishedComms.map(c => c.app_name as string))]
    const visibleWorkers = workerAppFilter ? (workersByApp.get(workerAppFilter) ?? []) : allWorkerCards

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">

          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 mb-3">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Panel de Agente</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-extrabold">
                  {mainTab === 'comisiones' ? 'Mis Comisiones' : mainTab === 'trabajadoras' ? 'Mis Trabajadoras' : 'Rendimiento'}
                </h1>
                {profile.agent_name && <p className="text-white/40 text-sm mt-0.5">Agente: {profile.agent_name}</p>}
              </div>
              {agentCode && (
                <div className="text-right shrink-0">
                  <p className="text-white/25 text-xs mb-1.5">Tu código · toca para copiar</p>
                  <CopyCode code={agentCode} />
                  <p className="text-white/20 text-xs mt-1">Compártelo con tus trabajadoras</p>
                </div>
              )}
            </div>
          </div>

          {/* No-commission warning for own worker entries */}
          {workerEntries.some(w => w.user_id === profile.id) && (
            <div className="mb-4 bg-amber-500/8 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-400 text-xl shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-300 text-sm font-bold mb-1">Tus cuentas propias no generan comisión</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Tienes cuentas en las apps bajo tu propio perfil
                  ({workerEntries.filter(w => w.user_id === profile.id).map(w => w.app_name).join(', ')}).
                  Esas cuentas no cuentan para tu comisión de agente.
                </p>
              </div>
            </div>
          )}

          {/* Push notification card */}
          <PushNotificationCard userId={profile?.id ?? ''} />

              {/* Canales card */}
              <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Canales de la agencia</p>
                      <p className="text-white/35 text-xs mt-0.5">Comunicados y noticias oficiales de Eclipse Angels</p>
                    </div>
                  </div>
                  <a href="/canales"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shrink-0">
                    Ver canales →
                  </a>
                </div>
              </div>

            {/* Tab switcher */}
          <div className="flex bg-[#0d0d1e] border border-purple-500/10 p-1 rounded-xl mb-6 gap-1 flex-wrap">
            <button onClick={() => setMainTab('comisiones')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'comisiones' ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white'}`}>
              <DollarSign className="w-3.5 h-3.5" /> Comisiones
            </button>
            <button onClick={() => setMainTab('trabajadoras')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'trabajadoras' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}>
              <Users className="w-3.5 h-3.5" /> Trabajadoras
              {allWorkerCards.length > 0 && <span className="text-[11px] bg-white/10 rounded-full px-1.5 py-0.5 leading-none">{allWorkerCards.length}</span>}
            </button>
            <button onClick={() => setMainTab('rendimiento')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'rendimiento' ? 'bg-green-700 text-white' : 'text-white/40 hover:text-white'}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Rendimiento
            </button>
            <button onClick={() => setMainTab('nocobro')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'nocobro' ? 'bg-rose-700 text-white' : 'text-white/40 hover:text-white'}`}>
                <AlertTriangle className="w-3.5 h-3.5" /> Sin Cobrar
                {noCobro.length > 0 && <span className="text-[11px] bg-rose-500/30 rounded-full px-1.5 py-0.5 leading-none">{[...new Set(noCobro.map(e => e.user_id + e.app_name))].length}</span>}
              </button>
          </div>

          {/* ====== COMISIONES TAB ====== */}
            {mainTab === 'comisiones' && (
              <>
                {/* Stats grid */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Resumen</p>
                  {commissions.length > 0 && (
                    <button
                      onClick={exportCommissionPDF}
                      className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-green-400">${pubTotalUSD.toFixed(2)} <span className="text-sm font-bold">USD</span></p>
                    {agentPayMethod && (exchangeRates[`${agentPayMethod}_agent`] ?? 0) > 0 && pubTotalUSD > 0
                      ? <p className="text-sm font-bold text-amber-300 mt-0.5">{(pubTotalUSD * (exchangeRates[`${agentPayMethod}_agent`] ?? 0)).toLocaleString('es-ES', {maximumFractionDigits: 0})} CUP</p>
                      : <p className="text-xs text-white/25 mt-0.5">⏳ Tasa pendiente</p>
                    }
                    <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Total publicado</p>
                  </div>
                  <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-purple-400">{pubSemanas.length}</p>
                    <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Semanas</p>
                  </div>
                  <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-extrabold text-blue-400">{allWorkerCards.length}</p>
                    <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Trabajadoras</p>
                  </div>
                </div>

                {/* Payment method selector — only when there are published commissions */}
                {publishedComms.length > 0 && (
                  <div className="mb-4">
                    {!agentPayMethod ? (
                      <div className="bg-[#0d0d1e] border border-amber-500/20 rounded-2xl p-5 mb-3">
                        <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">💱 Elige tu método de cobro</p>
                        <p className="text-white/40 text-xs mb-4">Selecciona cómo recibirás tus comisiones. Solo puedes elegir uno.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => selectPayMethod('efectivo')}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 transition-all">
                            <span className="text-2xl">💵</span>
                            <span className="text-white font-bold text-sm">Efectivo Cuba</span>
                            {(exchangeRates['efectivo_agent'] ?? 0) > 0 && <span className="text-amber-400/60 text-xs">1 USD = {(exchangeRates['efectivo_agent']).toLocaleString('es-ES')} CUP</span>}
                          </button>
                          <button onClick={() => selectPayMethod('transferencia')}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 transition-all">
                            <span className="text-2xl">🏦</span>
                            <span className="text-white font-bold text-sm">Transferencia Cuba</span>
                            {(exchangeRates['transferencia_agent'] ?? 0) > 0 && <span className="text-blue-400/60 text-xs">1 USD = {(exchangeRates['transferencia_agent']).toLocaleString('es-ES')} CUP</span>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`bg-${agentPayMethod === 'efectivo' ? 'amber' : 'blue'}-500/8 border border-${agentPayMethod === 'efectivo' ? 'amber' : 'blue'}-500/20 rounded-2xl p-4 mb-3`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{agentPayMethod === 'efectivo' ? '💵' : '🏦'}</span>
                            <div>
                              <p className={`text-${agentPayMethod === 'efectivo' ? 'amber' : 'blue'}-400 text-xs font-bold uppercase tracking-wider`}>
                                {agentPayMethod === 'efectivo' ? 'Efectivo Cuba' : 'Transferencia Cuba'}
                              </p>
                              {(exchangeRates[`${agentPayMethod}_agent`] ?? 0) > 0 && (
                                <p className="text-white/30 text-xs">1 USD = {(exchangeRates[`${agentPayMethod}_agent`]).toLocaleString('es-ES')} CUP</p>
                              )}
                            </div>
                          </div>
                          <button onClick={() => setAgentPayMethod(null)}
                            className="text-white/30 hover:text-white/60 text-xs transition-colors px-2 py-1 rounded-lg border border-white/10">
                            Cambiar
                          </button>
                        </div>
                        {/* Per-app breakdown from published commissions */}
                        {pubApps.length > 0 && (
                          <div className="space-y-1.5">
                            {pubApps.map(app => {
                              const appUsd = publishedComms.filter(c => c.app_name === app).reduce((s, c) => s + (Number(c.commission_usd) || 0), 0)
                              const rate = exchangeRates[`${agentPayMethod}_agent`] ?? 0
                              return (
                                <div key={app} className="flex items-center justify-between">
                                  <span className="text-white/50 text-sm">{app} · <span className="text-green-400 font-bold">${appUsd.toFixed(2)}</span></span>
                                  <span className={`text-${agentPayMethod === 'efectivo' ? 'amber' : 'blue'}-300 font-extrabold text-lg`}>
                                    {rate > 0 ? (appUsd * rate).toLocaleString('es-ES', {maximumFractionDigits: 0}) + ' CUP' : <span className="text-white/25 text-sm">— sin tasa</span>}
                                  </span>
                                </div>
                              )
                            })}
                            {pubApps.length > 1 && (
                              <div className="flex items-center justify-between border-t border-white/8 pt-2 mt-1">
                                <span className="text-white/40 text-sm font-bold">Total · <span className="text-green-400">${pubTotalUSD.toFixed(2)}</span></span>
                                <span className={`text-${agentPayMethod === 'efectivo' ? 'amber' : 'blue'}-300 font-extrabold text-xl`}>
                                  {(exchangeRates[`${agentPayMethod}_agent`] ?? 0) > 0
                                    ? (pubTotalUSD * (exchangeRates[`${agentPayMethod}_agent`] ?? 0)).toLocaleString('es-ES', {maximumFractionDigits: 0}) + ' CUP'
                                    : <span className="text-white/25 text-sm">— sin tasa</span>}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Contactar pagador */}
                {agentPayMethod === 'efectivo' && publishedComms.length > 0 && (exchangeRates['efectivo_agent'] ?? 0) > 0 && (
                  <div className="bg-amber-500/6 border border-amber-500/15 rounded-2xl p-4 mb-3 space-y-2">
                    <p className="text-amber-400/80 text-xs font-bold">📲 Contactar pagador</p>
                    <p className="text-white/30 text-xs leading-relaxed">Solo escríbele cuando hayas visto tu monto semanal en CUP. No contactes al pagador sin haber visto el monto.</p>
                    <a
                      href={`https://wa.me/5356380709?text=${encodeURIComponent('Hola. soy miembro de eclipse angels en la app ' + (pubApps[0] ?? '') + '. E logrado hacer la meta de la app por primera vez por favor guarda mi contacto para temas del pago.')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                      💬 Escribir al pagador
                    </a>
                  </div>
                )}

                {/* Published commissions per semana */}
                {pubCommsLoading ? (
                  <div className="text-white/30 text-sm text-center py-12 animate-pulse">Cargando comisiones...</div>
                ) : publishedComms.length === 0 ? (
                  <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                    <DollarSign className="w-8 h-8 text-white/15 mx-auto mb-3" />
                    <p className="text-white/35 text-sm font-semibold">Comisión pendiente</p>
                    <p className="text-white/20 text-xs mt-1">El admin publicará tu comisión cuando esté lista.</p>
                  </div>
                ) : (() => {
                  const bySemana: Record<string, any[]> = {}
                  for (const c of publishedComms) { if (!bySemana[c.semana]) bySemana[c.semana] = []; bySemana[c.semana].push(c) }
                  return (
                    <div className="space-y-3">
                      {Object.entries(bySemana).sort(([a], [b]) => b.localeCompare(a)).map(([sem, rows]) => {
                        const semUsd = rows.reduce((s, row) => s + (Number(row.commission_usd) || 0), 0)
                        const rate = agentPayMethod ? (exchangeRates[`${agentPayMethod}_agent`] ?? 0) : 0
                        return (
                          <div key={sem} className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl overflow-hidden">
                            <button onClick={() => toggleExpand(sem)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/5 transition-colors text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">💰</div>
                                <div>
                                  <p className="text-white font-semibold text-sm">Semana {sem}</p>
                                  <p className="text-white/35 text-xs">{rows.length} {rows.length === 1 ? 'trabajadora' : 'trabajadoras'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right shrink-0">
                                  <p className="text-green-400 font-extrabold text-base">${semUsd.toFixed(2)} <span className="text-sm">USD</span></p>
                                  {rate > 0
                                    ? <p className={`text-sm font-bold mt-0.5 ${agentPayMethod === 'efectivo' ? 'text-amber-400' : 'text-blue-400'}`}>{(semUsd * rate).toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP</p>
                                    : <p className="text-xs text-white/25 mt-0.5">⏳ Tasa pendiente</p>
                                  }
                                </div>
                                {expanded.has(sem) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                              </div>
                            </button>
                            {expanded.has(sem) && (
                              <div className="border-t border-purple-500/10 px-5 py-4 space-y-2">
                                {rows.map((row, i) => {
                                  const workerSalUsd = Number(row.worker_salary_usd ?? 0)
                                  const met = (row.worker_metodo_pago ?? '').toLowerCase()
                                  const isEfectivo = met.includes('efectivo') || (!met.includes('transfer') && workerSalUsd > 0)
                                  const customEf = Number(row.custom_efectivo_rate ?? 0)
                                  const customTr = Number(row.custom_transferencia_rate ?? 0)
                                  const globalEf = exchangeRates['efectivo_worker'] ?? 0
                                  const globalTr = exchangeRates['transferencia_worker'] ?? 0
                                  const efRate = customEf > 0 ? customEf : globalEf
                                  const trRate = customTr > 0 ? customTr : globalTr
                                  const workerRate = isEfectivo ? efRate : trRate
                                  const hasExclusive = customEf > 0 || customTr > 0
                                  const cupAmount = workerSalUsd > 0 && workerRate > 0 ? workerSalUsd * workerRate : 0
                                  return (
                                    <div key={i} className="py-2 border-b border-white/5 last:border-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <span className="text-white/70 text-sm block truncate">{row.worker_name}</span>
                                          <span className="text-white/30 text-xs">{row.app_name}{isCuban && workerRate > 0 ? ` · ${workerRate.toLocaleString('es-ES')} CUP/USD${hasExclusive ? ' ✦' : ''}` : ''}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-green-400 font-bold text-sm block">${Number(row.commission_usd).toFixed(2)} <span className="text-white/30 font-normal text-xs">comisión</span></span>
                                          {cupAmount > 0 && (
                                            <span className={`font-bold text-xs block mt-0.5 ${isEfectivo ? 'text-amber-400' : 'text-blue-400'}`}>
                                              {cupAmount.toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP
                                            </span>
                                          )}
                                          {isCuban && workerRate <= 0 && (
                                            <span className="text-white/20 text-xs block mt-0.5">⏳ tasa pendiente</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </>
            )}

          {/* ====== TRABAJADORAS TAB ====== */}
          {mainTab === 'trabajadoras' && (
            <>
              <div className="flex gap-2 mb-5 flex-wrap">
                <button onClick={() => setWorkerAppFilter('')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!workerAppFilter ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>
                  Todas ({allWorkerCards.length})
                </button>
                {allApps.map(a => (
                  <button key={a} onClick={() => setWorkerAppFilter(a)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${workerAppFilter === a ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>
                    {a} ({(workersByApp.get(a) ?? []).length})
                  </button>
                ))}
              </div>

              {workersLoading && commLoading ? (
                <div className="text-white/30 text-sm text-center py-12">Cargando trabajadoras...</div>
              ) : visibleWorkers.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                  <Users className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/35 text-sm">Ninguna trabajadora ha registrado tu código aún.</p>
                  {agentCode && (
                    <div className="mt-5">
                      <p className="text-white/25 text-xs mb-2">Comparte tu código:</p>
                      <div className="flex justify-center"><CopyCode code={agentCode} /></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleWorkers.map((w) => (
                    <div key={w.key} className="bg-[#0d0d1e] border border-purple-500/10 rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                          {(w.nombre[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-white truncate">{w.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {w.apps.map(a => (
                              <span key={a} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">{a}</span>
                            ))}
                            {!w.isActive && (
                              <span className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Sin comisiones aún</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {w.totalComm > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-green-400 font-extrabold text-sm">${fmt(w.totalComm)}</p>
                          <p className="text-white/25 text-xs">comisión total</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ====== RENDIMIENTO TAB ====== */}
          {mainTab === 'rendimiento' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#0d0d1e] border border-green-500/20 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-extrabold text-green-400">${fmt(totalUSD)}</p>
                  <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Total comisiones</p>
                </div>
                <div className="bg-[#0d0d1e] border border-purple-500/20 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-extrabold text-purple-400">{allWorkerCards.length}</p>
                  <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Trabajadoras totales</p>
                </div>
              </div>

              {commissions.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                  <BarChart3 className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/35 text-sm">Aún no hay datos de rendimiento.</p>
                  <p className="text-white/20 text-xs mt-2">Aparecerán cuando se publiquen comisiones.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">Rendimiento por app</p>
                  {[...appStats.entries()].map(([app, s]) => {
                    const avgPerWeek = s.weekCount > 0 ? s.totalComm / s.weekCount : 0
                    const recentWeeks = [...s.weeks].sort((a, b) => b.semana.localeCompare(a.semana)).slice(0, 4)
                    return (
                      <div key={app} className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-extrabold text-lg">{app[0]}</div>
                            <div>
                              <p className="font-extrabold text-lg">{app}</p>
                              <p className="text-white/35 text-xs">{s.workerCount} activas · {s.weekCount} semanas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-extrabold text-xl">${fmt(s.totalComm)}</p>
                            <p className="text-white/30 text-xs">total acumulado</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-black/20 rounded-xl p-3 text-center">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                            <p className="text-white font-extrabold text-sm">${fmt(avgPerWeek)}</p>
                            <p className="text-white/30 text-xs">prom/semana</p>
                          </div>
                          <div className="bg-black/20 rounded-xl p-3 text-center">
                            <Star className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-1" />
                            <p className="text-white font-extrabold text-sm">${fmt(s.bestWeek)}</p>
                            <p className="text-white/30 text-xs">mejor semana</p>
                          </div>
                          <div className="bg-black/20 rounded-xl p-3 text-center">
                            <Users className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                            <p className="text-white font-extrabold text-sm">{s.workerCount}</p>
                            <p className="text-white/30 text-xs">activas</p>
                          </div>
                        </div>

                        {recentWeeks.length > 0 && (
                          <div>
                            <p className="text-xs text-white/25 mb-2.5 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" /> Últimas semanas
                            </p>
                            <div className="space-y-2">
                              {recentWeeks.map(w => {
                                const pct = s.bestWeek > 0 ? (w.comm / s.bestWeek) * 100 : 0
                                return (
                                  <div key={w.semana} className="flex items-center gap-3">
                                    <span className="text-white/40 text-xs w-24 shrink-0">{w.semana}</span>
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-amber-400 font-bold text-xs w-16 text-right shrink-0">${fmt(w.comm)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}


            {/* ====== SIN COBRAR TAB ====== */}
            {mainTab === 'nocobro' && (
              <>
                {noCobroLoading ? (
                  <div className="text-white/30 text-sm text-center py-12">Cargando...</div>
                ) : noCobro.length === 0 ? (
                  <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                    <AlertTriangle className="w-8 h-8 text-white/15 mx-auto mb-3" />
                    <p className="text-white/35 text-sm">Ninguna trabajadora de tu equipo aparece en el registro sin cobrar.</p>
                  </div>
                ) : (() => {
                  // Group by user_id + app_name
                  const grouped = new Map<string, NoCobro[]>()
                  for (const e of noCobro) {
                    const k = e.user_id + '__' + e.app_name
                    if (!grouped.has(k)) grouped.set(k, [])
                    grouped.get(k)!.push(e)
                  }
                  const entries1: NoCobro[][] = []
                  const entries2plus: NoCobro[][] = []
                  for (const group of grouped.values()) {
                    if (group.length === 1) entries1.push(group)
                    else entries2plus.push(group.sort((a, b) => b.semana.localeCompare(a.semana)))
                  }
                  entries2plus.sort((a, b) => b.length - a.length)
                  return (
                    <div className="space-y-6">
                      {entries2plus.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-red-400">🔴 2 o más semanas sin cobrar</span>
                            <span className="text-xs bg-red-500/20 text-red-300 rounded-full px-2 py-0.5">{entries2plus.length}</span>
                          </div>
                          <div className="space-y-2">
                            {entries2plus.map(group => {
                              const latest = group[0]
                              const nombre = latest.nombre_en_app || latest.nombre_real || latest.user_id.slice(0, 8)
                              return (
                                <div key={latest.user_id + latest.app_name} className="bg-[#0d0d1e] border border-red-500/20 rounded-2xl p-4">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                      <p className="text-white font-bold text-sm">{nombre}</p>
                                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        <p className="text-white/35 text-xs">{latest.app_name} · {group.length} semanas</p>
                                        {latest.id_aplicacion && <span className="text-[10px] text-white/30 font-mono">ID: {latest.id_aplicacion}</span>}
                                      </div>
                                      {(() => { const raw = `${latest.codigo_pais_worker ?? ''}${latest.telefono_worker ?? ''}`; const d = raw.replace(/\\D/g,''); return d.length >= 7 ? <a href={`https://wa.me/${d}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20 font-semibold transition-colors mt-0.5 inline-block">📱 WA</a> : null })()} 
                                    </div>
                                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border bg-red-500/15 text-red-300 border-red-500/25">
                                      {group.length} sem.
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {group.map(entry => (
                                      <div key={entry.id} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2">
                                        <span className="text-white/40 text-xs">Semana {entry.semana}</span>
                                        {entry.justified
                                          ? <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">✓ Justificada</span>
                                          : <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">✗ No justificada</span>
                                        }
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {entries1.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">⚠️ 1 semana sin cobrar</span>
                            <span className="text-xs bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">{entries1.length}</span>
                          </div>
                          <div className="space-y-2">
                            {entries1.map(group => {
                              const entry = group[0]
                              const nombre = entry.nombre_en_app || entry.nombre_real || entry.user_id.slice(0, 8)
                              return (
                                <div key={entry.id} className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-white font-semibold text-sm">{nombre}</p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      <p className="text-white/35 text-xs">{entry.app_name} · Semana {entry.semana}</p>
                                      {entry.id_aplicacion && <span className="text-[10px] text-white/30 font-mono">ID: {entry.id_aplicacion}</span>}
                                    </div>
                                    {(() => { const raw = `${entry.codigo_pais_worker ?? ''}${entry.telefono_worker ?? ''}`; const d = raw.replace(/\\D/g,''); return d.length >= 7 ? <a href={`https://wa.me/${d}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20 font-semibold mt-0.5 inline-block">📱 WA</a> : null })()} 
                                  </div>
                                  {entry.justified
                                    ? <span className="shrink-0 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">✓ Justificada</span>
                                    : <span className="shrink-0 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">⚠ No justificada</span>
                                  }
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
        </div>
      </div>
    )
  }
  