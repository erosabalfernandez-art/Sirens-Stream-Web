import { useState, useEffect } from 'react'
  import { useLanguage } from '@/contexts/LanguageContext'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, Gem, Calendar, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from 'lucide-react'

  interface PublishedSalary {
    id: string
    app_name: string
    semana: string
    usd: number
    diamantes: number
    extras: Record<string, string | number>
    created_at: string
  }

  function fmt(n: number) { return Number(n).toLocaleString('es-ES') }


  export default function Salarios() {
    const { user, loading } = useAuth()
      const { lang } = useLanguage()
      const T = {
        badge:        lang === 'pt' ? 'Meus Salários'          : 'Mis Salarios',
        title:        lang === 'pt' ? 'Seu histórico de pagamentos' : 'Tu historial de pagos',
        subtitle:     lang === 'pt' ? 'Eclipse Angels Agency · máx. 10 semanas salvas' : 'Eclipse Angels Agency · máx. 10 semanas guardadas',
        loading:      lang === 'pt' ? 'Carregando...'           : 'Cargando...',
        empty1:       lang === 'pt' ? 'Você ainda não tem salários publicados.' : 'Aún no tienes salarios publicados.',
        empty2:       lang === 'pt' ? 'Sua agência publicará seus ganhos semanalmente.' : 'Tu agencia publicará tus ganancias semanalmente.',
        week:         lang === 'pt' ? 'Semana'                  : 'Semana',
        hideDetails:  lang === 'pt' ? 'Ocultar detalhes'        : 'Ocultar detalles',
        showDetails:  lang === 'pt' ? 'Ver detalhes'            : 'Ver detalles',
        deleteBtn:    lang === 'pt' ? 'Excluir'                 : 'Borrar',
        cancelBtn:    lang === 'pt' ? 'Não'                     : 'No',
        confirmBtn:   lang === 'pt' ? 'Confirmar pagamento recebido' : 'Confirmar pago recibido',
        confirmDone:  lang === 'pt' ? '✓ Pago confirmado'        : '✓ Pago confirmado',
      }
    const [, navigate] = useLocation()
    const [salaries, setSalaries] = useState<PublishedSalary[]>([])
    const [fetching, setFetching] = useState(true)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
    const [confirming, setConfirming] = useState<string | null>(null)
      const [workerPayMethods, setWorkerPayMethods] = useState<Record<string,string>>({})
      const [exchangeRates, setExchangeRates] = useState<Record<string,number>>({})
      const [validRateSemana, setValidRateSemana] = useState<string>('')

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => { if (user) { fetchSalaries(); fetchConfirmed(); fetchWorkerInfo() } }, [user])

    async function fetchSalaries() {
      setFetching(true)
      const { data } = await supabase
        .from('published_salaries')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      setSalaries((data as PublishedSalary[]) ?? [])
      setFetching(false)
    }

    async function fetchConfirmed() {
      const { data } = await supabase
        .from('payment_confirmations')
        .select('salary_id')
        .eq('user_id', user!.id)
      setConfirmed(new Set(((data ?? []) as any[]).map((r: any) => r.salary_id)))
    }

    async function fetchWorkerInfo() {
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        const [entriesRes, ratesRes, semanaRes] = await Promise.all([
          supabase.from('worker_entries').select('app_name, metodo_pago').eq('user_id', user!.id),
          supabase.from('exchange_rates').select('id, rate'),
          fetch(`${apiBase}/api/site-settings/exchange_rates_valid_semana`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        ])
        const methods: Record<string,string> = {}
        for (const e of (entriesRes.data ?? []) as {app_name:string;metodo_pago:string|null}[]) {
          methods[e.app_name] = e.metodo_pago ?? ''
        }
        setWorkerPayMethods(methods)
        const r: Record<string,number> = {}
        for (const row of (ratesRes.data ?? []) as {id:string;rate:number}[]) r[row.id] = row.rate
        setExchangeRates(r)
        setValidRateSemana((semanaRes as any)?.value ?? '')
      }

      async function confirmPayment(salaryId: string, appName: string, semana: string) {
      setConfirming(salaryId)
      await supabase.from('payment_confirmations').insert({
        salary_id: salaryId,
        user_id: user!.id,
        app_name: appName,
        semana,
      })
      setConfirmed(prev => new Set([...prev, salaryId]))
      setConfirming(null)
    }

    async function deleteSalary(id: string) {
      setDeleting(id)
      const { error } = await supabase.from('published_salaries').delete().eq('id', id)
      if (!error) setSalaries(prev => prev.filter(s => s.id !== id))
      setDeleting(null)
      setDeleteConfirm(null)
    }

    function toggle(id: string) {
      setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    const apps = [...new Set(salaries.map(s => s.app_name))]

    if (loading) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse">{T.loading}</div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1 mb-3">
              <DollarSign className="w-3 h-3 text-green-400" />
              <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
            </div>
            <h1 className="text-2xl font-extrabold">{T.title}</h1>
            <p className="text-white/40 text-sm mt-1">{T.subtitle}</p>
          </div>

          {fetching ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : salaries.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
              <DollarSign className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">{T.empty1}</p>
              <p className="text-white/25 text-xs mt-1">{T.empty2}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CUP summary banner - only show when Cuban pay method & rate set */}
              {(() => {
                const cupApps = apps.filter(app => {
                  const m = workerPayMethods[app] ?? ''
                  const isCuban = m === 'Efectivo (Cuba)' || m === 'Transferencia Bancaria (Cuba)'
                  const rk = m === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
                  const hasSemana = validRateSemana ? salaries.filter(s => s.app_name === app).some(s => s.semana === validRateSemana) : false
                  return isCuban && (exchangeRates[rk] ?? 0) > 0 && hasSemana
                })
                if (cupApps.length === 0) return null
                let grandTotal = 0
                return (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4 mb-4">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">💱 Resumen en Moneda Nacional (CUP)</p>
                    <div className="space-y-2">
                      {cupApps.map(app => {
                        const m = workerPayMethods[app] ?? ''
                        const rk = m === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
                        const rate = exchangeRates[rk] ?? 0
                        const totalUsd = salaries.filter(s => s.app_name === app).reduce((sum, s) => sum + Number(s.usd), 0)
                        const cup = totalUsd * rate
                        grandTotal += cup
                        return (
                          <div key={app} className="flex items-center justify-between py-1">
                            <div>
                              <span className="text-white/80 text-sm font-bold">{app}</span>
                              <span className="text-white/30 text-xs ml-2">{m.includes('Efectivo') ? '💵 Efectivo' : '🏦 Transferencia'} · 1 USD = {rate.toLocaleString('es-ES')} CUP</span>
                            </div>
                            <p className="text-amber-300 font-extrabold text-base">{cup.toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/60 text-xs font-semibold">CUP</span></p>
                          </div>
                        )
                      })}
                      {cupApps.length > 1 && (
                        <div className="flex items-center justify-between border-t border-amber-500/20 pt-2 mt-1">
                          <span className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">Total todas las apps</span>
                          <p className="text-amber-300 font-extrabold text-xl">{grandTotal.toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/60 text-sm font-semibold">CUP</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
              {apps.map(app => {
                const appSalaries = salaries.filter(s => s.app_name === app)
                return (
                  <div key={app}>
                    <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3 px-1">{app}</h2>
                    <div className="space-y-3">
                      {appSalaries.map(s => {
                        const isOpen = expanded.has(s.id)
                        const isConfirming = deleteConfirm === s.id
                        const isDeleting = deleting === s.id
                        const extraEntries = s.extras ? Object.entries(s.extras).filter(([, v]) => v !== '' && v !== null) : []
                        const metodo = workerPayMethods[s.app_name] ?? ''
                        const isCubanPay = metodo === 'Efectivo (Cuba)' || metodo === 'Transferencia Bancaria (Cuba)'
                        const rateKey = metodo === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
                        const cupRate = isCubanPay && s.semana === validRateSemana ? (exchangeRates[rateKey] ?? 0) : 0
                        const cupTotal = Number(s.usd) * cupRate
                        return (
                          <div key={s.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                                  <Calendar className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{T.week} {s.semana}</p>
                                  <p className="text-white/30 text-xs mt-0.5">
                                    {new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  {isCubanPay ? (
                                    cupRate > 0 ? (
                                      <>
                                        <p className="text-xl font-extrabold text-amber-300">
                                          {(Number(s.usd) * cupRate).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-base font-bold text-amber-400/70">CUP</span>
                                        </p>
                                        <p className="text-amber-400/50 text-xs mt-0.5 text-right">1 USD = {cupRate.toLocaleString('es-ES')}</p>
                                      </>
                                    ) : (
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-white/25">⏳ Cambio pendiente</p>
                                        <p className="text-white/15 text-xs mt-0.5">En espera del tipo de cambio</p>
                                      </div>
                                    )
                                  ) : (
                                    <>
                                      <p className="text-xl font-extrabold text-green-400">
                                        ${Number(s.usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                      </p>
                                      <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <Gem className="w-3.5 h-3.5 text-purple-400" />
                                        <span className="text-purple-300 text-sm font-semibold">{fmt(s.diamantes)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {isConfirming ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => deleteSalary(s.id)} disabled={isDeleting}
                                      className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                                      {isDeleting ? '...' : T.deleteBtn}
                                    </button>
                                    <button onClick={() => setDeleteConfirm(null)}
                                      className="text-xs bg-white/8 hover:bg-white/15 text-white/60 font-semibold px-3 py-1.5 rounded-lg transition-all">
                                      {T.cancelBtn}
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(s.id)} title="Eliminar"
                                    className="text-white/20 hover:text-red-400 transition-colors shrink-0 p-1">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                              {extraEntries.length > 0 && (
                              <>
                                <button onClick={() => toggle(s.id)}
                                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 border-t border-purple-500/8 text-xs font-semibold text-white/30 hover:text-purple-300 hover:bg-purple-500/5 transition-all">
                                  {isOpen
                                    ? <><ChevronUp className="w-3.5 h-3.5" />{T.hideDetails}</>
                                    : <><ChevronDown className="w-3.5 h-3.5" />{T.showDetails}</>}
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
                            {/* Confirmación de pago */}
                            <div className="px-5 py-3 border-t border-purple-500/8">
                              {confirmed.has(s.id) ? (
                                <div className="flex items-center gap-2 text-green-400">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span className="text-sm font-semibold">{T.confirmDone}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => confirmPayment(s.id, s.app_name, s.semana)}
                                  disabled={confirming === s.id}
                                  className="flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-green-400 transition-colors disabled:opacity-40">
                                  {confirming === s.id
                                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                  {T.confirmBtn}
                                </button>
                              )}
                            </div>
                              {metodo === 'Efectivo (Cuba)' && (
                                <div className="px-5 pb-4 pt-0">
                                  <div className="bg-amber-500/6 border border-amber-500/15 rounded-xl p-3 space-y-2">
                                    <p className="text-amber-400/80 text-xs font-bold">📲 Contactar pagador</p>
                                    <p className="text-white/30 text-xs leading-relaxed">Solo escríbele cuando hayas visto tu monto semanal en CUP. No contactes al pagador sin haber visto el monto.</p>
                                    {cupRate > 0 && Number(s.usd) > 0 ? (
                                      <a
                                        href={`https://wa.me/5356380709?text=${encodeURIComponent('Hola. soy miembro de eclipse angels en la app ' + s.app_name + '. E logrado hacer la meta de la app por primera vez por favor guarda mi contacto para temas del pago.')}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                                        💬 Escribir al pagador
                                      </a>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2 w-full bg-white/5 text-white/20 font-bold py-2.5 rounded-xl text-sm cursor-not-allowed border border-white/5">
                                        🔒 Disponible cuando veas tu monto en CUP
                                      </div>
                                    )}
                                  </div>
                                </div>
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
