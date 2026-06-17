import React, { useState, useRef, useCallback, useEffect } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase, type WorkerEntry, COUNTRIES, getPaymentMethods, getWalletLabel } from '@/lib/supabase'

    import { sendPushViaApi } from '@/lib/push'
  import * as XLSX from 'xlsx'
  import {
    Upload, ChevronDown, ChevronUp, Copy, Check,
    TrendingUp, Gem, Users, AlertTriangle, UserX,
    FileSpreadsheet, Sparkles, Loader2, Download, Trash2, Filter, Search, X} from 'lucide-react'

const PAYMENT_METHODS = ['', 'Binance', 'Pix', 'Efectivo (Cuba)', 'Transferencia Bancaria (Cuba)']

function isoWeekLabel(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const wk = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-S${String(wk).padStart(2, '0')}`
}

  interface NominaRow {
    uid: string
    apodo: string
    usd: number
    diamantes: number
    semana: string
    comision: number
    agente: string | null
    extras: Record<string, string | number>
  }

  type ColConfig = { uid: number; usd: number; apodo: number; semana: number; metric: number; metricLabel: string; currency: 'USD' | 'BRL' }
  interface WorkerRow extends WorkerEntry { profile_email: string }
  interface Matched  { worker: WorkerRow; nomina: NominaRow }
  interface NoCobro  { worker: WorkerRow; nomina: NominaRow | null }

  interface CustomWorkerRate {
      id?: string
      user_id: string
      app_name: string
      nombre_en_app: string | null
      efectivo_rate: number
      transferencia_rate: number
    }

    interface HistoryEntry {
    id: string
    app_name: string
    semana: string
    total_usd: number
    total_diamantes: number
    cobradas_count: number
    nocobro_count: number
    sinperfil_count: number
    rows_data: { cobradas: Matched[]; noCobro: NoCobro[]; sinPerfil: NominaRow[] }
    published: boolean
    created_at: string
    file_name?: string
  }

  function normalizeUID(val: unknown): string {
    if (val === null || val === undefined || val === '') return ''
    const s = String(val).trim()
    if (/[eE]/.test(s)) return Math.round(parseFloat(s)).toString()
    if (/\.0$/.test(s)) return s.replace(/\.0$/, '')
    return s
  }

  function fmt(n: number | undefined | null) {
    if (n === undefined || n === null) return '—'
    return Number(n).toLocaleString('es-ES')
  }

  function CopyBtn({ value }: { value: string | null | undefined }) {
    const [done, setDone] = useState(false)
    if (!value) return <span className="text-white/25 text-sm">—</span>
    return (
      <button onClick={() => { navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1400) }}
        className="group flex items-center gap-1.5 text-left hover:text-purple-200 transition-colors w-full">
        <span className="text-white/80 text-sm font-medium break-all">{value}</span>
        {done ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 shrink-0 transition-colors" />}
      </button>
    )
  }

  // ── PDF export ────────────────────────────────────────────────────────────────
  function buildPDF(
    semana: string,
    cobradas: Matched[],
    noCobro: NoCobro[],
    sinPerfil: NominaRow[],
    aiSummary: string | null,
    agentNameMap: Record<string, string> = {}
  ): string {
    const now = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    const totalUSD = cobradas.reduce((s, m) => s + (m.nomina?.usd ?? 0), 0)
    const totalDia = cobradas.reduce((s, m) => s + (m.nomina?.diamantes ?? 0), 0)

    function workerBlock(w: WorkerRow, n: NominaRow | null, paid: boolean, sinp?: boolean): string {
      const profileRows = [
        ['Email', w.profile_email], ['Nombre real', w.nombre_real], ['Nombre en app', w.nombre_en_app],
        ['UID en la app', w.id_aplicacion], ['País', w.pais], ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono],
        ['Método de pago', w.metodo_pago], ['Billetera', w.billetera], ['Agente', agentNameMap[w.agente ?? ''] ?? w.agente],
      ].filter(([, v]) => v).map(([l, v]) => `<tr><td class="lbl">${l}</td><td>${v}</td></tr>`).join('')

      const nominaRows = n ? Object.entries(n.extras).filter(([, v]) => v !== '' && v !== null).map(([k, v]) => `<tr><td class="lbl">${k}</td><td>${v}</td></tr>`).join('') : ''

      const borderColor = paid ? '#22c55e' : '#f97316'
      const badge = paid
        ? `<span class="badge green">Cobró $${n!.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span>`
        : `<span class="badge orange">No cobró</span>`
      const sinpBadge = sinp ? `<span class="badge yellow">Sin perfil</span>` : ''

      return `
        <div class="worker-card" style="border-left-color:${borderColor}">
          <div class="worker-header">
            <div class="worker-name">
              ${n?.apodo || w.nombre_en_app || w.nombre_real || '—'}
              ${w.nombre_real && n?.apodo ? `<span class="real-name">${w.nombre_real}</span>` : ''}
            </div>
            <div>${badge}${sinpBadge}</div>
          </div>
          ${n ? `<div class="amounts"><span class="usd">$${n.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span><span class="gems">💎 ${fmt(n.diamantes)} diamonds</span></div>` : ''}
          ${profileRows ? `<p class="section-label">Perfil</p><table class="data-table">${profileRows}</table>` : ''}
          ${nominaRows ? `<p class="section-label">Datos de nómina</p><table class="data-table">${nominaRows}</table>` : ''}
        </div>`
    }

    function sinPerfilBlock(n: NominaRow): string {
      const rows = Object.entries(n.extras).filter(([, v]) => v !== '' && v !== null).map(([k, v]) => `<tr><td class="lbl">${k}</td><td>${v}</td></tr>`).join('')
      return `
        <div class="worker-card" style="border-left-color:#eab308">
          <div class="worker-header">
            <div class="worker-name">${n.apodo} <span class="real-name">UID: ${n.uid}</span></div>
            <div><span class="badge yellow">Sin perfil</span></div>
          </div>
          <div class="amounts"><span class="usd">$${n.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD</span><span class="gems">💎 ${fmt(n.diamantes)} diamonds</span></div>
          ${rows ? `<p class="section-label">Datos de nómina</p><table class="data-table">${rows}</table>` : ''}
        </div>`
    }

    return `<!DOCTYPE html>
  <html lang="es">
  <head>
  <meta charset="UTF-8">
  <title>Nómina ${semana} — Eclipse Angels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #7c3aed; }
    .logo { font-size: 20px; font-weight: 900; color: #7c3aed; }
    .logo span { color: #1a1a1a; }
    .header-right { text-align: right; color: #666; font-size: 12px; }
    .ai-box { background: #f5f0ff; border: 1px solid #c4b5fd; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
    .ai-box h4 { color: #7c3aed; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    .ai-box p { color: #4b5563; font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; text-align: center; }
    .stat .val { font-size: 20px; font-weight: 800; }
    .stat .lbl2 { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
    .green-val { color: #16a34a; } .purple-val { color: #7c3aed; } .blue-val { color: #2563eb; } .orange-val { color: #ea580c; }
    .section-title { font-size: 14px; font-weight: 800; color: #1a1a1a; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
    .section-title .count { font-size: 12px; font-weight: 600; color: #9ca3af; }
    .worker-card { border: 1px solid #e5e7eb; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; break-inside: avoid; }
    .worker-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .worker-name { font-weight: 700; font-size: 14px; }
    .real-name { font-weight: 400; color: #9ca3af; font-size: 12px; margin-left: 6px; }
    .amounts { display: flex; gap: 16px; margin-bottom: 10px; }
    .usd { font-size: 18px; font-weight: 800; color: #16a34a; }
    .gems { font-size: 13px; color: #7c3aed; font-weight: 600; }
    .section-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .07em; margin: 10px 0 4px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table tr:nth-child(even) td { background: #f9fafb; }
    .data-table td { padding: 3px 8px; font-size: 12px; }
    .data-table td.lbl { color: #6b7280; width: 40%; font-weight: 500; }
    .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; display: inline-block; }
    .badge.green { background: #dcfce7; color: #15803d; }
    .badge.orange { background: #ffedd5; color: #c2410c; }
    .badge.yellow { background: #fef9c3; color: #a16207; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
  </head>
  <body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Eclipse <span>Angels</span> Agency</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:4px">Nómina Semanal</div>
      </div>
      <div class="header-right">
        <div style="font-weight:700;color:#1a1a1a">${semana}</div>
        <div>Exportado: ${now}</div>
      </div>
    </div>

    ${aiSummary ? `<div class="ai-box"><h4>✦ Análisis IA</h4><p>${aiSummary}</p></div>` : ''}

    <div class="stats">
      <div class="stat"><div class="val green-val">$${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div><div class="lbl2">Total pagado</div></div>
      <div class="stat"><div class="val purple-val">${fmt(totalDia)}</div><div class="lbl2">Diamantes</div></div>
      <div class="stat"><div class="val blue-val">${cobradas.length}</div><div class="lbl2">Cobraron</div></div>
      <div class="stat"><div class="val orange-val">${noCobro.length}</div><div class="lbl2">No cobraron</div></div>
    </div>

    ${cobradas.length > 0 ? `<div class="section-title">✓ Cobraron <span class="count">(${cobradas.length})</span></div>${cobradas.map(m => workerBlock(m.worker, m.nomina, true)).join('')}` : ''}
    ${noCobro.length > 0 ? `<div class="section-title">No cobraron <span class="count">(${noCobro.length})</span></div>${noCobro.map(m => workerBlock(m.worker, m.nomina, false)).join('')}` : ''}
    ${sinPerfil.length > 0 ? `<div class="section-title">Sin perfil <span class="count">(${sinPerfil.length})</span></div>${sinPerfil.map(sinPerfilBlock).join('')}` : ''}

    <div class="footer">Eclipse Angels Agency · Nómina generada automáticamente · ${now}</div>
  </div>
  <script>window.onload = () => window.print()</script>
  </body>
  </html>`
  }


  // ── History Panel ───────────────────────────────────────────────────────────
  function HistoryPanel({
    history, historyLoading, historyFilterSemana, setHistoryFilterSemana,
    historyFilterApp, setHistoryFilterApp, deletingHistId, onDelete, onLoad, fmtNum,
  }: {
    history: HistoryEntry[]
    historyLoading: boolean
    historyFilterSemana: string
    setHistoryFilterSemana: (v: string) => void
    historyFilterApp: string
    setHistoryFilterApp: (v: string) => void
    deletingHistId: string | null
    onDelete: (id: string) => void
    onLoad: (entry: HistoryEntry) => void
    fmtNum: (n: number) => string
  }) {
    const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)
    const filtered = history.filter(h => {
      if (historyFilterApp && h.app_name !== historyFilterApp) return false
      if (historyFilterSemana && !h.semana.toLowerCase().includes(historyFilterSemana.toLowerCase()) && !(h.file_name ?? '').toLowerCase().includes(historyFilterSemana.toLowerCase())) return false
      return true
    })
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-white/40 mr-1">App:</span>
          {(['', 'Waha', 'Layla', 'Howdy'] as const).map(a => (
            <button key={a} onClick={() => setHistoryFilterApp(a)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${historyFilterApp === a ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/50 hover:text-white'}`}>
              {a || 'Todas'}
            </button>
          ))}
          <input
            type="text" value={historyFilterSemana} onChange={e => setHistoryFilterSemana(e.target.value)}
            placeholder="Buscar semana..."
            className="bg-[#0d0d1e] border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 w-40" />
        </div>
        {historyLoading && <div className="text-white/40 animate-pulse text-sm py-4 text-center">Cargando historial...</div>}
        {!historyLoading && filtered.length === 0 && <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-10 text-center"><p className="text-white/30 text-sm">Sin nóminas guardadas.</p></div>}
        {filtered.map(h => {
          const dateStr = new Date(h.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
          return (
            <div key={h.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${h.app_name === 'Waha' ? 'bg-purple-500/20 text-purple-300' : h.app_name === 'Layla' ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'}`}>{h.app_name}</span>
                <div>
                  <span className="font-bold text-sm">{h.file_name ? h.file_name.replace(/\.xlsx?$/i, '') : `Semana ${h.semana}`}</span>
                  <p className="text-white/35 text-xs mt-0.5">
                    {dateStr} · {h.cobradas_count} cobraron · {Number(h.total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD · 💎 {fmtNum(Number(h.total_diamantes))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onLoad(h)}
                  className="text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 px-3 py-1.5 rounded-xl transition-all">
                  Cargar
                </button>
                {confirmDelete === h.id ? (
                  <>
                    <button onClick={() => { onDelete(h.id); setConfirmDelete(null) }}
                      className="text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl transition-all">
                      {deletingHistId === h.id ? '...' : '¿Eliminar?'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/30 hover:text-white px-2 py-1.5 transition-colors">✕</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(h.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

// ── Shared helper components ────────────────────────────────────────────────
function TabBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${active ? color + ' text-white' : 'text-white/40 hover:text-white'}`}>
      {children}
    </button>
  )
}
function Empty({ msg }: { msg: string }) {
  return <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-10 text-center"><p className="text-white/30 text-sm">{msg}</p></div>
}
function SplashLoader({ msg }: { msg: string }) {
  return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 animate-pulse">{msg}</div></div>
}

// ── App colors ────────────────────────────────────────────────────────────────
const APP_COLORS = {
  Waha:  { accent: 'bg-purple-600', border: 'border-purple-500/30', dot: 'bg-purple-400', tag: 'bg-purple-500/20 text-purple-300' },
  Layla: { accent: 'bg-pink-600',   border: 'border-pink-500/30',   dot: 'bg-pink-400',   tag: 'bg-pink-500/20 text-pink-300' },
  Howdy: { accent: 'bg-blue-600',   border: 'border-blue-500/30',   dot: 'bg-blue-400',   tag: 'bg-blue-500/20 text-blue-300' },
}

// ── Per-app accordion section ─────────────────────────────────────────────────

  // ── Layla Manual Entry Section ──────────────────────────────────────────────
  const LAYLA_RATE = 15500 // monedas por dólar

  function LaylaManualSection({ exchangeRates = {} }: { exchangeRates?: Record<string,number> }) {
    const [open, setOpen] = useState<boolean>(false)
    const [workers, setWorkers] = useState<WorkerEntry[]>([])
    const [loadingWorkers, setLoadingWorkers] = useState(false)
    const [semana, setSemana] = useState(() => { try { return localStorage.getItem('ea_active_semana') ?? '' } catch { return '' } })
    const [values, setValues] = useState<Record<string, { retiradas: string; comerciales: string; porcentaje: string }>>(() => {
      // Restore from localStorage on first render
      try {
        const activeSemana = localStorage.getItem('ea_active_semana') ?? ''
        if (!activeSemana) return {}
        const stored = localStorage.getItem(`ea_layla_vals_${activeSemana}`)
        return stored ? JSON.parse(stored) : {}
      } catch { return {} }
    })
    const [publishing, setPublishing] = useState(false)
    const [publishedOk, setPublishedOk] = useState(false)
    const [agentNameMap, setAgentNameMap] = useState<Record<string,string>>({})
    const [agentIdMap, setAgentIdMap] = useState<Record<string,string>>({})

    // Persist values to localStorage whenever they change (keyed by semana)
    useEffect(() => {
      if (!semana) return
      try { localStorage.setItem(`ea_layla_vals_${semana}`, JSON.stringify(values)) } catch {}
    }, [values, semana])

    useEffect(() => {
      if (!open || workers.length > 0) return
      setLoadingWorkers(true)
      const activeSemana = (() => { try { return localStorage.getItem('ea_active_semana') ?? '' } catch { return '' } })()
      Promise.all([
        supabase.from('worker_entries').select('*').eq('app_name', 'Layla'),
        supabase.from('profiles').select('agent_name, colider_name, agent_code').or('is_agent.eq.true,is_colider.eq.true'),
        // Load already-published salaries for the current semana to prefill inputs
        activeSemana
          ? supabase.from('published_salaries').select('user_id,diamantes,extras').eq('app_name', 'Layla').eq('semana', activeSemana)
          : Promise.resolve({ data: [] }),
      ]).then(([{ data: workerData }, { data: agentData }, { data: pubData }]) => {
        const workerList = (workerData ?? []) as WorkerEntry[]
        setWorkers(workerList)
        const am: Record<string,string> = Object.fromEntries(
          ((agentData ?? []) as any[]).filter((a: any) => a.agent_code).map((a: any) => [a.agent_code, a.agent_name ?? a.colider_name ?? a.agent_code])
        )
        setAgentNameMap(am)
        if (activeSemana) setSemana(activeSemana)

        // Build a map from published_salaries: user_id → {retiradas, comerciales, porcentaje}
        const pubMap: Record<string, { retiradas: string; comerciales: string; porcentaje: string }> = {}
        for (const row of (pubData ?? []) as any[]) {
          pubMap[row.user_id] = {
            retiradas: String(row.diamantes ?? ''),
            comerciales: String((row.extras as any)?.monedas_comerciales ?? ''),
            porcentaje: String((row.extras as any)?.porcentaje_comision ?? ''),
          }
        }

        // Merge: localStorage values win, but fill missing entries from published_salaries
        if (Object.keys(pubMap).length > 0) {
          setValues(prev => {
            const lsKey = activeSemana ? `ea_layla_vals_${activeSemana}` : ''
            const stored: Record<string, any> = lsKey ? (() => { try { const s = localStorage.getItem(lsKey); return s ? JSON.parse(s) : {} } catch { return {} } })() : {}
            const merged = { ...prev }
            for (const w of workerList) {
              if (!merged[w.id] && pubMap[w.user_id]) {
                merged[w.id] = pubMap[w.user_id]
              }
            }
            return merged
          })
          setPublishedOk(true)
        }

        setLoadingWorkers(false)
      })
    }, [open])

    useEffect(() => {
      function onCierre() {
        // Get current semana before clearing
        const activeSemana = (() => { try { return localStorage.getItem('ea_active_semana') ?? '' } catch { return '' } })()
        setValues({})
        setPublishedOk(false)
        setSemana('')
        try { localStorage.removeItem('ea_nomina_layla_published') } catch {}
        try { localStorage.removeItem('ea_active_semana') } catch {}
        if (activeSemana) {
          try { localStorage.removeItem(`ea_layla_vals_${activeSemana}`) } catch {}
        }
      }
      window.addEventListener('ea_cierre_done', onCierre)
      return () => window.removeEventListener('ea_cierre_done', onCierre)
    }, [])

    function setField(id: string, field: 'retiradas' | 'comerciales' | 'porcentaje', val: string) {
      setValues(prev => ({ ...prev, [id]: { ...(prev[id] ?? { retiradas: '', comerciales: '', porcentaje: '' }), [field]: val } }))
    }

    function calcUSD(retiradas: string) {
      const n = parseFloat(retiradas) || 0
      return n / LAYLA_RATE
    }

    function calcCommission(comerciales: string, porcentaje: string) {
      const n = parseFloat(comerciales) || 0
      const pct = parseFloat(porcentaje) || 0
      return (n / LAYLA_RATE) * (pct / 100)
    }

    const totalUSD = workers.reduce((s, w) => s + calcUSD(values[w.id]?.retiradas ?? ''), 0)

    async function publicar() {


      setPublishing(true)
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

        // Build salary inserts for workers
        const salaryInserts = workers
          .map(w => {
            const v = values[w.id] ?? { retiradas: '0', comerciales: '0', porcentaje: '0' }
            const usd = calcUSD(v.retiradas)
            const monRetiradas = parseFloat(v.retiradas) || 0
            const monComerciales = parseFloat(v.comerciales) || 0
            const pct = parseFloat(v.porcentaje) || 0
            return { user_id: w.user_id, app_name: 'Layla', semana, usd, diamantes: monRetiradas, extras: { monedas_comerciales: monComerciales, porcentaje_comision: pct } }
          })

        // Build cobradas array for history
        const cobradas = workers
          .filter(w => calcUSD(values[w.id]?.retiradas ?? '') > 0)
          .map(w => {
            const v = values[w.id]
            const usd = calcUSD(v.retiradas)
            const monComerciales = parseFloat(v.comerciales) || 0
            const pct = parseFloat(v.porcentaje) || 0
            return {
              worker: { ...w, profile_email: '' },
              nomina: {
                uid: w.id_aplicacion ?? '',
                apodo: w.nombre_en_app ?? w.nombre_real ?? '',
                usd,
                diamantes: parseFloat(v.retiradas) || 0,
                semana,
                comision: calcCommission(v.comerciales, v.porcentaje),
                extras: { monedas_comerciales: monComerciales, porcentaje_comision: pct },
              },
            }
          })

        const noCobro = workers
          .filter(w => !(calcUSD(values[w.id]?.retiradas ?? '') > 0))
          .map(w => ({ worker: { ...w, profile_email: '' }, nomina: null }))

        const total_usd = salaryInserts.reduce((s, i) => s + i.usd, 0)
        const total_diamantes = salaryInserts.reduce((s, i) => s + i.diamantes, 0)

        // Publish salaries to workers
        const r1 = await fetch(`${apiBase}/api/publish-salaries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inserts: salaryInserts, app_name: 'Layla', semana,
            cobradas, noCobro, sinPerfil: [],
            total_usd, total_diamantes,
            file_name: `Layla-manual-${semana}`,
          }),
        })
        if (!r1.ok) {
          const e = await r1.json() as { error?: string }
          alert(`❌ Error al publicar salarios: ${e.error ?? r1.status}`)
          setPublishing(false); return
        }

        // Build agent commission inserts
        const agentMap: Record<string, { uid: string; nombre: string; salary_usd: number; commission_usd: number }[]> = {}
        for (const w of workers) {
          const agente = w.agente
          if (!agente) continue
          // Skip agent's own worker account — no commission for self
          if (agentIdMap[agente] && w.user_id === agentIdMap[agente]) continue
          const v = values[w.id] ?? { retiradas: '0', comerciales: '0', porcentaje: '0' }
          const commission = calcCommission(v.comerciales, v.porcentaje)
          if (commission <= 0) continue
          if (!agentMap[agente]) agentMap[agente] = []
          agentMap[agente].push({
            uid: w.user_id ?? '',
            nombre: w.nombre_en_app ?? w.nombre_real ?? '',
            salary_usd: calcUSD(v.retiradas),
            commission_usd: commission,
          })
        }

        const agentInserts = Object.entries(agentMap).map(([name, wkrs]) => ({
          agent_user_id: null as string | null,
          agent_name: name,
          app_name: 'Layla',
          semana,
          total_commission_usd: wkrs.reduce((s, wk) => s + wk.commission_usd, 0),
          workers_data: wkrs,
        }))

        if (agentInserts.length > 0) {
          const r2 = await fetch(`${apiBase}/api/publish-agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inserts: agentInserts }),
          })
          if (!r2.ok) {
            const e = await r2.json() as { error?: string }
            alert(`❌ Error al publicar comisiones de agentes: ${e.error ?? r2.status}`)
          }
        }

        setPublishedOk(true)
        try { const _pls2 = JSON.parse(localStorage.getItem('ea_nomina_layla_published') || 'false'); void _pls2 } catch {} 
        localStorage.setItem('ea_nomina_layla_published', 'true')
      } catch (e: unknown) {
        alert(`❌ Error: ${e instanceof Error ? e.message : 'Error de red'}`)
      }
      setPublishing(false)
    }

    return (
      <div className="rounded-2xl border border-pink-500/30 bg-[#0a0a1a] overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-pink-500/5 transition-colors">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${publishedOk ? 'bg-green-400' : 'bg-pink-400/40'}`} />
            <span className="font-extrabold text-lg tracking-tight">Layla</span>
            <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-lg font-bold">Entrada manual</span>
            {publishedOk && <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-lg border border-green-500/20">✓ Publicado</span>}
          </div>
          <div className="flex items-center gap-2">
            {open ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
          </div>
        </button>

        {/* Content */}
        {open && (
          <div className="border-t border-pink-500/10 p-5 space-y-5">
            {/* Conversion note */}
            <div className="flex items-center gap-2 text-white/25 text-xs">
              <span>📐</span>
              <span>15,500 monedas = $1.00 USD · Escribe el % de comisión de agente por cada chica</span>
            </div>

            {/* Workers */}
            {loadingWorkers ? (
              <div className="flex items-center justify-center gap-3 text-white/30 py-10">
                <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando trabajadoras...</span>
              </div>
            ) : workers.length === 0 ? (
              <div className="text-white/25 text-sm text-center py-10">No hay trabajadoras registradas en Layla.</div>
            ) : (
              <div className="space-y-3">
                {workers.map(w => {
                  const v = values[w.id] ?? { retiradas: '', comerciales: '', porcentaje: '' }
                  const usd = calcUSD(v.retiradas)
                  const comm = calcCommission(v.comerciales, v.porcentaje)
                  const nombre = w.nombre_en_app ?? w.nombre_real ?? '—'
                  return (
                    <div key={w.id} className="bg-[#0d0d1e] border border-pink-500/15 rounded-2xl p-4">
                      {/* Worker header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                          <span className="text-pink-300 font-extrabold text-sm">{nombre[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{nombre}</p>
                          {w.agente && <p className="text-white/30 text-xs">Agente: {agentNameMap[w.agente] ?? w.agente}</p>}
                        </div>
                        {usd > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-green-400 font-extrabold text-sm">${usd.toFixed(2)} USD</p>
                            {comm > 0 && (
                              <p className="text-amber-400/70 text-xs">
                                Com. agente ({v.porcentaje || '0'}%): ${comm.toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Input fields */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-white/40 text-xs font-semibold mb-1.5 block">💎 Monedas retiradas</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={v.retiradas}
                            onChange={e => setField(w.id, 'retiradas', e.target.value)}
                            className="w-full bg-[#13132a] border border-purple-500/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-pink-500/40 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-white/40 text-xs font-semibold mb-1.5 block">🪙 Monedas comerciales</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={v.comerciales}
                            onChange={e => setField(w.id, 'comerciales', e.target.value)}
                            className="w-full bg-[#13132a] border border-purple-500/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-pink-500/40 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-white/40 text-xs font-semibold mb-1.5 block">📊 % Comisión agente</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="0"
                              value={v.porcentaje}
                              onChange={e => setField(w.id, 'porcentaje', e.target.value)}
                              className="w-full bg-[#13132a] border border-amber-500/30 rounded-xl px-3 py-2.5 text-amber-300 text-sm placeholder:text-white/15 focus:outline-none focus:border-amber-500/60 transition-colors pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 text-xs font-bold pointer-events-none">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Summary + Publish button */}
            {workers.length > 0 && (
              <div className="bg-[#0d0d1e] border border-pink-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-0.5">Total a publicar</p>
                  <p className="text-green-400 font-extrabold text-2xl">${totalUSD.toFixed(2)} <span className="text-base font-bold">USD</span></p>
                  <p className="text-white/20 text-xs mt-0.5">15,500 monedas = $1.00</p>
                </div>
                <button
                  onClick={publicar}
                  disabled={publishing}
                  className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-pink-900/30 text-sm">
                  {publishing
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publicando...</>
                    : publishedOk
                    ? '✓ Publicado'
                    : '🚀 Publicar resultados'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  
function AppNominaSection({ app, reloadKey, exchangeRates = {} }: { app: 'Waha' | 'Layla' | 'Howdy'; reloadKey: number; exchangeRates?: Record<string,number> }) {
  const color = APP_COLORS[app]

  // Accordion open state — default closed, persists user's explicit choice
  const [sectionOpen, setSectionOpen] = useState<boolean>(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('ea_nomina_open_prefs') || '{}')
      return prefs[app] === true
    } catch { return false }
  })

  function persistOpen(val: boolean) {
    try {
      const prefs = JSON.parse(localStorage.getItem('ea_nomina_open_prefs') || '{}')
      prefs[app] = val
      localStorage.setItem('ea_nomina_open_prefs', JSON.stringify(prefs))
    } catch {}
  }

  // Per-app state
  const [step, setStep] = useState<'upload' | 'configuring' | 'results'>('upload')
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [aiColDetect, setAiColDetect] = useState<string | null>(null)
  const [cobradas, setCobradas] = useState<Matched[]>([])
  const [noCobro, setNoCobro] = useState<NoCobro[]>([])
  const [sinPerfil, setSinPerfil] = useState<NominaRow[]>([])
  const [semana, setSemana] = useState('')
  const [fileName, setFileName] = useState('')
  const [tab, setTab] = useState<'cobradas' | 'nocobro' | 'sinperfil'>('cobradas')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedOk, setPublishedOk] = useState(false)
  const [publishingAgents, setPublishingAgents] = useState(false)
  const [agentPublishOk, setAgentPublishOk] = useState(false)
  const [commissionPct, setCommissionPct] = useState<number>(() => { try { return parseFloat(localStorage.getItem(`ea_comm_pct_${app}`) ?? '10') || 10 } catch { return 10 } })
    const [savedColConfig, setSavedColConfig] = useState<ColConfig | null>(() => { try { const s = localStorage.getItem(`ea_col_cfg_${app}`); return s ? JSON.parse(s) as ColConfig : null } catch { return null } })
    const [pendingHeaders, setPendingHeaders] = useState<string[]>([])
    const [pendingRaw, setPendingRaw] = useState<unknown[][]>([])
    const [pendingFileName, setPendingFileName] = useState('')
    const [wizardCfg, setWizardCfg] = useState<ColConfig>({ uid: -1, usd: -1, apodo: -1, semana: -1, metric: -1, metricLabel: 'Diamantes', currency: 'USD' })
    const [wizardLoading, setWizardLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [paidMarks, setPaidMarks] = useState<Set<string>>(new Set())
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null)
  const [coliderMarks, setColiderMarks] = useState<Set<string>>(new Set())
  const [refreshingMarks, setRefreshingMarks] = useState(false)

  // Filter states
  const [fPais, setFPais] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_pais`) ?? '' } catch { return '' } })
  const [fPago, setFPago] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_pago`) ?? '' } catch { return '' } })
  const [fEmail, setFEmail] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_email`) ?? '' } catch { return '' } })
  const [fBilletera, setFBilletera] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_billetera`) ?? '' } catch { return '' } })
  const [fAgente, setFAgente] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_agente`) ?? '' } catch { return '' } })
  const [agentNameMap, setAgentNameMap] = useState<Record<string,string>>({})
  const [agentIdMap, setAgentIdMap] = useState<Record<string,string>>({})
  const [agentPhoneMap, setAgentPhoneMap] = useState<Record<string,string>>({})
  const [fNombreReal, setFNombreReal] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_nombrereal`) ?? '' } catch { return '' } })
  const [fNombreApp, setFNombreApp] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_nombreapp`) ?? '' } catch { return '' } })
  const [fIdApp, setFIdApp] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_idapp`) ?? '' } catch { return '' } })
  const [fTelefono, setFTelefono] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_telefono`) ?? '' } catch { return '' } })
  const [fSortDir, setFSortDir] = useState<'desc'|'asc'>(() => { try { return (localStorage.getItem(`ea_nf_${app}_sortdir`) as 'desc'|'asc') || 'desc' } catch { return 'desc' } })

  // Load from localStorage on mount (fast path) with Supabase fallback for reliability
  useEffect(() => {
    async function loadSavedNomina() {
      try {
        const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
        const s = all[app]
        if (s && (s.cobradas?.length > 0 || s.noCobro?.length > 0 || s.sinPerfil?.length > 0)) {
          setCobradas(s.cobradas)
          setNoCobro(s.noCobro ?? [])
          setSinPerfil(s.sinPerfil ?? [])
          setSemana(s.semana ?? '')
          setFileName(s.fileName ?? '')
          if (s.aiSummary) setAiSummary(s.aiSummary)
          if (s.publishedOk) setPublishedOk(true)
          setStep('results')
          // (do NOT force open — respect user's saved preference)
          // Background check: if cierre was done, clear stale data
          void (async () => {
            try {
              const _ab = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
              const _rb = await fetch(`${_ab}/api/nomina-state?app=${encodeURIComponent(app)}`)
              if (_rb.ok) {
                const { entry: _eb } = await _rb.json() as { entry: { rows_data?: { cobradas?: unknown[]; noCobro?: unknown[]; sinPerfil?: unknown[] }; published?: boolean; created_at?: string } | null }
                // Check if a cierre was done after this nomina entry was saved
                const _cierreTs = (() => { try { return parseInt(localStorage.getItem('ea_cierre_done_ts') ?? '0') || 0 } catch { return 0 } })()
                const _entryTs = _eb?.created_at ? new Date(_eb.created_at).getTime() : 0
                const _cierreWasDone = _cierreTs > 0 && _entryTs <= _cierreTs
                if (!_eb || _cierreWasDone || (_eb as any).was_closed || (!_eb.rows_data?.cobradas?.length && !_eb.rows_data?.noCobro?.length && !_eb.rows_data?.sinPerfil?.length)) {
                  try { const _a = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}'); delete _a[app]; localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(_a)) } catch {}
                  setCobradas([]); setNoCobro([]); setSinPerfil([])
                  setSemana(''); setFileName(''); setAiSummary(null)
                  setPublishedOk(false); setStep('upload')
                } else if (_eb.published) {
                  setPublishedOk(true)
                }
              }
            } catch {}
          })()
          return
        }
      } catch {}
      // Fallback: load latest entry from API server (uses service role → bypasses RLS)
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
        const r = await fetch(`${apiBase}/api/nomina-state?app=${encodeURIComponent(app)}`)
        if (r.ok) {
          const { entry } = await r.json() as { entry: { app_name: string; semana: string; rows_data: { cobradas: Matched[]; noCobro: NoCobro[]; sinPerfil: NominaRow[] }; file_name?: string; published?: boolean } | null }
          if (!(entry as any)?.was_closed && entry?.rows_data && (entry.rows_data.cobradas?.length > 0 || entry.rows_data.noCobro?.length > 0 || entry.rows_data.sinPerfil?.length > 0)) {
            setCobradas(entry.rows_data.cobradas)
            setNoCobro(entry.rows_data.noCobro ?? [])
            setSinPerfil(entry.rows_data.sinPerfil ?? [])
            setSemana(entry.semana ?? '')
            setFileName(entry.file_name ?? '')
            if (entry.published) setPublishedOk(true)
            setStep('results')
            // (do NOT force open — respect user's saved preference)
            try {
              const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
              all[app] = { cobradas: entry.rows_data.cobradas, noCobro: entry.rows_data.noCobro ?? [], sinPerfil: entry.rows_data.sinPerfil ?? [], semana: entry.semana, aiSummary: null, fileName: entry.file_name ?? '', publishedOk: entry.published ?? false }
              localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(all))
            } catch {}
            return
          }
        }
      } catch {}
    }
    loadSavedNomina()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, reloadKey])

  // Auto-save whenever results change
  useEffect(() => {
    if (step !== 'results' || cobradas.length === 0) return
    try {
      const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
      all[app] = { cobradas, noCobro, sinPerfil, semana, aiSummary, fileName }
      localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(all))
    } catch {}
  }, [step, cobradas, noCobro, sinPerfil, semana, aiSummary, fileName, app])

  // Reset when cierre semanal is done
  useEffect(() => {
    function onCierre() {
      setCobradas([]); setNoCobro([]); setSinPerfil([])
      setSemana(''); setFileName(''); setAiSummary(null)
      setPublishedOk(false); setAgentPublishOk(false); setStep('upload'); setSectionOpen(false); persistOpen(false)
      try {
        const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
        delete all[app]
        localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(all))
      } catch {}
      try { localStorage.removeItem('ea_active_semana') } catch {}
    }
    window.addEventListener('ea_cierre_done', onCierre)
    return () => window.removeEventListener('ea_cierre_done', onCierre)
  }, [app])

  // Persist filter prefs
  useEffect(() => {
    try {
      localStorage.setItem(`ea_nf_${app}_pais`, fPais)
      localStorage.setItem(`ea_nf_${app}_pago`, fPago)
      localStorage.setItem(`ea_nf_${app}_email`, fEmail)
      localStorage.setItem(`ea_nf_${app}_billetera`, fBilletera)
      localStorage.setItem(`ea_nf_${app}_agente`, fAgente)
      localStorage.setItem(`ea_nf_${app}_nombrereal`, fNombreReal)
      localStorage.setItem(`ea_nf_${app}_nombreapp`, fNombreApp)
      localStorage.setItem(`ea_nf_${app}_idapp`, fIdApp)
      localStorage.setItem(`ea_nf_${app}_telefono`, fTelefono)
      localStorage.setItem(`ea_nf_${app}_sortdir`, fSortDir)
    } catch {}
  }, [fPais, fPago, fEmail, fBilletera, fAgente, fNombreReal, fNombreApp, fIdApp, fTelefono, fSortDir, app])

  // Load paidMarks + coliderMarks — callable for manual refresh
  const refreshMarks = useCallback(async () => {
    if (!semana || !app) { setPaidMarks(new Set()); setColiderMarks(new Set()); return }
    setRefreshingMarks(true)
    const _apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
    const [adminRes, marksJson] = await Promise.all([
      fetch(`${_apiBase}/api/admin-paid-marks?app_name=${encodeURIComponent(app)}&semana=${encodeURIComponent(semana)}`).then(r => r.json()).catch(() => ({ uids: [] })),
      fetch(`${_apiBase}/api/colider/marks?semana=${encodeURIComponent(semana)}`).then(r => r.json()).catch(() => ({ marks: [] })),
    ])
    setPaidMarks(new Set<string>((adminRes.uids ?? []) as string[]))
    setColiderMarks(new Set<string>(
      ((marksJson.marks ?? []) as any[]).filter((m: any) => m.paid && m.person_app === app).map((m: any) => m.person_uid as string)
    ))
    setRefreshingMarks(false)
  }, [semana, app])
  useEffect(() => { refreshMarks() }, [refreshMarks])

  // ▶ FIX: Persist aiSummary to localStorage once Groq async response arrives
  useEffect(() => {
    if (!aiSummary) return
    try {
      const _aiCache = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
      if (_aiCache[app]) { _aiCache[app].aiSummary = aiSummary; localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(_aiCache)) }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSummary])

  function toggleExpanded(key: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function exportarPDF() {
    const html = buildPDF(semana, cobradas, noCobro, sinPerfil, aiSummary, agentNameMap)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  async function callGroq(matchedList: Matched[], noCobroList: NoCobro[], sem: string) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) return
    setAiLoading(true)
    try {
      const totalUSD = matchedList.reduce((s, m) => s + (m.nomina?.usd ?? 0), 0)
      const totalDia = matchedList.reduce((s, m) => s + (m.nomina?.diamantes ?? 0), 0)
      const paises = [...new Set(matchedList.map(m => m.worker.pais).filter(Boolean))]
      const top3 = matchedList.slice(0, 3).map(m => `${m.nomina?.apodo ?? ''} ($${(m.nomina?.usd ?? 0).toFixed(2)})`).join(', ')
      const prompt = `Eres asistente de Eclipse Angels Agency. Genera un resumen ejecutivo breve (máx 4 oraciones) de la nómina de la semana ${sem}. Datos: ${matchedList.length} chicas cobraron, total pagado $${totalUSD.toFixed(2)} USD, ${fmt(totalDia)} diamantes totales. Top 3: ${top3}. ${noCobroList.length} chicas no cobraron. Países activos: ${paises.join(', ')}. Sé directo y profesional.`
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 250 })
      })
      const data = await res.json()
      setAiSummary(data.choices?.[0]?.message?.content ?? null)
    } catch { /* ignore */ }
    setAiLoading(false)
  }

  async function publicarSalarios(notifyWorkers = true) {
      if (cobradas.length === 0) return
      setPublishing(true); setPublishedOk(false)
      const inserts = cobradas.map(({ worker: w, nomina: n }) => ({
        user_id: w.user_id,
        app_name: app,
        semana: n.semana,
        usd: n.usd,
        diamantes: n.diamantes,
        extras: n.extras,
      }))
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
        const r = await fetch(`${apiBase}/api/publish-salaries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inserts, app_name: app, semana, cobradas, noCobro, sinPerfil,
            total_usd: cobradas.reduce((s, m) => s + (m.nomina?.usd ?? 0), 0),
            total_diamantes: cobradas.reduce((s, m) => s + (m.nomina?.diamantes ?? 0), 0),
            file_name: fileName,
          }),
        })
        const result = await r.json() as { ok?: boolean; error?: string; saved?: number }
        if (!r.ok) { alert(`❌ Error al publicar salarios:\n${result.error ?? r.status}`); setPublishing(false); return }
        setPublishedOk(true)
        try { const _pls = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}'); if (_pls[app]) { _pls[app].publishedOk = true; localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(_pls)) } } catch {}
        // Stage agent commissions for admin review (fire-and-forget, no push to agents)
          publishAgentCommissions().catch(() => {})
        await Promise.all(cobradas.map(async ({ worker: w }) => {
          const { data: recs } = await supabase.from('published_salaries').select('id').eq('user_id', w.user_id).order('created_at', { ascending: false })
          if (recs && recs.length > 10) {
            const toDelete = (recs as {id:string}[]).slice(10).map(r => r.id)
            await supabase.from('published_salaries').delete().in('id', toDelete)
          }
        }))
      } catch (e: unknown) {
        alert(`❌ Error al publicar salarios: ${e instanceof Error ? e.message : 'Error de red'}`)
      }
      setPublishing(false)
    }
  
  async function publishAgentCommissions() {
      const agentMap: Record<string, { uid: string; nombre: string; salary_usd: number; commission_usd: number }[]> = {}
      for (const { worker: w, nomina: nm } of cobradas) {
        const agente = nm.agente ?? ((w as any).agente as string | null)
        if (!agente) continue
        // Skip agent's own worker account — no commission for self
        if (agentIdMap[agente] && w.user_id === agentIdMap[agente]) continue
        if (!agentMap[agente]) agentMap[agente] = []
        agentMap[agente].push({ uid: nm.uid, nombre: nm.apodo, salary_usd: nm.usd, commission_usd: nm.comision })
      }
      const agentNames = Object.keys(agentMap)
      if (agentNames.length === 0) {
        alert('⚠️ No se encontraron agentes en esta nómina. Verifica que el archivo tenga una columna de agente con nombres.')
        return
      }
      const sem = cobradas[0]?.nomina?.semana ?? ''
      const inserts = agentNames.map(name => ({
        agent_user_id: null as string | null,
        agent_name: name, app_name: app, semana: sem,
        total_commission_usd: agentMap[name].reduce((s, wk) => s + wk.commission_usd, 0),
        workers_data: agentMap[name],
      }))
      setPublishingAgents(true); setAgentPublishOk(false)
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
        const r = await fetch(`${apiBase}/api/publish-agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inserts }),
        })
        const result = await r.json() as { ok?: boolean; error?: string; saved?: number; agentUserIds?: string[] }
        if (!r.ok) { alert(`❌ Error al publicar comisiones:\n${result.error ?? r.status}`); setPublishingAgents(false); return }
        setAgentPublishOk(true)
        const agentUserIds = result.agentUserIds ?? []
      } catch (e: unknown) {
        alert(`❌ Error al publicar comisiones: ${e instanceof Error ? e.message : 'Error de red'}`)
      }
      setPublishingAgents(false)
    }
  
  async function getAIColumnSuggestions(headers: string[], appName: string): Promise<Partial<ColConfig>> {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
      if (!apiKey) return {}
      try {
        const prompt = [
          `You are an expert data analyst for a streaming platform payroll system. App: "${appName}".`,
          'Given these spreadsheet column headers (JSON array), identify the best 0-based column index for each field.',
          'Headers: ' + JSON.stringify(headers),
          'Return a JSON object with keys:',
          '- uid: column index for worker unique app ID/username (numeric or string IDs like host_id, user_id, UID, Host ID)',
          '- usd: column index for salary or earnings amount',
          '- apodo: column index for display name or nickname of the worker',
          '- semana: column index for week, period, or date',
          '- metric: column index for any engagement metric (points/coins/diamonds/gems). Use -1 if none exists.',
          '- metricLabel: natural Spanish label for the metric based on the column name (e.g. "Diamantes", "Monedas", "Coins", "Puntos"). Default "Diamantes".',
          '- currency: "USD" if salary column suggests US dollars (USD, $, dólar, dollar, salary, earning), "BRL" if Brazilian reais (BRL, R$, reais, real). Default "USD".',
          'Think carefully — column names may be in English, Spanish, Portuguese, or mixed. Use -1 for integer fields not found. Return ONLY valid JSON, no markdown.',
        ].join(' ')
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0 }),
        })
        const data = await res.json()
        const raw = data.choices?.[0]?.message?.content ?? '{}'
        const jsonStr = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim()
        return JSON.parse(jsonStr) as Partial<ColConfig>
      } catch { return {} }
    }

    async function applyColConfig(headers: string[], raw: unknown[][], cfg: ColConfig, fileName: string) {
      const { uid: uidCol, usd: usdCol, apodo: apodoCol, semana: semanaCol, metric: metricCol } = cfg
      if (uidCol < 0 || usdCol < 0) {
        setParseError('Necesitas configurar al menos la columna de ID de trabajadora y la de salario.')
        setStep('upload')
        setParsing(false)
        return
      }
      try {
        setParsing(true)
        // Save config for future uploads
        try { localStorage.setItem(`ea_col_cfg_${app}`, JSON.stringify(cfg)) } catch {}
        setSavedColConfig(cfg)
        setAiColDetect(null)

        const dataRows = (raw.slice(1) as unknown[][]).filter(r => r.length > 0)
        const mainCols = new Set([semanaCol, uidCol, apodoCol, usdCol, metricCol].filter(i => i >= 0))

        const nominaRows: NominaRow[] = dataRows.map(r => {
          const extras: Record<string, string | number> = {}
          headers.forEach((h, i) => { if (!mainCols.has(i) && h && r[i] !== undefined && r[i] !== null && r[i] !== '') extras[h] = r[i] as string | number })
          const usd = parseFloat(String(usdCol >= 0 ? (r[usdCol] ?? 0) : 0)) || 0
          return {
            uid: normalizeUID(uidCol >= 0 ? r[uidCol] : ''),
            apodo: String(apodoCol >= 0 ? (r[apodoCol] ?? '') : ''),
            usd,
            diamantes: parseFloat(String(metricCol >= 0 ? (r[metricCol] ?? 0) : 0)) || 0,
            comision: (app === 'Waha' || app === 'Howdy') ? usd * (commissionPct / 100) : usd * 0.10,
            semana: String(semanaCol >= 0 ? (r[semanaCol] ?? '') : isoWeekLabel()),
            agente: null,
            extras,
          }
        }).filter(r => r.uid !== '')

        if (nominaRows.length === 0) throw new Error('No se encontraron filas válidas. Verifica que el archivo tenga datos y que las columnas seleccionadas sean correctas.')

        const sem = nominaRows[0]?.semana || isoWeekLabel()
        setSemana(sem)
        try { localStorage.setItem('ea_active_semana', sem) } catch {}

        const { data: entries, error: entriesErr } = await supabase.from('worker_entries').select('*').eq('app_name', app)
        if (entriesErr) throw new Error('Error de base de datos: ' + entriesErr.message)

        const [{ data: profs }, { data: agentProfsNom }] = await Promise.all([
          supabase.from('profiles').select('id, email'),
          supabase.from('profiles').select('id, agent_name, colider_name, agent_code, phone, telefono').or('is_agent.eq.true,is_colider.eq.true'),
        ])
        const emailMap: Record<string, string> = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.email]))
        const am2: Record<string,string> = Object.fromEntries(
          ((agentProfsNom ?? []) as any[]).filter((a: any) => a.agent_code).map((a: any) => [a.agent_code, a.agent_name ?? a.colider_name ?? a.agent_code])
        )
        setAgentNameMap(am2)
        const idMap2: Record<string,string> = Object.fromEntries(
          ((agentProfsNom ?? []) as any[]).filter((a: any) => a.agent_code && a.id).map((a: any) => [a.agent_code as string, a.id as string])
        )
        setAgentIdMap(idMap2)
        const pm2: Record<string,string> = Object.fromEntries(
          ((agentProfsNom ?? []) as any[]).filter((a: any) => a.agent_code && (a.phone || a.telefono)).map((a: any) => [a.agent_code, String(a.phone || a.telefono)])
        )
        setAgentPhoneMap(pm2)
        const workers: WorkerRow[] = (entries ?? []).map((e: any) => ({ ...e, profile_email: emailMap[e.user_id] ?? '' }))

        const cobradasList: Matched[] = []
        const noCobroList: NoCobro[] = []
        const sinPerfilList: NominaRow[] = []
        const matchedWorkerIDs = new Set<string>()

        for (const nom of nominaRows) {
          const worker = workers.find(w => normalizeUID(w.id_aplicacion) === nom.uid)
          if (worker) {
            matchedWorkerIDs.add(worker.id)
            nom.usd > 0 ? cobradasList.push({ worker, nomina: nom }) : noCobroList.push({ worker, nomina: nom })
          } else { sinPerfilList.push(nom) }
        }
        for (const w of workers) { if (!matchedWorkerIDs.has(w.id)) noCobroList.push({ worker: w, nomina: null }) }
        cobradasList.sort((a, b) => b.nomina.usd - a.nomina.usd)

        setCobradas(cobradasList); setNoCobro(noCobroList); setSinPerfil(sinPerfilList)
        try {
          const _nomCache = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
          _nomCache[app] = { cobradas: cobradasList, noCobro: noCobroList, sinPerfil: sinPerfilList, semana: sem, fileName, aiSummary: null }
          localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(_nomCache))
        } catch {}
        loadPaidMarks(app, sem)
        try {
          const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
          await fetch(`${apiBase}/api/nomina-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app_name: app, semana: sem,
              total_usd: cobradasList.reduce((s, m) => s + (m.nomina?.usd ?? 0), 0),
              total_diamantes: cobradasList.reduce((s, m) => s + (m.nomina?.diamantes ?? 0), 0),
              cobradas: cobradasList, noCobro: noCobroList, sinPerfil: sinPerfilList, file_name: fileName,
            }),
          })
        } catch {}
        setStep('results'); setSectionOpen(true); persistOpen(true)
        callGroq(cobradasList, noCobroList, sem)
      } catch (err: any) {
        setParseError(err?.message ?? 'Error desconocido al procesar el archivo.')
      } finally {
        setParsing(false)
      }
    }

    async function processFile(file: File) {
        if (!file.name.match(/\.xlsx?$/i)) return
        setParsing(true); setAiSummary(null); setParseError(null)
        setFileName(file.name)
        try {
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
          const rawHeaders = (raw[0] as unknown[]) ?? []
          const headers = rawHeaders.map(h => String(h ?? '').trim())

          // ── Step 1: saved config valid for this file → use it directly ──
          const saved = savedColConfig
          const isValid = saved && saved.uid >= 0 && saved.uid < headers.length && saved.usd >= 0 && saved.usd < headers.length
          if (isValid && saved) {
            setParsing(false)
            await applyColConfig(headers, raw, saved, file.name)
            return
          }

          // ── Step 2: try smartCOL alias detection — Waha always passes here ──
          const COLUMN_ALIASES: [string, string[]][] = [
            ['UID del Host',      ['uid', 'host id', 'id del host', 'id host', 'host_id', 'userid', 'user id']],
            ['USD',               ['usd', 'host salary', 'salario en usd', 'dólar', 'dollar', 'monto', 'pago usd', 'ganancia', 'ingreso', 'earning']],
            ['Apodo',             ['name', 'nombre', 'apodo', 'nick', 'nickname', 'nombre en app', 'nombre_app', 'username']],
            ['Semana',            ['week', 'semana', 'periodo', 'período', 'date', 'fecha']],
            ['Diamantes Totales', ['total monedas', 'total diamante', 'diamante', 'diamond', 'gem', 'piedra', 'coins', 'moneda', 'total dia']],
          ]
          function smartCOL(canonical: string): number {
            const exact = headers.indexOf(canonical)
            if (exact !== -1) return exact
            const lower = canonical.toLowerCase()
            const ci = headers.findIndex(h => h.toLowerCase() === lower)
            if (ci !== -1) return ci
            const aliases = COLUMN_ALIASES.find(([c]) => c === canonical)
            if (aliases) {
              for (const kw of aliases[1]) {
                const idx = headers.findIndex(h => h.toLowerCase() === kw); if (idx !== -1) return idx
              }
              for (const kw of aliases[1]) {
                const idx = headers.findIndex(h => h.toLowerCase().includes(kw)); if (idx !== -1) return idx
              }
            }
            const words = lower.split(/\s+/)
            return headers.findIndex(h => { const hl = h.toLowerCase(); return words.every(w => hl.includes(w)) })
          }
          const uidAuto  = smartCOL('UID del Host')
          const usdAuto  = smartCOL('USD')
          if (uidAuto >= 0 && usdAuto >= 0) {
            // Auto-detected — save config and process directly (no wizard needed)
            const autoCfg: ColConfig = {
              uid: uidAuto, usd: usdAuto,
              apodo: smartCOL('Apodo'), semana: smartCOL('Semana'), metric: smartCOL('Diamantes Totales'),
              metricLabel: 'Diamantes', currency: 'USD',
            }
            setParsing(false)
            await applyColConfig(headers, raw, autoCfg, file.name)
            return
          }

          // ── Step 3: smartCOL failed → launch AI wizard ──
          setPendingHeaders(headers)
          setPendingRaw(raw)
          setPendingFileName(file.name)
          setParsing(false)
          setStep('configuring')
          setWizardLoading(true)
          const sugg = await getAIColumnSuggestions(headers, app)
          setWizardCfg({
            uid: typeof sugg.uid === 'number' ? sugg.uid : -1,
            usd: typeof sugg.usd === 'number' ? sugg.usd : -1,
            apodo: typeof sugg.apodo === 'number' ? sugg.apodo : -1,
            semana: typeof sugg.semana === 'number' ? sugg.semana : -1,
            metric: typeof sugg.metric === 'number' ? sugg.metric : -1,
            metricLabel: typeof sugg.metricLabel === 'string' && sugg.metricLabel ? sugg.metricLabel : 'Diamantes',
            currency: sugg.currency === 'BRL' ? 'BRL' : 'USD',
          })
          setWizardLoading(false)
        } catch (err: any) {
          setParseError(err?.message ?? 'Error desconocido al procesar el archivo.')
          setParsing(false)
        }
      }
    async function loadPaidMarks(a: string, week: string) {
    const _apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
    const res = await fetch(`${_apiUrl}/api/admin-paid-marks?app_name=${encodeURIComponent(a)}&semana=${encodeURIComponent(week)}`).then(r => r.json()).catch(() => ({ uids: [] }))
    setPaidMarks(new Set<string>((res.uids ?? []) as string[]))
  }

  async function togglePaid(uid: string) {
    setTogglingPaid(uid)
    const _apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
    const isNowPaid = !paidMarks.has(uid)
    try {
      const r = await fetch(`${_apiUrl}/api/admin-paid-marks/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: app, semana, uid, paid: isNowPaid }),
      })
      if (r.ok) {
        if (isNowPaid) {
          setPaidMarks(prev => new Set([...prev, uid]))
          try {
            const matched = (cobradas as any[]).find((c: any) => c?.nomina?.uid === uid || c?.worker?.id === uid)
            const nombre = matched ? (matched?.nomina?.apodo ?? matched?.worker?.profile_email ?? uid) : uid
            await fetch(`${_apiUrl}/api/payment-sticker`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, app_name: app, nombre_en_app: nombre, sticker_index: 0 }) })
          } catch {}
        } else {
          setPaidMarks(prev => { const s = new Set(prev); s.delete(uid); return s })
        }
      }
    } catch {}
    setTogglingPaid(null)
  }

  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }
  function onInput(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) processFile(f) }

  function reset() {
    try { const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}'); delete all[app]; localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(all)) } catch {}
    setStep('upload'); setSemana(''); setCobradas([]); setNoCobro([]); setSinPerfil([])
    setExpanded(new Set()); setAiSummary(null); setPublishedOk(false); setPaidMarks(new Set()); setFileName('')
  }

  // saveNominaToHistory: now handled by /api/publish-salaries (service role, bypasses RLS)
  async function saveNominaToHistory() { /* handled by API server */ }

  // Derived values
  const totalUSD = cobradas.reduce((s, m) => s + (m.nomina?.usd ?? 0), 0)
  const totalDiamonds = cobradas.reduce((s, m) => s + (m.nomina?.diamantes ?? 0), 0)
  const cobradasFiltered = cobradas.filter(({ worker: w }) => {
    if (fPais && w.pais !== fPais) return false
    if (fPago && w.metodo_pago !== fPago) return false
    if (fEmail && !w.profile_email.toLowerCase().includes(fEmail.toLowerCase())) return false
    if (fBilletera && !(w.billetera ?? '').toLowerCase().includes(fBilletera.toLowerCase())) return false
    if (fAgente && !(w.agente ?? '').toLowerCase().includes(fAgente.toLowerCase())) return false
    if (fNombreReal && !(w.nombre_real ?? '').toLowerCase().includes(fNombreReal.toLowerCase())) return false
    if (fNombreApp && !(w.nombre_en_app ?? '').toLowerCase().includes(fNombreApp.toLowerCase())) return false
    if (fIdApp && !(w.id_aplicacion ?? '').toLowerCase().includes(fIdApp.toLowerCase())) return false
    if (fTelefono && !(w.telefono ?? '').toLowerCase().includes(fTelefono.toLowerCase())) return false
    return true
  }).sort((a, b) => { const _s1 = new Set(Object.values(agentIdMap)); const da = _s1.has(a.worker.user_id)?1:0, db = _s1.has(b.worker.user_id)?1:0; if(da!==db)return da-db; return fSortDir==='desc'?(b.nomina?.usd??0)-(a.nomina?.usd??0):(a.nomina?.usd??0)-(b.nomina?.usd??0); })
  const nfHasFilters = !!(fPais || fPago || fEmail || fBilletera || fAgente || fNombreReal || fNombreApp || fIdApp || fTelefono)
  function clearNominaFilters() { setFPais(''); setFPago(''); setFEmail(''); setFBilletera(''); setFAgente(''); setFNombreReal(''); setFNombreApp(''); setFIdApp(''); setFTelefono('') }
  const _agentUids = new Set(Object.values(agentIdMap))

  return (
    <div className={`border rounded-2xl overflow-hidden ${sectionOpen ? color.border : 'border-purple-500/10'} bg-[#0a0a18] transition-all`}>
      {/* ── Accordion header ── */}
      <button
        onClick={() => { const next = !sectionOpen; setSectionOpen(next); persistOpen(next) }}
        className={`w-full flex items-center justify-between px-5 py-4 transition-all ${sectionOpen ? color.accent : 'hover:bg-white/3'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${step === 'results' && cobradas.length > 0 ? 'bg-green-400' : 'bg-white/15'}`} />
          <span className="font-extrabold text-lg tracking-tight">{app}</span>
          {step === 'results' && cobradas.length > 0 && (
            <span className="text-xs text-white/60 font-normal hidden sm:inline">
              {cobradas.length} cobraron · ${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
            </span>
          )}
          {step === 'upload' && (
            <span className="text-xs text-white/30 font-normal">Sin nómina cargada</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step === 'results' && cobradas.length > 0 && !sectionOpen && (
            <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-0.5 rounded-full font-semibold border border-green-500/20">✓ Lista</span>
          )}
          {sectionOpen ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
        </div>
      </button>

      {/* ── Accordion content ── */}
      {sectionOpen && (
        <div className="border-t border-purple-500/10">
          {/* ── Upload zone ── */}
          {step === 'upload' && (
            <div className="p-5 space-y-4">
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                onDrop={onDrop} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/20 bg-[#0d0d1e] hover:border-purple-500/40 hover:bg-purple-500/5'}`}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInput} />
                {parseError && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left">
                    <p className="text-red-400 font-bold text-sm mb-1">❌ Error al procesar el archivo</p>
                    <pre className="text-red-300/70 text-xs whitespace-pre-wrap">{parseError}</pre>
                    <p className="text-white/30 text-xs mt-2">Verifica que el Excel sea de {app} y tenga las columnas correctas.</p>
                  </div>
                )}
                {aiColDetect && !parseError && (
                  <div className="mb-4 bg-purple-500/10 border border-purple-500/25 rounded-xl p-3 text-left">
                    <p className="text-purple-300 text-xs font-semibold">{aiColDetect}</p>
                  </div>
                )}
                {parsing ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-white/50 text-sm">Procesando nómina...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg mb-1">Sube la nómina de {app}</p>
                      <p className="text-white/40 text-sm">Arrastra el Excel aquí, o haz clic para seleccionar</p>
                      <p className="text-white/25 text-xs mt-2">.xlsx / .xls</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


            {/* ── Column Config Wizard ── */}
            {step === 'configuring' && (
              <div className="p-5">
                <div className="bg-[#0d0d1e] border border-purple-500/25 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base">Configurar columnas de la nómina</p>
                      <p className="text-white/40 text-xs mt-0.5">Archivo: {pendingFileName} · {pendingHeaders.length} columnas detectadas</p>
                    </div>
                  </div>
                  {wizardLoading ? (
                    <div className="flex items-center gap-3 bg-purple-500/10 rounded-xl px-4 py-3">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <p className="text-purple-300 text-sm">La IA está analizando las columnas del archivo...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">1. ID de la trabajadora en la app</span>
                          <span className="text-red-400 text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded-full">Obligatorio</span>
                        </div>
                        <p className="text-white/40 text-xs">Columna con el identificador único de cada trabajadora en la plataforma</p>
                        <select value={wizardCfg.uid} onChange={e => setWizardCfg(c => ({ ...c, uid: parseInt(e.target.value) }))}
                          className="w-full bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                          <option value={-1}>— Seleccionar columna —</option>
                          {pendingHeaders.map((h, i) => <option key={i} value={i}>[col {i}] {h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">2. Salario / Ganancias</span>
                          <span className="text-red-400 text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded-full">Obligatorio</span>
                        </div>
                        <p className="text-white/40 text-xs">Columna con el monto ganado por cada trabajadora</p>
                        <select value={wizardCfg.usd} onChange={e => setWizardCfg(c => ({ ...c, usd: parseInt(e.target.value) }))}
                          className="w-full bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                          <option value={-1}>— Seleccionar columna —</option>
                          {pendingHeaders.map((h, i) => <option key={i} value={i}>[col {i}] {h}</option>)}
                        </select>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-white/50 text-xs shrink-0">¿En qué moneda?</span>
                          {(['USD', 'BRL'] as const).map(cur => (
                            <button key={cur} onClick={() => setWizardCfg(c => ({ ...c, currency: cur }))}
                              className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${wizardCfg.currency === cur ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                              {cur === 'USD' ? '$ USD' : 'R$ BRL'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-semibold">3. Nombre / Apodo</span>
                          <button onClick={() => setWizardCfg(c => ({ ...c, apodo: -1 }))} className="text-white/30 text-xs hover:text-white/60 transition-colors">Saltar →</button>
                        </div>
                        <select value={wizardCfg.apodo} onChange={e => setWizardCfg(c => ({ ...c, apodo: parseInt(e.target.value) }))}
                          className="w-full bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                          <option value={-1}>No aplica / Saltar</option>
                          {pendingHeaders.map((h, i) => <option key={i} value={i}>[col {i}] {h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-semibold">4. Semana / Periodo</span>
                          <button onClick={() => setWizardCfg(c => ({ ...c, semana: -1 }))} className="text-white/30 text-xs hover:text-white/60 transition-colors">Saltar →</button>
                        </div>
                        <select value={wizardCfg.semana} onChange={e => setWizardCfg(c => ({ ...c, semana: parseInt(e.target.value) }))}
                          className="w-full bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                          <option value={-1}>No aplica / Saltar (usará semana actual)</option>
                          {pendingHeaders.map((h, i) => <option key={i} value={i}>[col {i}] {h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-semibold">5. Puntos / Métrica adicional</span>
                          <button onClick={() => setWizardCfg(c => ({ ...c, metric: -1 }))} className="text-white/30 text-xs hover:text-white/60 transition-colors">Saltar →</button>
                        </div>
                        <p className="text-white/40 text-xs">Diamantes, monedas, coins u otra métrica de la app (opcional)</p>
                        <select value={wizardCfg.metric} onChange={e => setWizardCfg(c => ({ ...c, metric: parseInt(e.target.value) }))}
                          className="w-full bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400">
                          <option value={-1}>No aplica / Saltar</option>
                          {pendingHeaders.map((h, i) => <option key={i} value={i}>[col {i}] {h}</option>)}
                        </select>
                        {wizardCfg.metric >= 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/50 text-xs shrink-0">¿Cómo llamar a esta métrica?</span>
                            <input type="text" value={wizardCfg.metricLabel}
                              onChange={e => setWizardCfg(c => ({ ...c, metricLabel: e.target.value || 'Diamantes' }))}
                              placeholder="Ej: Diamantes, Monedas, Coins..."
                              className="flex-1 bg-[#0a0a18] border border-purple-500/20 text-white text-sm rounded-xl px-3 py-1.5 outline-none focus:border-purple-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <button
                          onClick={async () => {
                            if (wizardCfg.uid < 0 || wizardCfg.usd < 0) { setParseError('Selecciona al menos la columna de ID y la de salario.'); return }
                            setParseError(null)
                            await applyColConfig(pendingHeaders, pendingRaw, wizardCfg, pendingFileName)
                          }}
                          disabled={wizardCfg.uid < 0 || wizardCfg.usd < 0}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
                          ✓ Confirmar y procesar nómina
                        </button>
                        <button onClick={() => { setStep('upload'); setParseError(null) }}
                          className="text-white/40 hover:text-white/70 text-sm px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all">
                          Cancelar
                        </button>
                      </div>
                      {parseError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-red-400 text-sm">{parseError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          {/* ── Results ── */}
          {step === 'results' && (
            <>
              {/* Action buttons row */}
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 flex-wrap">
                {publishedOk && (
                  <span className="flex items-center gap-1.5 text-green-400 text-sm font-bold bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20">
                    ✓ Publicado
                  </span>
                )}
                <button
                  onClick={async () => { await publicarSalarios(true) }}
                  disabled={publishing || cobradas.length === 0}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
                  {publishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {publishing ? 'Publicando...' : '📋 Publicar Nómina'}
                </button>
                <button onClick={exportarPDF}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
                <button onClick={reset}
                  className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                  <Upload className="w-4 h-4" /> {publishedOk ? '➕ Agregar otro lote' : 'Nueva nómina'}
                </button>
                <button
                    onClick={() => { try { localStorage.removeItem(`ea_col_cfg_${app}`) } catch {} setSavedColConfig(null) }}
                    title="Reconfigurar columnas de la nómina"
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/70 text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                    ⚙ Columnas
                  </button>
                  {(app === 'Waha' || app === 'Howdy') && (
                  <div className="flex items-center gap-1.5 ml-auto bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="text-white/50 text-xs font-semibold whitespace-nowrap">% Comisión agentes:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionPct}
                      onChange={e => {
                        const v = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        setCommissionPct(v)
                        try { localStorage.setItem(`ea_comm_pct_${app}`, String(v)) } catch {}
                      }}
                      className="w-14 bg-transparent text-white text-sm font-bold text-center outline-none border-b border-purple-400/40 focus:border-purple-400"
                    />
                    <span className="text-purple-400/70 text-xs font-bold">%</span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-6">
                {/* AI summary */}
                {(aiLoading || aiSummary) && (
                  <div className="bg-[#0d0d1e] border border-purple-500/25 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      {aiLoading ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div>
                      <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">Análisis IA</p>
                      {aiLoading ? <p className="text-white/40 text-sm animate-pulse">Generando resumen...</p>
                        : <p className="text-white/75 text-sm leading-relaxed">{aiSummary}</p>}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: <TrendingUp className="w-4 h-4" />, label: 'Total pagado', value: `$${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, color: 'text-green-400' },
                    { icon: <Gem className="w-4 h-4" />, label: 'Diamantes', value: fmt(totalDiamonds), color: 'text-purple-400' },
                    { icon: <Users className="w-4 h-4" />, label: 'Cobraron', value: String(cobradas.length), color: 'text-blue-400' },
                    { icon: <UserX className="w-4 h-4" />, label: 'No cobraron', value: String(noCobro.length), color: 'text-orange-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-4">
                      <div className={`flex items-center gap-2 mb-1 ${s.color}`}>{s.icon}<span className="text-xs font-semibold uppercase tracking-wide opacity-80">{s.label}</span></div>
                      <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl bg-[#0d0d1e] border border-purple-500/10 p-1 w-fit gap-1 flex-wrap">
                  <TabBtn active={tab === 'cobradas'}  color="bg-green-600"  onClick={() => setTab('cobradas')}>✓ Cobraron ({cobradas.length})</TabBtn>
                  <TabBtn active={tab === 'nocobro'}   color="bg-orange-600" onClick={() => setTab('nocobro')}>No cobraron ({noCobro.length})</TabBtn>
                  <TabBtn active={tab === 'sinperfil'} color="bg-yellow-600" onClick={() => setTab('sinperfil')}>Sin perfil ({sinPerfil.length})</TabBtn>
                </div>

                {/* Cobradas tab */}
                {tab === 'cobradas' && (
                  <div className="space-y-4">
                    <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-white/70">Filtros</span>
                        <span className="ml-1 text-xs text-white/30">{cobradasFiltered.length}/{cobradas.length}</span>
                        <button onClick={() => setFSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                          className="flex items-center gap-1 text-xs text-white/35 hover:text-white transition-colors ml-2">
                          {fSortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />} Salario
                        </button>
                        {nfHasFilters && (
                          <button onClick={clearNominaFilters} className="ml-auto flex items-center gap-1 text-xs text-white/35 hover:text-white transition-colors">
                            <X className="w-3 h-3" /> Limpiar
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-white/40 mb-1">País</label>
                          <select value={fPais} onChange={e => setFPais(e.target.value)}
                            className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                            {COUNTRIES.map(c => <option key={c} value={c}>{c || 'Todos'}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Método de pago</label>
                          <select value={fPago} onChange={e => setFPago(e.target.value)}
                            className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m || 'Todos'}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Nombre real</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fNombreReal} onChange={e => setFNombreReal(e.target.value)} placeholder="Nombre real..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Nombre en app</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fNombreApp} onChange={e => setFNombreApp(e.target.value)} placeholder="Nickname en app..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">ID en app</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fIdApp} onChange={e => setFIdApp(e.target.value)} placeholder="ID de cuenta..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Email</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="correo@..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Teléfono</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fTelefono} onChange={e => setFTelefono(e.target.value)} placeholder="Número..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Billetera</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fBilletera} onChange={e => setFBilletera(e.target.value)} placeholder="Buscar billetera..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-white/40 mb-1">Agente</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input type="text" value={fAgente} onChange={e => setFAgente(e.target.value)} placeholder="Nombre del agente..."
                              className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment progress bars */}
                    {cobradas.length > 0 && (() => {
                      const efWorkers = cobradas.filter(({ worker: w }) => (w.metodo_pago ?? '').toLowerCase().includes('efectivo'))
                      const agWorkers = cobradas.filter(({ worker: w }) => !(w.metodo_pago ?? '').toLowerCase().includes('efectivo'))
                      const efPaid = efWorkers.filter(({ worker: w }) => coliderMarks.has(w.user_id)).length
                      const agPaid = agWorkers.filter(({ worker: w, nomina: n }) => paidMarks.has(n.uid)).length
                      return (<>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/30 font-medium">Estado de pagos esta semana</span>
                          <button onClick={() => refreshMarks()} disabled={refreshingMarks}
                            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50">
                            <svg className={`w-3 h-3 ${refreshingMarks ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            {refreshingMarks ? 'Actualizando…' : 'Actualizar'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                          {efWorkers.length > 0 && (
                            <div className="bg-[#0d0d1e] border border-teal-500/15 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">💵 Cólider — efectivo</span>
                                <span className="text-xs font-bold text-teal-400">{efPaid}/{efWorkers.length}</span>
                              </div>
                              <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
                                <div className="bg-teal-400 h-2 rounded-full transition-all duration-500" style={{ width: `${efWorkers.length > 0 ? Math.round((efPaid/efWorkers.length)*100) : 0}%` }} />
                              </div>
                            </div>
                          )}
                          {agWorkers.length > 0 && (
                            <div className="bg-[#0d0d1e] border border-green-500/15 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-green-300 uppercase tracking-wider">🏦 Agencia — transferencias</span>
                                <span className="text-xs font-bold text-green-400">{agPaid}/{agWorkers.length}</span>
                              </div>
                              <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
                                <div className="bg-green-400 h-2 rounded-full transition-all duration-500" style={{ width: `${agWorkers.length > 0 ? Math.round((agPaid/agWorkers.length)*100) : 0}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </>)
                    })()}
                    {cobradasFiltered.length === 0 && cobradas.length > 0 && <Empty msg="No hay resultados con los filtros aplicados." />}
                    {cobradas.length === 0 && <Empty msg="Ninguna chica cobró o no se encontraron coincidencias." />}
                    {cobradasFiltered.map(({ worker: w, nomina: n }, _cfIdx) => {
                      const _isDual = _agentUids.has(w.user_id)
                      const _prevIsDual = _cfIdx>0 && _agentUids.has(cobradasFiltered[_cfIdx-1].worker.user_id)
                      const _showPureHdr = !_isDual && _cfIdx===0 && cobradasFiltered.some(x=>_agentUids.has(x.worker.user_id))
                      const _showDualHdr = _isDual && !_prevIsDual
                      const cardOpen = expanded.has(n.uid)
                      const waNum = [w.codigo_pais, w.telefono].filter(Boolean).join('').replace(/\D/g, '')
                      const waLink = waNum ? `https://wa.me/${waNum}` : null
                      return (<>
                        {_showPureHdr&&<p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/50 pb-2">👩 Trabajadoras</p>}
                        {_showDualHdr&&<p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/50 pb-2 pt-3">🔗 Agente + Trabajadora</p>}
                        <div key={n.uid} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden ${ (w.metodo_pago ?? '').toLowerCase().includes('efectivo') ? (coliderMarks.has(w.user_id) ? 'border-teal-500/30' : 'border-amber-500/15') : 'border-purple-500/10' }`}>
                          <div className="px-5 py-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300 font-extrabold text-sm shrink-0">W</div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-base leading-tight">{n.apodo}</p>
                                  {(w.metodo_pago ?? '').toLowerCase().includes('efectivo')
                                      ? (coliderMarks.has(w.user_id)
                                          ? <span title="Pagado por cólider ✓" className="text-xs bg-teal-500/15 border border-teal-500/30 text-teal-300 px-1.5 py-0.5 rounded-full font-bold select-none shrink-0">✓ Cólider</span>
                                          : <span title="Pendiente de pago por cólider" className="text-xs bg-amber-500/8 border border-amber-500/20 text-amber-400/70 px-1.5 py-0.5 rounded-full font-medium select-none shrink-0">⏳ Cólider</span>
                                        )
                                      : <button
                                          onClick={() => togglePaid(n.uid)}
                                          disabled={togglingPaid === n.uid}
                                          title={paidMarks.has(n.uid) ? 'Quitar marca de pagado' : 'Marcar como pagado'}
                                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${paidMarks.has(n.uid) ? 'bg-green-500 border-green-500 text-white' : 'border-white/25 text-transparent hover:border-green-400/60'}`}>
                                          <Check className="w-3 h-3" />
                                        </button>
                                    }
                                </div>
                                {w.nombre_real && <p className="text-white/40 text-xs mt-0.5">{w.nombre_real}</p>}
                                <p className="text-white/30 text-xs mt-0.5">{w.profile_email}</p>
                                {waLink ? (
                                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors">
                                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    {w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono}
                                  </a>
                                ) : (w.telefono && <p className="text-white/30 text-xs mt-0.5">{w.codigo_pais ? `${w.codigo_pais} ${w.telefono}` : w.telefono}</p>)}
                                {w.agente && agentPhoneMap[w.agente] && (() => {
                                  const agPh = agentPhoneMap[w.agente!]
                                  const agPhClean = agPh.replace(/\D/g, '')
                                  const agWa = agPhClean ? `https://wa.me/${agPhClean}` : null
                                  return (
                                    <div className="mt-1.5">
                                      <p className="text-white/25 text-[10px] mb-0.5">Número de agente</p>
                                      {agWa ? (
                                        <a href={agWa} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                          {agPh}
                                        </a>
                                      ) : <p className="text-white/40 text-xs">{agPh}</p>}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-extrabold text-green-400">{`$${(n?.usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Gem className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-purple-300 text-sm font-semibold">{fmt(n?.diamantes ?? 0)}</span>
                              </div>
                                {(w.metodo_pago === 'Efectivo (Cuba)' || w.metodo_pago === 'Transferencia Bancaria (Cuba)') && (() => {
                                  const rk = w.metodo_pago === 'Efectivo (Cuba)' ? 'efectivo_worker' : 'transferencia_worker'
                                  const rate = exchangeRates[rk] ?? 0
                                  if (!rate || !n?.usd) return null
                                  return <p className="text-amber-400 text-xs font-bold mt-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg">{((n.usd ?? 0) * rate).toLocaleString('es-ES', {maximumFractionDigits: 0})} {w.metodo_pago === 'Efectivo (Cuba)' ? '💵 Ef.' : '🏦 Transf.'}</p>
                                })()}
                            </div>
                          </div>
                          <div className="px-5 pb-4 border-t border-purple-500/8">
                            <p className="text-white/25 text-xs font-semibold uppercase tracking-wider mb-2.5 pt-3">Datos del perfil</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                              {([['UID en app', w.id_aplicacion],['País', w.pais],['Método de pago', w.metodo_pago],['Billetera', w.billetera],['Agente', agentNameMap[w.agente ?? ''] ?? w.agente]] as [string,string|null][]).map(([label, val]) => (
                                <div key={label}><p className="text-white/30 text-xs mb-0.5">{label}</p><CopyBtn value={val} /></div>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => toggleExpanded(n.uid)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-purple-500/8 text-xs font-semibold text-white/35 hover:text-purple-300 hover:bg-purple-500/5 transition-all">
                            {cardOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles de nómina</> : <><ChevronDown className="w-3.5 h-3.5" />Ver todos los campos de nómina</>}
                          </button>
                          {cardOpen && (
                            <div className="px-5 pb-5 border-t border-purple-500/8">
                              <p className="text-white/25 text-xs font-semibold uppercase tracking-wider mb-2.5 pt-3">Todos los campos de la nómina</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                {Object.entries(n.extras).map(([key, val]) => (
                                  <div key={key}><p className="text-white/30 text-xs mb-0.5">{key}</p><CopyBtn value={String(val)} /></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        </>
                      )
                    })}
                  </div>
                )}

                {/* No cobro tab */}
                {tab === 'nocobro' && (
                  <div className="space-y-3">
                    {noCobro.length === 0 && <Empty msg="¡Todas las chicas registradas cobraron esta semana!" />}
                    {noCobro.map(({ worker: w, nomina: n }, _ncIdx) => {
                      const _ncIsDual = _agentUids.has(w.user_id)
                      const _ncPrevDual = _ncIdx>0 && _agentUids.has(noCobro[_ncIdx-1].worker.user_id)
                      const _ncShowPure = !_ncIsDual && _ncIdx===0 && noCobro.some(x=>_agentUids.has(x.worker.user_id))
                      const _ncShowDual = _ncIsDual && !_ncPrevDual
                      const key = n ? n.uid : 'db_' + w.id
                      const ncOpen = expanded.has('nc_' + key)
                      const ncWaNum = [w.codigo_pais, w.telefono].filter(Boolean).join('').replace(/\D/g, '')
                      const ncWaLink = ncWaNum ? `https://wa.me/${ncWaNum}` : null
                      return (
                        <>
                        {_ncShowPure&&<p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/50 pb-2">👩 Trabajadoras</p>}
                        {_ncShowDual&&<p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/50 pb-2 pt-3">🔗 Agente + Trabajadora</p>}
                        <div key={key} className="bg-[#0d0d1e] border border-orange-500/20 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                              <UserX className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="font-bold text-sm">{n?.apodo || w.nombre_en_app || w.nombre_real || 'Sin nombre'}</p>
                                  {w.nombre_real && <p className="text-white/40 text-xs">{w.nombre_real}</p>}
                                  <p className="text-white/30 text-xs mt-0.5">{w.profile_email}</p>
                                  {ncWaLink ? (
                                    <a href={ncWaLink} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors">
                                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                      {w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono}
                                    </a>
                                  ) : (w.telefono ? <p className="text-white/30 text-xs mt-0.5">{w.codigo_pais ? `${w.codigo_pais} ${w.telefono}` : w.telefono}</p> : null)}
                                </div>
                                <span className="text-orange-400/70 text-xs font-semibold shrink-0 pt-0.5">No cobró</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                {([['ID en app', w.id_aplicacion],['País', w.pais],['Método de pago', w.metodo_pago],['Agente', agentNameMap[w.agente ?? ''] ?? w.agente]] as [string,string|null][]).map(([label, val]) => (
                                  <div key={label}><p className="text-white/25 text-xs mb-0.5">{label}</p><CopyBtn value={val} /></div>
                                ))}
                              </div>
                            </div>
                          </div>
                          {n && (
                            <>
                              <button onClick={() => toggleExpanded('nc_' + key)}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-orange-500/10 text-xs font-semibold text-white/35 hover:text-orange-300 hover:bg-orange-500/5 transition-all">
                                {ncOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar campos de nómina</> : <><ChevronDown className="w-3.5 h-3.5" />Ver campos de nómina</>}
                              </button>
                              {ncOpen && (
                                <div className="px-5 pb-5 border-t border-orange-500/10">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-3">
                                    {Object.entries(n.extras).map(([k, v]) => (
                                      <div key={k}><p className="text-white/30 text-xs mb-0.5">{k}</p><CopyBtn value={String(v)} /></div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        </>
                      )
                    })}
                  </div>
                )}

                {/* Sin perfil tab */}
                {tab === 'sinperfil' && (
                  <div className="space-y-3">
                    {sinPerfil.length === 0 && <Empty msg="Todas las chicas de la nómina tienen perfil en el sistema." />}
                    {sinPerfil.map(n => {
                      const spOpen = expanded.has('sp_' + n.uid)
                      return (
                        <div key={n.uid} className="bg-[#0d0d1e] border border-yellow-500/20 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">{n.apodo}</p>
                                <p className="text-white/30 text-xs mt-0.5">UID: {n.uid}</p>
                                <p className="text-yellow-400/60 text-xs mt-0.5">Sin perfil registrado</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-extrabold text-green-400">${(n?.usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Gem className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-purple-300 text-sm font-semibold">{fmt(n?.diamantes ?? 0)}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => toggleExpanded('sp_' + n.uid)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-yellow-500/10 text-xs font-semibold text-white/35 hover:text-yellow-300 hover:bg-yellow-500/5 transition-all">
                            {spOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles</> : <><ChevronDown className="w-3.5 h-3.5" />Ver todos los campos de nómina</>}
                          </button>
                          {spOpen && (
                            <div className="px-5 pb-5 border-t border-yellow-500/10">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-3">
                                {Object.entries(n.extras).map(([k, v]) => (
                                  <div key={k}><p className="text-white/30 text-xs mb-0.5">{k}</p><CopyBtn value={String(v)} /></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Parent component ──────────────────────────────────────────────────────────

  // ── Colider Admin Section ──────────────────────────────────────────────────

  
  export default function Nomina() {
  const { user, profile, loading } = useAuth()
  const [, navigate] = useLocation()
  const [historyView, setHistoryView] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilterSemana, setHistoryFilterSemana] = useState('')
  const [historyFilterApp, setHistoryFilterApp] = useState('')
  const [deletingHistId, setDeletingHistId] = useState<string | null>(null)
  // Used to signal each section to reload from localStorage (e.g. after loading history)
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({ Waha: 0, Layla: 0, Howdy: 0 })
  const [nominaRates, setNominaRates] = useState<Record<string,number>>({})
  const [nominaRateInputs, setNominaRateInputs] = useState<Record<string,string>>(() => { try { const s = localStorage.getItem('ea_cambio_drafts'); return s ? JSON.parse(s) : {} } catch { return {} } })
  const [nominaSavingRate, setNominaSavingRate] = useState<string|null>(null)
  const [nominaRateSaved, setNominaRateSaved] = useState<string|null>(null)
  const [showCambio, setShowCambio] = useState(false)
    const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/,'')
    const [showPersonalizado, setShowPersonalizado] = useState(false)
    const [customRates, setCustomRates] = useState<CustomWorkerRate[]>([])
    const [allWorkers, setAllWorkers] = useState<{user_id:string;app_name:string;nombre_en_app:string|null;nombre_real:string|null;metodo_pago:string|null;telefono:string|null;codigo_pais:string|null;id_aplicacion:string|null}[]>([])
    const [workerSearch, setWorkerSearch] = useState('')
    const [filterPhone, setFilterPhone] = useState('')
    const [filterId, setFilterId] = useState('')
    const [loadingCustom, setLoadingCustom] = useState(false)
    const [setupNeeded, setSetupNeeded] = useState(false)
    const [savingCustomKey, setSavingCustomKey] = useState<string|null>(null)
    const [customInputs, setCustomInputs] = useState<Record<string,{ef:string,tr:string}>>({})
      const [agentColiderMap, setAgentColiderMap] = useState<Record<string, {is_agent: boolean; is_colider: boolean}>>({})

  if (!loading && user && profile !== undefined && !profile?.is_admin) navigate('/perfil')

  if (loading) return <SplashLoader msg="Cargando..." />
  if (!profile?.is_admin) return <SplashLoader msg="Sin acceso" />

  useEffect(() => {
    supabase.from('exchange_rates').select('*').then(({ data }) => {
      const r: Record<string,number> = {}
      for (const row of (data ?? []) as {id:string;rate:number}[]) { r[row.id] = row.rate }
      setNominaRates(r)
    })
    const clearHandler = () => {
      setNominaRates({})
      // Also wipe the exclusive-rate UI so admin doesn't see stale rates from the closed semana
      setCustomRates([])
      setCustomInputs({})
    }
    window.addEventListener('ea_rates_cleared', clearHandler)
    return () => window.removeEventListener('ea_rates_cleared', clearHandler)
  }, [])

  async function publishNominaRate(id: string) {
    const isPublished = (nominaRates[id] ?? 0) > 0
    if (isPublished) {
      setNominaSavingRate(id)
      await supabase.from('exchange_rates').upsert({ id, rate: 0, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      setNominaRates(prev => ({ ...prev, [id]: 0 }))
      setNominaSavingRate(null); setNominaRateSaved(id); setTimeout(() => setNominaRateSaved(null), 3000)
      return
    }
    const rate = parseFloat(nominaRateInputs[id] || '0')
    if (isNaN(rate) || rate <= 0) return
    setNominaSavingRate(id)
    await supabase.from('exchange_rates').upsert({ id, rate, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    setNominaRates(prev => ({ ...prev, [id]: rate }))
    if (id === 'efectivo_worker') {
      const { data } = await supabase.from('worker_entries').select('user_id').eq('metodo_pago', 'Efectivo (Cuba)')
      const ids = [...new Set(((data ?? []) as {user_id:string}[]).map(w => w.user_id).filter(Boolean))]
      if (ids.length > 0) sendPushViaApi(ids, '💱 Cambio Efectivo actualizado', `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar — entra a ver tu salario.`, '/salarios', true)
    } else if (id === 'transferencia_worker') {
      const { data } = await supabase.from('worker_entries').select('user_id').eq('metodo_pago', 'Transferencia Bancaria (Cuba)')
      const ids = [...new Set(((data ?? []) as {user_id:string}[]).map(w => w.user_id).filter(Boolean))]
      if (ids.length > 0) sendPushViaApi(ids, '💱 Cambio Transferencia actualizado', `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar — entra a ver tu salario.`, '/salarios', true)
    } else {
      const { data } = await supabase.from('profiles').select('id').eq('is_agent', true)
      const ids = ((data ?? []) as {id:string}[]).map(p => p.id)
      const label = id === 'efectivo_agent' ? 'Efectivo' : 'Transferencia'
      if (ids.length > 0) sendPushViaApi(ids, `💱 Cambio ${label} para agentes actualizado`, `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar.`, '/agente', true)
    }
    setNominaSavingRate(null); setNominaRateSaved(id); setTimeout(() => setNominaRateSaved(null), 3000)
  }

  async function loadCustomRates() {
      setLoadingCustom(true)
      setSetupNeeded(false)
      try {
        const [workersRes, ratesRes] = await Promise.all([
          fetch(API_URL + '/api/admin/all-workers').then(r => r.json()).catch(() => ({ workers: [] })),
          fetch(API_URL + '/api/admin/custom-worker-rates').then(r => r.json()).catch(() => ({ rates: [], setup_needed: true }))
        ])
        if (ratesRes.setup_needed) { setSetupNeeded(true); setLoadingCustom(false); return }
        const workers = (workersRes.workers ?? []) as {user_id:string;app_name:string;nombre_en_app:string|null;nombre_real:string|null;metodo_pago:string|null;telefono:string|null;codigo_pais:string|null;id_aplicacion:string|null}[]
        const { data: agentProfs } = await supabase.from('profiles').select('id,is_agent,is_colider').or('is_agent.eq.true,is_colider.eq.true')
          const acMap: Record<string, {is_agent: boolean; is_colider: boolean}> = {}
          for (const p of ((agentProfs ?? []) as {id:string; is_agent: boolean; is_colider: boolean}[])) {
            acMap[p.id] = { is_agent: !!p.is_agent, is_colider: !!p.is_colider }
          }
          setAgentColiderMap(acMap)
          setAllWorkers(workers)
        // Only keep rates that are actually active (non-zero) — filters out ghost records
        // from deleted users and rows left over from a previous cierre with rate=0
        const activeRates = ((ratesRes.rates ?? []) as CustomWorkerRate[]).filter(
          r => r.efectivo_rate > 0 || r.transferencia_rate > 0
        )
        setCustomRates(activeRates)
        const inputs: Record<string,{ef:string,tr:string}> = {}
        for (const r of activeRates) {
          const k = r.user_id + '::' + r.app_name
          inputs[k] = { ef: r.efectivo_rate > 0 ? String(r.efectivo_rate) : '', tr: r.transferencia_rate > 0 ? String(r.transferencia_rate) : '' }
        }
        setCustomInputs(inputs)
      } catch (e) { console.error(e) }
      setLoadingCustom(false)
    }

    async function saveCustomRate(userId: string, appName: string, nombreEnApp: string | null) {
      const k = userId + '::' + appName
      const inp = customInputs[k] ?? { ef: '', tr: '' }
      const ef = parseFloat(inp.ef) || 0
      const tr = parseFloat(inp.tr) || 0
      setSavingCustomKey(k)
      try {
        const res = await fetch(API_URL + '/api/admin/custom-worker-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, app_name: appName, nombre_en_app: nombreEnApp, efectivo_rate: ef, transferencia_rate: tr })
        })
        const data = await res.json()
        if (data.setup_needed) { setSetupNeeded(true) } else { await loadCustomRates() }
      } catch {}
      setSavingCustomKey(null)
    }

    async function deleteCustomRate(userId: string, appName: string) {
      const k = userId + '::' + appName
      setSavingCustomKey(k)
      try {
        await fetch(API_URL + '/api/admin/custom-worker-rates?user_id=' + encodeURIComponent(userId) + '&app_name=' + encodeURIComponent(appName), { method: 'DELETE' })
        await loadCustomRates()
      } catch {}
      setSavingCustomKey(null)
    }

    async function fetchHistory() {
    setHistoryLoading(true)
    const { data } = await supabase
      .from('nomina_history')
      .select('id,app_name,semana,total_usd,total_diamantes,cobradas_count,nocobro_count,sinperfil_count,published,created_at,rows_data,file_name')
      .order('created_at', { ascending: false })
    setHistory((data ?? []) as HistoryEntry[])
    setHistoryLoading(false)
  }

  function loadFromHistory(entry: HistoryEntry) {
    try {
      const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
      all[entry.app_name] = {
        cobradas: entry.rows_data.cobradas ?? [],
        noCobro: entry.rows_data.noCobro ?? [],
        sinPerfil: entry.rows_data.sinPerfil ?? [],
        semana: entry.semana,
        fileName: entry.file_name ?? '',
        aiSummary: null,
      }
      localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(all))
    } catch {}
    setReloadKeys(prev => ({ ...prev, [entry.app_name]: (prev[entry.app_name] ?? 0) + 1 }))
    setHistoryView(false)
  }

  async function deleteFromHistory(id: string) {
    setDeletingHistId(id)
    await supabase.from('nomina_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
    setDeletingHistId(null)
  }

  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-3 py-1 mb-3">
            <FileSpreadsheet className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Admin · Nómina</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>

              <h1 className="text-2xl font-extrabold">{historyView ? 'Historial de Nóminas' : 'Nómina Semanal'}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!historyView && (
                <button onClick={() => { setHistoryView(true); fetchHistory() }}
                  className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                  📁 Historial
                </button>
              )}
              {historyView && (
                <button onClick={() => setHistoryView(false)}
                  className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                  ← Volver
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 💱 Tipo de Cambio Cuba */}
        {!historyView && (
          <div className="bg-[#0d0d1e] border border-green-500/15 rounded-2xl overflow-hidden mb-4">
            <button onClick={() => setShowCambio(prev => !prev)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-green-500/5 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">💱</span>
                <span className="text-green-300 text-sm font-bold">Tipo de Cambio Cuba</span>
                {(nominaRates['efectivo_worker'] > 0 || nominaRates['transferencia_worker'] > 0 || nominaRates['efectivo_agent'] > 0 || nominaRates['transferencia_agent'] > 0) && (
                  <span className="text-xs bg-green-500/15 border border-green-500/25 text-green-300 px-2 py-0.5 rounded-full">Publicado</span>
                )}
              </div>
              <span className="text-white/30 text-xs">{showCambio ? '▲ Cerrar' : '▼ Editar'}</span>
            </button>
            {showCambio && (
              <div className="border-t border-green-500/10 p-5 space-y-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70 mb-3">💜 Para Trabajadoras</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { id: 'efectivo_worker' as const, label: 'Efectivo Cuba', color: 'amber' },
                      { id: 'transferencia_worker' as const, label: 'Transferencia Cuba', color: 'blue' },
                    ]).map(({ id, label, color }) => (
                      <div key={id} className="bg-black/20 border border-white/10 rounded-xl p-4">
                        <p className="text-white/60 text-xs font-bold mb-1">{label}</p>
                        <p className="text-white/25 text-xs mb-2">Actual: <span className="text-white/50 font-semibold">{(nominaRates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                        <div className="flex gap-2">
                          <input type="number" min="0" step="any" value={nominaRateInputs[id] ?? ''}
                            onChange={e => setNominaRateInputs(prev => { const next = { ...prev, [id]: e.target.value }; try { localStorage.setItem('ea_cambio_drafts', JSON.stringify(next)) } catch {} return next })}
                            placeholder="Ej: 400"
                            className="flex-1 bg-[#07070f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                          <button onClick={() => publishNominaRate(id)} disabled={nominaSavingRate === id}
                            className={`shrink-0 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${nominaRateSaved === id ? 'bg-green-600' : (nominaRates[id] ?? 0) > 0 ? 'bg-rose-700 hover:bg-rose-600' : color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            {nominaRateSaved === id ? '✓' : nominaSavingRate === id ? '...' : (nominaRates[id] ?? 0) > 0 ? 'Despublicar' : 'Publicar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-3">🧡 Para Agentes</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { id: 'efectivo_agent' as const, label: 'Efectivo Cuba', color: 'amber' },
                      { id: 'transferencia_agent' as const, label: 'Transferencia Cuba', color: 'blue' },
                    ]).map(({ id, label, color }) => (
                      <div key={id} className="bg-black/20 border border-white/10 rounded-xl p-4">
                        <p className="text-white/60 text-xs font-bold mb-1">{label}</p>
                        <p className="text-white/25 text-xs mb-2">Actual: <span className="text-white/50 font-semibold">{(nominaRates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                        <div className="flex gap-2">
                          <input type="number" min="0" step="any" value={nominaRateInputs[id] ?? ''}
                            onChange={e => setNominaRateInputs(prev => { const next = { ...prev, [id]: e.target.value }; try { localStorage.setItem('ea_cambio_drafts', JSON.stringify(next)) } catch {} return next })}
                            placeholder="Ej: 400"
                            className="flex-1 bg-[#07070f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                          <button onClick={() => publishNominaRate(id)} disabled={nominaSavingRate === id}
                            className={`shrink-0 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${nominaRateSaved === id ? 'bg-green-600' : (nominaRates[id] ?? 0) > 0 ? 'bg-rose-700 hover:bg-rose-600' : color === 'amber' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            {nominaRateSaved === id ? '✓' : nominaSavingRate === id ? '...' : (nominaRates[id] ?? 0) > 0 ? 'Despublicar' : 'Publicar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🎯 Cambio Personalizado */}
          {!historyView && (
            <div className="bg-[#0d0d1e] border border-violet-500/20 rounded-2xl overflow-hidden mb-4">
              <button
                onClick={() => { if (!showPersonalizado) { loadCustomRates() } setShowPersonalizado(prev => !prev) }}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-violet-500/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <span className="text-violet-300 text-sm font-bold">Cambio Personalizado por Trabajadora</span>
                  {customRates.length > 0 && (
                    <span className="text-xs bg-violet-500/15 border border-violet-500/25 text-violet-300 px-2 py-0.5 rounded-full">
                      {customRates.length} asignado{customRates.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="text-white/30 text-xs">{showPersonalizado ? '▲ Cerrar' : '▼ Editar'}</span>
              </button>

              {showPersonalizado && (
                <div className="border-t border-violet-500/10 p-5">
                  <p className="text-white/40 text-xs mb-4 leading-relaxed">
                      Asigna un tipo de cambio exclusivo a trabajadoras o a agentes/coliders que también son streamers. Ese cambio reemplaza el global solo para ellos — lo verán en sus salarios. Para agentes y coliders, este cambio aplica únicamente a su salario como trabajadora, NO a sus comisiones.
                    </p>

                  {setupNeeded && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-4">
                      <p className="text-rose-300 text-xs font-bold mb-1">⚠️ Tabla no creada en Supabase</p>
                      <p className="text-rose-200/70 text-xs mb-3">Ejecuta este SQL en el Editor SQL de Supabase y presiona Reintentar:</p>
                      <pre className="bg-black/40 rounded-lg p-3 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap select-all">{`CREATE TABLE IF NOT EXISTS custom_worker_rates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    app_name text NOT NULL,
    nombre_en_app text,
    efectivo_rate numeric(10,2) NOT NULL DEFAULT 0,
    transferencia_rate numeric(10,2) NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, app_name)
  );
  ALTER TABLE custom_worker_rates ENABLE ROW LEVEL SECURITY;`}</pre>
                      <button onClick={loadCustomRates} className="mt-3 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition-all">Reintentar</button>
                    </div>
                  )}

                  {loadingCustom && (
                    <div className="flex items-center gap-2 text-white/40 text-sm py-6 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /><span>Cargando...</span>
                    </div>
                  )}

                  {!loadingCustom && !setupNeeded && (
                    <div className="space-y-3">
                      {/* 3 filtros */}
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                          <input type="text" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)}
                            placeholder="🔍 Buscar por nombre real o nombre en app..."
                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                          />
                          {workerSearch && (
                            <button onClick={() => setWorkerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                              <X className="w-3.5 h-3.5 text-white/30 hover:text-white/70" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={filterId} onChange={e => setFilterId(e.target.value)}
                            placeholder="ID de aplicación..."
                            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                          />
                          <input type="text" value={filterPhone} onChange={e => setFilterPhone(e.target.value)}
                            placeholder="Teléfono..."
                            className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                          />
                        </div>
                      </div>

                      {customRates.length > 0 && (
                        <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                          <p className="text-violet-300 text-xs font-bold mb-2">📋 Cambios activos</p>
                          <div className="space-y-1">
                            {customRates.map(cr => (
                              <div key={cr.user_id + '::' + cr.app_name} className="flex items-center justify-between text-xs">
                                <span className="text-white/60">{cr.nombre_en_app ?? cr.user_id} <span className="text-violet-400/60">· {cr.app_name}</span></span>
                                <div className="flex items-center gap-2">
                                  {cr.efectivo_rate > 0 && <span className="text-amber-400 font-bold">Ef: {cr.efectivo_rate.toLocaleString('es-ES')}</span>}
                                  {cr.transferencia_rate > 0 && <span className="text-blue-400 font-bold">Tr: {cr.transferencia_rate.toLocaleString('es-ES')}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const srch = workerSearch.toLowerCase()
                        const idF  = filterId.toLowerCase()
                        const phF  = filterPhone.toLowerCase()

                        const groups: Record<string, typeof allWorkers> = {}
                        for (const w of allWorkers) {
                          if (!groups[w.user_id]) groups[w.user_id] = []
                          groups[w.user_id].push(w)
                        }

                        const filteredGroups = Object.values(groups).filter(group =>
                          group.some(w =>
                            (!srch || (w.nombre_en_app ?? '').toLowerCase().includes(srch) || (w.nombre_real ?? '').toLowerCase().includes(srch) || w.app_name.toLowerCase().includes(srch)) &&
                            (!idF  || (w.id_aplicacion ?? '').toLowerCase().includes(idF)) &&
                            (!phF  || (w.telefono ?? '').toLowerCase().includes(phF))
                          )
                        ).sort((a, b) => (a[0].nombre_real ?? '').localeCompare(b[0].nombre_real ?? ''))

                        if (filteredGroups.length === 0) return (
                          <p className="text-white/30 text-sm text-center py-6">
                            {(srch || idF || phF) ? 'No se encontraron trabajadoras con ese criterio.' : 'No hay trabajadoras registradas aún.'}
                          </p>
                        )

                        return filteredGroups.map(group => {
                          const uid       = group[0].user_id
                          const nomReal   = group[0].nombre_real
                          const tel       = group[0].telefono
                          const pais      = group[0].codigo_pais ?? ''
                          const waPhone   = tel ? (pais + tel.replace(/\D/g, '')) : null

                          return (
                            <div key={uid} className="bg-black/20 border border-white/8 rounded-xl p-3 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white/80 text-sm font-semibold">{nomReal ?? '—'}</span>
                                  {agentColiderMap[uid]?.is_agent && (
                                    <span className="text-xs bg-amber-500/15 border border-amber-500/25 text-amber-300 px-1.5 py-0.5 rounded font-bold tracking-wide">AGENTE+TRABAJADORA</span>
                                  )}
                                  {agentColiderMap[uid]?.is_colider && (
                                    <span className="text-xs bg-blue-500/15 border border-blue-500/25 text-blue-300 px-1.5 py-0.5 rounded font-bold tracking-wide">COLIDER+TRABAJADORA</span>
                                  )}
                                  {tel && (
                                    <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-green-400 hover:text-green-300 underline">
                                      📱 {tel}
                                    </a>
                                  )}
                                </div>
                                {(agentColiderMap[uid]?.is_agent || agentColiderMap[uid]?.is_colider) && (
                                  <p className="text-amber-400/70 text-xs leading-relaxed bg-amber-500/5 border border-amber-500/15 rounded-lg px-2 py-1.5">⚠️ Este cambio aplica <strong>solo a su salario como trabajadora</strong>, no a sus comisiones de agente/colider.</p>
                                )}
                              {group.map(w => {
                                const k        = w.user_id + '::' + w.app_name
                                const existing = customRates.find(r => r.user_id === w.user_id && r.app_name === w.app_name)
                                const inp      = customInputs[k] ?? { ef: '', tr: '' }
                                const isSaving = savingCustomKey === k
                                return (
                                  <div key={k} className="border-t border-white/5 pt-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded font-semibold">{w.app_name}</span>
                                        {w.nombre_en_app && <span className="text-white/60 text-xs">{w.nombre_en_app}</span>}
                                        {w.id_aplicacion && <span className="text-white/35 text-xs font-mono">#{w.id_aplicacion}</span>}
                                        {existing && <span className="text-xs text-violet-300/60">· personalizado</span>}
                                      </div>
                                      {existing && (
                                        <button onClick={() => deleteCustomRate(w.user_id, w.app_name)} disabled={isSaving}
                                          className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors disabled:opacity-40 px-2 py-0.5 rounded hover:bg-rose-500/10">
                                          Borrar
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-amber-400/70 text-xs font-bold mb-1">💵 Efectivo CUP</p>
                                        <input type="number" min="0" step="any" value={inp.ef}
                                          onChange={e => setCustomInputs(prev => ({ ...prev, [k]: { ...(prev[k] ?? {ef:'',tr:''}), ef: e.target.value } }))}
                                          placeholder={existing?.efectivo_rate ? String(existing.efectivo_rate) : 'Ej: 420'}
                                          className="w-full bg-[#07070f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/50" />
                                      </div>
                                      <div>
                                        <p className="text-blue-400/70 text-xs font-bold mb-1">🏦 Transferencia CUP</p>
                                        <input type="number" min="0" step="any" value={inp.tr}
                                          onChange={e => setCustomInputs(prev => ({ ...prev, [k]: { ...(prev[k] ?? {ef:'',tr:''}), tr: e.target.value } }))}
                                          placeholder={existing?.transferencia_rate ? String(existing.transferencia_rate) : 'Ej: 420'}
                                          className="w-full bg-[#07070f] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
                                      </div>
                                    </div>
                                    <button onClick={() => saveCustomRate(w.user_id, w.app_name, w.nombre_en_app)}
                                      disabled={isSaving || (!inp.ef && !inp.tr)}
                                      className="mt-2 w-full text-xs font-bold py-1.5 rounded-lg transition-all disabled:opacity-40 bg-violet-600 hover:bg-violet-500 text-white">
                                      {isSaving ? '...' : existing ? '✓ Actualizar cambio' : 'Guardar cambio personalizado'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {historyView ? (
            <HistoryPanel
            history={history}
            historyLoading={historyLoading}
            historyFilterSemana={historyFilterSemana}
            setHistoryFilterSemana={setHistoryFilterSemana}
            historyFilterApp={historyFilterApp}
            setHistoryFilterApp={setHistoryFilterApp}
            deletingHistId={deletingHistId}
            onDelete={deleteFromHistory}
            onLoad={loadFromHistory}
            fmtNum={fmt}
          />
        ) : (
          <div className="space-y-3">
            <AppNominaSection app="Waha"  reloadKey={reloadKeys.Waha}  exchangeRates={nominaRates} />
            <LaylaManualSection exchangeRates={nominaRates} />
            <AppNominaSection app="Howdy" reloadKey={reloadKeys.Howdy} exchangeRates={nominaRates} />
          </div>
        )}

      </div>
    </div>
  )
}
