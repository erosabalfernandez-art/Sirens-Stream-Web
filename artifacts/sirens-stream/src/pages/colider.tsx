import { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { Phone, CheckCircle, Circle, Bell, Lock, Clock, Users, DollarSign } from 'lucide-react'

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
    const [tab, setTab] = useState<'workers' | 'agents'>('workers')
    const [notifyMsg, setNotifyMsg] = useState('')

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => {
      if (!loading && profile && !(profile as any).is_colider && !(profile as any).is_admin) navigate('/perfil')
    }, [loading, profile])
    useEffect(() => { if (user) fetchWeeks() }, [user])
    useEffect(() => { if (semana) loadData() }, [semana])

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
      setLoadingData(true)
      try {
        const [listR, marksR, statusR] = await Promise.all([
          fetch(`${API}/api/colider/salary-list?semana=${encodeURIComponent(semana)}`).then(r => r.json()),
          fetch(`${API}/api/colider/marks?semana=${encodeURIComponent(semana)}`).then(r => r.json()),
          fetch(`${API}/api/colider/week-status?semana=${encodeURIComponent(semana)}`).then(r => r.json()),
        ])

        const rm: Record<string, number> = listR.exchange_rates ?? {}
        const entries: PersonEntry[] = []

        for (const s of (listR.workers ?? [])) {
          const met = s.metodo_pago ?? ''
          const isCuba = met === 'Efectivo (Cuba)' || met === 'Transferencia Bancaria (Cuba)'
          const rk = met === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
          const rate = isCuba ? (rm[rk] ?? 0) : 0
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

        const agentMap: Record<string, { usd: number; app: string }> = {}
        for (const a of (listR.agents ?? [])) {
          if (!agentMap[a.agent_name]) agentMap[a.agent_name] = { usd: 0, app: a.app_name }
          agentMap[a.agent_name].usd += Number(a.total_commission_usd) || 0
        }
        const efRate = rm['efectivo_agent'] ?? 0
        for (const [name, info] of Object.entries(agentMap)) {
          entries.push({
            key: `agent__${name}`,
            person_uid: name,
            person_type: 'agent',
            display_name: name,
            real_name: name,
            phone: null,
            app: info.app,
            salary_usd: info.usd,
            salary_cuba: efRate > 0 ? info.usd * efRate : 0,
            metodo_pago: null,
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
      try {
        const r = await fetch(`${API}/api/colider/notify-admin`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ semana })
        })
        const d = await r.json()
        if (!r.ok) { setNotifyMsg(`❌ ${d.error ?? 'Error'}`); return }
        setWeekStatus(prev => ({ ...prev!, notified: true, admin_closed: false }))
        setNotifyMsg('✅ Admin notificado.')
      } catch { setNotifyMsg('❌ Error de conexión') }
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

          <div className="flex gap-2 mb-4">
            {(['workers', 'agents'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-[#0d0d1e] text-white/30 border border-white/5 hover:text-white/60'}`}>
                {t === 'workers' ? `👩 Trabajadoras (${workers.length})` : `🧡 Agentes (${agents.length})`}
              </button>
            ))}
          </div>

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
                            <p className="text-green-400 font-bold text-sm">${p.salary_usd.toFixed(2)}</p>
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
  