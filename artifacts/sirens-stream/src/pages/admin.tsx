import { useState, useEffect } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase, type WorkerEntry, type Profile } from '@/lib/supabase'
  import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'

  interface WorkerWithProfile extends WorkerEntry {
    profile: Profile
  }

  const APPS = ['', 'Waha', 'Layla']
  const PAYMENT_METHODS = ['', 'Binance', 'Pix', 'Efectivo (Cuba)', 'Transferencia Bancaria (Cuba)']
  const COUNTRIES = [
    '','Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba',
    'Ecuador','El Salvador','España','Estados Unidos','Guatemala','Honduras',
    'México','Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
    'República Dominicana','Uruguay','Venezuela','Otro',
  ]

  export default function Admin() {
    const { user, profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [workers, setWorkers] = useState<WorkerWithProfile[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [filterApp, setFilterApp] = useState('')
    const [filterPais, setFilterPais] = useState('')
    const [filterPago, setFilterPago] = useState('')
    const [filterEmail, setFilterEmail] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
      if (!loading) {
        if (!user) { navigate('/login'); return }
        if (profile && !profile.is_admin) { navigate('/perfil'); return }
      }
    }, [loading, user, profile])

    useEffect(() => {
      if (profile?.is_admin) fetchAll()
    }, [profile])

    async function fetchAll() {
      setLoadingData(true)
      const { data: entries } = await supabase
        .from('worker_entries')
        .select('*, profiles!inner(*)')
        .order('created_at', { ascending: false })
      
      if (entries) {
        const mapped = entries.map((e: any) => ({
          ...e,
          profile: e.profiles,
        })) as WorkerWithProfile[]
        setWorkers(mapped)
      }
      setLoadingData(false)
    }

    const filtered = workers.filter(w => {
      if (filterApp && w.app_name !== filterApp) return false
      if (filterPais && w.pais !== filterPais) return false
      if (filterPago && w.metodo_pago !== filterPago) return false
      if (filterEmail && !w.profile.email.toLowerCase().includes(filterEmail.toLowerCase())) return false
      return true
    })

    const hasFilters = filterApp || filterPais || filterPago || filterEmail

    if (loading || loadingData) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse">Cargando panel de admin...</div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-3 py-1 mb-3">
              <Filter className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Admin</span>
            </div>
            <h1 className="text-2xl font-extrabold">Panel de Administración</h1>
            <p className="text-white/40 text-sm mt-1">{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Filters */}
          <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white/70">Filtros</span>
              {hasFilters && (
                <button onClick={() => { setFilterApp(''); setFilterPais(''); setFilterPago(''); setFilterEmail('') }}
                  className="ml-auto flex items-center gap-1 text-xs text-white/35 hover:text-white transition-colors">
                  <X className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">App</label>
                <select value={filterApp} onChange={e => setFilterApp(e.target.value)}
                  className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  {APPS.map(a => <option key={a} value={a}>{a || 'Todas las apps'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">País</label>
                <select value={filterPais} onChange={e => setFilterPais(e.target.value)}
                  className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c || 'Todos los países'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Método de pago</label>
                <select value={filterPago} onChange={e => setFilterPago(e.target.value)}
                  className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m || 'Todos los métodos'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Buscar por email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input type="text" value={filterEmail} onChange={e => setFilterEmail(e.target.value)}
                    placeholder="correo@..."
                    className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-10 text-center">
              <p className="text-white/30 text-sm">No hay registros que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(w => (
                <div key={w.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                        {w.app_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{w.app_name}</span>
                          {w.pais && <span className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{w.pais}</span>}
                          {w.metodo_pago && <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{w.metodo_pago}</span>}
                        </div>
                        <p className="text-white/35 text-xs truncate mt-0.5">{w.profile.email}</p>
                      </div>
                    </div>
                    {expanded === w.id ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                  </button>
                  {expanded === w.id && (
                    <div className="px-5 pb-5 border-t border-purple-500/8">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {[
                          ['Email', w.profile.email],
                          ['App', w.app_name],
                          ['Nombre real', w.nombre_real],
                          ['Nombre en app', w.nombre_en_app],
                          ['ID en la app', w.id_aplicacion],
                          ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono],
                          ['País', w.pais],
                          ['Método de pago', w.metodo_pago],
                        ].map(([label, value]) => (
                          <div key={label as string}>
                            <p className="text-white/30 text-xs mb-0.5">{label}</p>
                            <p className="text-white/80 text-sm font-medium break-all">{(value as string) || '—'}</p>
                          </div>
                        ))}
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
  