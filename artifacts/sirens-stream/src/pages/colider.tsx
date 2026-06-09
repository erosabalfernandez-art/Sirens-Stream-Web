import { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { Phone, CheckCircle, Circle, Bell, BellOff, Lock, Clock, Users, DollarSign, AlertTriangle } from 'lucide-react'
import { subscribeToPush } from '@/lib/push'

  const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

  interface PersonEntry {
    key: string
    person_uid: string
    person_type: 'worker' | 'agent'
    display_name: string
    real_name: string | null
    phone: string | null
    app: string
    salary_usd: number
    salary_cuba: number
    metodo_pago: string | null
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
    reason: string
    created_at: string
  }

  function fmtCup(n: number) { return n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) }

  export default function Colider() {
    const { user, profile, loading } = useAuth()
    const [, navigate] = useLocation()

    const [weeks, setWeeks] = useState<string[]>([])
    const [semana, setSemana] = useState('')
    const [persons, setPersons] = useState<PersonEntry[]>([])
    const [marks, setMarks] = useState<Record<string, boolean>>({})
    const [weekStatus, setWeekStatus] = useState<{ notified: boolean; admin_closed: boolean } | null>(null)
    const [loadingData, setLoadingData] = useState(false)
    const [notifying, setNotifying] = useState(false)
    const [toggling, setToggling] = useState<string | null>(null)
  const [tab, setTab] = useState<'workers' | 'agents' | 'nocobro'>(() => { try { return (localStorage.getItem('ea_colider_tab') as any) || 'workers' } catch { return 'workers' } })
    const [noCobroData, setNoCobroData] = useState<NoCobro[]>([])
    const [noCobroLoading, setNoCobroLoading] = useState(false)
    const [notifyMsg, setNotifyMsg] = useState('')
  const [notifStatus, setNotifStatus] = useState<'idle'|'requesting'|'granted'|'denied'|'error'>('idle')
  const [localAgentCode, setLocalAgentCode] = useState<string | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifStatus('granted')
      else if (Notification.permission === 'denied') setNotifStatus('denied')
    }
  }, [])

  async function subscribeNotif() {
    if (!user) return
    setNotifStatus('requesting')
    const result = await subscribeToPush(user.id)
    setNotifStatus(result)
  }

  // Persist tab selection
  useEffect(() => { try { localStorage.setItem('ea_colider_tab', tab) } catch {} }, [tab])

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => {
      if (!loading && profile && !profile?.is_colider && !profile?.is_admin) navigate('/perfil')
    }, [loading, profile])
    useEffect(() => { if (user) fetchWeeks() }, [user])
    useEffect(() => { if (user) fetchNoCobro() }, [user])

  // Auto-generate agent_code for colider if not set yet
  useEffect(() => {
    if (!user || !profile || (profile as any).agent_code || localAgentCode) return
    if (!(profile as any).is_colider && !(profile as any).is_agent) return
    const AB = API
    fetch(`${AB}/api/agent/ensure-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    }).then(r => r.json()).then((d: { agent_code?: string }) => {
      if (d.agent_code) setLocalAgentCode(d.agent_code)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile])
    useEffect(() => { if (semana) loadData() }, [semana])

    // Refresh colider view when admin does weekly cierre
    useEffect(() => {
      function onCierre() {
        setPersons([])
        setMarks({})
        setWeekStatus(null)
        if (user) fetchWeeks()
      }
      window.addEventListener('ea_cierre_done', onCierre)
      return () => window.removeEventListener('ea_cierre_done', onCierre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    async function fetchWeeks() {
      try {
        const r = await fetch(`${API}/api/colider/available-weeks?colider_user_id=${user?.id ?? ''}`)
        const d = await r.json()
        const w: string[] = d.weeks ?? []
        setWeeks(w)
        if (w.length > 0) setSemana(w[0])
      } catch {}
    }

    async function fetchNoCobro() {
      setNoCobroLoading(true)
      try {
        const r = await fetch(`${API}/api/agent/no-cobro?agent_id=${user?.id ?? ''}`)
        if (r.ok) { const d = await r.json() as { entries: NoCobro[] }; setNoCobroData(d.entries ?? []) }
      } catch {}
      setNoCobroLoading(false)
    }

    async function loadData() {
      setLoadingData(true)
      try {
        const [listR, marksR, statusR, agentPub] = await Promise.all([
          fetch(`${API}/api/colider/salary-list?semana=${encodeURIComponent(semana)}&colider_user_id=${user?.id ?? ''}`).then(r => r.json()),
          fetch(`${API}/api/colider/marks?semana=${encodeURIComponent(semana)}`).then(r => r.json()),
          fetch(`${API}/api/colider/week-status?semana=${encodeURIComponent(semana)}&colider_user_id=${user?.id ?? ''}`).then(r => r.json()),
          fetch(`${API}/api/colider/published-agent-commissions?semana=${encodeURIComponent(semana)}`).then(r => r.json()).catch(() => ({ published: false, agents: [], exchange_rates: {} })),
        ])

        const rm: Record<string, number> = listR.exchange_rates ?? {}
        const entries: PersonEntry[] = []

        for (const s of (listR.workers ?? [])) {
          const met = s.metodo_pago ?? ''
          if (met !== 'Efectivo (Cuba)') continue // colider solo ve efectivo cuba
          const rate = rm['efectivo_worker'] ?? 0
          entries.push({
            key: `${s.user_id}__${s.app_name}`,
            person_uid: s.user_id,
            person_type: 'worker',
            display_name: s.nombre_en_app ?? s.user_id,
            real_name: s.nombre_real ?? null,
            phone: s.telefono ?? null,
            app: s.app_name,
            salary_usd: Number(s.usd) || 0,
            salary_cuba: rate > 0 ? (Number(s.usd) || 0) * rate : 0,
            metodo_pago: met || null,
          })
        }

        // Agents: from published_agent_commissions (admin must publish to colider first)
        const efRate = (agentPub.exchange_rates?.['efectivo_agent'] ?? rm['efectivo_agent']) ?? 0
        for (const ag of (agentPub.agents ?? [])) {
          const usd = Number(ag.total_usd) || 0
          entries.push({
            key: `agent__${ag.agent_name}`,
            person_uid: ag.agent_name,
            person_type: 'agent',
            display_name: ag.agent_name,
            real_name: ag.agent_name,
            phone: null,
            app: '',
            salary_usd: usd,
            salary_cuba: efRate > 0 ? usd * efRate : 0,
            metodo_pago: 'Efectivo (Cuba)',
          })
        }

        setPersons(entries)

        const mMap: Record<string, boolean> = {}
        for (const m of (marksR.marks ?? [])) {
          mMap[`${m.person_uid}__${m.person_app ?? ''}`] = m.paid
        }
        setMarks(mMap)
        setWeekStatus(statusR.status ?? null)
      } catch (e) { console.error(e) }
      setLoadingData(false)
    }

    async function toggleMark(p: PersonEntry) {
      const k = p.key
      const newPaid = !marks[k]
      setToggling(k)
      setMarks(prev => ({ ...prev, [k]: newPaid }))
      try {
        await fetch(`${API}/api/colider/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semana, person_uid: p.person_uid, person_type: p.person_type,
            person_name: p.display_name, person_real_name: p.real_name,
            person_phone: p.phone, person_app: p.app,
            salary_usd: p.salary_usd, salary_cuba: p.salary_cuba,
            metodo_pago: p.metodo_pago, paid: newPaid,
          })
        })
      } catch { setMarks(prev => ({ ...prev, [k]: !newPaid })) }
      setToggling(null)
    }

    async function notifyAdmin() {
      setNotifying(true); setNotifyMsg('')
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          if (attempt > 0) {
            setNotifyMsg('⏳ Servidor iniciando, espera...')
            await new Promise(res => setTimeout(res, 8000))
          }
          const r = await fetch(`${API}/api/colider/notify-admin`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semana, colider_user_id: user?.id ?? '' })
          })
          const d = await r.json()
          if (!r.ok) { setNotifyMsg(`❌ ${d.error ?? 'Error'}`); break }
          setWeekStatus(prev => ({ ...prev!, notified: true, admin_closed: false }))
          setNotifyMsg('✅ Admin notificado.'); setNotifying(false); return
        } catch { if (attempt === 0) continue; setNotifyMsg('❌ Error de red — intenta de nuevo') }
      }
      setNotifying(false)
    }

    const workers = persons.filter(p => p.person_type === 'worker')
    const agents  = persons.filter(p => p.person_type === 'agent')
    const total = persons.length
    const totalPaid = persons.filter(p => marks[p.key]).length
    const allPaid = total > 0 && totalPaid === total
    const alreadyNotified = !!(weekStatus?.notified && !weekStatus?.admin_closed)
    const notifyLocked = !allPaid || alreadyNotified
    const listToShow = tab === 'workers' ? workers : agents

    if (loading) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-sm">Cargando...</div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-full px-3 py-1 mb-3">
              <Users className="w-3 h-3 text-orange-400" />
              <span className="text-orange-300 text-xs font-semibold uppercase tracking-wider">Panel de Co-líder</span>
            </div>
            <h1 className="text-2xl font-extrabold">Gestión de Pagos</h1>
            <p className="text-white/40 text-sm mt-1">Marca cada pago completado · Eclipse Angels Agency</p>
          </div>

          {/* Push notification banner */}
          <div className="bg-[#0d0d1e] border border-orange-500/15 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Notificaciones push</p>
                <p className="text-white/35 text-xs mt-0.5">
                  {notifStatus === 'granted' ? 'Notificaciones activadas' : notifStatus === 'denied' ? 'Bloqueadas en el navegador' : notifStatus === 'error' ? 'Error técnico al activar' : 'Recibe alertas de la agencia'}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              {notifStatus === 'denied' ? (
                <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"><BellOff className="w-3.5 h-3.5" /> Bloqueadas</span>
              ) : notifStatus === 'granted' ? (
                <div className="flex flex-col items-end gap-2">
                  <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold"><Bell className="w-3.5 h-3.5" /> Activadas</span>
                  <button onClick={subscribeNotif}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border border-white/10">
                    <Bell className="w-3 h-3" /> Reactivar
                  </button>
                </div>
              ) : (
                <button onClick={subscribeNotif} disabled={notifStatus === 'requesting'}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
                  {notifStatus === 'requesting' ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  {notifStatus === 'requesting' ? 'Activando...' : 'Activar'}
                </button>
              )}
            </div>
          </div>


            {/* Agent code card — colider shares this with their workers */}
            {(() => {
              const displayCode = (profile as any)?.agent_code || localAgentCode
              return displayCode ? (
              <div className="mb-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-amber-300/60 uppercase font-bold tracking-wider mb-0.5">Tu código de agente</p>
                  <p className="text-white/50 text-xs">Las trabajadoras ponen este código en su perfil para vincularse contigo</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-extrabold text-amber-300 text-sm tracking-widest select-all">{displayCode}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(displayCode)}
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                    title="Copiar código">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin shrink-0" />
                <p className="text-amber-300/60 text-sm">Generando tu código de agente...</p>
              </div>
            )
            })()}

            {weeks.length > 0 && (
            <div className="mb-4">
              <select value={semana} onChange={e => setSemana(e.target.value)}
                className="w-full bg-[#0d0d1e] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50">
                {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
              </select>
            </div>
          )}

          {alreadyNotified && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm font-bold">Admin notificado. Espera a que cierre la semana.</p>
            </div>
          )}

          {total > 0 && (
            <div className="mb-4 bg-[#0d0d1e] border border-purple-500/10 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Progreso</span>
                <span className="text-white font-bold text-sm">{totalPaid} / {total}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${total > 0 ? (totalPaid/total)*100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            {(['workers', 'agents'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>
                {t === 'workers' ? `👩 Trabajadoras (${workers.length})` : `🧡 Agentes (${agents.length})`}
              </button>
            ))}
            <button onClick={() => setTab('nocobro')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'nocobro' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>
              🚨 Sin cobrar{noCobroData.length > 0 ? ` (${noCobroData.length})` : ''}
            </button>
          </div>

          {tab !== 'nocobro' && (
            <>
          {loadingData ? (
            <div className="space-y-2 mb-6">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : listToShow.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center mb-6">
              <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No hay datos publicados para esta semana.</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {listToShow.map(p => {
                const paid = marks[p.key] ?? false
                const tog  = toggling === p.key
                return (
                  <div key={p.key} className={`bg-[#0d0d1e] border rounded-2xl p-4 transition-all ${paid ? 'border-green-500/30 bg-green-500/5' : 'border-purple-500/10'}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleMark(p)} disabled={tog}
                        className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${paid ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-green-400'} disabled:opacity-50`}>
                        {paid
                          ? <CheckCircle className="w-4 h-4 text-white" />
                          : <Circle className={`w-4 h-4 ${tog ? 'text-white/50 animate-pulse' : 'text-white/20'}`} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white truncate">{p.real_name ?? p.display_name}</p>
                            {p.real_name && p.real_name !== p.display_name && <p className="text-white/40 text-xs">{p.display_name}</p>}
                            <p className="text-white/30 text-xs">{p.app}</p>
                            {paid && <p className="text-green-400 text-xs font-bold mt-0.5">✓ Pagado</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-green-400 font-bold text-sm">${(p.salary_usd ?? 0).toFixed(2)}</p>
                            {p.salary_cuba > 0 && <p className="text-amber-400 text-xs font-bold">{fmtCup(p.salary_cuba)} CUP</p>}
                          </div>
                        </div>
                        {p.phone && (
                          <a href={`https://wa.me/${p.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/20 hover:border-green-500/40 px-2.5 py-1.5 rounded-lg transition-colors">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </>

          )}

          {/* ====== SIN COBRAR TAB ====== */}
          {tab === 'nocobro' && (
            <div className="mb-6">
              {noCobroLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}</div>
              ) : noCobroData.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-white/8 rounded-2xl p-12 text-center">
                  <AlertTriangle className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/35 text-sm">Ninguna persona aparece sin cobrar todavía.</p>
                  <p className="text-white/25 text-xs mt-1">Aparecerán aquí al publicar nóminas.</p>
                </div>
              ) : (() => {
                const grouped = new Map<string, NoCobro[]>()
                for (const e of noCobroData) {
                  const k = e.user_id + '__' + e.app_name
                  if (!grouped.has(k)) grouped.set(k, [])
                  grouped.get(k)!.push(e)
                }
                const sorted = [...grouped.values()]
                  .map(g => ({ ...g.sort((a, b) => b.semana.localeCompare(a.semana))[0], weeks_count: g.length }))
                  .sort((a, b) => (b as any).weeks_count - (a as any).weeks_count)
                return (
                  <div className="space-y-2">
                    {sorted.map((e: any) => (
                      <div key={e.id} className="bg-[#0d0d1e] border border-red-500/15 rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">{e.nombre_real ?? e.nombre_en_app ?? e.email ?? e.user_id}</p>
                          {e.nombre_en_app && e.nombre_en_app !== e.nombre_real && <p className="text-white/40 text-xs">{e.nombre_en_app}</p>}
                          <p className="text-red-400/70 text-xs mt-0.5">{e.app_name} · Semana {e.semana}</p>
                          {e.reason === 'zero_commission' && <p className="text-amber-400/60 text-xs">Comisión $0</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {(e as any).weeks_count > 1 && <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">{(e as any).weeks_count} semanas</span>}
                          {e.justified && <p className="text-green-400 text-xs font-bold mt-1">✓ Justificado</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {semana && (
            <div className="space-y-2">
              <button onClick={notifyAdmin} disabled={notifyLocked || notifying}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  notifyLocked
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30'
                }`}>
                {alreadyNotified
                  ? <><Clock className="w-4 h-4" /> Esperando al admin</>
                  : notifyLocked
                  ? <><Lock className="w-4 h-4" /> {total > 0 ? `Marcar todos primero (${totalPaid}/${total})` : 'Sin datos esta semana'}</>
                  : <><Bell className="w-4 h-4" /> Notificar pago terminado al admin</>}
              </button>
              {notifyMsg && <p className="text-center text-xs text-white/50">{notifyMsg}</p>}
            </div>
          )}

        </div>
      </div>
    )
  }
  