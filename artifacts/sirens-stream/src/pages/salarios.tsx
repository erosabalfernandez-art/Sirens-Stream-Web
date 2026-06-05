import { useState, useEffect } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase } from '@/lib/supabase'
  import { subscribeToPush } from '@/lib/push'
  import { DollarSign, Gem, Calendar, ChevronDown, ChevronUp, Bell } from 'lucide-react'

  interface PublishedSalary {
    id: string
    app_name: string
    semana: string
    usd: number
    diamantes: number
    extras: Record<string, string | number>
    published_at: string
  }

  function fmt(n: number) { return Number(n).toLocaleString('es-ES') }

  export default function Salarios() {
    const { user, loading } = useAuth()
    const [, navigate] = useLocation()
    const [salaries, setSalaries] = useState<PublishedSalary[]>([])
    const [fetching, setFetching] = useState(true)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
    const [enablingPush, setEnablingPush] = useState(false)

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => { if (user) { fetchSalaries(); checkPush() } }, [user])

    async function fetchSalaries() {
      setFetching(true)
      const { data } = await supabase
        .from('published_salaries')
        .select('*')
        .eq('user_id', user!.id)
        .order('published_at', { ascending: false })
      setSalaries((data as PublishedSalary[]) ?? [])
      setFetching(false)
    }

    async function checkPush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushEnabled(false); return }
      const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => null)
      if (!reg) { setPushEnabled(false); return }
      const sub = await reg.pushManager.getSubscription().catch(() => null)
      setPushEnabled(!!sub)
    }

    async function enablePush() {
      setEnablingPush(true)
      const ok = await subscribeToPush(user!.id)
      setPushEnabled(ok)
      setEnablingPush(false)
    }

    function toggle(id: string) {
      setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    const apps = [...new Set(salaries.map(s => s.app_name))]

    if (loading) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse">Cargando...</div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1 mb-3">
                <DollarSign className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">Mis Salarios</span>
              </div>
              <h1 className="text-2xl font-extrabold">Tu historial de pagos</h1>
              <p className="text-white/40 text-sm mt-1">Eclipse Angels Agency</p>
            </div>
            {pushEnabled === false && (
              <button onClick={enablePush} disabled={enablingPush}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-lg">
                {enablingPush
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Bell className="w-4 h-4" />}
                Activar notificaciones
              </button>
            )}
            {pushEnabled === true && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20">
                <Bell className="w-4 h-4" /> Notificaciones activas
              </div>
            )}
          </div>

          {fetching ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : salaries.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
              <DollarSign className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">Aún no tienes salarios publicados.</p>
              <p className="text-white/25 text-xs mt-1">Tu agencia publicará tus ganancias semanalmente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {apps.map(app => {
                const appSalaries = salaries.filter(s => s.app_name === app)
                return (
                  <div key={app}>
                    <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3 px-1">{app}</h2>
                    <div className="space-y-3">
                      {appSalaries.map(s => {
                        const isOpen = expanded.has(s.id)
                        const extraEntries = s.extras ? Object.entries(s.extras).filter(([, v]) => v !== '' && v !== null) : []
                        return (
                          <div key={s.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                                  <Calendar className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">Semana {s.semana}</p>
                                  <p className="text-white/30 text-xs mt-0.5">
                                    {new Date(s.published_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-extrabold text-green-400">
                                  ${Number(s.usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <Gem className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="text-purple-300 text-sm font-semibold">{fmt(s.diamantes)}</span>
                                </div>
                              </div>
                            </div>
                            {extraEntries.length > 0 && (
                              <>
                                <button onClick={() => toggle(s.id)}
                                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 border-t border-purple-500/8 text-xs font-semibold text-white/30 hover:text-purple-300 hover:bg-purple-500/5 transition-all">
                                  {isOpen
                                    ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles</>
                                    : <><ChevronDown className="w-3.5 h-3.5" />Ver detalles</>}
                                </button>
                                {isOpen && (
                                  <div className="px-5 pb-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-purple-500/8 pt-3">
                                    {extraEntries.map(([k, v]) => (
                                      <div key={k}>
                                        <p className="text-white/30 text-xs">{k}</p>
                                        <p className="text-sm font-semibold text-white/80">{String(v)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
  