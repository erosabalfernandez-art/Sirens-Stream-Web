import { useState, useRef } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase, type WorkerEntry } from '@/lib/supabase'
    import { sendPushViaApi } from '@/lib/push'
  import * as XLSX from 'xlsx'
  import {
    Upload, ChevronDown, ChevronUp, Copy, Check,
    TrendingUp, Gem, Users, AlertTriangle, UserX,
    FileSpreadsheet, Sparkles, Loader2, Download
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
        <div style="color:#9ca3af;font-size:12px;margin-top:4px">`Nómina Semanal — ${nominaApp}`</div>
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

  export default function Nomina() {
    const { user, profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [step, setStep] = useState<'upload' | 'results'>('upload')
    const [dragging, setDragging] = useState(false)
    const [parsing, setParsing] = useState(false)
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
          await sendPushViaApi(
            cobradas.map(c => c.worker.user_id),
            `💰 Tu salario de ${nominaApp} está disponible`,
            `Semana ${semana} — Entra a ver tus ganancias.`,
            '/salarios'
          )
          setTimeout(() => setPublishedOk(false), 4000)
        }
        setPublishing(false)
      }

      async function processFile(file: File) {
      if (!file.name.match(/\.xlsx?$/i)) return
      setParsing(true); setAiSummary(null)

      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]

      const headers = (raw[0] as string[]).map(h => String(h ?? '').trim())
      const dataRows = (raw.slice(1) as unknown[][]).filter(r => r.length > 0 && r[2])
      const COL = (name: string) => headers.indexOf(name)
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

      const { data: entries } = await supabase.from('worker_entries').select('*').eq('app_name', 'Waha')
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
      setStep('results'); setParsing(false)
      callGroq(cobradasList, noCobroList, sem)
    }

    function onDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }
    function onInput(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) processFile(f) }
    function reset() { setStep('upload'); setSemana(''); setCobradas([]); setNoCobro([]); setSinPerfil([]); setExpanded(new Set()); setAiSummary(null) }

    const totalUSD = cobradas.reduce((s, m) => s + m.nomina.usd, 0)
    const totalDiamonds = cobradas.reduce((s, m) => s + m.nomina.diamantes, 0)

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
                <h1 className="text-2xl font-extrabold">Nómina Semanal — Waha</h1>
                {semana && <p className="text-white/40 text-sm mt-0.5">Semana: {semana}</p>}
              </div>
              {step === 'results' && (
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

          {step === 'upload' && (
            <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40 mr-2">App:</span>
              {(['Waha', 'Layla', 'Howdy'] as const).map(a => (
                <button key={a} onClick={() => setNominaApp(a)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${nominaApp === a ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/50 hover:text-white'}`}>
                  {a}
                </button>
              ))}
            </div>
              onDrop={onDrop} onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
                ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/25 bg-[#0d0d1e] hover:border-purple-500/50 hover:bg-purple-500/5'}`}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInput} />
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
                    <p className="text-white font-bold text-lg mb-1">Sube la nómina de Waha</p>
                    <p className="text-white/40 text-sm">Arrastra el Excel aquí, o haz clic para seleccionar</p>
                    <p className="text-white/25 text-xs mt-2">.xlsx / .xls</p>
                  </div>
                </div>
              )}
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
                  {cobradas.length === 0 && <Empty msg="Ninguna chica cobró o no se encontraron coincidencias." />}
                  {cobradas.map(({ worker: w, nomina: n }) => {
                    const isOpen = expanded.has(n.uid)
                    return (
                      <div key={n.uid} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300 font-extrabold text-sm shrink-0">W</div>
                            <div className="min-w-0">
                              <p className="font-bold text-base leading-tight">{n.apodo}</p>
                              {w.nombre_real && <p className="text-white/40 text-xs mt-0.5">{w.nombre_real}</p>}
                              <p className="text-white/30 text-xs mt-0.5">{w.profile_email}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-extrabold text-green-400">${n.usd.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <Gem className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-purple-300 text-sm font-semibold">{fmt(n.diamantes)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 pb-4 border-t border-purple-500/8">
                          <p className="text-white/25 text-xs font-semibold uppercase tracking-wider mb-2.5 pt-3">Datos del perfil</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                            {([['UID en app', w.id_aplicacion],['País', w.pais],['Método de pago', w.metodo_pago],['Billetera', w.billetera],['Agente', w.agente],['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono]] as [string,string|null][]).map(([label, val]) => (
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
  