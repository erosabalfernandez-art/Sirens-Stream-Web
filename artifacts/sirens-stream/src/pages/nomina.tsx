import React, { useState, useRef, useEffect } from 'react'
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

  interface NominaRow {
    uid: string
    apodo: string
    usd: number
    diamantes: number
    semana: string
    comision: number
    extras: Record<string, string | number>
  }

  interface WorkerRow extends WorkerEntry { profile_email: string }
  interface Matched  { worker: WorkerRow; nomina: NominaRow }
  interface NoCobro  { worker: WorkerRow; nomina: NominaRow | null }

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
    aiSummary: string | null
  ): string {
    const now = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    const totalUSD = cobradas.reduce((s, m) => s + m.nomina.usd, 0)
    const totalDia = cobradas.reduce((s, m) => s + m.nomina.diamantes, 0)

    function workerBlock(w: WorkerRow, n: NominaRow | null, paid: boolean, sinp?: boolean): string {
      const profileRows = [
        ['Email', w.profile_email], ['Nombre real', w.nombre_real], ['Nombre en app', w.nombre_en_app],
        ['UID en la app', w.id_aplicacion], ['País', w.pais], ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono],
        ['Método de pago', w.metodo_pago], ['Billetera', w.billetera], ['Agente', w.agente],
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
function AppNominaSection({ app, reloadKey }: { app: 'Waha' | 'Layla' | 'Howdy'; reloadKey: number }) {
  const color = APP_COLORS[app]

  // Accordion open state (auto-open if has saved data)
  const [sectionOpen, setSectionOpen] = useState<boolean>(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
      return !!(all[app]?.cobradas?.length > 0)
    } catch { return false }
  })

  // Per-app state
  const [step, setStep] = useState<'upload' | 'results'>('upload')
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [paidMarks, setPaidMarks] = useState<Set<string>>(new Set())
  const [togglingPaid, setTogglingPaid] = useState<string | null>(null)

  // Filter states
  const [fPais, setFPais] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_pais`) ?? '' } catch { return '' } })
  const [fPago, setFPago] = useState(() => { try { return localStorage.getItem(`ea_nf_${app}_pago`) ?? '' } catch { return '' } })
  const [fEmail, setFEmail] = useState('')
  const [fBilletera, setFBilletera] = useState('')
  const [fAgente, setFAgente] = useState('')
  const [fNombreReal, setFNombreReal] = useState('')
  const [fNombreApp, setFNombreApp] = useState('')
  const [fIdApp, setFIdApp] = useState('')
  const [fTelefono, setFTelefono] = useState('')
  const [fSortDir, setFSortDir] = useState<'desc'|'asc'>('desc')

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
          setStep('results')
          setSectionOpen(true)
          return
        }
      } catch {}
      // Fallback: load latest entry from API server (uses service role → bypasses RLS)
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
        const r = await fetch(`${apiBase}/api/nomina-state?app=${encodeURIComponent(app)}`)
        if (r.ok) {
          const { entry } = await r.json() as { entry: { app_name: string; semana: string; rows_data: { cobradas: Matched[]; noCobro: NoCobro[]; sinPerfil: NominaRow[] }; file_name?: string } | null }
          if (entry?.rows_data && (entry.rows_data.cobradas?.length > 0 || entry.rows_data.noCobro?.length > 0 || entry.rows_data.sinPerfil?.length > 0)) {
            setCobradas(entry.rows_data.cobradas)
            setNoCobro(entry.rows_data.noCobro ?? [])
            setSinPerfil(entry.rows_data.sinPerfil ?? [])
            setSemana(entry.semana ?? '')
            setFileName(entry.file_name ?? '')
            setStep('results')
            setSectionOpen(true)
            try {
              const all = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
              all[app] = { cobradas: entry.rows_data.cobradas, noCobro: entry.rows_data.noCobro ?? [], sinPerfil: entry.rows_data.sinPerfil ?? [], semana: entry.semana, aiSummary: null, fileName: entry.file_name ?? '' }
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

  // Persist filter prefs
  useEffect(() => {
    try {
      localStorage.setItem(`ea_nf_${app}_pais`, fPais)
      localStorage.setItem(`ea_nf_${app}_pago`, fPago)
    } catch {}
  }, [fPais, fPago, app])

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
    const html = buildPDF(semana, cobradas, noCobro, sinPerfil, aiSummary)
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
      const totalUSD = matchedList.reduce((s, m) => s + m.nomina.usd, 0)
      const totalDia = matchedList.reduce((s, m) => s + m.nomina.diamantes, 0)
      const paises = [...new Set(matchedList.map(m => m.worker.pais).filter(Boolean))]
      const top3 = matchedList.slice(0, 3).map(m => `${m.nomina.apodo} ($${m.nomina.usd.toFixed(2)})`).join(', ')
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
            total_usd: cobradas.reduce((s, m) => s + m.nomina.usd, 0),
            total_diamantes: cobradas.reduce((s, m) => s + m.nomina.diamantes, 0),
            file_name: fileName,
          }),
        })
        const result = await r.json() as { ok?: boolean; error?: string; saved?: number }
        if (!r.ok) { alert(`❌ Error al publicar salarios:\n${result.error ?? r.status}`); setPublishing(false); return }
        setPublishedOk(true)
        if (notifyWorkers) {
          sendPushViaApi(
            cobradas.map(c => c.worker.user_id),
            `💰 Tu salario de ${app} está disponible`,
            `Semana ${semana} — Entra a ver tus ganancias.`,
            '/salarios', true
          )
        }
        setTimeout(() => setPublishedOk(false), 4000)
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
        const agente = (w as any).agente as string | null
        if (!agente) continue
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
        if (agentUserIds.length > 0) {
          sendPushViaApi(agentUserIds, `💰 Comisiones de ${app} disponibles`, `Semana ${sem} — Entra a ver tus comisiones.`, '/agente', true)
        }
        setTimeout(() => setAgentPublishOk(false), 4000)
      } catch (e: unknown) {
        alert(`❌ Error al publicar comisiones: ${e instanceof Error ? e.message : 'Error de red'}`)
      }
      setPublishingAgents(false)
    }
  
  async function detectColumnsWithAI(headers: string[]): Promise<Record<string, number>> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
    if (!apiKey) return {}
    try {
      const prompt = [
        'You are analyzing a streaming platform payroll spreadsheet.',
        'Given these column headers (as a JSON array), return a JSON object mapping each field to its 0-based column index.',
        'Fields to identify: uid (user/host ID), usd (dollar earnings), apodo (nickname/display name), semana (week/period), diamantes (diamonds/gems/coins), agencia (agency name).',
        'If a field is not present use -1. Return ONLY valid JSON, no markdown, no explanation.',
        'Headers: ' + JSON.stringify(headers),
      ].join(' ')
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 120, temperature: 0 }),
      })
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content ?? '{}'
      const jsonStr = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim()
      return JSON.parse(jsonStr) as Record<string, number>
    } catch { return {} }
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

      const COLUMN_ALIASES: [string, string[]][] = [
        ['UID del Host',        ['uid', 'host id', 'id del host', 'id host', 'host_id', 'userid', 'user id']],
        ['USD',                 ['usd', 'host salary', 'salario en usd', 'dólar', 'dollar', 'monto', 'pago usd', 'ganancia', 'ingreso', 'earning']],
        ['Apodo',               ['name', 'nombre', 'apodo', 'nick', 'nickname', 'nombre en app', 'nombre_app', 'username']],
        ['Semana',              ['week', 'semana', 'periodo', 'período', 'date', 'fecha']],
        ['Diamantes Totales',   ['total monedas', 'total diamante', 'diamante', 'diamond', 'gem', 'piedra', 'coins', 'moneda', 'total dia']],
        ['Nombre de la agencia',['agency', 'agencia', 'manager', 'nombre agencia']],
        ['Comisión',            ['agc salary', '10 porciento', '12% del salario', 'commission', 'comisión', 'comision', '10%', '12%']],
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
            const idx = headers.findIndex(h => h.toLowerCase() === kw)
            if (idx !== -1) return idx
          }
          for (const kw of aliases[1]) {
            const idx = headers.findIndex(h => h.toLowerCase().includes(kw))
            if (idx !== -1) return idx
          }
        }
        const words = lower.split(/\s+/)
        const idx = headers.findIndex(h => { const hl = h.toLowerCase(); return words.every(w => hl.includes(w)) })
        return idx
      }

      let uidCol    = smartCOL('UID del Host')
      let usdCol    = smartCOL('USD')
      let apodoCol  = smartCOL('Apodo')
      let semanaCol = smartCOL('Semana')
      let diaCol    = smartCOL('Diamantes Totales')
      let agenciaCol  = smartCOL('Nombre de la agencia')
      let comisionCol = smartCOL('Comisión')

      if (uidCol === -1 || usdCol === -1) {
        setAiColDetect('🤖 Columnas no reconocidas — usando IA para identificarlas…')
        const aiMap = await detectColumnsWithAI(headers)
        if (uidCol    === -1 && aiMap.uid       !== undefined) uidCol    = aiMap.uid
        if (usdCol    === -1 && aiMap.usd       !== undefined) usdCol    = aiMap.usd
        if (apodoCol  === -1 && aiMap.apodo     !== undefined) apodoCol  = aiMap.apodo
        if (semanaCol === -1 && aiMap.semana    !== undefined) semanaCol = aiMap.semana
        if (diaCol    === -1 && aiMap.diamantes !== undefined) diaCol    = aiMap.diamantes
        if (agenciaCol=== -1 && aiMap.agencia   !== undefined) agenciaCol= aiMap.agencia

        if (uidCol >= 0 && usdCol >= 0) {
          const names = [
            uidCol>=0 && `UID→"${headers[uidCol]}"`,
            usdCol>=0 && `USD→"${headers[usdCol]}"`,
            apodoCol>=0 && `Apodo→"${headers[apodoCol]}"`,
            semanaCol>=0 && `Semana→"${headers[semanaCol]}"`,
          ].filter(Boolean).join(', ')
          setAiColDetect(`✅ IA identificó las columnas: ${names}`)
        } else {
          const found = headers.filter(Boolean).join(' | ')
          throw new Error(
            'No se encontraron las columnas de UID o USD (ni con IA).\n\nColumnas en el archivo:\n' + (found || '(ninguna)') + '\n\nRevisa que el Excel tenga una columna con el ID del usuario y otra con el monto.'
          )
        }
      } else {
        setAiColDetect(null)
      }

      const dataRows = (raw.slice(1) as unknown[][]).filter(r => r.length > 0)
      const mainCols = new Set([semanaCol, uidCol, apodoCol, usdCol, diaCol, agenciaCol, comisionCol].filter(i => i !== -1))

      const nominaRows: NominaRow[] = dataRows.map(r => {
        const extras: Record<string, string | number> = {}
        headers.forEach((h, i) => { if (!mainCols.has(i) && h && r[i] !== undefined && r[i] !== null && r[i] !== '') extras[h] = r[i] as string | number })
        return {
          uid: normalizeUID(uidCol !== -1 ? r[uidCol] : ''),
          apodo: String(apodoCol !== -1 ? (r[apodoCol] ?? '') : ''),
          usd: parseFloat(String(usdCol !== -1 ? (r[usdCol] ?? 0) : 0)) || 0,
          diamantes: parseFloat(String(diaCol !== -1 ? (r[diaCol] ?? 0) : 0)) || 0,
          comision: parseFloat(String(comisionCol !== -1 ? (r[comisionCol] ?? 0) : 0)) || 0,
          semana: String(semanaCol !== -1 ? (r[semanaCol] ?? '') : ''),
          extras,
        }
      }).filter(r => r.uid !== '')

      const sem = nominaRows[0]?.semana ?? ''
      setSemana(sem)

      const { data: entries, error: entriesErr } = await supabase.from('worker_entries').select('*').eq('app_name', app)
      if (entriesErr) throw new Error('Error de base de datos: ' + entriesErr.message)

      const { data: profs } = await supabase.from('profiles').select('id, email')
      const emailMap: Record<string, string> = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.email]))
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
      // ▶ FIX: Save to localStorage immediately using local vars — React state isn't committed yet
      // This keeps nomina data alive across navigation, tab switch, and page refresh for ALL 3 apps
      try {
        const _nomCache = JSON.parse(localStorage.getItem('ea_nomina_apps_v1') || '{}')
        _nomCache[app] = { cobradas: cobradasList, noCobro: noCobroList, sinPerfil: sinPerfilList, semana: sem, fileName: file.name, aiSummary: null }
        localStorage.setItem('ea_nomina_apps_v1', JSON.stringify(_nomCache))
      } catch {}
      loadPaidMarks(app, sem)
      // Save via API server (service role → bypasses RLS) so data persists across navigation/sessions
      try {
        const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
        await fetch(`${apiBase}/api/nomina-state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_name: app,
            semana: sem,
            total_usd: cobradasList.reduce((s, m) => s + m.nomina.usd, 0),
            total_diamantes: cobradasList.reduce((s, m) => s + m.nomina.diamantes, 0),
            cobradas: cobradasList,
            noCobro: noCobroList,
            sinPerfil: sinPerfilList,
            file_name: file.name,
          }),
        })
      } catch {}
      setStep('results')
      callGroq(cobradasList, noCobroList, sem)
    } catch (err: any) {
      setParseError(err?.message ?? 'Error desconocido al procesar el archivo.')
    } finally {
      setParsing(false)
    }
  }

  async function loadPaidMarks(a: string, week: string) {
    const { data } = await supabase.from('admin_paid_marks').select('uid').eq('app_name', a).eq('semana', week)
    setPaidMarks(new Set(((data ?? []) as {uid:string}[]).map((r: any) => r.uid)))
  }

  async function togglePaid(uid: string) {
    setTogglingPaid(uid)
    if (paidMarks.has(uid)) {
      await supabase.from('admin_paid_marks').delete().eq('app_name', app).eq('semana', semana).eq('uid', uid)
      setPaidMarks(prev => { const s = new Set(prev); s.delete(uid); return s })
    } else {
      await supabase.from('admin_paid_marks').insert({ app_name: app, semana, uid })
      setPaidMarks(prev => new Set([...prev, uid]))
    }
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
  const totalUSD = cobradas.reduce((s, m) => s + m.nomina.usd, 0)
  const totalDiamonds = cobradas.reduce((s, m) => s + m.nomina.diamantes, 0)
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
  }).sort((a, b) => fSortDir === 'desc' ? b.nomina.usd - a.nomina.usd : a.nomina.usd - b.nomina.usd)
  const nfHasFilters = !!(fPais || fPago || fEmail || fBilletera || fAgente || fNombreReal || fNombreApp || fIdApp || fTelefono)
  function clearNominaFilters() { setFPais(''); setFPago(''); setFEmail(''); setFBilletera(''); setFAgente(''); setFNombreReal(''); setFNombreApp(''); setFIdApp(''); setFTelefono('') }

  return (
    <div className={`border rounded-2xl overflow-hidden ${sectionOpen ? color.border : 'border-purple-500/10'} bg-[#0a0a18] transition-all`}>
      {/* ── Accordion header ── */}
      <button
        onClick={() => setSectionOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-all ${sectionOpen ? color.accent : 'hover:bg-white/3'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${step === 'results' && cobradas.length > 0 ? 'bg-green-400' : 'bg-white/15'}`} />
          <span className="font-extrabold text-lg tracking-tight">{app}</span>
          {step === 'results' && cobradas.length > 0 && (
            <span className="text-xs text-white/60 font-normal hidden sm:inline">
              {semana && `${semana} · `}{cobradas.length} cobraron · ${totalUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
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
                <button onClick={() => publicarSalarios(true)} disabled={publishing || cobradas.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
                  {publishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {publishing ? 'Publicando...' : '⬆ Publicar para Trabajadoras'}
                </button>
                <button onClick={publishAgentCommissions} disabled={publishingAgents || cobradas.length === 0}
                  className={`flex items-center gap-2 ${agentPublishOk ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg`}>
                  {publishingAgents ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {agentPublishOk ? '✓ Publicado para agentes' : (publishingAgents ? 'Publicando...' : '💰 Publicar para Agentes')}
                </button>
                <button onClick={exportarPDF}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
                  <Download className="w-4 h-4" /> Exportar PDF
                </button>
                <button onClick={reset}
                  className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                  <Upload className="w-4 h-4" /> Nueva nómina
                </button>
              </div>

              {/* 💱 Cambio Cuba widget for admin */}
              <div className="bg-[#0d0d1e] border border-green-500/15 rounded-2xl overflow-hidden">
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
                          { id: 'efectivo_worker', label: 'Efectivo Cuba', color: 'amber' },
                          { id: 'transferencia_worker', label: 'Transferencia Cuba', color: 'blue' },
                        ] as const).map(({ id, label, color }) => (
                          <div key={id} className={`bg-black/20 border border-${color}-500/15 rounded-xl p-4`}>
                            <p className={`text-${color}-400 text-xs font-bold mb-1`}>{label}</p>
                            <p className="text-white/25 text-xs mb-2">Actual: <span className="text-white/50 font-semibold">{(nominaRates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                            <div className="flex gap-2">
                              <input type="number" min="0" step="any" value={nominaRateInputs[id] ?? ''}
                                onChange={e => setNominaRateInputs(prev => ({ ...prev, [id]: e.target.value }))}
                                placeholder="Ej: 400"
                                className="flex-1 bg-[#07070f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                              <button onClick={() => publishNominaRate(id)} disabled={nominaSavingRate === id}
                                className={`shrink-0 text-sm font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${nominaRateSaved === id ? 'bg-green-600 text-white' : `bg-${color}-600 hover:bg-${color}-500 text-white`}`}>
                                {nominaRateSaved === id ? '✓' : (nominaSavingRate === id ? '...' : 'Publicar')}
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
                          { id: 'efectivo_agent', label: 'Efectivo Cuba', color: 'amber' },
                          { id: 'transferencia_agent', label: 'Transferencia Cuba', color: 'blue' },
                        ] as const).map(({ id, label, color }) => (
                          <div key={id} className={`bg-black/20 border border-${color}-500/15 rounded-xl p-4`}>
                            <p className={`text-${color}-400 text-xs font-bold mb-1`}>{label}</p>
                            <p className="text-white/25 text-xs mb-2">Actual: <span className="text-white/50 font-semibold">{(nominaRates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                            <div className="flex gap-2">
                              <input type="number" min="0" step="any" value={nominaRateInputs[id] ?? ''}
                                onChange={e => setNominaRateInputs(prev => ({ ...prev, [id]: e.target.value }))}
                                placeholder="Ej: 400"
                                className="flex-1 bg-[#07070f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                              <button onClick={() => publishNominaRate(id)} disabled={nominaSavingRate === id}
                                className={`shrink-0 text-sm font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${nominaRateSaved === id ? 'bg-green-600 text-white' : `bg-${color}-600 hover:bg-${color}-500 text-white`}`}>
                                {nominaRateSaved === id ? '✓' : (nominaSavingRate === id ? '...' : 'Publicar')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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

                    {cobradasFiltered.length === 0 && cobradas.length > 0 && <Empty msg="No hay resultados con los filtros aplicados." />}
                    {cobradas.length === 0 && <Empty msg="Ninguna chica cobró o no se encontraron coincidencias." />}
                    {cobradasFiltered.map(({ worker: w, nomina: n }) => {
                      const cardOpen = expanded.has(n.uid)
                      const waNum = [w.codigo_pais, w.telefono].filter(Boolean).join('').replace(/\D/g, '')
                      const waLink = waNum ? `https://wa.me/${waNum}` : null
                      return (
                        <div key={n.uid} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300 font-extrabold text-sm shrink-0">W</div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-base leading-tight">{n.apodo}</p>
                                  <button
                                    onClick={() => togglePaid(n.uid)}
                                    disabled={togglingPaid === n.uid}
                                    title={paidMarks.has(n.uid) ? 'Quitar marca de pagado' : 'Marcar como pagado'}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${paidMarks.has(n.uid) ? 'bg-green-500 border-green-500 text-white' : 'border-white/25 text-transparent hover:border-green-400/60'}`}>
                                    <Check className="w-3 h-3" />
                                  </button>
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
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-extrabold text-green-400">{`$${n.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Gem className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-purple-300 text-sm font-semibold">{fmt(n.diamantes)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-5 pb-4 border-t border-purple-500/8">
                            <p className="text-white/25 text-xs font-semibold uppercase tracking-wider mb-2.5 pt-3">Datos del perfil</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                              {([['UID en app', w.id_aplicacion],['País', w.pais],['Método de pago', w.metodo_pago],['Billetera', w.billetera],['Agente', w.agente]] as [string,string|null][]).map(([label, val]) => (
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
                      )
                    })}
                  </div>
                )}

                {/* No cobro tab */}
                {tab === 'nocobro' && (
                  <div className="space-y-3">
                    {noCobro.length === 0 && <Empty msg="¡Todas las chicas registradas cobraron esta semana!" />}
                    {noCobro.map(({ worker: w, nomina: n }) => {
                      const key = n ? n.uid : 'db_' + w.id
                      const ncOpen = expanded.has('nc_' + key)
                      const ncWaNum = [w.codigo_pais, w.telefono].filter(Boolean).join('').replace(/\D/g, '')
                      const ncWaLink = ncWaNum ? `https://wa.me/${ncWaNum}` : null
                      return (
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
                                {([['ID en app', w.id_aplicacion],['País', w.pais],['Método de pago', w.metodo_pago],['Agente', w.agente]] as [string,string|null][]).map(([label, val]) => (
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
                              <p className="text-xl font-extrabold text-green-400">${n.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Gem className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-purple-300 text-sm font-semibold">{fmt(n.diamantes)}</span>
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
  const [nominaRateInputs, setNominaRateInputs] = useState<Record<string,string>>({})
  const [nominaSavingRate, setNominaSavingRate] = useState<string|null>(null)
  const [nominaRateSaved, setNominaRateSaved] = useState<string|null>(null)
  const [showCambio, setShowCambio] = useState(false)

  if (!loading && user && profile !== undefined && !profile?.is_admin) navigate('/perfil')

  if (loading) return <SplashLoader msg="Cargando..." />
  if (!profile?.is_admin) return <SplashLoader msg="Sin acceso" />

  useEffect(() => {
    supabase.from('exchange_rates').select('*').then(({ data }) => {
      const r: Record<string,number> = {}; const inp: Record<string,string> = {}
      for (const row of (data ?? []) as {id:string;rate:number}[]) { r[row.id] = row.rate; inp[row.id] = String(row.rate === 0 ? '' : row.rate) }
      setNominaRates(r); setNominaRateInputs(inp)
    })
  }, [])

  async function publishNominaRate(id: string) {
    const rate = parseFloat(nominaRateInputs[id] || '0')
    if (isNaN(rate) || rate < 0) return
    setNominaSavingRate(id)
    await supabase.from('exchange_rates').upsert({ id, rate, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    setNominaRates(prev => ({ ...prev, [id]: rate }))
    setNominaSavingRate(null); setNominaRateSaved(id); setTimeout(() => setNominaRateSaved(null), 3000)
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
            <AppNominaSection app="Waha"  reloadKey={reloadKeys.Waha}  />
            <AppNominaSection app="Layla" reloadKey={reloadKeys.Layla} />
            <AppNominaSection app="Howdy" reloadKey={reloadKeys.Howdy} />
          </div>
        )}

      </div>
    </div>
  )
}
