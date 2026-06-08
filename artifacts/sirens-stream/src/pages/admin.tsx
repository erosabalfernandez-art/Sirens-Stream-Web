import { useState, useEffect, useRef } from 'react'
    import { useLocation } from 'wouter'
    import { useAuth } from '@/contexts/AuthContext'
    import { supabase, type WorkerEntry, COUNTRIES, getPaymentMethods, getWalletLabel } from '@/lib/supabase'
    import { Search, Filter, X, ChevronDown, ChevronUp, Copy, Check, CheckCircle2, Clock, DollarSign, AlertTriangle, Eye, EyeOff, Settings, MessageSquare, Send, Trash2, Radio, Bell, Users } from 'lucide-react'
  import { sendPushViaApi } from '@/lib/push'

    interface WorkerRow extends WorkerEntry {
      profile_email: string
    }

    interface NotifLog {
      id: string
      ts: Date
      app: string
      type: string
      title: string
      total: number
      sent: number
      error?: string
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

    function CopyCell({ label, value, uid, href }: { label: string; value: string | null; uid: string; href?: string }) {
      const [copied, setCopied] = useState(false)
      function copy() {
        if (!value) return
        navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      }
      return (
        <div>
          <p className="text-white/30 text-xs mb-0.5">{label}</p>
          {value ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={copy} title="Copiar" className="group flex items-center gap-1.5 text-left hover:text-purple-300 transition-colors">
                <span className="text-white/80 text-sm font-medium break-all group-hover:text-purple-200 transition-colors">{value}</span>
                <span className="shrink-0 text-white/20 group-hover:text-purple-400 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </span>
              </button>
                <button onClick={() => setTab('cambio')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'cambio' ? 'bg-green-600 text-white' : 'text-white/40 hover:text-white'}`}>
                  💱 Cambio
                </button>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="text-xs bg-green-500/15 border border-green-500/25 text-green-300 px-2 py-0.5 rounded-full hover:bg-green-500/25 transition-colors font-semibold shrink-0">
                  WhatsApp ↗
                </a>
              )}
            </div>
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
      const emailMapRef = useRef<Record<string, string>>({})
      const [filterApp, setFilterApp] = useState(() => { try { return localStorage.getItem('ea_af_app') ?? '' } catch { return '' } })
      const [filterPais, setFilterPais] = useState(() => { try { return localStorage.getItem('ea_af_pais') ?? '' } catch { return '' } })
      const [filterPago, setFilterPago] = useState(() => { try { return localStorage.getItem('ea_af_pago') ?? '' } catch { return '' } })
      const [filterEmail, setFilterEmail] = useState(() => { try { return localStorage.getItem('ea_af_email') ?? '' } catch { return '' } })
      const [filterBilletera, setFilterBilletera] = useState(() => { try { return localStorage.getItem('ea_af_billetera') ?? '' } catch { return '' } })
      const [filterAgente, setFilterAgente] = useState(() => { try { return localStorage.getItem('ea_af_agente') ?? '' } catch { return '' } })
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

      const [filterNombreReal, setFilterNombreReal] = useState(() => { try { return localStorage.getItem('ea_af_nombre_real') ?? '' } catch { return '' } })
      const [filterNombreApp, setFilterNombreApp] = useState(() => { try { return localStorage.getItem('ea_af_nombre_app') ?? '' } catch { return '' } })
      const [filterIdApp, setFilterIdApp] = useState(() => { try { return localStorage.getItem('ea_af_id_app') ?? '' } catch { return '' } })
      const [filterTelefono, setFilterTelefono] = useState(() => { try { return localStorage.getItem('ea_af_telefono') ?? '' } catch { return '' } })
      const [expanded, setExpanded] = useState<string | null>(null)
      const [tab, setTab] = useState<'list' | 'dupes' | 'config' | 'solicitudes' | 'canales' | 'notifs' | 'pagos' | 'agentes' | 'cambio'>('list')

        // Channel state
        const [solicitudes, setSolicitudes] = useState<{id:string;user_id:string;app_name:string;status:string;created_at:string;profile_email:string}[]>([])
        const [loadingSol, setLoadingSol] = useState(false)
        const [channelApp, setChannelApp] = useState<'Waha'|'Layla'|'Howdy'>('Waha')
        const [channelMessages, setChannelMessages] = useState<{id:string;app_name:string;content:string|null;image_url:string|null;created_at:string}[]>([])
        const [channelContent, setChannelContent] = useState('')
        const [channelImage, setChannelImage] = useState('')
        const [channelPosting, setChannelPosting] = useState(false)
        const [loadingMsgs, setLoadingMsgs] = useState(false)
        const [notifying, setNotifying] = useState<Record<string, boolean>>({})
          const [agents, setAgents] = useState<{id:string;email:string;agent_name:string|null;agent_code:string|null;is_agent:boolean}[]>([])
          const [agentFormName, setAgentFormName] = useState('')
          const [agentFormEmail, setAgentFormEmail] = useState('')
          const [agentFormPassword, setAgentFormPassword] = useState('')
          const [creatingAgent, setCreatingAgent] = useState(false)
          const [agentCreateMsg, setAgentCreateMsg] = useState<{ok:boolean;msg:string}|null>(null)
        const [notifOk, setNotifOk] = useState<Record<string, boolean>>({})
        const [notifLogs, setNotifLogs] = useState<NotifLog[]>([])
        const [pagosApp, setPagosApp] = useState<'Waha'|'Layla'|'Howdy'>(() => { try { return (localStorage.getItem('ea_pagos_app') as 'Waha'|'Layla'|'Howdy') ?? 'Waha' } catch { return 'Waha' } })
        const [pagosData, setPagosData] = useState<any[]>([])
        const [pagosLoading, setPagosLoading] = useState(false)
        const [pagosSemana, setPagosSemana] = useState('')
        const [pagosNeedSetup, setPagosNeedSetup] = useState(false)
        const [testPushSending, setTestPushSending] = useState<Record<string, boolean>>({})
        const [testPushOk, setTestPushOk] = useState<Record<string, boolean>>({})
        const [testPushAgents, setTestPushAgents] = useState(false)
        const [testPushAgentsOk, setTestPushAgentsOk] = useState(false)
        const [rates, setRates] = useState<Record<string,number>>({})
        const [rateInputs, setRateInputs] = useState<Record<string,string>>({})
        const [savingRate, setSavingRate] = useState<string|null>(null)
        const [rateSaved, setRateSaved] = useState<string|null>(null)
        async function fetchPagosData(app: string) {
          try { localStorage.setItem('ea_pagos_app', app) } catch {}
          setPagosLoading(true); setPagosNeedSetup(false)
          const { data: semanaData, error: semErr } = await supabase
            .from('published_salaries').select('semana').eq('app_name', app)
            .order('semana', { ascending: false }).limit(1).maybeSingle()
          if (semErr || !semanaData) { setPagosData([]); setPagosSemana(''); setPagosLoading(false); return }
          const semana = semanaData.semana
          setPagosSemana(semana)
          const { data: salaries } = await supabase.from('published_salaries')
            .select('*').eq('app_name', app).eq('semana', semana)
          if (!salaries || salaries.length === 0) { setPagosData([]); setPagosLoading(false); return }
          const userIds = (salaries as any[]).map((s: any) => s.user_id)
          const salaryIds = (salaries as any[]).map((s: any) => s.id)
          const [{ data: profiles }, { data: workers }, { data: confirmations, error: confErr }] = await Promise.all([
            supabase.from('profiles').select('id, email').in('id', userIds),
            supabase.from('worker_entries').select('user_id, nombre_real, nombre_en_app, metodo_pago, billetera').eq('app_name', app).in('user_id', userIds),
            supabase.from('payment_confirmations').select('salary_id, confirmed_at').in('salary_id', salaryIds),
          ])
          if (confErr?.code === '42P01') { setPagosNeedSetup(true); setPagosLoading(false); return }
          const profileMap: Record<string,string> = Object.fromEntries(((profiles ?? []) as any[]).map((p: any) => [p.id, p.email]))
          const workerMap: Record<string,any> = Object.fromEntries(((workers ?? []) as any[]).map((w: any) => [w.user_id, w]))
          const confMap: Record<string,string> = Object.fromEntries(((confirmations ?? []) as any[]).map((c: any) => [c.salary_id, c.confirmed_at]))
          const merged = (salaries as any[]).map((s: any) => {
            const w = workerMap[s.user_id] ?? {}
            const confAt = confMap[s.id]
            return {
              salary_id: s.id, user_id: s.user_id, semana: s.semana, usd: Number(s.usd),
              apodo: (s.extras?.Apodo ?? s.extras?.apodo ?? s.extras?.Nick ?? w.nombre_en_app ?? '—') as string,
              nombre_real: w.nombre_real ?? null, nombre_en_app: w.nombre_en_app ?? null,
              email: profileMap[s.user_id] ?? '—',
              metodo_pago: w.metodo_pago ?? null, billetera: w.billetera ?? null,
              confirmed: !!confAt, confirmed_at: confAt ?? null,
            }
          })
          setPagosData(merged); setPagosLoading(false)
        }

        async function notifyApp(app: string, type: 'salary' | 'canal') {
          const key = `${app}_${type}`
          setNotifying(p => ({ ...p, [key]: true }))
          setNotifOk(p => ({ ...p, [key]: false }))
          let ids: string[] = []
          if (type === 'salary') {
            const { data } = await supabase.from('worker_entries').select('user_id').eq('app_name', app)
            ids = [...new Set((data ?? []).map((r: any) => r.user_id))]
          } else {
            const { data } = await supabase.from('channel_requests').select('user_id').eq('app_name', app).eq('status', 'approved')
            ids = (data ?? []).map((r: any) => r.user_id)
          }
          const msg = type === 'salary'
            ? { title: `💰 Tu salario de ${app} está disponible`, body: 'Entra a ver tus ganancias en tu perfil.', url: '/salarios' }
            : { title: `📢 Nuevo en tu canal ${app}`, body: 'Hay una actualización en tu canal. ¡Revísala!', url: '/canales' }
          let sent = 0; let logError: string | undefined
          if (ids.length > 0) {
            const result = await sendPushViaApi(ids, msg.title, msg.body, msg.url)
            sent = result.sent; logError = result.error
          }
          setNotifLogs(prev => [{
            id: crypto.randomUUID(), ts: new Date(), app, type,
            title: msg.title, total: ids.length, sent, error: logError
          }, ...prev].slice(0, 50))
          setNotifying(p => ({ ...p, [key]: false }))
          setNotifOk(p => ({ ...p, [key]: true }))
          setTimeout(() => setNotifOk(p => ({ ...p, [key]: false })), 4000)
        }

        async function sendTestPushToWorker(worker: WorkerRow) {
          setTestPushSending(p => ({ ...p, [worker.id]: true }))
          setTestPushOk(p => ({ ...p, [worker.id]: false }))
          await sendPushViaApi(
            [worker.user_id],
            '🔔 Notificación de prueba',
            `Hola${worker.nombre_real ? ` ${worker.nombre_real}` : ''}! Esta es una notificación de prueba enviada desde el panel admin.`,
            '/perfil'
          )
          setTestPushSending(p => ({ ...p, [worker.id]: false }))
          setTestPushOk(p => ({ ...p, [worker.id]: true }))
          setTimeout(() => setTestPushOk(p => ({ ...p, [worker.id]: false })), 4000)
        }

        async function sendTestPushToAllAgents() {
          setTestPushAgents(true); setTestPushAgentsOk(false)
          const { data: agentProfs } = await supabase.from('profiles').select('id').eq('is_agent', true)
          const ids = ((agentProfs ?? []) as {id:string}[]).map(p => p.id)
          if (ids.length > 0) await sendPushViaApi(ids, '🔔 Notificación de prueba (Agentes)', 'Esta es una notificación de prueba enviada desde el panel admin.', '/agente')
          setTestPushAgents(false); setTestPushAgentsOk(true)
          setTimeout(() => setTestPushAgentsOk(false), 4000)
        }

        useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])

      useEffect(() => {
        if (!loading && user && profile !== undefined) {
          if (profile && !profile.is_admin) navigate('/perfil')
          if (profile?.is_admin) fetchAll()
        }
      }, [loading, user, profile])

      async function fetchSolicitudes() {
          setLoadingSol(true)
          const { data: reqs } = await supabase.from('channel_requests').select('*').order('created_at', { ascending: false })
          if (Object.keys(emailMapRef.current).length === 0) {
            const { data: profs } = await supabase.from('profiles').select('id, email')
            emailMapRef.current = Object.fromEntries(((profs ?? []) as any[]).map((p: any) => [p.id, p.email]))
          }
          const pm = emailMapRef.current
          setSolicitudes(((reqs ?? []) as any[]).map((r: any) => ({ ...r, profile_email: pm[r.user_id] ?? 'desconocido' })))
          setLoadingSol(false)
        }

        async function resolveRequest(id: string, status: 'approved' | 'rejected') {
          await supabase.from('channel_requests').update({ status, resolved_at: new Date().toISOString(), resolved_by: user!.id }).eq('id', id)
          fetchSolicitudes()
        }

        async function fetchChannelMessages(app: string) {
          setLoadingMsgs(true)
          const { data } = await supabase.from('channel_messages').select('*').eq('app_name', app).order('created_at', { ascending: false })
          setChannelMessages((data ?? []) as any[])
          setLoadingMsgs(false)
        }

        async function postMessage() {
          if (!channelContent.trim() && !channelImage.trim()) return
          setChannelPosting(true)
          const { error } = await supabase.from('channel_messages').insert({
            app_name: channelApp,
            content: channelContent.trim() || null,
            image_url: channelImage.trim() || null,
            created_by: user!.id,
          })
          if (!error) {
            // Notify approved workers in this channel
            const { data: approved } = await supabase.from('channel_requests').select('user_id').eq('app_name', channelApp).eq('status', 'approved')
            const ids = (approved ?? []).map((r: any) => r.user_id)
            if (ids.length > 0) {
              sendPushViaApi(ids, `📢 Nuevo comunicado — ${channelApp}`, channelContent.trim().slice(0, 80) || '📷 Imagen', '/canales', true)
            }
            setChannelContent(''); setChannelImage('')
            fetchChannelMessages(channelApp)
          }
          setChannelPosting(false)
        }

        async function deleteMessage(id: string) {
          await supabase.from('channel_messages').delete().eq('id', id)
          setChannelMessages(prev => prev.filter(m => m.id !== id))
        }

        async function fetchAll() {
        setLoadingData(true)
        fetchRates()
        const [{ data: entries }, { data: profiles }] = await Promise.all([
          supabase.from('worker_entries').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, email'),
        ])
        const pm = Object.fromEntries(((profiles ?? []) as any[]).map(p => [p.id, p.email]))
        emailMapRef.current = pm
        if (entries) {
          setWorkers(entries.map((e: any) => ({ ...e, profile_email: pm[e.user_id] ?? 'desconocido' })))
        }
        setLoadingData(false)
      }

      // Persist admin filters to localStorage
        useEffect(() => {
          try {
            localStorage.setItem('ea_af_app', filterApp); localStorage.setItem('ea_af_pais', filterPais)
            localStorage.setItem('ea_af_pago', filterPago); localStorage.setItem('ea_af_email', filterEmail)
            localStorage.setItem('ea_af_billetera', filterBilletera); localStorage.setItem('ea_af_agente', filterAgente)
            localStorage.setItem('ea_af_nombre_real', filterNombreReal); localStorage.setItem('ea_af_nombre_app', filterNombreApp)
            localStorage.setItem('ea_af_id_app', filterIdApp); localStorage.setItem('ea_af_telefono', filterTelefono)
          } catch {}
        }, [filterApp, filterPais, filterPago, filterEmail, filterBilletera, filterAgente, filterNombreReal, filterNombreApp, filterIdApp, filterTelefono])

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

      async function fetchAgents() {
          const { data } = await supabase.from('profiles').select('id, email, agent_name, agent_code, is_agent').eq('is_agent', true).order('created_at', { ascending: false })
          setAgents((data ?? []) as {id:string;email:string;agent_name:string|null;agent_code:string|null;is_agent:boolean}[])
        }

        async function createAgent() {
          if (!agentFormName.trim() || !agentFormEmail.trim() || !agentFormPassword.trim()) {
            setAgentCreateMsg({ ok: false, msg: 'Completa todos los campos.' }); return
          }
          setCreatingAgent(true); setAgentCreateMsg(null)
          const { createClient } = await import('@supabase/supabase-js')
          const tmpClient = createClient(
            import.meta.env.VITE_SUPABASE_URL as string,
            import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
          )
          const { data: signUpData, error: signUpError } = await tmpClient.auth.signUp({ email: agentFormEmail.trim(), password: agentFormPassword.trim() })
          if (signUpError || !signUpData.user) {
            setAgentCreateMsg({ ok: false, msg: signUpError?.message ?? 'Error al crear cuenta.' })
            setCreatingAgent(false); return
          }
          const userId = signUpData.user.id
          const nameKey = agentFormName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'AGENT'
          const { data: existingCodes } = await supabase.from('profiles').select('agent_code').not('agent_code', 'is', null)
          const samePrefixCount = ((existingCodes ?? []) as {agent_code:string|null}[]).filter(p => p.agent_code?.startsWith(nameKey + '-')).length
          const agentCode = `${nameKey}-${String(samePrefixCount + 1).padStart(3, '0')}`
          await supabase.from('profiles').upsert({ id: userId, email: agentFormEmail.trim(), is_agent: true, agent_name: agentFormName.trim(), agent_code: agentCode, is_admin: false }, { onConflict: 'id' })
          setAgentCreateMsg({ ok: true, msg: `✓ Agente "${agentFormName.trim()}" creado. Código de agente: ${agentCode}` })
          setAgentFormName(''); setAgentFormEmail(''); setAgentFormPassword('')
          await fetchAgents()
          setCreatingAgent(false)
        }

          async function fetchRates() {
            const { data } = await supabase.from('exchange_rates').select('*')
            const r: Record<string,number> = {}; const inp: Record<string,string> = {}
            for (const row of (data ?? []) as {id:string;rate:number}[]) { r[row.id] = row.rate; inp[row.id] = String(row.rate === 0 ? '' : row.rate) }
            setRates(r); setRateInputs(inp)
          }

          async function publishRate(id: string) {
            const rate = parseFloat(rateInputs[id] || '0')
            if (isNaN(rate) || rate < 0) return
            setSavingRate(id)
            await supabase.from('exchange_rates').upsert({ id, rate, updated_at: new Date().toISOString() }, { onConflict: 'id' })
            setRates(prev => ({ ...prev, [id]: rate }))
            // Notify affected users
            if (id === 'efectivo_worker') {
              const { data } = await supabase.from('worker_entries').select('user_id').eq('metodo_pago', 'Efectivo (Cuba)').in('app_name', ['Waha', 'Howdy'])
              const ids = [...new Set(((data ?? []) as {user_id:string}[]).map(w => w.user_id))]
              if (ids.length > 0) sendPushViaApi(ids, '💱 Cambio Efectivo actualizado', `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar — entra a ver tu salario.`, '/salarios', false)
            } else if (id === 'transferencia_worker') {
              const { data } = await supabase.from('worker_entries').select('user_id').eq('metodo_pago', 'Transferencia Bancaria (Cuba)').in('app_name', ['Waha', 'Howdy'])
              const ids = [...new Set(((data ?? []) as {user_id:string}[]).map(w => w.user_id))]
              if (ids.length > 0) sendPushViaApi(ids, '💱 Cambio Transferencia actualizado', `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar — entra a ver tu salario.`, '/salarios', false)
            } else {
              const { data } = await supabase.from('profiles').select('id').eq('is_agent', true)
              const ids = ((data ?? []) as {id:string}[]).map(p => p.id)
              const label = id === 'efectivo_agent' ? 'Efectivo' : 'Transferencia'
              if (ids.length > 0) sendPushViaApi(ids, `💱 Cambio ${label} para agentes actualizado`, `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar.`, '/agente', false)
            }
            setSavingRate(null); setRateSaved(id); setTimeout(() => setRateSaved(null), 3000)
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
              <button onClick={() => { setTab('solicitudes'); fetchSolicitudes() }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'solicitudes' ? 'bg-orange-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <Bell className="w-3.5 h-3.5" />
                Solicitudes
                {solicitudes.filter(s => s.status === 'pending').length > 0 && (
                  <span className="w-4 h-4 bg-orange-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {solicitudes.filter(s => s.status === 'pending').length}
                  </span>
                )}
              </button>
              <button onClick={() => { setTab('canales'); fetchChannelMessages(channelApp) }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'canales' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <Radio className="w-3.5 h-3.5" />
                Canales
              </button>
              <button onClick={() => setTab('notifs')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'notifs' ? 'bg-green-700 text-white' : 'text-white/40 hover:text-white'}`}>
                <Bell className="w-3.5 h-3.5" />
                Notificaciones
              </button>
              <button onClick={() => { setTab('pagos'); fetchPagosData(pagosApp) }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'pagos' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <DollarSign className="w-3.5 h-3.5" />
                Control Pagos
              </button>
              <button onClick={() => { setTab('agentes'); fetchAgents() }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'agentes' ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <Users className="w-3.5 h-3.5" />
                Agentes
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
                                {w.telefono && (
                                  <a
                                    href={`https://wa.me/${(`${w.codigo_pais ?? ''}${w.telefono}`).replace(/[\s\-\+\(\)]/g, '')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full hover:bg-emerald-500/25 transition-colors font-medium">
                                    📱 {w.codigo_pais ? `${w.codigo_pais} ${w.telefono}` : w.telefono}
                                  </a>
                                )}
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
                                ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono, w.telefono ? `https://wa.me/${(`${w.codigo_pais ?? ''}${w.telefono}`).replace(/[\s\-\+\(\)]/g, '')}` : undefined],
                                ['País', w.pais],
                                ['Método de pago', w.metodo_pago],
                                ['Billetera', w.billetera],
                                ['Agente', w.agente],
                              ] as [string, string | null, string?][]).map(([label, value, href]) => (
                                <CopyCell key={label} label={label} value={value} uid={w.id + label} href={href} />
                              ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-purple-500/8 flex items-center gap-3 flex-wrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); sendTestPushToWorker(w); }}
                                disabled={testPushSending[w.id]}
                                className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                              >
                                {testPushSending[w.id] ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : testPushOk[w.id] ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Bell className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {testPushOk[w.id] ? '✓ Notificación enviada' : testPushSending[w.id] ? 'Enviando...' : 'Notificación de prueba'}
                                </span>
                              </button>
                              <span className="text-xs text-white/25">Solo le llega a ella</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'solicitudes' && (
                <div>
                  {loadingSol ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}</div>
                  ) : solicitudes.length === 0 ? (
                    <div className="bg-[#0d0d1e] border border-orange-500/10 rounded-2xl p-10 text-center">
                      <Bell className="w-8 h-8 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">No hay solicitudes de canal.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {['pending','approved','rejected'].map(status => {
                        const group = solicitudes.filter(s => s.status === status)
                        if (group.length === 0) return null
                        const colors: Record<string,string> = { pending:'amber', approved:'green', rejected:'red' }
                        const labels: Record<string,string> = { pending:'⏳ Pendientes', approved:'✓ Aprobadas', rejected:'✗ Rechazadas' }
                        const c = colors[status]
                        return (
                          <div key={status}>
                            <p className={`text-${c}-400 text-xs font-bold uppercase tracking-wider mb-2`}>{labels[status]} ({group.length})</p>
                            <div className="space-y-2">
                              {group.map(s => (
                                <div key={s.id} className={`bg-[#0d0d1e] border border-${c}-500/15 rounded-2xl px-5 py-3 flex items-center justify-between gap-4`}>
                                  <div>
                                    <span className={`text-xs font-bold bg-${c}-500/10 text-${c}-300 px-2 py-0.5 rounded-full mr-2`}>{s.app_name}</span>
                                    <span className="text-sm text-white/70">{s.profile_email}</span>
                                    <p className="text-white/30 text-xs mt-0.5">{new Date(s.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</p>
                                  </div>
                                  {status === 'pending' && (
                                    <div className="flex gap-2">
                                      <button onClick={() => resolveRequest(s.id, 'approved')}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all">
                                        Aprobar
                                      </button>
                                      <button onClick={() => resolveRequest(s.id, 'rejected')}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all">
                                        Rechazar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'canales' && (
                <div>
                  {/* App selector */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    {(['Waha','Layla','Howdy'] as const).map(app => (
                      <button key={app} onClick={() => setChannelApp(app)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${channelApp === app ? 'bg-blue-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/50 hover:text-white'}`}>
                        {app}
                      </button>
                    ))}
                  </div>

                  {/* Post new message */}
                  <div className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Send className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white/70">Nuevo comunicado — {channelApp}</span>
                    </div>
                    <textarea value={channelContent} onChange={e => setChannelContent(e.target.value)}
                      placeholder="Escribe el mensaje aquí..."
                      rows={4}
                      className="w-full bg-[#07070f] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 resize-none mb-3" />
                    <input type="url" value={channelImage} onChange={e => setChannelImage(e.target.value)}
                      placeholder="URL de imagen (opcional)"
                      className="w-full bg-[#07070f] border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 mb-3" />
                    <button onClick={postMessage} disabled={channelPosting || (!channelContent.trim() && !channelImage.trim())}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                      {channelPosting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                      {channelPosting ? 'Publicando...' : 'Publicar y Notificar'}
                    </button>
                  </div>

                  {/* Messages list */}
                  {loadingMsgs ? (
                    <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}</div>
                  ) : channelMessages.length === 0 ? (
                    <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-10 text-center">
                      <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">No hay comunicados en {channelApp} aún.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {channelMessages.map(msg => (
                        <div key={msg.id} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl overflow-hidden">
                          {msg.image_url && <img src={msg.image_url} alt="comunicado" className="w-full max-h-64 object-cover" />}
                          <div className="px-5 py-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {msg.content && <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                              <p className="text-white/30 text-xs mt-2">
                                {new Date(msg.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                              </p>
                            </div>
                            <button onClick={() => deleteMessage(msg.id)}
                              className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {tab === 'pagos' && (
                <div className="space-y-5">
                  {/* App selector + header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">Control de Pagos Semanales</p>
                      {pagosSemana && <p className="text-xs text-white/35 mt-0.5">Semana activa: {pagosSemana}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(['Waha', 'Layla', 'Howdy'] as const).map(a => (
                        <button key={a} onClick={() => { setPagosApp(a); fetchPagosData(a) }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${pagosApp === a ? 'bg-emerald-600 text-white' : 'bg-[#0d0d1e] border border-white/10 text-white/50 hover:text-white'}`}>
                          {a}
                        </button>
                      ))}
                      <button onClick={() => fetchPagosData(pagosApp)} disabled={pagosLoading}
                        className="px-3 py-2 rounded-xl text-sm font-bold bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white transition-all disabled:opacity-40">
                        {pagosLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /> : '↻'}
                      </button>
                    </div>
                  </div>

                  {/* SQL setup notice */}
                  {pagosNeedSetup && (
                    <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
                      <p className="text-amber-300 text-sm font-bold mb-2">⚠️ Falta crear la tabla en Supabase</p>
                      <p className="text-white/50 text-xs mb-3">Ejecuta este SQL en el Editor SQL de Supabase para activar el sistema de confirmación de pagos:</p>
                      <pre className="text-[11px] text-emerald-300/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap select-all text-left">{`CREATE TABLE IF NOT EXISTS payment_confirmations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  app_name text NOT NULL,
  semana text NOT NULL,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(salary_id)
);
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_insert_own" ON payment_confirmations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_read_own" ON payment_confirmations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_read_all" ON payment_confirmations FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
);`}
                      </pre>
                      <p className="text-white/30 text-xs mt-3">Después de crearlo, recarga esta página.</p>
                    </div>
                  )}

                  {/* Layla / Howdy not yet */}
                  {(pagosApp === 'Layla' || pagosApp === 'Howdy') && !pagosNeedSetup && (
                    <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl p-10 text-center">
                      <Clock className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
                      <p className="text-amber-300/70 text-sm font-semibold">Nómina de {pagosApp} no implementada aún</p>
                      <p className="text-white/30 text-xs mt-1">Disponible en cuanto subas la primera nómina de {pagosApp}.</p>
                    </div>
                  )}

                  {/* Waha (or any app with data) */}
                  {!pagosNeedSetup && (
                    pagosLoading ? (
                      <div className="space-y-3">
                        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
                      </div>
                    ) : !pagosSemana ? (
                      <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                        <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No hay nómina publicada para {pagosApp} todavía.</p>
                        <p className="text-white/25 text-xs mt-1">Sube la nómina desde la sección Nómina para ver el control aquí.</p>
                      </div>
                    ) : pagosData.length === 0 ? (
                      <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-12 text-center">
                        <p className="text-white/40 text-sm">No hay datos de pago para la semana {pagosSemana}.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Stats bar */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#0d0d1e] border border-green-500/20 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-extrabold text-green-400">{pagosData.filter((r: any) => r.confirmed).length}</p>
                            <p className="text-xs text-white/40 mt-1">Confirmaron pago</p>
                          </div>
                          <div className="bg-[#0d0d1e] border border-amber-500/20 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-extrabold text-amber-400">{pagosData.filter((r: any) => !r.confirmed).length}</p>
                            <p className="text-xs text-white/40 mt-1">Sin confirmar</p>
                          </div>
                          <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-4 text-center">
                            <p className="text-2xl font-extrabold text-purple-400">{pagosData.length}</p>
                            <p className="text-xs text-white/40 mt-1">Total cobraron</p>
                          </div>
                        </div>

                        {/* Confirmed list */}
                        {pagosData.filter((r: any) => r.confirmed).length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-green-400/70 mb-3 px-1">
                              ✓ Confirmaron recibir pago ({pagosData.filter((r: any) => r.confirmed).length})
                            </h3>
                            <div className="space-y-2">
                              {pagosData.filter((r: any) => r.confirmed).map((row: any) => (
                                <div key={row.salary_id} className="bg-[#0d0d1e] border border-green-500/20 rounded-2xl px-5 py-3 flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                    <p className="text-xs text-white/35 truncate">{row.email} · <span className="text-green-400">${row.usd.toFixed(2)} USD</span></p>
                                    {row.metodo_pago && <p className="text-xs text-white/20 mt-0.5">{row.metodo_pago}{row.billetera ? ` · ${row.billetera}` : ''}</p>}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-green-400 font-bold">Confirmado ✓</p>
                                    {row.confirmed_at && (
                                      <p className="text-xs text-white/25">{new Date(row.confirmed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending list */}
                        {pagosData.filter((r: any) => !r.confirmed).length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-3 px-1">
                              ⏳ Faltan por confirmar ({pagosData.filter((r: any) => !r.confirmed).length})
                            </h3>
                            <div className="space-y-2">
                              {pagosData.filter((r: any) => !r.confirmed).map((row: any) => (
                                <div key={row.salary_id} className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl px-5 py-3 flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                    <p className="text-xs text-white/35 truncate">{row.email} · <span className="text-amber-400">${row.usd.toFixed(2)} USD</span></p>
                                    {row.metodo_pago && <p className="text-xs text-white/20 mt-0.5">{row.metodo_pago}{row.billetera ? ` · ${row.billetera}` : ''}</p>}
                                  </div>
                                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3 py-1 rounded-full font-semibold shrink-0">Sin confirmar</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {tab === 'notifs' && (
                <div className="space-y-4">
                  <p className="text-xs text-white/30 mb-4">Envía notificaciones push a las trabajadoras de cada app. Solo reciben la notificación las chicas de esa app específica.</p>
                  {(['Waha', 'Layla', 'Howdy'] as const).map(app => (
                    <div key={app} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5">
                      <p className="text-sm font-bold text-white mb-4">{app}</p>
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => notifyApp(app, 'salary')} disabled={notifying[`${app}_salary`]}
                          className="flex items-center gap-2 bg-green-600/90 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all">
                          {notifying[`${app}_salary`] ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>💰</span>}
                          {notifOk[`${app}_salary`] ? '✓ Enviado' : 'Notificar salario'}
                        </button>
                        <button onClick={() => notifyApp(app, 'canal')} disabled={notifying[`${app}_canal`]}
                          className="flex items-center gap-2 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all">
                          {notifying[`${app}_canal`] ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>📢</span>}
                          {notifOk[`${app}_canal`] ? '✓ Enviado' : 'Notificar actualización canal'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {notifLogs.length > 0 && (
                    <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-purple-500/10">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Registro de envíos</span>
                        <button onClick={() => setNotifLogs([])} className="text-xs text-white/25 hover:text-white/50 transition-colors">Limpiar</button>
                      </div>
                      <div className="divide-y divide-white/4 max-h-72 overflow-y-auto">
                        {notifLogs.map(log => (
                          <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${log.error ? 'bg-red-500/15' : log.sent > 0 ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                              {log.error ? '❌' : log.sent > 0 ? '✓' : '⚠️'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white/80 truncate">{log.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-white/35">{log.app} · {log.type === 'salary' ? 'salario' : log.type === 'canal' ? 'canal' : 'mensaje'}</span>
                                {log.error
                                  ? <span className="text-xs text-red-400">Error: {log.error}</span>
                                  : <span className={`text-xs font-semibold ${log.sent > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                      {log.sent}/{log.total} dispositivos
                                    </span>
                                }
                              </div>
                            </div>
                            <span className="text-xs text-white/20 shrink-0 tabular-nums">
                              {log.ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
  
                {tab === 'agentes' && (
                  <div className="space-y-6">
                    {/* Botón de prueba de notificación para agentes */}
                    <div className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400" /> Notificación de prueba para agentes</p>
                        <p className="text-white/35 text-xs">Envía una push de prueba a todas las cuentas de agente para verificar que les llegan las notificaciones.</p>
                      </div>
                      <button onClick={sendTestPushToAllAgents} disabled={testPushAgents}
                        className={`shrink-0 flex items-center gap-2 ${testPushAgentsOk ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all`}>
                        {testPushAgents ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                        {testPushAgentsOk ? '✓ Enviado' : (testPushAgents ? 'Enviando...' : 'Enviar prueba')}
                      </button>
                    </div>
                    <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-white/70">Crear cuenta de agente</span>
                      </div>
                      {agentCreateMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${agentCreateMsg.ok ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                          {agentCreateMsg.msg}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <input value={agentFormName} onChange={e => setAgentFormName(e.target.value)}
                          placeholder="Nombre del agente" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                        <input value={agentFormEmail} onChange={e => setAgentFormEmail(e.target.value)}
                          placeholder="Correo electrónico" type="email" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                        <input value={agentFormPassword} onChange={e => setAgentFormPassword(e.target.value)}
                          placeholder="Contraseña" type="password" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                      </div>
                      <button onClick={createAgent} disabled={creatingAgent}
                        className="mt-3 flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                        {creatingAgent ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users className="w-4 h-4" />}
                        {creatingAgent ? 'Creando...' : 'Crear agente'}
                      </button>
                    </div>
                    <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-purple-500/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/40">Agentes registrados</span>
                        <span className="text-xs text-white/30">{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>
                      </div>
                      {agents.length === 0 ? (
                        <div className="p-8 text-center text-white/25 text-sm">No hay agentes registrados aún.</div>
                      ) : (
                        <div className="divide-y divide-white/4">
                          {agents.map(ag => (
                            <div key={ag.id} className="px-5 py-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-white/80 text-sm font-semibold">{ag.agent_name || '—'}</p>
                                <p className="text-white/35 text-xs">{ag.email}</p>
                                {ag.agent_code && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-amber-400/60 text-xs">Código:</span>
                                    <span className="text-amber-300 font-mono font-bold text-xs tracking-wider">{ag.agent_code}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Agente</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
    
              {tab === 'cambio' && (
                <div className="space-y-8 max-w-2xl">

                  {/* TRABAJADORAS */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400/70 mb-4 flex items-center gap-2">
                      <span className="text-base">💱</span> Cambio para Trabajadoras
                      <span className="text-white/20 font-normal normal-case tracking-normal ml-1">— Waha y Howdy únicamente</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        { id: 'efectivo_worker',       label: 'Efectivo Cuba',       color: 'amber' },
                        { id: 'transferencia_worker',  label: 'Transferencia Cuba',  color: 'blue'  },
                      ] as const).map(({ id, label, color }) => (
                        <div key={id} className={`bg-[#0d0d1e] border border-${color}-500/15 rounded-2xl p-5`}>
                          <p className={`text-${color}-400 text-xs font-bold uppercase tracking-wider mb-1`}>{label}</p>
                          <p className="text-white/30 text-xs mb-3">Cambio actual: <span className="text-white/60 font-semibold">{(rates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                          <div className="flex gap-2">
                            <input
                              type="number" min="0" step="any"
                              value={rateInputs[id] ?? ''}
                              onChange={e => setRateInputs(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Ej: 400"
                              className="flex-1 bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                              onClick={() => publishRate(id)}
                              disabled={savingRate === id}
                              className={`flex items-center gap-1.5 ${rateSaved === id ? 'bg-green-600' : `bg-${color}-600 hover:bg-${color}-500`} disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shrink-0`}>
                              {savingRate === id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                              {rateSaved === id ? '✓ Publicado' : (savingRate === id ? '...' : 'Publicar')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AGENTES */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-4 flex items-center gap-2">
                      <span className="text-base">💱</span> Cambio para Agentes
                      <span className="text-white/20 font-normal normal-case tracking-normal ml-1">— independiente al de trabajadoras</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        { id: 'efectivo_agent',       label: 'Efectivo Cuba',       color: 'amber' },
                        { id: 'transferencia_agent',  label: 'Transferencia Cuba',  color: 'blue'  },
                      ] as const).map(({ id, label, color }) => (
                        <div key={id} className={`bg-[#0d0d1e] border border-${color}-500/15 rounded-2xl p-5`}>
                          <p className={`text-${color}-400 text-xs font-bold uppercase tracking-wider mb-1`}>{label}</p>
                          <p className="text-white/30 text-xs mb-3">Cambio actual: <span className="text-white/60 font-semibold">{(rates[id] ?? 0).toLocaleString('es-ES')} por USD</span></p>
                          <div className="flex gap-2">
                            <input
                              type="number" min="0" step="any"
                              value={rateInputs[id] ?? ''}
                              onChange={e => setRateInputs(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Ej: 400"
                              className="flex-1 bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                              onClick={() => publishRate(id)}
                              disabled={savingRate === id}
                              className={`flex items-center gap-1.5 ${rateSaved === id ? 'bg-green-600' : `bg-${color}-600 hover:bg-${color}-500`} disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shrink-0`}>
                              {savingRate === id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                              {rateSaved === id ? '✓ Publicado' : (savingRate === id ? '...' : 'Publicar')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              )}

          </div>
        </div>
      )
    }
