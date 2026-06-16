import { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { Phone, CheckCircle, Circle, Bell, BellOff, Lock, Clock, Users, DollarSign } from 'lucide-react'
import { PushNotificationCard } from '@/components/layout/PushNotificationCard'

function cleanNum(s: string | null | undefined): string { return (s ?? '').replace(/[^0-9]/g, '') }

  const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

  interface PersonEntry {
    key: string
    person_uid: string
    person_type: 'worker' | 'agent'
    display_name: string
    real_name: string | null
    phone: string | null
    app: string
    apps: string[]
    appNameMap: Record<string, string>
    idMap: Record<string, string>
    salary_usd: number
    salary_cuba: number
    metodo_pago: string | null
  }


  function fmtCup(n: number) { return n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) }

  export default function Colider() {
    const { user, profile, loading } = useAuth()
    const [, navigate] = useLocation()

    const [weeks, setWeeks] = useState<string[]>([])
    const [semana, setSemana] = useState('')
    const [persons, setPersons] = useState<PersonEntry[]>([])
    const [weekRates, setWeekRates] = useState<Record<string, number>>({})
    const [marks, setMarks] = useState<Record<string, boolean>>({})
    const [weekStatus, setWeekStatus] = useState<{ notified: boolean; admin_closed: boolean } | null>(null)
    const [loadingData, setLoadingData] = useState(false)
    const [notifying, setNotifying] = useState(false)
    const [toggling, setToggling] = useState<string | null>(null)
  const [tab, setTab] = useState<'workers' | 'agents' | 'dual'>(() => { try { return (localStorage.getItem('ea_colider_tab') as any) || 'workers' } catch { return 'workers' } })
    const [notifyMsg, setNotifyMsg] = useState('')

  const [localAgentCode, setLocalAgentCode] = useState<string | null>(null)


  // Persist tab selection
  useEffect(() => { try { localStorage.setItem('ea_colider_tab', tab) } catch {} }, [tab])

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => {
      if (!loading && profile && !profile?.is_colider && !profile?.is_admin) navigate('/perfil')
    }, [loading, profile])
    useEffect(() => { if (user) fetchWeeks() }, [user])

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
        setWeekRates(rm)
        const entries: PersonEntry[] = []
        const workerMap = new Map<string, PersonEntry>()

        for (const s of (listR.workers ?? [])) {
          const met = s.metodo_pago ?? ''
          if (met !== 'Efectivo (Cuba)') continue
          const customRate = Number(s.custom_efectivo_rate ?? 0)
          const rate = customRate > 0 ? customRate : (rm['efectivo_worker'] ?? 0)
          const addUsd = Number(s.usd) || 0
          const addCup = rate > 0 ? addUsd * rate : 0
          if (workerMap.has(s.user_id)) {
            // Merge into existing entry
            const ex = workerMap.get(s.user_id)!
            ex.salary_usd += addUsd
            ex.salary_cuba += addCup
            if (!ex.apps.includes(s.app_name)) ex.apps.push(s.app_name)
            ex.appNameMap[s.app_name] = s.nombre_en_app ?? ''
            ex.idMap[s.app_name] = s.id_aplicacion ?? ''
          } else {
            workerMap.set(s.user_id, {
              key: s.user_id,
              person_uid: s.user_id,
              person_type: 'worker',
              display_name: s.nombre_en_app ?? s.user_id,
              real_name: s.nombre_real ?? null,
              phone: s.telefono ? `${s.codigo_pais ?? ''}${s.telefono}`.replace(/\D/g, '') : null,
              app: s.app_name,
              apps: [s.app_name],
              appNameMap: { [s.app_name]: s.nombre_en_app ?? '' },
              idMap: { [s.app_name]: s.id_aplicacion ?? '' },
              salary_usd: addUsd,
              salary_cuba: addCup,
              metodo_pago: met || null,
            })
          }
        }
        entries.push(...workerMap.values())

        // Agents: from published_agent_commissions (admin must publish to colider first)
        const efRate = (agentPub.exchange_rates?.['efectivo_agent'] ?? rm['efectivo_agent']) ?? 0
        for (const ag of (agentPub.agents ?? [])) {
          const usd = Number(ag.total_usd) || 0
          // Use agent_user_id as person_uid so admin colider-marks lookup works correctly
          const agUid = ag.agent_user_id ?? ag.agent_name
          entries.push({
            key: `${agUid}__`,
            person_uid: agUid,
            person_type: 'agent',
            display_name: ag.agent_name,
            real_name: ag.agent_name,
            phone: null,
            app: '',
            apps: [],
            appNameMap: {},
            idMap: {},
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
        const allApps = p.apps.length > 0 ? p.apps : (p.app ? [p.app] : [''])
        const currentlyPaid = allApps.every(a => marks[`${p.person_uid}__${a}`] ?? false)
        const newPaid = !currentlyPaid
        setToggling(p.key)
        const updatedMarks = { ...marks }
        for (const a of allApps) updatedMarks[`${p.person_uid}__${a}`] = newPaid
        setMarks(() => updatedMarks)
        try {
          await Promise.all(allApps.map(appName => fetch(`${API}/api/colider/mark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              semana, person_uid: p.person_uid, person_type: p.person_type,
              person_name: p.display_name, person_real_name: p.real_name,
              person_phone: p.phone, person_app: appName,
              salary_usd: p.salary_usd, salary_cuba: p.salary_cuba,
              metodo_pago: p.metodo_pago, paid: newPaid,
            }),
          })))
          // Auto-notificar al admin cuando el último pago queda marcado
          if (newPaid) {
            const allNowPaid = persons.length > 0 && persons.every(person => {
              const pa = person.apps.length > 0 ? person.apps : (person.app ? [person.app] : [''])
              return pa.every(a => updatedMarks[`${person.person_uid}__${a}`] ?? false)
            })
            const notYetNotified = !(weekStatus?.notified && !weekStatus?.admin_closed)
            if (allNowPaid && notYetNotified) {
              setTimeout(() => notifyAdmin(), 500)
            }
          }
        } catch { setMarks(prev => { const r = { ...prev }; for (const a of allApps) r[`${p.person_uid}__${a}`] = !newPaid; return r }) }
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
    const dualUids = new Set(workers.map(w => w.person_uid).filter(uid => agents.some(a => a.person_uid === uid)))
    const pureWorkers = workers.filter(w => !dualUids.has(w.person_uid))
    const dualWorkers = workers.filter(w => dualUids.has(w.person_uid))
    const pureAgents  = agents.filter(a => !dualUids.has(a.person_uid))
    const dualAgents  = agents.filter(a => dualUids.has(a.person_uid))
    // Maps for cross-referencing dual entries
    const dualWorkersByUid = new Map<string, PersonEntry[]>()
    for (const w of dualWorkers) {
      if (!dualWorkersByUid.has(w.person_uid)) dualWorkersByUid.set(w.person_uid, [])
      dualWorkersByUid.get(w.person_uid)!.push(w)
    }
    const dualAgentByUid = new Map<string, PersonEntry>()
    for (const a of dualAgents) dualAgentByUid.set(a.person_uid, a)
    // Combined card per dual person
    const dualCombined = [...dualUids].map(uid => ({
      uid,
      workers: dualWorkersByUid.get(uid) ?? [],
      agent: dualAgentByUid.get(uid)!,
    }))
    const total = persons.length
    const totalPaid = persons.filter(p => { const pa = p.apps.length > 0 ? p.apps : (p.app ? [p.app] : ['']); return pa.every(a => marks[`${p.person_uid}__${a}`] ?? false) }).length
    const allPaid = total > 0 && totalPaid === total
    const alreadyNotified = !!(weekStatus?.notified && !weekStatus?.admin_closed)
    const notifyLocked = !allPaid || alreadyNotified
    const listToShow = tab === 'workers' ? pureWorkers : tab === 'agents' ? pureAgents : []

    async function toggleDualMark(uid: string) {
      const ws = dualWorkersByUid.get(uid) ?? []
      const ag = dualAgentByUid.get(uid)!
      const allKeys = [...ws.map(w => w.key), ag.key]
      const currentlyAllPaid = allKeys.every(k => marks[k] ?? false)
      const newPaid = !currentlyAllPaid
      setToggling(uid)
      const updatedMarks = { ...marks }
      for (const k of allKeys) updatedMarks[k] = newPaid
      setMarks(updatedMarks)
      try {
        await Promise.all([
          ...ws.map(w => fetch(`${API}/api/colider/mark`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semana, person_uid: w.person_uid, person_type: w.person_type, person_name: w.display_name, person_real_name: w.real_name, person_phone: w.phone, person_app: w.app, salary_usd: w.salary_usd, salary_cuba: w.salary_cuba, metodo_pago: w.metodo_pago, paid: newPaid }),
          })),
          fetch(`${API}/api/colider/mark`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ semana, person_uid: ag.person_uid, person_type: ag.person_type, person_name: ag.display_name, person_real_name: ag.real_name, person_phone: ag.phone, person_app: ag.app, salary_usd: ag.salary_usd, salary_cuba: ag.salary_cuba, metodo_pago: ag.metodo_pago, paid: newPaid }),
          }),
        ])
        if (newPaid) {
          const allNowPaid = persons.length > 0 && persons.every(person => updatedMarks[person.key] === true)
          if (allNowPaid && !(weekStatus?.notified && !weekStatus?.admin_closed)) setTimeout(() => notifyAdmin(), 500)
        }
      } catch { setMarks(prev => { const r = { ...prev }; for (const k of allKeys) r[k] = !newPaid; return r }) }
      setToggling(null)
    }

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

          {/* Push notification card */}
          <PushNotificationCard userId={user?.id ?? ''} />


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
            <button onClick={() => setTab('workers')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'workers' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>👩 Trabajadoras ({pureWorkers.length})</button>
            <button onClick={() => setTab('agents')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'agents' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>🧡 Agentes ({pureAgents.length})</button>
            {dualUids.size > 0 && (<button onClick={() => setTab('dual')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'dual' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>🔗 Agente+Trabajadora ({dualUids.size})</button>)}
          </div>

          <>

          {loadingData ? (
            <div className="space-y-2 mb-6">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : (tab === 'dual' ? dualCombined.length === 0 : listToShow.length === 0) ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center mb-6">
              <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No hay datos publicados para esta semana.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1 text-teal-400/60">
                  {tab === 'workers' ? '👩‍💻 Trabajadoras' : tab === 'agents' ? '👑 Agentes' : '🔗 Agente + Trabajadora'}
                </p>
                <div className="space-y-2">
                  {tab === 'dual' ? (
                    dualCombined.map(({ uid, workers: ws, agent }) => {
                      const allKeys = [...ws.map(w => w.key), agent.key]
                      const paid = allKeys.every(k => marks[k] ?? false)
                      const tog = toggling === uid
                      const totalUsd = ws.reduce((s, w) => s + w.salary_usd, 0) + agent.salary_usd
                      const totalCup = ws.reduce((s, w) => s + w.salary_cuba, 0) + agent.salary_cuba
                      const agentName = agent.real_name ?? agent.display_name
                      const phone = ws.find(w => w.phone)?.phone ?? agent.phone
                      return (
                        <div key={uid} className={`bg-[#0d0d1e] border rounded-2xl p-4 transition-all ${paid ? 'border-green-500/30 bg-green-500/5' : 'border-violet-500/15'}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleDualMark(uid)} disabled={tog}
                              className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${paid ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-green-400'} disabled:opacity-50`}>
                              {paid ? <CheckCircle className="w-4 h-4 text-white" /> : <Circle className={`w-4 h-4 ${tog ? 'text-white/50 animate-pulse' : 'text-white/20'}`} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-white truncate">{agentName}</p>
                                  {ws.map(w => (
                                    <p key={w.key} className="text-violet-300/70 text-xs">🎮 {w.app}: <span className="font-semibold">{w.display_name}</span></p>
                                  ))}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-green-400 font-bold text-sm">${totalUsd.toFixed(2)}</p>
                                  {totalCup > 0 && <p className="text-amber-400 text-xs font-bold">{fmtCup(totalCup)} CUP</p>}
                                </div>
                              </div>
                              <div className="mt-2 space-y-0.5 border-t border-white/5 pt-2">
                                {ws.map(w => (
                                  <div key={w.key} className="flex items-center justify-between text-xs text-white/40">
                                    <span>💰 Salario {w.app}</span>
                                    <span>${w.salary_usd.toFixed(2)}{w.salary_cuba > 0 ? ` · ${fmtCup(w.salary_cuba)} CUP` : ''}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-xs text-white/40">
                                  <span>🧡 Comisión agente</span>
                                  <span>${agent.salary_usd.toFixed(2)}{agent.salary_cuba > 0 ? ` · ${fmtCup(agent.salary_cuba)} CUP` : ''}</span>
                                </div>
                              </div>
                              {paid && <p className="text-green-400 text-xs font-bold mt-1.5">✓ Pagado</p>}
                              {phone && (
                                <a href={`https://wa.me/${cleanNum(phone)}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/20 hover:border-green-500/40 px-2.5 py-1.5 rounded-lg transition-colors">
                                  <Phone className="w-3 h-3" /> {phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    listToShow.map(p => {
                      const paid = (p.apps.length > 0 ? p.apps : (p.app ? [p.app] : [''])).every(a => marks[`${p.person_uid}__${a}`] ?? false)
                      const tog  = toggling === p.key
                      return (
                        <div key={p.key} className={`bg-[#0d0d1e] border rounded-2xl p-4 transition-all ${paid ? 'border-green-500/30 bg-green-500/5' : 'border-purple-500/10'}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleMark(p)} disabled={tog}
                              className={`mt-0.5 w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${paid ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-green-400'} disabled:opacity-50`}>
                              {paid ? <CheckCircle className="w-4 h-4 text-white" /> : <Circle className={`w-4 h-4 ${tog ? 'text-white/50 animate-pulse' : 'text-white/20'}`} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-white truncate">{p.real_name ?? p.display_name}</p>
                                  {p.apps.map(a => {
                                    const nameInApp = p.appNameMap?.[a] || p.display_name
                                    return (
                                      <p key={a} className="text-white/40 text-xs">🎮 {a}: <span className="text-white/60 font-medium">{nameInApp}</span>{p.idMap?.[a] ? <span className="ml-1.5 text-white/25 font-mono text-[10px]">· ID: {p.idMap[a]}</span> : null}</p>
                                    )
                                  })}
                                  {paid && <p className="text-green-400 text-xs font-bold mt-0.5">✓ Pagado</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-green-400 font-bold text-sm">${(p.salary_usd ?? 0).toFixed(2)}</p>
                                  {p.salary_cuba > 0 && (
                                    <>
                                      <p className="text-amber-400 text-xs font-bold">{fmtCup(p.salary_cuba)} CUP</p>
                                      {(() => {
                                        // Derivar la tasa efectiva desde salary_cuba/salary_usd — refleja tasa exclusiva si la hay
                                        const derivedRate = p.salary_usd > 0 ? Math.round(p.salary_cuba / p.salary_usd) : (weekRates[p.person_type === 'agent' ? 'efectivo_agent' : 'efectivo_worker'] ?? 0)
                                        return derivedRate > 0 ? <p className="text-white/20 text-xs">💱 1 USD = {derivedRate.toLocaleString('es-ES')} CUP</p> : null
                                      })()}
                                    </>
                                  )}
                                </div>
                              </div>
                              {p.phone && (
                                <a href={`https://wa.me/${cleanNum(p.phone)}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/20 hover:border-green-500/40 px-2.5 py-1.5 rounded-lg transition-colors">
                                  <Phone className="w-3 h-3" /> {p.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
          )}
          </>

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
  