import { useState, useEffect } from 'react'
    import { useLocation } from 'wouter'
    import { useAuth } from '@/contexts/AuthContext'
    import { supabase, type WorkerEntry } from '@/lib/supabase'
    import { Search, Filter, X, ChevronDown, ChevronUp, Copy, Check, AlertTriangle, Eye, EyeOff, Settings } from 'lucide-react'

    interface WorkerRow extends WorkerEntry {
      profile_email: string
    }

    const APPS = ['', 'Waha', 'Layla', 'Howdy']
    const PAYMENT_METHODS = ['', 'Binance', 'Pix', 'Efectivo (Cuba)', 'Transferencia Bancaria (Cuba)']
    const COUNTRIES = [
      '','Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba',
      'Ecuador','El Salvador','España','Estados Unidos','Guatemala','Honduras',
      'México','Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
      'República Dominicana','Uruguay','Venezuela','Otro',
    ]

    const DUPE_FIELDS: { key: keyof WorkerRow; label: string }[] = [
      { key: 'id_aplicacion', label: 'ID en la app' },
      { key: 'billetera', label: 'Billetera' },
      { key: 'nombre_en_app', label: 'Nombre en app' },
      { key: 'telefono', label: 'Teléfono' },
    ]

    function CopyCell({ label, value, uid }: { label: string; value: string | null; uid: string }) {
      const [copied, setCopied] = useState(false)
      function copy() {
        if (!value) return
        navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      }
      return (
        <div>
          <p className="text-white/30 text-xs mb-0.5">{label}</p>
          {value ? (
            <button onClick={copy} title="Copiar" className="group flex items-center gap-1.5 text-left hover:text-purple-300 transition-colors w-full">
              <span className="text-white/80 text-sm font-medium break-all group-hover:text-purple-200 transition-colors">{value}</span>
              <span className="shrink-0 text-white/20 group-hover:text-purple-400 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </span>
            </button>
          ) : (
            <p className="text-white/25 text-sm">—</p>
          )}
        </div>
      )
    }

    export default function Admin() {
      const { user, profile, loading } = useAuth()
      const [, navigate] = useLocation()
      const [workers, setWorkers] = useState<WorkerRow[]>([])
      const [loadingData, setLoadingData] = useState(true)
      const [filterApp, setFilterApp] = useState('')
      const [filterPais, setFilterPais] = useState('')
      const [filterPago, setFilterPago] = useState('')
      const [filterEmail, setFilterEmail] = useState('')
      const [filterBilletera, setFilterBilletera] = useState('')
      const [filterAgente, setFilterAgente] = useState('')
  const [showAgencia, setShowAgencia] = useState(true);
  const [loadingAgencia, setLoadingAgencia] = useState(false);
  const [agenciaError, setAgenciaError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'show_agencia').maybeSingle()
      .then(({ data }) => { if (data) setShowAgencia(data.value !== 'false'); });
  }, []);

  async function toggleAgencia() {
    setLoadingAgencia(true);
    setAgenciaError(null);
    const newVal = !showAgencia;
    const { error } = await supabase.from('site_settings').upsert({ key: 'show_agencia', value: String(newVal) }, { onConflict: 'key' });
    if (error) {
      setAgenciaError(error.message);
    } else {
      setShowAgencia(newVal);
    }
    setLoadingAgencia(false);
  }

      const [filterNombreReal, setFilterNombreReal] = useState('')
      const [filterNombreApp, setFilterNombreApp] = useState('')
      const [filterIdApp, setFilterIdApp] = useState('')
      const [filterTelefono, setFilterTelefono] = useState('')
      const [expanded, setExpanded] = useState<string | null>(null)
      const [tab, setTab] = useState<'list' | 'dupes' | 'config'>('list')

      useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])

      useEffect(() => {
        if (!loading && user && profile !== undefined) {
          if (profile && !profile.is_admin) navigate('/perfil')
          if (profile?.is_admin) fetchAll()
        }
      }, [loading, user, profile])

      async function fetchAll() {
        setLoadingData(true)
        const { data: entries } = await supabase.from('worker_entries').select('*').order('created_at', { ascending: false })
        const { data: profiles } = await supabase.from('profiles').select('id, email')
        if (entries && profiles) {
          const pm = Object.fromEntries((profiles as any[]).map(p => [p.id, p.email]))
          setWorkers(entries.map((e: any) => ({ ...e, profile_email: pm[e.user_id] ?? 'desconocido' })))
        }
        setLoadingData(false)
      }

      const filtered = workers.filter(w => {
        if (filterApp && w.app_name !== filterApp) return false
        if (filterPais && w.pais !== filterPais) return false
        if (filterPago && w.metodo_pago !== filterPago) return false
        if (filterEmail && !w.profile_email.toLowerCase().includes(filterEmail.toLowerCase())) return false
        if (filterBilletera && !(w.billetera ?? '').toLowerCase().includes(filterBilletera.toLowerCase())) return false
        if (filterAgente && !(w.agente ?? '').toLowerCase().includes(filterAgente.toLowerCase())) return false
        if (filterNombreReal && !(w.nombre_real ?? '').toLowerCase().includes(filterNombreReal.toLowerCase())) return false
        if (filterNombreApp && !(w.nombre_en_app ?? '').toLowerCase().includes(filterNombreApp.toLowerCase())) return false
        if (filterIdApp && !(w.id_aplicacion ?? '').toLowerCase().includes(filterIdApp.toLowerCase())) return false
        if (filterTelefono && !(w.telefono ?? '').toLowerCase().includes(filterTelefono.toLowerCase())) return false
        return true
      })

      // Duplicate detection
      const duplicates: { field: string; value: string; rows: WorkerRow[] }[] = []
      for (const { key, label } of DUPE_FIELDS) {
        const groups: Record<string, WorkerRow[]> = {}
        for (const w of workers) {
          const raw = w[key] as string | null
          if (!raw?.trim()) continue
          const val = key === 'telefono' ? `${w.codigo_pais ?? ''}${raw}`.toLowerCase().trim() : raw.toLowerCase().trim()
          if (!groups[val]) groups[val] = []
          groups[val].push(w)
        }
        for (const [, rows] of Object.entries(groups)) {
          if (rows.length > 1) duplicates.push({ field: label, value: rows[0][key] as string, rows })
        }
      }

      const hasFilters = filterApp || filterPais || filterPago || filterEmail || filterBilletera || filterAgente || filterNombreReal || filterNombreApp || filterIdApp || filterTelefono

      function clearFilters() {
        setFilterApp(''); setFilterPais(''); setFilterPago(''); setFilterEmail('')
        setFilterBilletera(''); setFilterAgente(''); setFilterNombreReal('')
        setFilterNombreApp(''); setFilterIdApp(''); setFilterTelefono('')
      }

      if (loading) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 animate-pulse">Cargando...</div></div>
      if (!profile?.is_admin) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 animate-pulse">Verificando acceso...</div></div>

      return (
        <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
          <div className="max-w-5xl mx-auto px-4">

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-3 py-1 mb-3">
                <Filter className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Admin</span>
              </div>
              <h1 className="text-2xl font-extrabold">Panel de Administración</h1>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-[#0d0d1e] border border-purple-500/10 p-1 mb-6 w-fit gap-1">
              <button onClick={() => setTab('list')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'list' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}>
                Trabajadoras ({filtered.length})
              </button>
              <button onClick={() => setTab('dupes')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'dupes' ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'}`}>
                {duplicates.length > 0 && <span className="w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">{duplicates.length}</span>}
                Duplicados
              </button>
              <button onClick={() => setTab('config')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'config' ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <Settings className="w-3.5 h-3.5" />
                Configuración
              </button>
            </div>

            {tab === 'config' && (
                <div className="bg-[#0d0d1e] border border-amber-500/10 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white/70">Configuración del sitio</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#07070f] rounded-xl border border-amber-500/10">
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">Sección "Crear Agencia"</p>
                      <p className="text-xs text-white/40">Controla si los visitantes pueden ver la opción de crear su propia agencia en la página de inicio.</p>
                    </div>
                    <button onClick={toggleAgencia} disabled={loadingAgencia}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showAgencia ? 'bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25' : 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25'} disabled:opacity-50`}>
                      {showAgencia ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {loadingAgencia ? 'Guardando...' : showAgencia ? 'Visible' : 'Oculta'}
                    </button>
                  </div>
                  {agenciaError && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-300 font-semibold mb-2">Error al guardar. Probablemente la tabla no existe en Supabase.</p>
                      <p className="text-xs text-white/50 mb-1">Error: {agenciaError}</p>
                      <p className="text-xs text-white/50 mb-2">Ejecuta este SQL en Supabase SQL Editor:</p>
                      <pre className="text-[11px] text-amber-300/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap select-all">
                        {[
                          "CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY, value text);",
                          "ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;",
                          'CREATE POLICY "public_read" ON site_settings FOR SELECT USING (true);',
                          'CREATE POLICY "admin_write" ON site_settings FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));',
                          "INSERT INTO site_settings (key, value) VALUES ('show_agencia', 'true') ON CONFLICT (key) DO NOTHING;"
                        ].join("\n")}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {tab === 'list' && (
              <>
                {/* Filters */}
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white/70">Filtros</span>
                    {hasFilters && (
                      <button onClick={clearFilters}
                        className="ml-auto flex items-center gap-1 text-xs text-white/35 hover:text-white transition-colors">
                        <X className="w-3 h-3" /> Limpiar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-1">App</label>
                      <select value={filterApp} onChange={e => setFilterApp(e.target.value)}
                        className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                        {APPS.map(a => <option key={a} value={a}>{a || 'Todas'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">País</label>
                      <select value={filterPais} onChange={e => setFilterPais(e.target.value)}
                        className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                        {COUNTRIES.map(c => <option key={c} value={c}>{c || 'Todos'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Método de pago</label>
                      <select value={filterPago} onChange={e => setFilterPago(e.target.value)}
                        className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m || 'Todos'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Nombre real</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterNombreReal} onChange={e => setFilterNombreReal(e.target.value)} placeholder="Nombre real..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Nombre en app</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterNombreApp} onChange={e => setFilterNombreApp(e.target.value)} placeholder="Nickname en app..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">ID en app</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterIdApp} onChange={e => setFilterIdApp(e.target.value)} placeholder="ID de cuenta..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Email</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterEmail} onChange={e => setFilterEmail(e.target.value)} placeholder="correo@..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Teléfono</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterTelefono} onChange={e => setFilterTelefono(e.target.value)} placeholder="Número..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Billetera</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterBilletera} onChange={e => setFilterBilletera(e.target.value)} placeholder="Buscar billetera..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Agente</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input type="text" value={filterAgente} onChange={e => setFilterAgente(e.target.value)} placeholder="Nombre del agente..."
                          className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                  </div>
                </div>

                {loadingData ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl h-16 animate-pulse" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-10 text-center">
                    <p className="text-white/30 text-sm">No hay registros que coincidan.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(w => (
                      <div key={w.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                        <button onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                              {(w.nombre_real || w.app_name)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{w.nombre_real || w.app_name}</span>
                                {w.nombre_real && <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{w.app_name}</span>}
                                {w.pais && <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{w.pais}</span>}
                                {w.metodo_pago && <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{w.metodo_pago}</span>}
                                {w.agente && <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{w.agente}</span>}
                              </div>
                              <p className="text-white/35 text-xs truncate mt-0.5">{w.profile_email}</p>
                            </div>
                          </div>
                          {expanded === w.id ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                        </button>
                        {expanded === w.id && (
                          <div className="px-5 pb-5 border-t border-purple-500/8">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                              {([
                                ['Email', w.profile_email],
                                ['App', w.app_name],
                                ['Nombre real', w.nombre_real],
                                ['Nombre en app', w.nombre_en_app],
                                ['ID en la app', w.id_aplicacion],
                                ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono],
                                ['País', w.pais],
                                ['Método de pago', w.metodo_pago],
                                ['Billetera', w.billetera],
                                ['Agente', w.agente],
                              ] as [string, string | null][]).map(([label, value]) => (
                                <CopyCell key={label} label={label} value={value} uid={w.id + label} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'dupes' && (
              <div>
                {duplicates.length === 0 ? (
                  <div className="bg-[#0d0d1e] border border-green-500/15 rounded-2xl p-10 text-center">
                    <Check className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">No se detectaron duplicados.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white/40 text-sm">{duplicates.length} coincidencia{duplicates.length !== 1 ? 's' : ''} duplicada{duplicates.length !== 1 ? 's' : ''} detectada{duplicates.length !== 1 ? 's' : ''}.</p>
                    {duplicates.map((dupe, i) => (
                      <div key={i} className="bg-[#0d0d1e] border border-red-500/25 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-red-500/8 border-b border-red-500/15">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="text-red-300 text-xs font-bold uppercase tracking-wider">{dupe.field}</span>
                          <span className="text-white/40 text-xs">duplicado en {dupe.rows.length} registros</span>
                          <div className="ml-auto bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 text-xs text-red-300 font-mono max-w-[200px] truncate">{dupe.value}</div>
                        </div>
                        <div className="divide-y divide-white/4">
                          {dupe.rows.map(w => (
                            <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">{w.app_name[0]}</div>
                                <div className="min-w-0">
                                  <p className="text-white/80 text-sm font-semibold truncate">{w.nombre_real || w.nombre_en_app || '—'}</p>
                                  <p className="text-white/35 text-xs truncate">{w.profile_email} · {w.app_name}</p>
                                </div>
                              </div>
                              {w.pais && <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full hidden sm:block shrink-0">{w.pais}</span>}
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
        </div>
      )
    }
  