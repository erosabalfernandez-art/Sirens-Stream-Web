import { useState, useEffect } from 'react'
    import { useLocation } from 'wouter'
    import { useAuth } from '@/contexts/AuthContext'
    import { supabase, type WorkerEntry, COUNTRIES, getPaymentMethods, getWalletLabel } from '@/lib/supabase'
    import { Plus, Pencil, Trash2, LogOut, ChevronDown, ChevronUp, AlertTriangle, X, Check } from 'lucide-react'

    const APPS = ['Waha', 'Layla', 'Howdy']

    interface EntryFormData {
      app_name: string
      nombre_real: string
      nombre_en_app: string
      id_aplicacion: string
      telefono: string
      codigo_pais: string
      pais: string
      metodo_pago: string
      billetera: string
      agente: string
    }

    const EMPTY_FORM: EntryFormData = {
      app_name: '', nombre_real: '', nombre_en_app: '',
      id_aplicacion: '', telefono: '', codigo_pais: '+1',
      pais: '', metodo_pago: '', billetera: '', agente: ''
    }

    export default function Perfil() {
      const { user, loading, signOut } = useAuth()
      const [, navigate] = useLocation()
      const [entries, setEntries] = useState<WorkerEntry[]>([])
      const [loadingEntries, setLoadingEntries] = useState(true)
      const [showForm, setShowForm] = useState(false)
      const [editingId, setEditingId] = useState<string | null>(null)
      const [form, setForm] = useState<EntryFormData>(EMPTY_FORM)
      const [saving, setSaving] = useState(false)
      const [formError, setFormError] = useState<string | null>(null)
      const [confirmClear, setConfirmClear] = useState(false)
      const [expandedApp, setExpandedApp] = useState<string | null>(null)

      useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
      useEffect(() => { if (user) fetchEntries() }, [user])

      async function fetchEntries() {
        setLoadingEntries(true)
        const { data } = await supabase.from('worker_entries').select('*').eq('user_id', user!.id).order('created_at', { ascending: true })
        setEntries((data as WorkerEntry[]) ?? [])
        setLoadingEntries(false)
      }

      function openAdd() { setEditingId(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true) }

      function openEdit(entry: WorkerEntry) {
        setEditingId(entry.id)
        setForm({
          app_name: entry.app_name, nombre_real: entry.nombre_real ?? '',
          nombre_en_app: entry.nombre_en_app ?? '', id_aplicacion: entry.id_aplicacion ?? '',
          telefono: entry.telefono ?? '', codigo_pais: entry.codigo_pais ?? '+1',
          pais: entry.pais ?? '', metodo_pago: entry.metodo_pago ?? '',
          billetera: entry.billetera ?? '', agente: entry.agente ?? '',
        })
        setFormError(null); setShowForm(true)
      }

      async function handleSave() {
        if (!form.app_name) { setFormError('Selecciona una aplicación'); return }
        if (!form.pais) { setFormError('Selecciona tu país'); return }
        if (!form.metodo_pago) { setFormError('Selecciona un método de pago'); return }
        setSaving(true); setFormError(null)
        const payload = {
          user_id: user!.id, app_name: form.app_name,
          nombre_real: form.nombre_real || null, nombre_en_app: form.nombre_en_app || null,
          id_aplicacion: form.id_aplicacion || null, telefono: form.telefono || null,
          codigo_pais: form.codigo_pais || null, pais: form.pais || null,
          metodo_pago: form.metodo_pago || null,
          billetera: form.billetera || null,
          agente: form.agente || null,
          updated_at: new Date().toISOString(),
        }
        let error: string | null = null
        if (editingId) {
          const { error: e } = await supabase.from('worker_entries').update(payload).eq('id', editingId)
          error = e?.message ?? null
        } else {
          if (entries.find(e => e.app_name === form.app_name)) { setFormError('Ya tienes una entrada para esta app.'); setSaving(false); return }
          const { error: e } = await supabase.from('worker_entries').insert(payload)
            error = e?.message ?? null
            if (!e) {
              await supabase.from('channel_requests').upsert(
                { user_id: user!.id, app_name: form.app_name, status: 'pending' },
                { onConflict: 'user_id,app_name', ignoreDuplicates: true }
              )
            }
          }
        setSaving(false)
        if (error) { setFormError(error); return }
        setShowForm(false); fetchEntries()
      }

      async function handleDelete(id: string) { await supabase.from('worker_entries').delete().eq('id', id); fetchEntries() }
      async function handleClearAll() { await supabase.from('worker_entries').delete().eq('user_id', user!.id); setEntries([]); setConfirmClear(false) }

      const paymentMethods = getPaymentMethods(form.pais)
      const walletLabel = getWalletLabel(form.metodo_pago)
      const usedApps = entries.map(e => e.app_name)
      const availableApps = APPS.filter(a => !usedApps.includes(a) || (editingId && entries.find(e => e.id === editingId)?.app_name === a))

      if (loading) return <div className="min-h-screen bg-[#07070f] flex items-center justify-center"><div className="text-white/40 animate-pulse">Cargando...</div></div>

      return (
        <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-extrabold">Mi Perfil</h1>
                <p className="text-white/40 text-sm mt-0.5">{user?.email}</p>
              </div>
              <button onClick={signOut} className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400/70">Mis Aplicaciones</h2>
                {availableApps.length > 0 && (
                  <button onClick={openAdd} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                    <Plus className="w-3.5 h-3.5" /> Agregar app
                  </button>
                )}
              </div>
              {loadingEntries ? <div className="text-white/30 text-sm">Cargando...</div>
              : entries.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-8 text-center">
                  <p className="text-white/40 text-sm mb-4">No tienes ninguna app registrada aún.</p>
                  <button onClick={openAdd} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl mx-auto transition-all">
                    <Plus className="w-4 h-4" /> Agregar mi primera app
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map(entry => (
                    <div key={entry.id} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                      <button onClick={() => setExpandedApp(expandedApp === entry.id ? null : entry.id)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-xs">
                            {(entry.nombre_real || entry.app_name)[0].toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm">{entry.nombre_real || entry.app_name}</p>
                            <p className="text-white/35 text-xs">{entry.app_name}{entry.nombre_en_app ? ` · ${entry.nombre_en_app}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); openEdit(entry) }} className="p-1.5 rounded-lg text-white/35 hover:text-purple-400 hover:bg-purple-500/10 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(entry.id) }} className="p-1.5 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          {expandedApp === entry.id ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                        </div>
                      </button>
                      {expandedApp === entry.id && (
                        <div className="px-5 pb-5 border-t border-purple-500/8">
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {([
                              ['Nombre real', entry.nombre_real],
                              ['Nombre en app', entry.nombre_en_app],
                              ['ID en la app', entry.id_aplicacion],
                              ['Teléfono', entry.codigo_pais && entry.telefono ? `${entry.codigo_pais} ${entry.telefono}` : entry.telefono],
                              ['País', entry.pais],
                              ['Método de pago', entry.metodo_pago],
                              ...(entry.billetera ? [['Billetera', entry.billetera]] : []),
                              ...(entry.agente ? [['Agente', entry.agente]] : []),
                            ] as [string, string | null][]).map(([label, value]) => (
                              <div key={label}><p className="text-white/30 text-xs mb-0.5">{label}</p><p className="text-white/80 text-sm font-medium">{value || '—'}</p></div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {entries.length > 0 && (
              <div className="bg-[#0d0d1e] border border-red-500/15 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white mb-1">Borrar toda mi información</p>
                    <p className="text-white/40 text-xs mb-3">Elimina los datos de todas tus apps. Tu cuenta permanece activa.</p>
                    {!confirmClear ? (
                      <button onClick={() => setConfirmClear(true)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">Borrar información</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-red-400 text-xs font-semibold">¿Confirmas?</p>
                        <button onClick={handleClearAll} className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg transition-all"><Check className="w-3 h-3" /> Sí, borrar</button>
                        <button onClick={() => setConfirmClear(false)} className="text-white/35 hover:text-white text-xs transition-colors">Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setShowForm(false)}>
              <div className="bg-[#0d0d1e] border border-purple-500/20 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
                  <h3 className="font-bold">{editingId ? 'Editar entrada' : 'Nueva app'}</h3>
                  <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <Field label="Aplicación *">
                    <select value={form.app_name} onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))} disabled={!!editingId}
                      className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50">
                      <option value="">Seleccionar...</option>
                      {(editingId ? APPS : availableApps).map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="Nombre real">
                    <FInput value={form.nombre_real} onChange={v => setForm(f => ({ ...f, nombre_real: v }))} placeholder="Tu nombre completo" />
                  </Field>
                  <Field label="Nombre en la aplicación">
                    <FInput value={form.nombre_en_app} onChange={v => setForm(f => ({ ...f, nombre_en_app: v }))} placeholder="Nickname en la app" />
                  </Field>
                  <Field label="ID en la aplicación">
                    <FInput value={form.id_aplicacion} onChange={v => setForm(f => ({ ...f, id_aplicacion: v }))} placeholder="ID de tu cuenta" />
                  </Field>
                  <Field label="País *">
                    <select value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value, metodo_pago: '', billetera: '' }))}
                      className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50">
                      <option value="">Seleccionar...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Teléfono">
                    <div className="flex gap-2">
                      <FInput value={form.codigo_pais} onChange={v => setForm(f => ({ ...f, codigo_pais: v }))} placeholder="+53" className="w-20" />
                      <FInput value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} placeholder="Número" className="flex-1" />
                    </div>
                  </Field>
                  <Field label="Método de pago *">
                    <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value, billetera: '' }))} disabled={!form.pais}
                      className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 disabled:opacity-40">
                      <option value="">{form.pais ? 'Seleccionar...' : 'Primero selecciona tu país'}</option>
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label={walletLabel || 'Billetera / Dirección de pago'}>
                    <FInput value={form.billetera} onChange={v => setForm(f => ({ ...f, billetera: v }))} placeholder="Ej: 123456789" />
                  </Field>
                  <Field label="Agente (opcional)">
                    <FInput value={form.agente} onChange={v => setForm(f => ({ ...f, agente: v }))} placeholder="Nombre de tu agente" />
                  </Field>

                  {formError && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
                  <button onClick={handleSave} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all">
                    {saving ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    function Field({ label, children }: { label: string; children: React.ReactNode }) {
      return <div><label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
    }

    function FInput({ value, onChange, placeholder, className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
      return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`bg-[#07070f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-colors ${className}`} />
    }
  