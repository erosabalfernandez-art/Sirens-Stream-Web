import { useState, useEffect } from 'react'
  import { useLanguage } from '@/contexts/LanguageContext'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase } from '@/lib/supabase'
  import { DollarSign, Gem, Calendar, ChevronDown, ChevronUp, Trash2, CheckCircle2, FileDown } from 'lucide-react'
  import { PushNotificationCard } from '@/components/layout/PushNotificationCard'

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
    const { user, profile, loading } = useAuth()
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
        const [myCustomRates, setMyCustomRates] = useState<Record<string,{efectivo_rate:number;transferencia_rate:number}>>({})
      const [activeNominas, setActiveNominas] = useState<Set<string>>(new Set())
      const [historyOpen, setHistoryOpen] = useState(false)

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => { if (user) { fetchSalaries(); fetchConfirmed(); fetchWorkerInfo() } }, [user])

    async function fetchSalaries() {
      setFetching(true)
      const _apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/,'')
      const [salRes, activeRes] = await Promise.all([
        supabase.from('published_salaries').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        fetch(_apiBase + '/api/active-semanas').then(r => r.json()).catch(() => ({ semanas: [] })),
      ])
      setSalaries((salRes.data as PublishedSalary[]) ?? [])
      setActiveNominas(new Set((activeRes.semanas ?? []) as string[]))
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
        const _apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/,'')
        const [entriesRes, myRatesRes] = await Promise.all([
          supabase.from('worker_entries').select('app_name, metodo_pago').eq('user_id', user!.id),
          fetch(`${_apiBase}/api/worker/my-rates?user_id=${encodeURIComponent(user!.id)}`).then(r => r.json()).catch(() => ({ custom: {}, global: {} })),
        ])
        const methods: Record<string,string> = {}
        for (const e of (entriesRes.data ?? []) as {app_name:string;metodo_pago:string|null}[]) {
          methods[e.app_name] = e.metodo_pago ?? ''
        }
        setWorkerPayMethods(methods)
        setExchangeRates((myRatesRes as any).global ?? {})
        setMyCustomRates((myRatesRes as any).custom ?? {})
      }

      async function confirmPayment(salaryId: string, appName: string, semana: string) {
      setConfirming(salaryId)
      const _apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
      await fetch(`${_apiBase}/api/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary_id: salaryId, user_id: user!.id, app_name: appName, semana }),
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

    function exportSalaryPDF() {
      if (salaries.length === 0) return
      const activeSalaries = salaries.filter(s => activeNominas.has(s.semana))
    const historySalaries = salaries.filter(s => !activeNominas.has(s.semana))
    const activeApps = [...new Set(activeSalaries.map(s => s.app_name))]
        const apps = [...new Set(salaries.map(s => s.app_name))]
      const totalUSD = salaries.reduce((sum, s) => sum + Number(s.usd), 0)
      const now = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

      const rows = apps.map(app => {
        const appSals = salaries.filter(s => s.app_name === app)
        const appTotal = appSals.reduce((sum, s) => sum + Number(s.usd), 0)
        const weekRows = appSals.map(s => {
          const extras = s.extras ? Object.entries(s.extras).filter(([k, v]) => v !== '' && v !== null && !k.toLowerCase().includes('cup') && !k.toLowerCase().includes('rate')) : []
          return `
            <tr class="week-row">
              <td class="week-cell">
                <span class="week-label">Semana ${s.semana}</span>
                <span class="date-small">${new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </td>
              <td class="usd-cell">$${Number(s.usd).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</td>
              ${s.diamantes > 0 ? `<td class="dia-cell">${Number(s.diamantes).toLocaleString('es-ES')} 💎</td>` : '<td class="dia-cell">—</td>'}
              <td class="extras-cell">${extras.map(([k, v]) => `<span class="extra-item"><b>${k}:</b> ${v}</span>`).join('')}</td>
            </tr>`
        }).join('')
        return `
          <div class="app-section">
            <div class="app-header">
              <span class="app-name">${app}</span>
              <span class="app-total">Total: $${appTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span>
            </div>
            <table class="week-table">
              <thead><tr><th>Semana</th><th>USD</th><th>Diamantes</th><th>Detalles</th></tr></thead>
              <tbody>${weekRows}</tbody>
            </table>
          </div>`
      }).join('')

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mis Salarios - Eclipse Angels</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 36px; font-size: 13px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #7c3aed; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 900; color: #7c3aed; letter-spacing: -0.5px; }
  .brand span { color: #a855f7; }
  .doc-title { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .meta { text-align: right; font-size: 11px; color: #9ca3af; line-height: 1.6; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; background: #f3f0ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 14px 18px; }
  .summary-card .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7c3aed; margin-bottom: 4px; }
  .summary-card .value { font-size: 20px; font-weight: 900; color: #1a1a2e; }
  .summary-card .sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .app-section { margin-bottom: 28px; }
  .app-header { display: flex; align-items: center; justify-content: space-between; background: #7c3aed; color: #fff; border-radius: 8px 8px 0 0; padding: 10px 16px; }
  .app-name { font-weight: 900; font-size: 14px; letter-spacing: 0.03em; }
  .app-total { font-weight: 700; font-size: 13px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; }
  .week-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-top: none; }
  .week-table th { background: #f5f3ff; color: #7c3aed; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd6fe; }
  .week-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .week-row:last-child td { border-bottom: none; }
  .week-row:nth-child(even) td { background: #fafafa; }
  .week-cell { min-width: 140px; }
  .week-label { display: block; font-weight: 700; color: #1a1a2e; font-size: 13px; }
  .date-small { display: block; font-size: 10px; color: #9ca3af; margin-top: 2px; }
  .usd-cell { font-weight: 900; color: #059669; font-size: 15px; white-space: nowrap; }
  .dia-cell { color: #7c3aed; font-weight: 700; white-space: nowrap; }
  .extras-cell { }
  .extra-item { display: inline-block; background: #f3f4f6; border-radius: 6px; padding: 2px 8px; margin: 2px 3px 2px 0; font-size: 11px; color: #374151; }
  .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Eclipse <span>Angels</span> Agency</div>
      <div class="doc-title">Historial de Salarios — Solo en USD</div>
    </div>
    <div class="meta">
      Generado: ${now}<br>
      Total de semanas: ${salaries.length}<br>
      Total de apps: ${apps.length}
    </div>
  </div>
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total acumulado (USD)</div>
      <div class="value">$${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</div>
      <div class="sub">Suma de todos los períodos</div>
    </div>
    <div class="summary-card">
      <div class="label">Semanas registradas</div>
      <div class="value">${salaries.length}</div>
      <div class="sub">En ${apps.length} aplicación${apps.length !== 1 ? 'es' : ''}</div>
    </div>
  </div>
  ${rows}
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

    const activeSalaries = salaries.filter(s => activeNominas.has(s.semana))
    const historySalaries = salaries.filter(s => !activeNominas.has(s.semana))
    const activeApps = [...new Set(activeSalaries.map(s => s.app_name))]
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
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-extrabold">{T.title}</h1>
                <p className="text-white/40 text-sm mt-1">{T.subtitle}</p>
              </div>
              {salaries.length > 0 && (
                <button
                  onClick={exportSalaryPDF}
                  className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar PDF
                </button>
              )}
            </div>
          </div>

          {user && <PushNotificationCard userId={user.id} lang={lang} />}

          {fetching ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : (activeSalaries.length === 0 && historySalaries.length === 0) ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
              <DollarSign className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">{T.empty1}</p>
              <p className="text-white/25 text-xs mt-1">{T.empty2}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tipo de cambio informativo — oculto para trabajadoras con tasa exclusiva asignada */}
              {(() => {
                // Si cualquier app cubana activa tiene tasa exclusiva → no mostrar el cambio global
                const hasExclusiveRate = activeApps.some(app => {
                  const m = workerPayMethods[app] ?? ''
                  const isCuban = m === 'Efectivo (Cuba)' || m === 'Transferencia Bancaria (Cuba)'
                  if (!isCuban) return false
                  const appCustom = myCustomRates[app]
                  const cRate = m === 'Efectivo (Cuba)' ? (appCustom?.efectivo_rate ?? 0) : (appCustom?.transferencia_rate ?? 0)
                  return cRate > 0
                })
                if (hasExclusiveRate) return null
                const ef = exchangeRates['efectivo_worker'] ?? 0
                const tr = exchangeRates['transferencia_worker'] ?? 0
                const displayRate = ef > 0 ? ef : tr
                if (displayRate === 0 || activeSalaries.length === 0) return null
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

              {/* CUP summary banner — tasa exclusiva tiene prioridad sobre global; ✦ indica tasa personalizada */}
              {(() => {
                const cupApps = activeApps.filter(app => {
                  const m = workerPayMethods[app] ?? ''
                  const isCuban = m === 'Efectivo (Cuba)' || m === 'Transferencia Bancaria (Cuba)'
                  if (!isCuban) return false
                  const appCustom = myCustomRates[app]
                  const cRate = m === 'Efectivo (Cuba)' ? (appCustom?.efectivo_rate ?? 0) : (appCustom?.transferencia_rate ?? 0)
                  if (cRate > 0) return true // tasa exclusiva siempre se muestra
                  const rk = m === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
                  // Use live rate directly — cierre resets exchange_rates to 0 in DB,
                  // so after cierre the API returns 0 and nothing leaks to the worker.
                  return (exchangeRates[rk] ?? 0) > 0
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
                        const appCustom = myCustomRates[app]
                        const cRate = m === 'Efectivo (Cuba)' ? (appCustom?.efectivo_rate ?? 0) : (appCustom?.transferencia_rate ?? 0)
                        const rate = cRate > 0 ? cRate : (exchangeRates[rk] ?? 0)
                        const isExclusive = cRate > 0
                        const totalUsd = activeSalaries.filter(s => s.app_name === app).reduce((sum, s) => sum + Number(s.usd), 0)
                        const cup = totalUsd * rate
                        grandTotal += cup
                        return (
                          <div key={app} className="flex items-center justify-between py-1">
                            <div>
                              <span className="text-white/80 text-sm font-bold">{app}</span>
                              <span className="text-white/30 text-xs ml-2">{m.includes('Efectivo') ? '💵 Efectivo' : '🏦 Transferencia'} · 1 USD = {rate.toLocaleString('es-ES')} CUP{isExclusive ? ' ✦' : ''}</span>
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
              {activeSalaries.length === 0 && historySalaries.length > 0 && (
                  <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-8 text-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg">🔒</span>
                    </div>
                    <p className="text-white/50 text-sm font-medium">Semana cerrada</p>
                    <p className="text-white/25 text-xs mt-1">Los pagos se procesaron. Consulta el historial abajo.</p>
                  </div>
                )}
                {activeApps.map(app => {
                const appSalaries = activeSalaries.filter(s => s.app_name === app)
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
                        const appCustom = myCustomRates[s.app_name]
                        const customCupRate = isCubanPay ? (metodo === 'Efectivo (Cuba)' ? (appCustom?.efectivo_rate ?? 0) : (appCustom?.transferencia_rate ?? 0)) : 0
                        const storedRate = metodo === 'Efectivo (Cuba)' ? (s.extras?.cup_efectivo_rate as number | undefined) : (s.extras?.cup_transferencia_rate as number | undefined)
                          // Live rate: use directly — cierre resets exchange_rates to 0 in DB
                          // so fetching after cierre returns 0, preventing stale CUP display.
                          const liveRate = exchangeRates[rateKey] ?? 0
                          const cupRate = isCubanPay ? (customCupRate > 0 ? customCupRate : ((storedRate && storedRate > 0) ? storedRate : liveRate)) : 0
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
                                  <p className="text-xl font-extrabold text-green-400">
                                    ${Number(s.usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                  </p>
                                  {!isCubanPay && s.diamantes > 0 && (
                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                      <Gem className="w-3.5 h-3.5 text-purple-400" />
                                      <span className="text-purple-300 text-sm font-semibold">{fmt(s.diamantes)}</span>
                                    </div>
                                  )}
                                  {isCubanPay && cupRate > 0 && (
                                    <>
                                      <p className="text-amber-300 font-bold text-sm mt-0.5">
                                        {(Number(s.usd) * cupRate).toLocaleString('es-ES', {maximumFractionDigits: 0})} <span className="text-amber-400/60 text-xs font-semibold">CUP</span>
                                      </p>
                                      <p className="text-white/20 text-xs mt-0.5">💱 1 USD = {cupRate.toLocaleString('es-ES')} CUP</p>
                                    </>
                                  )}
                                  {isCubanPay && cupRate <= 0 && (
                                    <p className="text-white/25 text-xs mt-0.5">⏳ Cambio pendiente</p>
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
                            {!profile?.is_agent && !profile?.is_colider && (<>
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
                            </>)}
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
              {historySalaries.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setHistoryOpen(h => !h)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/4 hover:bg-white/6 border border-white/8 rounded-xl text-white/50 text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <span>Semanas anteriores ({historySalaries.length})</span>
                    {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {historyOpen && (
                    <div className="mt-3 space-y-2 opacity-60">
                      {[...new Set(historySalaries.map(s => s.app_name))].map(app => (
                        <div key={app}>
                          <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-1 px-1">{app}</p>
                          <div className="space-y-2">
                            {historySalaries.filter(s => s.app_name === app).map(s => (
                              <div key={s.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
                                <div>
                                  <span className="text-white/40 text-xs font-semibold">Semana {s.semana}</span>
                                  <span className="text-white/20 text-xs ml-2">{new Date(s.created_at).toLocaleDateString('es-ES', {day:'2-digit',month:'short',year:'numeric'})}</span>
                                </div>
                                <span className="text-white/40 text-sm font-bold">{Number(s.usd).toLocaleString('es-ES', {minimumFractionDigits:2})} USD</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
