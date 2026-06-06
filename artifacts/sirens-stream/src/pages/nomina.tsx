import React, { useState, useRef, useEffect } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase, type WorkerEntry } from '@/lib/supabase'
    import { sendPushViaApi } from '@/lib/push'
  import * as XLSX from 'xlsx'
  import {
    Upload, ChevronDown, ChevronUp, Copy, Check,
    TrendingUp, Gem, Users, AlertTriangle, UserX,
    FileSpreadsheet, Sparkles, Loader2, Download, Trash2
  } from 'lucide-react'

  interface NominaRow {
    uid: string
    apodo: string
    usd: number
    diamantes: number
    semana: string
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
      if (historyFilterSemana && !h.semana.toLowerCase().includes(historyFilterSemana.toLowerCase())) return false
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
            value={historyFilterSemana}
            onChange={e => setHistoryFilterSemana(e.target.value)}
            placeholder="Buscar semana..."
            className="ml-auto bg-[#0d0d1e] border border-purple-500/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 w-56"
          />
        </div>
        {historyLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
            <FileSpreadsheet className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">{history.length === 0 ? 'No hay nóminas guardadas todavía.' : 'Sin resultados.'}</p>
            <p className="text-white/25 text-xs mt-1">Las nóminas se guardan automáticamente al publicar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(h => {
              const isConfirming = confirmDelete === h.id
              const isDeleting = deletingHistId === h.id
              const dateStr = new Date(h.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={h.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                    {h.app_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">{h.app_name}</span>
                      <span className="font-bold text-sm">Semana {h.semana}</span>
                      {h.published && <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">Publicada</span>}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">
                      {dateStr} · {h.cobradas_count} cobraron · {Number(h.total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD · 💎 {fmtNum(Number(h.total_diamantes))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onLoad(h)}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl transition-all">
                      ↩ Cargar
                    </button>
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { onDelete(h.id); setConfirmDelete(null) }} disabled={isDeleting}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                          {isDeleting ? '...' : 'Borrar'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="text-xs bg-white/8 hover:bg-white/15 text-white/60 font-semibold px-3 py-1.5 rounded-lg transition-all">
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(h.id)} title="Eliminar"
                        className="text-white/20 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  export default function Nomina() {
    const { user, profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [step, setStep] = useState<'upload' | 'results'>('upload')
    const [dragging, setDragging] = useState(false)
    const [parsing, setParsing] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)
    const [cobradas, setCobradas] = useState<Matched[]>([])
    const [noCobro, setNoCobro] = useState<NoCobro[]>([])
    const [sinPerfil, setSinPerfil] = useState<NominaRow[]>([])
    const [semana, setSemana] = useState('')
    const [tab, setTab] = useState<'cobradas' | 'nocobro' | 'sinperfil'>('cobradas')
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [aiSummary, setAiSummary] = useState<string | null>(null)
    const [aiLoading, setAiLoading] = useState(false)
    const [publishing, setPublishing] = useState(false)
      const [publishedOk, setPublishedOk] = useState(false)
      const [nominaApp, setNominaApp] = useState<'Waha'|'Layla'|'Howdy'>('Waha')
      const fileRef = useRef<HTMLInputElement>(null)
      const [historyView, setHistoryView] = useState(false)
      const [history, setHistory] = useState<HistoryEntry[]>([])
      const [historyLoading, setHistoryLoading] = useState(false)
      const [historyFilterSemana, setHistoryFilterSemana] = useState('')
      const [historyFilterApp, setHistoryFilterApp] = useState('')
      const [deletingHistId, setDeletingHistId] = useState<string | null>(null)
        // Nomina filter state (persisted in localStorage)
        const [fPais, setFPais] = useState(() => { try { return localStorage.getItem('ea_nf_pais') ?? '' } catch { return '' } })
        const [fPago, setFPago] = useState(() => { try { return localStorage.getItem('ea_nf_pago') ?? '' } catch { return '' } })
        const [fEmail, setFEmail] = useState(() => { try { return localStorage.getItem('ea_nf_email') ?? '' } catch { return '' } })
        const [fBilletera, setFBilletera] = useState(() => { try { return localStorage.getItem('ea_nf_billetera') ?? '' } catch { return '' } })
        const [fAgente, setFAgente] = useState(() => { try { return localStorage.getItem('ea_nf_agente') ?? '' } catch { return '' } })
        const [fNombreReal, setFNombreReal] = useState(() => { try { return localStorage.getItem('ea_nf_nombre_real') ?? '' } catch { return '' } })
        const [fNombreApp, setFNombreApp] = useState(() => { try { return localStorage.getItem('ea_nf_nombre_app') ?? '' } catch { return '' } })
        const [fIdApp, setFIdApp] = useState(() => { try { return localStorage.getItem('ea_nf_id_app') ?? '' } catch { return '' } })
        const [fTelefono, setFTelefono] = useState(() => { try { return localStorage.getItem('ea_nf_telefono') ?? '' } catch { return '' } })
        const [fSortDir, setFSortDir] = useState<'desc'|'asc'>(() => { try { return (localStorage.getItem('ea_nf_sort') as 'desc'|'asc') ?? 'desc' } catch { return 'desc' } })

      // Restore last processed nómina when navigating back
      useEffect(() => {
        try {
          const saved = sessionStorage.getItem('ea_nomina_state')
          if (!saved) return
          const s = JSON.parse(saved)
          if (s.cobradas?.length > 0) {
            setCobradas(s.cobradas)
            setNoCobro(s.noCobro ?? [])
            setSinPerfil(s.sinPerfil ?? [])
            setSemana(s.semana ?? '')
            setNominaApp(s.nominaApp ?? 'Waha')
            if (s.aiSummary) setAiSummary(s.aiSummary)
            setStep('results')
          }
        } catch {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      // Auto-save whenever results change
      useEffect(() => {
        if (step !== 'results' || cobradas.length === 0) return
        try { sessionStorage.setItem('ea_nomina_state', JSON.stringify({ cobradas, noCobro, sinPerfil, semana, nominaApp, aiSummary })) } catch {}
      }, [step, cobradas, noCobro, sinPerfil, semana, nominaApp, aiSummary])

        // Persist nomina filters to localStorage
        useEffect(() => {
          try {
            localStorage.setItem('ea_nf_pais', fPais); localStorage.setItem('ea_nf_pago', fPago)
            localStorage.setItem('ea_nf_email', fEmail); localStorage.setItem('ea_nf_billetera', fBilletera)
            localStorage.setItem('ea_nf_agente', fAgente); localStorage.setItem('ea_nf_nombre_real', fNombreReal)
            localStorage.setItem('ea_nf_nombre_app', fNombreApp); localStorage.setItem('ea_nf_id_app', fIdApp)
            localStorage.setItem('ea_nf_telefono', fTelefono); localStorage.setItem('ea_nf_sort', fSortDir)
          } catch {}
        }, [fPais, fPago, fEmail, fBilletera, fAgente, fNombreReal, fNombreApp, fIdApp, fTelefono, fSortDir])

    if (!loading && user && profile !== undefined && !profile?.is_admin) navigate('/perfil')

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

    async function publicarSalarios() {
        if (cobradas.length === 0) return
        setPublishing(true); setPublishedOk(false)
        const inserts = cobradas.map(({ worker: w, nomina: n }) => ({
          user_id: w.user_id,
          app_name: nominaApp,
          semana: n.semana,
          usd: n.usd,
          diamantes: n.diamantes,
          extras: n.extras,
        }))
        const { error } = await supabase.from('published_salaries').upsert(inserts, { onConflict: 'user_id,app_name,semana' })
        if (!error) {
          setPublishedOk(true)
          sendPushViaApi(
            cobradas.map(c => c.worker.user_id),
            `💰 Tu salario de ${nominaApp} está disponible`,
            `Semana ${semana} — Entra a ver tus ganancias.`,
            '/salarios',
            true
          )
          setTimeout(() => setPublishedOk(false), 4000)
          // Guardar en historial de nóminas automáticamente
          await saveNominaToHistory()
          // Recortar a 10 salarios máx por trabajadora
          await Promise.all(cobradas.map(async ({ worker: w }) => {
            const { data: recs } = await supabase
              .from('published_salaries').select('id')
              .eq('user_id', w.user_id).order('created_at', { ascending: false })
            if (recs && recs.length > 10) {
              const toDelete = (recs as {id:string}[]).slice(10).map(r => r.id)
              await supabase.from('published_salaries').delete().in('id', toDelete)
            }
          }))
        }
        setPublishing(false)
      }

      async function processFile(file: File) {
      if (!file.name.match(/\.xlsx?$/i)) return
      setParsing(true); setAiSummary(null); setParseError(null)
      try {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

        const rawHeaders = (raw[0] as unknown[]) ?? []
        const headers = rawHeaders.map(h => String(h ?? '').trim())

        // Case-insensitive column lookup so minor name differences don't break parsing
        function COL(name: string): number {
          const exact = headers.indexOf(name)
          if (exact !== -1) return exact
          const lower = name.toLowerCase()
          return headers.findIndex(h => h.toLowerCase() === lower)
        }

        // Validate critical columns exist
        const uidCol = COL('UID del Host')
        const usdCol = COL('USD')
        if (uidCol === -1 || usdCol === -1) {
          const found = headers.filter(Boolean).join(', ')
          throw new Error(
            'Columnas no encontradas en el Excel.\n\nEsperadas: "UID del Host", "USD", "Apodo", "Semana", "Diamantes Totales"\nEncontradas: ' + (found || '(ninguna)')
          )
        }

        const dataRows = (raw.slice(1) as unknown[][]).filter(r => r.length > 0 && r[2])
        const mainCols = new Set([COL('Semana'), COL('UID del Host'), COL('Apodo'), COL('USD'), COL('Diamantes Totales'), COL('Nombre de la agencia')])

        const nominaRows: NominaRow[] = dataRows.map(r => {
          const extras: Record<string, string | number> = {}
          headers.forEach((h, i) => { if (!mainCols.has(i) && h && r[i] !== undefined && r[i] !== null && r[i] !== '') extras[h] = r[i] as string | number })
          return {
            uid: normalizeUID(r[COL('UID del Host')]),
            apodo: String(r[COL('Apodo')] ?? ''),
            usd: parseFloat(String(r[COL('USD')] ?? 0)) || 0,
            diamantes: parseFloat(String(r[COL('Diamantes Totales')] ?? 0)) || 0,
            semana: String(r[COL('Semana')] ?? ''),
            extras,
          }
        })

        const sem = nominaRows[0]?.semana ?? ''
        setSemana(sem)

        const { data: entries, error: entriesErr } = await supabase.from('worker_entries').select('*').eq('app_name', nominaApp)
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
        setStep('results')
        callGroq(cobradasList, noCobroList, sem)
      } catch (err: any) {
        setParseError(err?.message ?? 'Error desconocido al procesar el archivo.')
      } finally {
        setParsing(false)
      }
    }

    function onDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }
    function onInput(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) processFile(f) }
    function reset() { sessionStorage.removeItem('ea_nomina_state'); setStep('upload'); setSemana(''); setCobradas([]); setNoCobro([]); setSinPerfil([]); setExpanded(new Set()); setAiSummary(null); setPublishedOk(false) }

    async function fetchHistory() {
      setHistoryLoading(true)
      const { data } = await supabase
        .from('nomina_history')
        .select('id,app_name,semana,total_usd,total_diamantes,cobradas_count,nocobro_count,sinperfil_count,published,created_at,rows_data')
        .order('created_at', { ascending: false })
      setHistory((data ?? []) as HistoryEntry[])
      setHistoryLoading(false)
    }

    async function saveNominaToHistory() {
      if (cobradas.length === 0) return
      try {
        await supabase.from('nomina_history').insert({
          app_name: nominaApp,
          semana,
          total_usd: cobradas.reduce((s, m) => s + m.nomina.usd, 0),
          total_diamantes: cobradas.reduce((s, m) => s + m.nomina.diamantes, 0),
          cobradas_count: cobradas.length,
          nocobro_count: noCobro.length,
          sinperfil_count: sinPerfil.length,
          rows_data: { cobradas, noCobro, sinPerfil },
          published: true,
        })
      } catch { /* ignore */ }
    }

    async function deleteFromHistory(id: string) {
      setDeletingHistId(id)
      await supabase.from('nomina_history').delete().eq('id', id)
      setHistory(prev => prev.filter(h => h.id !== id))
      setDeletingHistId(null)
    }

    function loadFromHistory(entry: HistoryEntry) {
      setCobradas(entry.rows_data.cobradas ?? [])
      setNoCobro(entry.rows_data.noCobro ?? [])
      setSinPerfil(entry.rows_data.sinPerfil ?? [])
      setSemana(entry.semana)
      setNominaApp(entry.app_name as 'Waha'|'Layla'|'Howdy')
      setAiSummary(null)
      setStep('results')
      sessionStorage.removeItem('ea_nomina_state')
      setHistoryView(false)
    }

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
        function clearNominaFilters() {
          setFPais(''); setFPago(''); setFEmail(''); setFBilletera('')
          setFAgente(''); setFNombreReal(''); setFNombreApp(''); setFIdApp(''); setFTelefono('')
        }

    if (loading) return <SplashLoader msg="Cargando..." />
    if (!profile?.is_admin) return <SplashLoader msg="Sin acceso" />

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
                <h1 className="text-2xl font-extrabold">{historyView ? 'Historial de Nóminas' : `Nómina Semanal — ${nominaApp}`}</h1>
                {!historyView && semana && <p className="text-white/40 text-sm mt-0.5">Semana: {semana}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {step === 'upload' && !historyView && (
                  <button onClick={() => { setHistoryView(true); fetchHistory() }}
                    className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                    📁 Historial
                  </button>
                )}
                {historyView && (
                  <button onClick={() => setHistoryView(false)}
                    className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                    ← Nueva nómina
                  </button>
                )}
              </div>
              {!historyView && step === 'results' && (
                <div className="flex items-center gap-2">
                  {publishedOk && (
                      <span className="flex items-center gap-1.5 text-green-400 text-sm font-bold bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20">
                        ✓ Publicado
                      </span>
                    )}
                    <button onClick={publicarSalarios} disabled={publishing || cobradas.length === 0}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
                      {publishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      {publishing ? 'Publicando...' : `⬆ Publicar ${nominaApp}`}
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
              )}
            </div>
          </div>

          {historyView && (
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
          )}

          {!historyView && step === 'upload' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-white/40 mr-2">App:</span>
                {(['Waha', 'Layla', 'Howdy'] as const).map(a => (
                  <button key={a} onClick={() => setNominaApp(a)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${nominaApp === a ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/50 hover:text-white'}`}>
                    {a}
                  </button>
                ))}
              </div>
              <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                onDrop={onDrop} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
                  ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/25 bg-[#0d0d1e] hover:border-purple-500/50 hover:bg-purple-500/5'}`}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInput} />
                {parseError && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left">
                    <p className="text-red-400 font-bold text-sm mb-1">❌ Error al procesar el archivo</p>
                    <pre className="text-red-300/70 text-xs whitespace-pre-wrap">{parseError}</pre>
                    <p className="text-white/30 text-xs mt-2">Verifica que el Excel sea de {nominaApp} y tenga las columnas correctas.</p>
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
                      <p className="text-white font-bold text-lg mb-1">Sube la nómina de {nominaApp}</p>
                      <p className="text-white/40 text-sm">Arrastra el Excel aquí, o haz clic para seleccionar</p>
                      <p className="text-white/25 text-xs mt-2">.xlsx / .xls</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'results' && (
            <>
              {(aiLoading || aiSummary) && (
                <div className="bg-[#0d0d1e] border border-purple-500/25 rounded-2xl p-4 mb-6 flex items-start gap-3">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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

              <div className="flex rounded-xl bg-[#0d0d1e] border border-purple-500/10 p-1 mb-6 w-fit gap-1 flex-wrap">
                <TabBtn active={tab === 'cobradas'} color="bg-green-600"  onClick={() => setTab('cobradas')}>✓ Cobraron ({cobradas.length})</TabBtn>
                <TabBtn active={tab === 'nocobro'}  color="bg-orange-600" onClick={() => setTab('nocobro')}>No cobraron ({noCobro.length})</TabBtn>
                <TabBtn active={tab === 'sinperfil'} color="bg-yellow-600" onClick={() => setTab('sinperfil')}>Sin perfil ({sinPerfil.length})</TabBtn>
              </div>

              {tab === 'cobradas' && (
                <div className="space-y-4">
                  {/* Filters */}
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
                        <button onClick={clearNominaFilters}
                          className="ml-auto flex items-center gap-1 text-xs text-white/35 hover:text-white transition-colors">
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
                    const isOpen = expanded.has(n.uid)
                    const waNum = [w.codigo_pais, w.telefono].filter(Boolean).join('').replace(/\D/g, '')
                    const waLink = waNum ? `https://wa.me/${waNum}` : null
                    return (
                      <div key={n.uid} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300 font-extrabold text-sm shrink-0">W</div>
                            <div className="min-w-0">
                              <p className="font-bold text-base leading-tight">{n.apodo}</p>
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
                          {isOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles de nómina</> : <><ChevronDown className="w-3.5 h-3.5" />Ver todos los campos de nómina</>}
                        </button>
                        {isOpen && (
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

              {tab === 'nocobro' && (
                <div className="space-y-3">
                  {noCobro.length === 0 && <Empty msg="¡Todas las chicas registradas cobraron esta semana!" />}
                  {noCobro.map(({ worker: w, nomina: n }) => {
                    const key = n ? n.uid : 'db_' + w.id
                    const isOpen = expanded.has('nc_' + key)
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
                              {([['ID en app', w.id_aplicacion],['País', w.pais],['Pago', w.metodo_pago],['Billetera', w.billetera]] as [string,string|null][]).map(([l,v]) => (
                                <div key={l}><p className="text-white/25 text-xs mb-0.5">{l}</p><p className="text-white/60 text-xs font-medium">{v||'—'}</p></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {n && (
                          <>
                            <button onClick={() => toggleExpanded('nc_' + key)}
                              className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-orange-500/10 text-xs font-semibold text-white/35 hover:text-orange-300 hover:bg-orange-500/5 transition-all">
                              {isOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles de nómina</> : <><ChevronDown className="w-3.5 h-3.5" />Ver todos los campos de nómina</>}
                            </button>
                            {isOpen && (
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

              {tab === 'sinperfil' && (
                <div className="space-y-3">
                  {sinPerfil.length === 0 && <Empty msg="Todas las chicas de la nómina tienen perfil en el sistema." />}
                  {sinPerfil.map(n => {
                    const isOpen = expanded.has('sp_' + n.uid)
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
                          {isOpen ? <><ChevronUp className="w-3.5 h-3.5" />Ocultar detalles</> : <><ChevronDown className="w-3.5 h-3.5" />Ver todos los campos de nómina</>}
                        </button>
                        {isOpen && (
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
            </>
          )}
        </div>
      </div>
    )
  }

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
  