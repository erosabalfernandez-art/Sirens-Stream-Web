import { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { DollarSign, Lock, CheckCircle, ChevronDown, ChevronUp, Calculator, Users, Send } from 'lucide-react'
  import { supabase } from '@/lib/supabase'

  const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

  interface WorkerRef { worker_uid: string | null; worker_name: string; agc_usd: number; salary_usd?: number; monedas: number | null; published_usd: number | null }
  interface AgentApp { app_name: string; workers: WorkerRef[] }
  interface AgentRef { agent_name: string; agent_user_id: string | null; locked: boolean; apps: AgentApp[] }

  function inputKey(agentId: string, app: string, worker: string) { return `${agentId}__${app}__${worker}` }

  export default function ComisionesAgente() {
    const { profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [weeks, setWeeks] = useState<string[]>([])
  const [semana, setSemana] = useState(() => { try { return localStorage.getItem('ea_com_semana') ?? '' } catch { return '' } })
    const [agents, setAgents] = useState<AgentRef[]>([])
    const [dataLoading, setDataLoading] = useState(false)
    const [coliderPublished, setColiderPublished] = useState(false)
    const [coliderPublishedAt, setColiderPublishedAt] = useState<string | null>(null)
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [publishing, setPublishing] = useState<string | null>(null)
    const [publishingColider, setPublishingColider] = useState(false)
    const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
    const [messages, setMessages] = useState<Record<string, string>>({})
      const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})

  // Persist semana selection
  useEffect(() => { try { if (semana) localStorage.setItem('ea_com_semana', semana) } catch {} }, [semana])

  // Reset page state after weekly cierre so agents unlock for the new cycle
  useEffect(() => {
    function onCierre() {
      setAgents([])
      setSemana('')
      try { localStorage.removeItem('ea_com_semana') } catch {}
      if (profile?.is_admin) fetchWeeks()
    }
    window.addEventListener('ea_cierre_done', onCierre)
    return () => window.removeEventListener('ea_cierre_done', onCierre)
  }, [profile])

    useEffect(() => { if (!loading && !profile?.is_admin) navigate('/') }, [loading, profile])
    useEffect(() => { if (profile?.is_admin) { fetchWeeks(); fetchExchangeRates() } }, [profile])
    useEffect(() => { if (semana) loadData() }, [semana])

    async function fetchExchangeRates() {
      const ratesRes = await supabase.from('exchange_rates').select('id, rate')
      const r: Record<string, number> = {}
      for (const row of (ratesRes.data ?? []) as { id: string; rate: number }[]) r[row.id] = row.rate
      setExchangeRates(r)
    }

    async function fetchWeeks() {
      try {
        const r = await fetch(`${API}/api/colider/available-weeks`)
        const d = await r.json()
        const w: string[] = d.weeks ?? []
        setWeeks(w)
        if (w.length > 0) setSemana(w[0])
      } catch {}
    }

    async function loadData() {
      setDataLoading(true)
      try {
        const r = await fetch(`${API}/api/admin/agent-commission-ref?semana=${encodeURIComponent(semana)}`)
        if (!r.ok) { setMessages(m => ({ ...m, _load: `❌ Error ${r.status} cargando datos. Revisa que el API esté funcionando.` })); setDataLoading(false); return }
        const d = await r.json()
        const ags: AgentRef[] = d.agents ?? []
        setAgents(ags)
        setColiderPublished(d.colider_published ?? false)
        setColiderPublishedAt(d.colider_published_at ?? null)
        const init: Record<string, string> = {}
        for (const ag of ags) {
          const agId = ag.agent_user_id ?? ag.agent_name
          for (const app of ag.apps) {
            for (const w of app.workers) {
              const k = inputKey(agId, app.app_name, w.worker_name)
              if (w.published_usd !== null) init[k] = String(w.published_usd)
              else if (w.agc_usd > 0) init[k] = (w.agc_usd ?? 0).toFixed(2)
              else if (app.app_name !== 'Layla' && (w.salary_usd ?? 0) > 0) init[k] = ((w.salary_usd ?? 0) * 0.10).toFixed(2)
            }
          }
        }
        setInputs(init)
        setExpandedAgents(new Set(ags.map(ag => ag.agent_user_id ?? ag.agent_name)))
      } catch {}
      setDataLoading(false)
    }

    function agentTotal(ag: AgentRef): number {
      const agId = ag.agent_user_id ?? ag.agent_name
      let total = 0
      for (const app of ag.apps) {
        for (const w of app.workers) {
          total += Number(inputs[inputKey(agId, app.app_name, w.worker_name)]) || 0
        }
      }
      return total
    }

    async function publishAgent(ag: AgentRef) {
      const workerRatesPublished = (exchangeRates['efectivo_worker'] ?? 0) > 0 || (exchangeRates['transferencia_worker'] ?? 0) > 0
      if (!workerRatesPublished) {
        setMessages(m => ({ ...m, [ag.agent_name]: '⚠️ Publica el Tipo de Cambio Cuba en la sección Nómina antes de publicar comisiones a agentes.' }))
        return
      }
      const agId = ag.agent_user_id ?? ag.agent_name
      const commissions = []
      for (const app of ag.apps) {
        for (const w of app.workers) {
          commissions.push({ worker_uid: w.worker_uid, worker_name: w.worker_name, app_name: app.app_name, commission_usd: Number(inputs[inputKey(agId, app.app_name, w.worker_name)]) || 0 })
        }
      }
      setPublishing(agId)
      setMessages(m => ({ ...m, [ag.agent_name]: '' }))
      try {
        const r = await fetch(`${API}/api/admin/publish-agent-commission`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semana, agent_user_id: ag.agent_user_id ?? null, agent_name: ag.agent_name, commissions }),
        })
        const d = await r.json()
        if (!r.ok) setMessages(m => ({ ...m, [ag.agent_name]: `❌ ${d.error ?? 'Error'}` }))
        else {
          const nota = ag.agent_user_id ? ' Notificación enviada.' : ' (Agente sin perfil registrado, sin notificación.)'
          setMessages(m => ({ ...m, [ag.agent_name]: `✅ Publicado — $${Number(d.total_usd).toFixed(2)} USD.${nota}` }))
          setAgents(prev => prev.map(a => a.agent_name === ag.agent_name ? { ...a, locked: true } : a))
        }
      } catch { setMessages(m => ({ ...m, [ag.agent_name]: '❌ Error de red' })) }
      setPublishing(null)
    }

    async function publishToColider() {
      setPublishingColider(true)
      try {
        const r = await fetch(`${API}/api/admin/publish-agents-to-colider`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semana }),
        })
        const d = await r.json()
        if (r.ok) { setColiderPublished(true); setColiderPublishedAt(new Date().toISOString()) }
        else setMessages(m => ({ ...m, _colider: `❌ ${d.error ?? 'Error'}` }))
      } catch { setMessages(m => ({ ...m, _colider: '❌ Error de red' })) }
      setPublishingColider(false)
    }

    function toggleAgent(id: string) {
      setExpandedAgents(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    }

    if (loading) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 text-sm animate-pulse">Cargando...</div></div>
    if (!profile?.is_admin) return null

    const publishedCount = agents.filter(a => a.locked).length

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 mb-3">
              <Calculator className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Admin · Comisiones</span>
            </div>
            <h1 className="text-2xl font-extrabold">Calcular Comisión de Agente</h1>
            <p className="text-white/40 text-sm mt-1">Define y publica manualmente la comisión de cada agente</p>
          </div>

          {messages['_load'] && <p className="text-xs font-semibold text-red-400 mb-3">{messages['_load']}</p>}

            {agents.length > 0 && (exchangeRates['efectivo_worker'] ?? 0) <= 0 && (exchangeRates['transferencia_worker'] ?? 0) <= 0 && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-amber-400 text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-amber-300 text-sm font-bold mb-1">Cambio Cuba no publicado</p>
                  <p className="text-white/40 text-xs leading-relaxed">Para publicar comisiones a los agentes primero debes publicar el Tipo de Cambio Cuba en la sección Nómina.</p>
                </div>
              </div>
            )}

          {agents.length > 0 && (
            <div className="mb-4 bg-[#0d0d1e] border border-amber-500/10 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Agentes publicados</span>
                <span className="text-white font-bold text-sm">{publishedCount} / {agents.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${agents.length > 0 ? (publishedCount / agents.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="mb-6 bg-[#0d0d1e] border border-orange-500/15 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Publicar comisiones al Cólider</p>
                <p className="text-white/35 text-xs mt-0.5">
                  {coliderPublished ? `✅ Publicado${coliderPublishedAt ? ' · ' + new Date(coliderPublishedAt).toLocaleDateString('es-ES') : ''}` : 'El cólider ve agentes de Efectivo Cuba solo después de esto'}
                </p>
              </div>
              <button onClick={publishToColider} disabled={publishingColider || agents.length === 0 || publishedCount < agents.length}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shrink-0">
                {publishingColider ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {coliderPublished ? 'Republicar al Cólider' : 'Publicar al Cólider'}
              </button>
            </div>
            {messages['_colider'] && <p className="text-xs mt-2 text-red-400">{messages['_colider']}</p>}
          </div>

          {dataLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">No hay comisiones de agentes para esta semana.</p>
              <p className="text-xs mt-1 text-white/20">Publica la nómina primero (botón &quot;Publicar Nómina&quot; en la sección Nómina).</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map(ag => {
                const agId = ag.agent_user_id ?? ag.agent_name
                const isExpanded = expandedAgents.has(agId)
                const total = agentTotal(ag)
                return (
                  <div key={agId} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => toggleAgent(agId)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-amber-400" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">{ag.agent_name}</p>
                          <p className="text-white/40 text-xs">
                            {ag.locked ? '🔒 Publicado esta semana' : (
                              <>
                                Total: <span className="text-green-400 font-bold">${total.toFixed(2)} USD</span>
                                {(exchangeRates['efectivo_agent'] ?? 0) > 0 && <span className="text-amber-400 ml-2">· {(total * (exchangeRates['efectivo_agent'] ?? 0)).toLocaleString('es-ES', {maximumFractionDigits:0})} CUP ef.</span>}
                                {(exchangeRates['transferencia_agent'] ?? 0) > 0 && (exchangeRates['efectivo_agent'] ?? 0) <= 0 && <span className="text-blue-400 ml-2">· {(total * (exchangeRates['transferencia_agent'] ?? 0)).toLocaleString('es-ES', {maximumFractionDigits:0})} CUP tr.</span>}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ag.locked ? (
                          <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20"><Lock className="w-3 h-3" /> Publicado</span>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); void publishAgent(ag) }} disabled={publishing === agId}
                            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all">
                            {publishing === agId ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Publicar
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-5">
                        {messages[ag.agent_name] && (
                          <p className={`text-xs font-semibold ${messages[ag.agent_name].startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{messages[ag.agent_name]}</p>
                        )}
                        {ag.apps.map(app => (
                          <div key={app.app_name}>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span className="w-1 h-3 bg-amber-500 rounded-full" />{app.app_name}
                            </p>
                            <div className="space-y-2">
                              {app.workers.map(w => {
                                const k = inputKey(agId, app.app_name, w.worker_name)
                                return (
                                  <div key={w.worker_name} className="flex items-center gap-3 bg-[#13132a] rounded-xl px-3 py-2.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white/85 text-xs font-semibold truncate">{w.worker_name}</p>
                                      <p className="text-white/30 text-xs">
                                        {app.app_name === 'Layla'
                                          ? 'Calculado desde nómina'
                                          : w.agc_usd > 0
                                            ? `AGC: $${(w.agc_usd ?? 0).toFixed(2)}`
                                            : (w.salary_usd ?? 0) > 0
                                              ? `Nómina: $${(w.salary_usd ?? 0).toFixed(2)} USD`
                                              : 'Sin nómina esta semana'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-white/30 text-xs">$</span>
                                      <input type="number" min="0" step="0.01" placeholder="0.00" value={inputs[k] ?? ''}
                                        onChange={e => setInputs(prev => ({ ...prev, [k]: e.target.value }))}
                                        disabled={ag.locked}
                                        className="w-20 bg-[#0d0d1e] border border-purple-500/20 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed" />
                                      <span className="text-white/30 text-xs">USD</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Total comisión</span>
                          <span className="text-amber-400 font-extrabold text-base">${total.toFixed(2)} <span className="text-xs font-bold text-amber-400/60">USD</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
  