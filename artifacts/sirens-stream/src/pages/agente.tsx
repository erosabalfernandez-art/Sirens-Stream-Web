import React, { useState, useEffect } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, ChevronDown, ChevronUp, Bell, BellOff } from 'lucide-react'
  import { subscribeToPush } from '@/lib/push'

  interface AgentCommission {
    id: string; agent_name: string; app_name: string; semana: string
    total_commission_usd: number
    workers_data: { uid: string; nombre: string; salary_usd: number; commission_usd: number }[]
    created_at: string
  }

  function fmt(n: number) { return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  export default function AgentePanel() {
    const { profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [commissions, setCommissions] = useState<AgentCommission[]>([])
    const [commLoading, setCommLoading] = useState(true)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [filterApp, setFilterApp] = useState('')
    const [notifStatus, setNotifStatus] = useState<'idle'|'requesting'|'granted'|'denied'>('idle')

    useEffect(() => { if (!loading && profile !== undefined && !profile?.is_agent) navigate('/') }, [loading, profile])
    useEffect(() => { if (profile?.is_agent) fetchCommissions() }, [profile])

    useEffect(() => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') setNotifStatus('granted')
        else if (Notification.permission === 'denied') setNotifStatus('denied')
      }
    }, [])

    async function fetchCommissions() {
      setCommLoading(true)
      const { data } = await supabase.from('agent_commissions').select('*').order('created_at', { ascending: false })
      setCommissions((data ?? []) as AgentCommission[])
      setCommLoading(false)
    }

    function toggleExpand(id: string) { setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s }) }

    async function subscribeNotif() {
      if (!profile?.id) return
      setNotifStatus('requesting')
      const ok = await subscribeToPush(profile.id)
      setNotifStatus(ok ? 'granted' : 'denied')
    }

    if (loading || profile === undefined) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 animate-pulse text-sm">Cargando...</div></div>
    if (!profile?.is_agent) return null

    const filtered = commissions.filter(c => !filterApp || c.app_name === filterApp)
    const apps = [...new Set(commissions.map(c => c.app_name))]
    const totalUSD = filtered.reduce((s, c) => s + (c.total_commission_usd || 0), 0)

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 mb-3">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Panel de Agente</span>
            </div>
            <h1 className="text-2xl font-extrabold">Mis Comisiones</h1>
            {profile.agent_name && <p className="text-white/40 text-sm mt-0.5">Agente: {profile.agent_name}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-green-400">${fmt(totalUSD)}</p>
              <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Total ganado</p>
            </div>
            <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-purple-400">{filtered.length}</p>
              <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Semanas</p>
            </div>
            <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-blue-400">{apps.length}</p>
              <p className="text-white/35 text-xs mt-1 uppercase tracking-wider">Apps</p>
            </div>
          </div>
          {apps.length > 1 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => setFilterApp('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!filterApp ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>Todas</button>
              {apps.map(a => <button key={a} onClick={() => setFilterApp(a)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterApp === a ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/40 hover:text-white'}`}>{a}</button>)}
            </div>

          {/* Push notifications */}
          <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-5 mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Notificaciones push</p>
                <p className="text-white/35 text-xs mt-0.5">Recibe alertas de nuevas comisiones en tu dispositivo</p>
              </div>
            </div>
            <div className="shrink-0">
              {notifStatus === 'granted' ? (
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                  <Bell className="w-3.5 h-3.5" /> Activadas
                </span>
              ) : notifStatus === 'denied' ? (
                <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                  <BellOff className="w-3.5 h-3.5" /> Bloqueadas
                </span>
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
                  {expanded.has(c.id) && (
                    <div className="border-t border-purple-500/10">
                      <div className="px-5 py-2 bg-purple-500/5">
                        <div className="grid grid-cols-3 gap-2 text-xs text-white/30 font-semibold uppercase tracking-wider">
                          <span>Trabajadora</span><span className="text-right">Salario</span><span className="text-right">Tu comisión</span>
                        </div>
                      </div>
                      <div className="divide-y divide-white/4">
                        {(c.workers_data ?? []).map((w, i) => (
                          <div key={i} className="px-5 py-3 grid grid-cols-3 gap-2 items-center">
                            <span className="text-white/80 text-sm font-medium truncate">{w.nombre || '—'}</span>
                            <span className="text-white/50 text-sm text-right">${fmt(w.salary_usd)}</span>
                            <span className="text-green-400 font-bold text-sm text-right">${fmt(w.commission_usd)}</span>
                          </div>
                        ))}
                        <div className="px-5 py-3 grid grid-cols-3 gap-2 items-center bg-amber-500/5 border-t border-amber-500/10">
                          <span className="text-white/50 text-xs font-bold uppercase">Total</span>
                          <span className="text-white/50 text-sm text-right font-bold">${fmt((c.workers_data ?? []).reduce((s,w)=>s+w.salary_usd,0))}</span>
                          <span className="text-green-400 font-extrabold text-sm text-right">${fmt(c.total_commission_usd)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  