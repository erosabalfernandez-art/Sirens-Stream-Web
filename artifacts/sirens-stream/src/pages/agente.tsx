import React, { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, ChevronDown, ChevronUp, Users, Copy, Check, CheckCircle2, MessageSquare, AlertTriangle, FileDown, BarChart2, ChevronRight, Gem, Calendar } from 'lucide-react'
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
    id_aplicacion: string | null
    pais: string | null
    metodo_pago: string | null
    agente: string | null
    created_at: string
  }

  interface WorkerCard {
    key: string
    nombre: string
    apps: string[]
    appNameMap: Record<string, string>
    idMap: Record<string, string>
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


    interface WorkerSalary {
      user_id: string
      app_name: string
      semana: string
      usd: number
      nombre_en_app: string | null
      nombre_real: string | null
      created_at: string
      metodo_pago: string | null
      custom_efectivo_rate: number
      custom_transferencia_rate: number
    }
  
    function fmt(n: number) { return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

    interface PublishedSalary {
      id: string; app_name: string; semana: string; usd: number; diamantes: number
      extras: Record<string, string | number>; created_at: string
    }

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

  const [mainTab, setMainTab] = useState<'comisiones'|'trabajadoras'|'nocobro'>(() => { try { const s = localStorage.getItem('ea_agent_tab'); return (s === 'comisiones' || s === 'trabajadoras' || s === 'nocobro' ? s : 'comisiones') } catch { return 'comisiones' } })
  const [workerAppFilter, setWorkerAppFilter] = useState(() => { try { return localStorage.getItem('ea_agent_workerapp') ?? '' } catch { return '' } })
    const [exchangeRates, setExchangeRates] = useState<Record<string,number>>({})
    const [agentPayMethod, setAgentPayMethod] = useState<'efectivo' | 'transferencia' | null>(null)
  const [payMethodLocked, setPayMethodLocked] = useState(false)
      const [agentConfirmed, setAgentConfirmed] = useState<Set<string>>(new Set())
      const [agentConfirming, setAgentConfirming] = useState<string | null>(null)
    const [noCobro, setNoCobro] = useState<NoCobro[]>([])
    const [noCobroLoading, setNoCobroLoading] = useState(false)
    const [publishedComms, setPublishedComms] = useState<any[]>([])
    const [pubCommsLoading, setPubCommsLoading] = useState(true)
  const [localAgentCode, setLocalAgentCode] = useState<string | null>(null)
    const [workerSalaries, setWorkerSalaries] = useState<WorkerSalary[]>([])
    const [workerSalariesLoading, setWorkerSalariesLoading] = useState(false)
    const [workerExchangeRates, setWorkerExchangeRates] = useState<Record<string,number>>({})

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
        fetchWorkerSalaries()
      }
      // Restore saved payment method from localStorage
      if (profile?.id) {
        const saved = localStorage.getItem(`apm_${profile.id}`)
        if (saved === 'efectivo' || saved === 'transferencia') setAgentPayMethod(saved)
        // Fetch payment method lock status
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        fetch(`${apiBase}/api/payment-method-lock?user_id=${encodeURIComponent(profile.id)}`)
          .then(r => r.ok ? r.json() : null)
          .then((d: any) => { if (d) setPayMethodLocked(d.locked === true) })
          .catch(() => {})
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


      async function fetchWorkerSalaries() {
        if (!profile?.id) return
        setWorkerSalariesLoading(true)
        try {
          const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
          const res = await fetch(`${apiBase}/api/agent/worker-salaries?agent_id=${profile.id}`)
          if (res.ok) {
            const d = await res.json() as { salaries: WorkerSalary[]; exchange_rates: Record<string,number> }
            setWorkerSalaries(d.salaries ?? [])
            if (d.exchange_rates && Object.keys(d.exchange_rates).length > 0) setWorkerExchangeRates(d.exchange_rates)
          }
        } catch {}
        setWorkerSalariesLoading(false)
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

      async function selectPayMethod(method: 'efectivo' | 'transferencia') {
          setAgentPayMethod(method)
          setPayMethodLocked(true)  // Lock immediately — don't wait for API response
          if (profile?.id) localStorage.setItem(`apm_${profile.id}`, method)
          const metodoLabel = method === 'efectivo' ? 'Efectivo Cuba' : 'Transferencia Cuba'
          if (profile?.id) {
            // Save to worker_entries (if row exists) AND to profile.agent_payment_method (always works)
            await Promise.all([
              supabase.from('worker_entries').update({ metodo_pago: metodoLabel }).eq('user_id', profile.id),
              supabase.from('profiles').update({ agent_payment_method: metodoLabel }).eq('id', profile.id),
            ])
            // Persist lock in DB — so it survives page reloads until cierre semanal
            const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
            fetch(`${apiBase}/api/payment-method-lock`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: profile.id }),
            }).catch(() => {})
          }
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
        if (!map.has(key)) map.set(key, { key, nombre: w.nombre_en_app || w.nombre_real || w.user_id.slice(0, 8), apps: [], appNameMap: {}, idMap: {}, totalComm: 0, isActive: false })
        const card = map.get(key)!
        if (!card.apps.includes(w.app_name)) card.apps.push(w.app_name)
        card.appNameMap[w.app_name] = w.nombre_en_app || ''
        card.idMap[w.app_name] = (w as any).id_aplicacion ?? ''
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
      // Fallback: when agent_commissions is empty (e.g. commission published under app-internal agent name
      // like "Sheila" instead of the registered Supabase agent), derive isActive/totalComm from publishedComms
      // by matching worker_uid to id_aplicacion or user_id in workerEntries.
      if (commissions.length === 0) {
        for (const pc of publishedComms) {
          const uid = String((pc as any).worker_uid ?? '')
          if (!uid) continue
          const we = workerEntries.find(w => w.id_aplicacion === uid || w.user_id === uid)
          if (!we) continue
          const card = map.get(we.user_id)
          if (!card) continue
          card.isActive = true
          card.totalComm += Number((pc as any).commission_usd) || 0
          const appName: string = (pc as any).app_name ?? ''
          if (appName && !card.apps.includes(appName)) card.apps.push(appName)
        }
      }
      return [...map.values()].sort((a, b) => b.totalComm - a.totalComm)
    }, [workerEntries, commissions, publishedComms])

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

    // Map: user_id → (app_name → metodo_pago) from workerEntries (current, never stale)
    // Only uses live workerEntries — never pulls historical salary/rates from publishedComms,
    // so the trabajadoras tab stays clean between semana publishes.
    const workerCupMap = React.useMemo(() => {
      const methodMap = new Map<string, Map<string, string>>()
      for (const we of workerEntries) {
        if (!methodMap.has(we.user_id)) methodMap.set(we.user_id, new Map())
        methodMap.get(we.user_id)!.set(we.app_name, we.metodo_pago ?? '')
      }
      return { methodMap }
    }, [workerEntries])

    // Latest salary per worker name (from published commissions, most recent semana first)
    const latestWorkerSalaryMap = React.useMemo(() => {
      const map = new Map<string, any>()
      const sorted = [...publishedComms].sort((a: any, b: any) => String(b.semana).localeCompare(String(a.semana)))
      for (const row of sorted) {
        const name = String((row as any).worker_name ?? '')
        if (name && !map.has(name)) map.set(name, row)
      }
      return map
    }, [publishedComms])

    if (loading || profile === undefined) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-sm">Cargando...</div>
      </div>
    )
    if (!profile?.is_agent && !profile?.is_colider) return null

    const agentCode = localAgentCode || ((profile as any).agent_code as string | undefined)
    const commApps = [...new Set(commissions.map(c => c.app_name))]
    const allApps = [...new Set([...workerEntries.map(w => w.app_name), ...commApps])]
    const pubTotalUSD = publishedComms.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0)
    const pubSemanas = [...new Set(publishedComms.map(c => c.semana))]
    const pubApps = [...new Set(publishedComms.map(c => c.app_name as string))]
    const visibleWorkers = workerAppFilter ? (workersByApp.get(workerAppFilter) ?? []) : allWorkerCards
    // Esta semana
    const latestSemana = pubSemanas.length > 0 ? [...pubSemanas].sort((a, b) => b.localeCompare(a))[0] : null
    const thisWeekRows = latestSemana ? (publishedComms as any[]).filter((c: any) => c.semana === latestSemana) : []
    const thisWeekAgentUSD = thisWeekRows.reduce((s: number, c: any) => s + (Number(c.commission_usd) || 0), 0)


  
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
                  {mainTab === 'comisiones' ? 'Mis Comisiones' : mainTab === 'trabajadoras' ? 'Mis Trabajadoras' : 'Sin Cobrar'}
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
              <button onClick={() => setMainTab('nocobro')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'nocobro' ? 'bg-rose-700 text-white' : 'text-white/40 hover:text-white'}`}>
                <AlertTriangle className="w-3.5 h-3.5" /> Sin Cobrar
                {noCobro.length > 0 && <span className="text-[11px] bg-rose-500/30 rounded-full px-1.5 py-0.5 leading-none">{[...new Set(noCobro.map(e => e.user_id + e.app_name))].length}</span>}
              </button>
          </div>

          {/* ====== COMISIONES TAB ====== */}
            {mainTab === 'comisiones' && (
              <>
                {/* ESTA SEMANA — hero prominente */}
                {!pubCommsLoading && latestSemana && (
                  <div className="bg-gradient-to-br from-amber-600/25 via-amber-500/10 to-transparent border border-amber-500/35 rounded-3xl p-6 mb-5">
                    <p className="text-amber-400/70 text-xs font-extrabold uppercase tracking-widest mb-1">Semana {latestSemana}</p>
                    <p className="text-white/40 text-sm mb-3">Lo que ganaste esta semana de tus trabajadoras</p>
                    <div className="flex items-end gap-2 mb-2">
                      <p className="text-5xl font-black text-white leading-none">${thisWeekAgentUSD.toFixed(2)}</p>
                      <p className="text-amber-400 font-extrabold text-xl mb-1">USD</p>
                    </div>
                    {agentPayMethod && (exchangeRates[`${agentPayMethod}_agent`] ?? 0) > 0 && thisWeekAgentUSD > 0 && (
                      <p className={`text-2xl font-extrabold mb-1 ${agentPayMethod === 'efectivo' ? 'text-amber-400' : 'text-blue-400'}`}>
                        {(thisWeekAgentUSD * (exchangeRates[`${agentPayMethod}_agent`] ?? 0)).toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP
                        <span className="text-sm font-bold text-white/25 ml-2">{agentPayMethod === 'efectivo' ? 'efectivo' : 'transferencia'}</span>
                      </p>
                    )}
                    {thisWeekRows.length > 0 && (
                      <div className="border-t border-amber-500/20 pt-4 mt-3 space-y-2">
                        <p className="text-white/35 text-xs font-bold uppercase tracking-wider mb-2">Desglose por trabajadora</p>
                        {thisWeekRows.map((row: any, i: number) => {
                          const commUsd = Number(row.commission_usd) || 0
                          const rate = agentPayMethod ? (exchangeRates[`${agentPayMethod}_agent`] ?? 0) : 0
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-white/55 text-sm truncate max-w-[55%]">
                                {row.worker_name}
                                <span className="text-white/25 text-xs ml-1">· {row.app_name}</span>
                              </span>
                              <div className="text-right shrink-0">
                                <span className="text-green-400 font-bold text-sm">${commUsd.toFixed(2)}</span>
                                {rate > 0 && commUsd > 0 && (
                                  <span className={`text-xs font-semibold ml-2 ${agentPayMethod === 'efectivo' ? 'text-amber-400/70' : 'text-blue-400/70'}`}>
                                    {(commUsd * rate).toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
                {!pubCommsLoading && !latestSemana && (
                  <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-3xl p-6 mb-5 text-center">
                    <DollarSign className="w-8 h-8 text-amber-500/30 mx-auto mb-2" />
                    <p className="text-white/35 text-sm font-semibold">Sin comisiones publicadas esta semana</p>
                    <p className="text-white/20 text-xs mt-1">El admin publicará tu comisión cuando esté lista.</p>
                  </div>
                )}

                {/* Rendimiento button */}
                  <button
                    onClick={() => navigate('/agente/rendimiento')}
                    className="w-full flex items-center justify-between bg-gradient-to-r from-purple-600/15 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 active:scale-[0.99] rounded-2xl p-4 mb-4 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-bold text-sm">Rendimiento</p>
                        <p className="text-white/35 text-xs">Ver tus ganancias de las últimas semanas</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>

                                  {/* Stats grid */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Resumen acumulado</p>
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
                    {agentPayMethod && (exchangeRates[`${agentPayMethod}_agent`] ?? 0) > 0
                      ? pubTotalUSD > 0
                        ? <>
                            <p className="text-sm font-bold text-amber-300 mt-0.5">{(pubTotalUSD * (exchangeRates[`${agentPayMethod}_agent`] ?? 0)).toLocaleString('es-ES', {maximumFractionDigits: 0})} CUP</p>
                            <p className="text-white/20 text-xs mt-0.5">💱 1 USD = {(exchangeRates[`${agentPayMethod}_agent`] ?? 0).toLocaleString('es-ES')} CUP</p>
                          </>
                        : <p className="text-white/20 text-xs mt-0.5">💱 1 USD = {(exchangeRates[`${agentPayMethod}_agent`] ?? 0).toLocaleString('es-ES')} CUP</p>
                      : agentPayMethod
                        ? <p className="text-xs text-white/25 mt-0.5">⏳ Tasa pendiente</p>
                        : null
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

                {/* Tipo de cambio informativo — visible cuando hay comisiones publicadas */}
                {(() => {
                  const ef = exchangeRates['efectivo_agent'] ?? 0
                  const tr = exchangeRates['transferencia_agent'] ?? 0
                  const displayRate = ef > 0 ? ef : tr
                  if (displayRate === 0 || publishedComms.length === 0) return null
                  return (
                    <div className="bg-purple-500/6 border border-purple-500/15 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                      <span className="text-xl shrink-0">💱</span>
                      <div>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-0.5">Tipo de cambio esta semana</p>
                        <p className="text-white/80 text-sm">1 USD = <span className="text-amber-300 font-extrabold">{displayRate.toLocaleString('es-ES')} CUP</span></p>
                      </div>
                    </div>
                  )
                })()}

                {/* Payment method selector — always visible */}
                {(
                  <div className="mb-4">
                    {!agentPayMethod ? (
                      payMethodLocked ? (
                        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 mb-3 flex items-center gap-3">
                          <span className="text-2xl shrink-0">🔒</span>
                          <div>
                            <p className="text-amber-300 text-sm font-bold">Método de pago bloqueado</p>
                            <p className="text-white/35 text-xs mt-0.5">Ya elegiste tu método esta semana. Podrás cambiarlo cuando el admin cierre la semana.</p>
                          </div>
                        </div>
                      ) : (
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
                      )
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
                          {payMethodLocked ? (
                            <span className="text-amber-400/50 text-xs px-2 py-1 rounded-lg border border-amber-500/20">🔒 bloqueado</span>
                          ) : (
                          <button onClick={() => setAgentPayMethod(null)}
                            className="text-white/30 hover:text-white/60 text-xs transition-colors px-2 py-1 rounded-lg border border-white/10">
                            Cambiar
                          </button>
                          )}
                        </div>
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
                      <p className="text-white/35 text-sm font-semibold">Sin comisiones publicadas esta semana</p>
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
                        const semanaComms = commissions.filter(c => c.semana === sem)
                        const allSemConfirmed = semanaComms.length > 0 && semanaComms.every(c => agentConfirmed.has(c.id))
                        return (
                          <div key={sem} className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl overflow-hidden">
                            <button onClick={() => toggleExpand(sem)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/5 transition-colors text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">💰</div>
                                <div>
                                  <p className="text-white font-semibold text-sm">Semana {sem}</p>
                                  <p className="text-white/35 text-xs">{rows.length} {rows.length === 1 ? 'trabajadora' : 'trabajadoras'}</p>
                                  {allSemConfirmed && <span className="text-[10px] text-green-400 font-bold">✓ Pago confirmado</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right shrink-0">
                                  <p className="text-green-400 font-extrabold text-base">${semUsd.toFixed(2)} <span className="text-sm">USD</span></p>
                                  {rate > 0
                                    ? <>
                                        <p className={`text-sm font-bold mt-0.5 ${agentPayMethod === 'efectivo' ? 'text-amber-400' : 'text-blue-400'}`}>{(semUsd * rate).toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP</p>
                                        <p className="text-white/20 text-xs mt-0.5">💱 1 USD = {rate.toLocaleString('es-ES')} CUP</p>
                                      </>
                                    : <p className="text-xs text-white/25 mt-0.5">⏳ Tasa pendiente</p>
                                  }
                                </div>
                                {expanded.has(sem) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                              </div>
                            </button>
                            {/* Confirm payment buttons — always visible, one per app commission */}
                            {semanaComms.length > 0 && (
                              <div className="border-t border-amber-500/10 px-5 py-3 space-y-2">
                                {semanaComms.map(comm => {
                                  const isConfirmed = agentConfirmed.has(comm.id)
                                  const isConfirming = agentConfirming === comm.id
                                  return (
                                    <div key={comm.id}>
                                      {isConfirmed ? (
                                        <div className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
                                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                                          Pago recibido confirmado
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => { if (!isConfirming) confirmAgentPayment(comm.id, comm.semana, comm.app_name) }}
                                          disabled={isConfirming}
                                          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                            isConfirming
                                              ? 'bg-amber-600/40 text-white/50 cursor-wait border border-amber-500/20'
                                              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                                          }`}>
                                          {isConfirming
                                            ? <><div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin shrink-0" /> Confirmando...</>
                                            : <><CheckCircle2 className="w-4 h-4 shrink-0" />
                                                CONFIRMAR PAGO RECIBIDO
                                              </>
                                          }
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {expanded.has(sem) && (
                              <div className="border-t border-purple-500/10 px-5 py-4 space-y-2">
                                {rows.map((row, i) => {
                                  const workerSalUsd = Number(row.worker_salary_usd ?? 0)
                                  const met = (row.worker_metodo_pago ?? '').toLowerCase()
                                  const isCuban = met.includes('cuba')
                                  const isEfectivo = met.includes('efectivo')
                                  const customEf = Number(row.custom_efectivo_rate ?? 0)
                                  const customTr = Number(row.custom_transferencia_rate ?? 0)
                                  const globalEf = exchangeRates['efectivo_worker'] ?? 0
                                  const globalTr = exchangeRates['transferencia_worker'] ?? 0
                                  const efRate = customEf > 0 ? customEf : globalEf
                                  const trRate = customTr > 0 ? customTr : globalTr
                                  const workerRate = isEfectivo ? efRate : trRate
                                  const hasExclusive = customEf > 0 || customTr > 0
                                  const cupAmount = isCuban && workerSalUsd > 0 && workerRate > 0 ? workerSalUsd * workerRate : 0
                                  return (
                                    <div key={i} className="py-2 border-b border-white/5 last:border-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <span className="text-white/70 text-sm block truncate">{row.worker_name}</span>
                                          <span className="text-white/30 text-xs">{row.app_name}{isCuban && workerRate > 0 ? ` · ${workerRate.toLocaleString('es-ES')} CUP/USD${hasExclusive ? ' ✦' : ''}` : ''}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-green-400 font-bold text-sm block">${Number(row.commission_usd).toFixed(2)} <span className="text-white/30 font-normal text-xs">comisión</span></span>
                                          {workerSalUsd > 0 && (
                                            <span className="text-purple-300 font-bold text-xs block mt-0.5">${workerSalUsd.toFixed(2)} <span className="text-white/30 font-normal">salario</span></span>
                                          )}
                                          {isCuban && cupAmount > 0 && (
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
                  {visibleWorkers.map((w) => {
                    // Show payment method indicator using current live data (workerEntries + rates).
                    // Custom exclusive rates from workerSalaries take priority over global rates.
                    const cupRows = w.apps.map(app => {
                      const metodo = workerCupMap.methodMap.get(w.key)?.get(app) ?? ''
                      const metLow = metodo.toLowerCase()
                      const isCuban = metLow.includes('cuba')
                      if (!isCuban) return null
                      const isEfectivo = metLow.includes('efectivo')
                      const globalRate = isEfectivo
                        ? (exchangeRates['efectivo_worker'] ?? 0)
                        : (exchangeRates['transferencia_worker'] ?? 0)
                      // Check if this worker has an exclusive custom rate assigned
                      const workerSal = (workerSalaries as any[])
                        .filter(s => s.user_id === w.key && s.app_name === app)
                        .sort((a: any, b: any) => String(b.semana).localeCompare(String(a.semana)))[0]
                      const customEf = Number(workerSal?.custom_efectivo_rate ?? 0)
                      const customTr = Number(workerSal?.custom_transferencia_rate ?? 0)
                      const customRate = isEfectivo ? customEf : customTr
                      const displayRate = customRate > 0 ? customRate : globalRate
                      const isExclusive = customRate > 0
                      return { app, isEfectivo, globalRate, displayRate, isExclusive }
                    }).filter(Boolean) as { app: string; isEfectivo: boolean; globalRate: number; displayRate: number; isExclusive: boolean }[]

                    return (
                      <div key={w.key} className="bg-[#0d0d1e] border border-purple-500/10 rounded-xl px-5 py-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                              {(w.nombre[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-white truncate">{w.nombre}</p>
                            </div>
                          </div>
                        </div>
                        {/* Contacto: nombre real, nombre en app, WhatsApp */}
                        {(() => {
                          const entries = workerEntries.filter(we => we.user_id === w.key)
                          if (entries.length === 0) return null
                          const firstEntry = entries[0]
                          const nombreReal = firstEntry.nombre_real
                          const tel = (firstEntry as any).telefono
                          const codigo = (firstEntry as any).codigo_pais ?? ''
                          const waNum = tel ? `${codigo}${tel}`.replace(/\D/g, '') : null
                          return (
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                              {nombreReal && (
                                <p className="text-white/40 text-xs">👤 Nombre real: <span className="text-white/75 font-medium">{nombreReal}</span></p>
                              )}
                              {entries.map(entry => (
                                <p key={entry.app_name} className="text-white/40 text-xs">🎮 {entry.app_name}: <span className="text-white/75 font-medium">{entry.nombre_en_app || '—'}</span>{entry.id_aplicacion ? <span className="ml-1.5 text-white/25 font-mono text-[10px]">· ID: {entry.id_aplicacion}</span> : null}</p>
                              ))}
                              {waNum && waNum.length >= 7 && (
                                <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-full hover:bg-green-500/20 transition-colors font-semibold mt-0.5">
                                  📞 {tel}
                                </a>
                              )}
                            </div>
                          )
                        })()}
                        {/* Payment method indicator per Cuban-payment app (live data only, no stale salary) */}
                        {cupRows.map(({ app, isEfectivo, displayRate, isExclusive }) => (
                          <div key={app} className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0">{isEfectivo ? '💵' : '🏦'}</span>
                              <span className={`text-xs font-medium truncate ${isEfectivo ? 'text-amber-400' : 'text-blue-400'}`}>
                                {app} · {isEfectivo ? 'Efectivo Cuba' : 'Transf. Cuba'}
                                {isExclusive && <span className="ml-1 text-emerald-400/70 text-[10px]">✦</span>}
                              </span>
                            </div>
                            {displayRate > 0
                              ? <p className={`text-xs font-semibold shrink-0 ${isEfectivo ? 'text-amber-400/60' : 'text-blue-400/60'}`}>{displayRate.toLocaleString('es-ES')} CUP/USD</p>
                              : <p className="text-white/20 text-xs shrink-0">⏳ Tasa pendiente</p>
                            }
                          </div>
                        ))}
                        {/* Salario de esta trabajadora — hidden after cierre-semanal */}
                        {(() => {
                          const weekClosed = Object.keys(exchangeRates).length > 0 && Object.values(exchangeRates).every(r => r === 0)
                          const wSals = weekClosed ? [] : (workerSalaries as any[]).filter(s => s.user_id === w.key)
                          if (wSals.length === 0) return null
                          const latestSal = wSals.sort((a: any, b: any) => String(b.semana).localeCompare(String(a.semana)))[0]
                          const salUsd = Number(latestSal.usd ?? 0)
                          if (salUsd <= 0) return null
                          const met = String(latestSal.metodo_pago ?? '').toLowerCase()
                          const isCuban = met.includes('cuba')
                          const isEfec = met.includes('efectivo')
                          const customEf = Number(latestSal.custom_efectivo_rate ?? 0)
                          const customTr = Number(latestSal.custom_transferencia_rate ?? 0)
                          const globalEf = workerExchangeRates['efectivo_worker'] ?? exchangeRates['efectivo_worker'] ?? 0
                          const globalTr = workerExchangeRates['transferencia_worker'] ?? exchangeRates['transferencia_worker'] ?? 0
                          const efRate = customEf > 0 ? customEf : globalEf
                          const trRate = customTr > 0 ? customTr : globalTr
                          const workerRate = isEfec ? efRate : trRate
                          const cupAmount = isCuban && salUsd > 0 && workerRate > 0 ? salUsd * workerRate : 0
                          return (
                            <div className="mt-3 pt-3 border-t border-white/8">
                              <p className="text-white/25 text-xs font-bold uppercase tracking-wider mb-2">Semana {latestSal.semana}</p>
                              <div className="bg-black/25 rounded-xl px-3 py-2.5">
                                <p className="text-white/35 text-[11px] mb-0.5">Salario trabajadora</p>
                                <p className="text-purple-300 font-extrabold text-base leading-tight">${salUsd.toFixed(2)} <span className="text-[11px] font-bold text-purple-400/40">USD</span></p>
                                {cupAmount > 0 && (
                                  <p className={`text-sm font-bold mt-0.5 ${isEfec ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {cupAmount.toLocaleString('es-ES', { maximumFractionDigits: 0 })} CUP
                                    <span className="text-[10px] font-normal text-white/20 ml-1">{isEfec ? 'ef.' : 'tr.'}</span>
                                  </p>
                                )}
                                {isCuban && workerRate <= 0 && <p className="text-white/20 text-[10px] mt-0.5">⏳ tasa pendiente</p>}
                              </div>
                            </div>
                          )
                        })()}
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
  