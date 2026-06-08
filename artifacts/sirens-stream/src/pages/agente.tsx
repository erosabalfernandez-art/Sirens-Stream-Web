import React, { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, ChevronDown, ChevronUp, Bell, BellOff, Users, BarChart3, Copy, Check, TrendingUp, Star, Calendar } from 'lucide-react'
  import { subscribeToPush } from '@/lib/push'

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
    const [filterApp, setFilterApp] = useState('')
    const [notifStatus, setNotifStatus] = useState<'idle'|'requesting'|'granted'|'denied'>('idle')
    const [mainTab, setMainTab] = useState<'comisiones'|'trabajadoras'|'rendimiento'>('comisiones')
    const [workerAppFilter, setWorkerAppFilter] = useState('')
    const [exchangeRates, setExchangeRates] = useState<Record<string,number>>({})

    useEffect(() => { if (!loading && profile !== undefined && !profile?.is_agent) navigate('/') }, [loading, profile])
    useEffect(() => {
      if (profile?.is_agent) {
        fetchCommissions()
        fetchWorkers()
        fetchExchangeRates()
      }
    }, [profile])
    useEffect(() => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') setNotifStatus('granted')
        else if (Notification.permission === 'denied') setNotifStatus('denied')
      }
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
      const { data } = await supabase.from('exchange_rates').select('id, rate')
      const r: Record<string,number> = {}
      for (const row of (data ?? []) as {id:string;rate:number}[]) r[row.id] = row.rate
      setExchangeRates(r)
    }

    async function subscribeNotif() {
      if (!profile?.id) return
      setNotifStatus('requesting')
      const ok = await subscribeToPush(profile.id)
      setNotifStatus(ok ? 'granted' : 'denied')
    }

    function toggleExpand(id: string) {
      setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
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
          if (!found) { map.set(w.uid, { key: w.uid, nombre: w.nombre, apps: [], totalComm: 0, isActive: true }); found = map.get(w.uid)! }
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
    if (!profile?.is_agent) return null

    const agentCode = (profile as any).agent_code as string | undefined
    const commApps = [...new Set(commissions.map(c => c.app_name))]
    const allApps = [...new Set([...workerEntries.map(w => w.app_name), ...commApps])]
    const filtered = commissions.filter(c => !filterApp || c.app_name === filterApp)
    const totalUSD = commissions.reduce((s, c) => s + (c.total_commission_usd || 0), 0)
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

          {/* Push notification banner - always visible when not activated */}
            {notifStatus !== 'granted' && (
              <div className="bg-[#0d0d1e] border border-purple-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Notificaciones push</p>
                    <p className="text-white/35 text-xs mt-0.5">
                      {notifStatus === 'denied' ? 'Notificaciones bloqueadas en el navegador' : 'Recibe alertas cuando publican tus comisiones'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {notifStatus === 'denied' ? (
                    <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"><BellOff className="w-3.5 h-3.5" /> Bloqueadas</span>
                  ) : (
                    <button onClick={subscribeNotif} disabled={notifStatus === 'requesting'}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                      {notifStatus === 'requesting' ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      {notifStatus === 'requesting' ? 'Activando...' : 'Activar'}
                    </button>
                  )}
                </div>
              </div>
            )}

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
          </div>

          {/* ====== COMISIONES TAB ====== */}
          {mainTab === 'comisiones' && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-green-400">${fmt(totalUSD)}</p>
                  <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Total ganado</p>
                </div>
                <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-purple-400">{commissions.length}</p>
                  <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Semanas</p>
                </div>
                <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-blue-400">{allWorkerCards.length}</p>
                  <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Trabajadoras</p>
                </div>
              </div>
              {/* CUP summary for agent - show both rates if set */}
              {(exchangeRates['efectivo_agent'] > 0 || exchangeRates['transferencia_agent'] > 0) && commissions.length > 0 && (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4 mb-4">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">💱 Total en Moneda Nacional (CUP)</p>
                  <div className="space-y-3">
                    {/* Per-app breakdown */}
                    {commApps.map(app => {
                      const appComms = commissions.filter(c => c.app_name === app)
                      const appTotalUsd = appComms.reduce((s, c) => s + (c.total_commission_usd || 0), 0)
                      return (
                        <div key={app} className="border-b border-amber-500/10 pb-2 last:border-0 last:pb-0">
                          <p className="text-white/60 text-xs font-bold mb-1.5">{app} · ${fmt(appTotalUsd)} USD</p>
                          <div className="flex gap-4 flex-wrap">
                            {exchangeRates['efectivo_agent'] > 0 && (
                              <div>
                                <p className="text-amber-400/50 text-xs">💵 Efectivo · 1 USD = {(exchangeRates['efectivo_agent']).toLocaleString('es-ES')} CUP</p>
                                <p className="text-amber-300 font-extrabold text-lg">{(appTotalUsd * exchangeRates['efectivo_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/50 text-xs font-semibold">CUP</span></p>
                              </div>
                            )}
                            {exchangeRates['transferencia_agent'] > 0 && (
                              <div>
                                <p className="text-amber-400/50 text-xs">🏦 Transferencia · 1 USD = {(exchangeRates['transferencia_agent']).toLocaleString('es-ES')} CUP</p>
                                <p className="text-amber-300 font-extrabold text-lg">{(appTotalUsd * exchangeRates['transferencia_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/50 text-xs font-semibold">CUP</span></p>
              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* Grand total if multiple apps */}
                    {commApps.length > 1 && (
                      <div className="border-t border-amber-500/20 pt-2 mt-1 flex gap-6 flex-wrap">
                        <div>
                          <p className="text-amber-400/50 text-xs uppercase tracking-wider mb-1">Total todas las apps</p>
                          <p className="text-white/50 text-xs">${fmt(totalUSD)} USD</p>
                        </div>
                        {exchangeRates['efectivo_agent'] > 0 && (
                          <div>
                            <p className="text-amber-400/50 text-xs">💵 Efectivo total</p>
                            <p className="text-amber-300 font-extrabold text-xl">{(totalUSD * exchangeRates['efectivo_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/50 text-sm">CUP</span></p>
                          </div>
                        )}
                        {exchangeRates['transferencia_agent'] > 0 && (
                          <div>
                            <p className="text-amber-400/50 text-xs">🏦 Transferencia total</p>
                            <p className="text-amber-300 font-extrabold text-xl">{(totalUSD * exchangeRates['transferencia_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/50 text-sm">CUP</span></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {commApps.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => setFilterApp('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!filterApp ? 'bg-amber-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>Todas</button>
                  {commApps.map(a => <button key={a} onClick={() => setFilterApp(a)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterApp === a ? 'bg-amber-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>{a}</button>)}
                </div>
              )}

              {commLoading ? (
                <div className="text-white/30 text-sm text-center py-12">Cargando comisiones...</div>
              ) : filtered.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                  <DollarSign className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/35 text-sm">Aún no tienes comisiones registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(c => (
                    <div key={c.id} className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl overflow-hidden">
                      <button onClick={() => toggleExpand(c.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/5 transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">{c.app_name[0]}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">{c.app_name}</span>
                              <span className="text-white/30 text-xs">·</span>
                              <span className="text-white/50 text-xs">{c.semana}</span>
                            </div>
                            <div className="text-white/35 text-xs mt-0.5">{(c.workers_data ?? []).length} trabajadoras</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-green-400 font-extrabold text-lg">${fmt(c.total_commission_usd)}</span>
                          {expanded.has(c.id) ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                        </div>
                      </button>
                      {(exchangeRates['efectivo_agent'] > 0 || exchangeRates['transferencia_agent'] > 0) && (
                        <div className="border-t border-amber-500/10 bg-amber-500/5 px-5 py-2 flex gap-4 text-xs">
                          {exchangeRates['efectivo_agent'] > 0 && <span className="text-amber-300/60">Efectivo: <span className="font-bold text-amber-300">{(c.total_commission_usd * exchangeRates['efectivo_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})}</span></span>}
                          {exchangeRates['transferencia_agent'] > 0 && <span className="text-amber-300/60">Transferencia: <span className="font-bold text-amber-300">{(c.total_commission_usd * exchangeRates['transferencia_agent']).toLocaleString('es-ES', {maximumFractionDigits: 0})}</span></span>}
                        </div>
                      )}
                      {expanded.has(c.id) && (
                        <div className="border-t border-purple-500/10 px-5 py-4 space-y-2">
                          {(c.workers_data ?? []).map((w, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">{(w.nombre[0] ?? '?').toUpperCase()}</div>
                                <span className="text-white/70 text-sm">{w.nombre}</span>
                              </div>
                              <span className="text-amber-400 font-bold text-sm">${fmt(w.commission_usd)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
        </div>
      </div>
    )
  }
  