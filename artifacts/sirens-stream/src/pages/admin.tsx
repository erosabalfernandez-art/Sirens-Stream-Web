import { useState, useEffect, useRef } from 'react'
    import { useLocation } from 'wouter'
    import { useAuth } from '@/contexts/AuthContext'
    import { supabase, type WorkerEntry, COUNTRIES, getPaymentMethods, getWalletLabel } from '@/lib/supabase'
    import { Search, Filter, X, ChevronDown, ChevronUp, Copy, Check, CheckCircle2, Clock, DollarSign, AlertTriangle, Eye, EyeOff, Settings, MessageSquare, Send, Trash2, Radio, Bell, BellOff, Users, Shield, ImagePlus } from 'lucide-react'
  import { sendPushViaApi } from '@/lib/push'
import { PushNotificationCard } from '@/components/layout/PushNotificationCard'

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

function cleanNum(s: string | null | undefined): string { return (s ?? '').replace(/[^0-9]/g, '') }
function cleanFullPhone(code: string | null | undefined, tel: string | null | undefined): string { return (`${code ?? ''}${tel ?? ''}`).replace(/[\s\-\+\(\)]/g, '') }

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
    fetch(((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '') + '/api/site-settings/show_agencia')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.value !== null) setShowAgencia(d.value !== 'false'); })
      .catch(() => {});
  }, []);

  async function toggleAgencia() {
    setLoadingAgencia(true);
    setAgenciaError(null);
    const newVal = !showAgencia;
    const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
    const resp = await fetch(`${apiBase}/api/site-settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'show_agencia', value: String(newVal) }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      setAgenciaError(json.error ?? 'Error al guardar');
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
      const [tab, setTab] = useState<'list' | 'dupes' | 'config' | 'solicitudes' | 'canales' | 'pagos' | 'agentes' | 'cambio' | 'nocobro' | 'chicas'>('list')
        const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
        const [chicasModal, setChicasModal] = useState<WorkerRow[] | null>(null)

        // Channel state
        const [solicitudes, setSolicitudes] = useState<{id:string;user_id:string;app_name:string;status:string;created_at:string;profile_email:string}[]>([])
        const [loadingSol, setLoadingSol] = useState(false)
        const [channelApp, setChannelApp] = useState<'Waha'|'Layla'|'Howdy'>('Waha')
        const [channelMessages, setChannelMessages] = useState<{id:string;app_name:string;content:string|null;image_url:string|null;created_at:string}[]>([])
        const [channelContent, setChannelContent] = useState('')
        const [channelImage, setChannelImage] = useState('')
        const [channelFile, setChannelFile] = useState<File | null>(null)
        const [channelPreview, setChannelPreview] = useState<string | null>(null)
        const [channelUploading, setChannelUploading] = useState(false)
        const [channelPosting, setChannelPosting] = useState(false)
        const [loadingMsgs, setLoadingMsgs] = useState(false)
        const [notifying, setNotifying] = useState<Record<string, boolean>>({})
          const [agents, setAgents] = useState<{id:string;email:string;agent_name:string|null;agent_code:string|null;is_agent:boolean;phone:string|null}[]>([])
            const [grantingChannels, setGrantingChannels] = useState<Record<string,boolean>>({})
            const [channelsGranted, setChannelsGranted] = useState<Record<string,boolean>>({})
            const [grantingColiderChannels, setGrantingColiderChannels] = useState<Record<string,boolean>>({})
            const [coliderChannelsGranted, setColiderChannelsGranted] = useState<Record<string,boolean>>({})
            const [agentDetails, setAgentDetails] = useState<{commTotals:Record<string,number>;workerCounts:Record<string,number>;commApps:Record<string,string[]>}|null>(null)
          const [agentFormName, setAgentFormName] = useState('')
          const [agentFormEmail, setAgentFormEmail] = useState('')
          const [agentFormPassword, setAgentFormPassword] = useState('')
          const [agentFormPhone, setAgentFormPhone] = useState('')
          const [creatingAgent, setCreatingAgent] = useState(false)
          const [agentCreateMsg, setAgentCreateMsg] = useState<{ok:boolean;msg:string}|null>(null)
          const [agentPhoneMap, setAgentPhoneMap] = useState<Record<string,string>>({})
          const [coliderFormName, setColiderFormName] = useState('')
          const [coliderFormEmail, setColiderFormEmail] = useState('')
          const [coliderFormPassword, setColiderFormPassword] = useState('')
          const [coliderFormTelefono, setColiderFormTelefono] = useState('')
          const [creatingColider, setCreatingColider] = useState(false)
          const [coliderCreateMsg, setColiderCreateMsg] = useState<{ok:boolean;msg:string}|null>(null)
          const [coliders, setColiders] = useState<{id:string;email:string;colider_name:string|null;telefono:string|null}[]>([])
            const [showResetModal, setShowResetModal] = useState(false)
            const [resetConfirmText, setResetConfirmText] = useState('')
            const [resetLoading, setResetLoading] = useState(false)
            const [resetResult, setResetResult] = useState<{ok: boolean; message: string} | null>(null)
          const [coliderSetupNeeded, setColiderSetupNeeded] = useState(false)
        const [notifOk, setNotifOk] = useState<Record<string, boolean>>({})
        const [notifLogs, setNotifLogs] = useState<NotifLog[]>([])
          const [pushTestLoading, setPushTestLoading] = useState(false)
          const [pushTestResult, setPushTestResult] = useState<{sent:number;ok:boolean;subs:number}|null>(null)
        const [pagosApp, setPagosApp] = useState<'Waha'|'Layla'|'Howdy'|'Agentes'>(() => { try { const _sv = localStorage.getItem('ea_pagos_app'); return (['Waha','Layla','Howdy','Agentes'].includes(_sv ?? '') ? _sv : 'Waha') as 'Waha'|'Layla'|'Howdy'|'Agentes' } catch { return 'Waha' } })
          const [agentPayData, setAgentPayData] = useState<{confirmed: any[], pending: any[]}>({confirmed: [], pending: []})
          const [agentPayLoading, setAgentPayLoading] = useState(false)
          const [coliderMarks, setColiderMarks] = useState<{paid: any[], pending: any[]}>({paid: [], pending: []})
          const [coliderMarksLoading, setColiderMarksLoading] = useState(false)
        const [pagosData, setPagosData] = useState<any[]>([])
        const [pagosLoading, setPagosLoading] = useState(false)
        const [pagosSemana, setPagosSemana] = useState('')
        const [pagosNeedSetup, setPagosNeedSetup] = useState(false)
          const [laylaDirectNotifs, setLaylaDirectNotifs] = useState<any[]>([])
          const [laylaDirectLoading, setLaylaDirectLoading] = useState(false)
          const [laylaDirectNeedSetup, setLaylaDirectNeedSetup] = useState(false)
          const [noCobroEntries, setNoCobroEntries] = useState<any[]>([])
          const [noCobFilter, setNoCobFilter] = useState<'all'|'justified'|'unjustified'>('all')
            const [noCobAgentFilter, setNoCobAgentFilter] = useState<string>('all')
          const [noCobroLoading, setNoCobroLoading] = useState(false)
          const [togglingJustified, setTogglingJustified] = useState<string|null>(null)
          const [togglingAdminPaid, setTogglingAdminPaid] = useState<string | null>(null)
          const [cierreLoading, setCierreLoading] = useState(false)
            const [cierreMsg, setCierreMsg] = useState<{ok:boolean;text:string}|null>(null)
            const [showForzarModal, setShowForzarModal] = useState(false)
            const [cierrePending, setCierrePending] = useState<string[]>([])
            const [efectivoExpanded, setEfectivoExpanded] = useState(false)
            const [agenciaExpanded, setAgenciaExpanded] = useState(false)
            const [agentMetodoMap, setAgentMetodoMap] = useState<Record<string, string>>({})
            const [agentBilleteraMap, setAgentBilleteraMap] = useState<Record<string, string>>({})
            const [agentAdminPaidIds, setAgentAdminPaidIds] = useState<Set<string>>(new Set())
            const [togglingAgentAdminPaid, setTogglingAgentAdminPaid] = useState<string | null>(null)


          const [noCobroSetupNeeded, setNoCobroSetupNeeded] = useState(false)
        const [testPushSending, setTestPushSending] = useState<Record<string, boolean>>({})
        const [testPushOk, setTestPushOk] = useState<Record<string, boolean>>({})
          const [testPushNoSub, setTestPushNoSub] = useState<Record<string, boolean>>({})
        const [testPushAgents, setTestPushAgents] = useState(false)
        const [testPushAgentsOk, setTestPushAgentsOk] = useState(false)
        const [rates, setRates] = useState<Record<string,number>>({})
        const [rateInputs, setRateInputs] = useState<Record<string,string>>({})
        const [savingRate, setSavingRate] = useState<string|null>(null)
        const [rateSaved, setRateSaved] = useState<string|null>(null)
        const [agentNameMap, setAgentNameMap] = useState<Record<string,string>>({})
        const [customRatesByKey, setCustomRatesByKey] = useState<Record<string, {user_id:string;app_name:string;nombre_en_app:string;efectivo_rate:number;transferencia_rate:number}>>({})
        const [customRateInputs, setCustomRateInputs] = useState<Record<string, {efectivo:string;transferencia:string}>>({})
        const [customRateApp, setCustomRateApp] = useState<'Waha'|'Layla'|'Howdy'>('Waha')
        const [customRateSearch, setCustomRateSearch] = useState('')
        const [savingCustomRate, setSavingCustomRate] = useState<string|null>(null)
        const [savedCustomRate, setSavedCustomRate] = useState<string|null>(null)
        const [deletingCustomRate, setDeletingCustomRate] = useState<string|null>(null)
        const [customRateSetupNeeded, setCustomRateSetupNeeded] = useState(false)
        useEffect(() => {
          if (tab !== 'cambio') return
          const _ab = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
          fetch(`${_ab}/api/admin/custom-worker-rates`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (!d || d.setup_needed) { setCustomRateSetupNeeded(true); return }
              setCustomRateSetupNeeded(false)
              const map: Record<string, any> = {}
              for (const cr of (d.rates ?? [])) map[`${cr.user_id}__${cr.app_name}`] = cr
              setCustomRatesByKey(map)
            })
            .catch(() => {})
        }, [tab])
        const sqlDirectPayments = [
            "CREATE TABLE IF NOT EXISTS direct_payment_notifications (",
            "  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,",
            "  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,",
            "  app_name text NOT NULL,",
            "  semana text NOT NULL DEFAULT to_char(now(), 'YYYYMMDD'),",
            "  nota text DEFAULT NULL,",
            "  notified_at timestamptz DEFAULT now(),",
            "  UNIQUE(user_id, app_name, semana)",
            ");",
            "ALTER TABLE direct_payment_notifications ENABLE ROW LEVEL SECURITY;",
            "CREATE POLICY \"users_insert_own_dpn\" ON direct_payment_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);",
            "CREATE POLICY \"users_read_own_dpn\" ON direct_payment_notifications FOR SELECT USING (auth.uid() = user_id);",
            "CREATE POLICY \"users_delete_own_dpn\" ON direct_payment_notifications FOR DELETE USING (auth.uid() = user_id);",
            "CREATE POLICY \"admin_read_all_dpn\" ON direct_payment_notifications FOR SELECT USING (",
            "  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)",
            ");"
          ].join("\n")

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
            supabase.from('worker_entries').select('user_id, nombre_real, nombre_en_app, id_aplicacion, metodo_pago, billetera, agente').eq('app_name', app).in('user_id', userIds),
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
              agente: w.agente ?? null,
              confirmed: !!confAt, confirmed_at: confAt ?? null,
              id_aplicacion: w.id_aplicacion ?? null,
            }
          })
          // Enrich with colider_marks and exchange_rates
          const [{ data: colMarks }, { data: exRates }] = await Promise.all([
            supabase.from('colider_marks').select('person_uid, paid').eq('semana', semana).eq('person_type', 'worker').eq('person_app', app).in('person_uid', userIds),
            supabase.from('exchange_rates').select('id, rate'),
          ])
          const _coliderMarkMap: Record<string, boolean> = {}
          for (const m of (colMarks ?? []) as any[]) _coliderMarkMap[(m as any).person_uid] = (m as any).paid
          const _rateMap: Record<string, number> = {}
          for (const r of (exRates ?? []) as any[]) _rateMap[(r as any).id] = (r as any).rate
          const mergedFull = merged.map((row: any) => {
            const colider_paid = (row.user_id in _coliderMarkMap) ? _coliderMarkMap[row.user_id] : null
            const mp = (row.metodo_pago ?? '').toLowerCase()
            let cup_amount: number | null = null
            if (mp.includes('cuba')) {
              const rate = mp.includes('efectivo') ? (_rateMap['efectivo_worker'] ?? 0) : (_rateMap['transferencia_worker'] ?? 0)
              if (rate > 0) cup_amount = row.usd * rate
            }
            return { ...row, colider_paid, cup_amount }
          })
          // Fetch admin paid marks
          const { data: _adminMarks } = await supabase.from('admin_paid_marks').select('uid').eq('app_name', app).eq('semana', semana)
          const _adminPaidSet = new Set(((_adminMarks ?? []) as {uid:string}[]).map((r: {uid:string}) => r.uid))
          const mergedWithAdmin = mergedFull.map((row: any) => ({ ...row, admin_paid: _adminPaidSet.has(row.id_aplicacion ?? '') }))
          setPagosData(mergedWithAdmin); setPagosLoading(false)
          fetchAgentPayData()
        }


          async function fetchAllPagosData() {
            setPagosLoading(true); setPagosNeedSetup(false)
            const APPS = ['Waha', 'Layla', 'Howdy'] as const
            // 1. Get latest semana per app
            const semanaResults = await Promise.all(
              APPS.map(app => supabase.from('published_salaries').select('semana').eq('app_name', app)
                .order('semana', { ascending: false }).limit(1).maybeSingle())
            )
            // 2. Collect (app, semana) pairs that have data
            const appSemanas: {app: string; semana: string}[] = []
            APPS.forEach((app, i) => {
              if (semanaResults[i].data?.semana) appSemanas.push({ app, semana: semanaResults[i].data!.semana })
            })
            if (appSemanas.length === 0) {
              setPagosData([]); setPagosSemana(''); setPagosLoading(false)
              fetchAgentPayData(); return
            }
            const mostRecentSemana = appSemanas.map(x => x.semana).sort().reverse()[0]
            setPagosSemana(mostRecentSemana)
            // 3. Fetch salaries for each app
            const salaryResults = await Promise.all(
              appSemanas.map(({app, semana}) => supabase.from('published_salaries').select('*').eq('app_name', app).eq('semana', semana))
            )
            // 4. Flatten all salaries with app_name tag
            const allSalaries: any[] = []
            appSemanas.forEach(({app, semana}, i) => {
              const rows = (salaryResults[i].data ?? []) as any[]
              rows.forEach(r => allSalaries.push({ ...r, _app: app, _semana: semana }))
            })
            if (allSalaries.length === 0) { setPagosData([]); setPagosLoading(false); fetchAgentPayData(); return }
            // 5. Collect ids for batch queries
            const userIds = [...new Set(allSalaries.map(s => s.user_id))] as string[]
            const salaryIds = allSalaries.map(s => s.id) as string[]
            const [{ data: profiles }, { data: workers }, { data: confirmations, error: confErr }, { data: exRates }] = await Promise.all([
              supabase.from('profiles').select('id, email').in('id', userIds),
              supabase.from('worker_entries').select('user_id, app_name, nombre_real, nombre_en_app, id_aplicacion, metodo_pago, billetera, agente'),
              supabase.from('payment_confirmations').select('salary_id, confirmed_at').in('salary_id', salaryIds),
              supabase.from('exchange_rates').select('id, rate'),
            ])
            if (confErr?.code === '42P01') { setPagosNeedSetup(true); setPagosLoading(false); fetchAgentPayData(); return }
            // 6. Build lookup maps
            const profileMap: Record<string,string> = Object.fromEntries(((profiles ?? []) as any[]).map((p: any) => [p.id, p.email]))
            // worker map keyed by user_id+app_name
            const workerMap: Record<string,any> = {}
            for (const w of (workers ?? []) as any[]) workerMap[`${w.user_id}_${w.app_name}`] = w
            const confMap: Record<string,string> = Object.fromEntries(((confirmations ?? []) as any[]).map((c: any) => [c.salary_id, c.confirmed_at]))
            const rateMap: Record<string,number> = {}
            for (const r of (exRates ?? []) as any[]) rateMap[(r as any).id] = (r as any).rate
            // 7. Enrich salaries
            const merged = allSalaries.map(s => {
              const w = workerMap[`${s.user_id}_${s._app}`] ?? workerMap[Object.keys(workerMap).find(k => k.startsWith(s.user_id)) ?? ''] ?? {}
              const confAt = confMap[s.id]
              const mp = (w.metodo_pago ?? '').toLowerCase()
              let cup_amount: number | null = null
              if (mp.includes('cuba')) {
                const rate = mp.includes('efectivo') ? (rateMap['efectivo_worker'] ?? 0) : (rateMap['transferencia_worker'] ?? 0)
                if (rate > 0) cup_amount = Number(s.usd) * rate
              }
              return {
                salary_id: s.id, user_id: s.user_id, app_name: s._app, semana: s._semana, usd: Number(s.usd),
                apodo: (s.extras?.Apodo ?? s.extras?.apodo ?? s.extras?.Nick ?? w.nombre_en_app ?? '—') as string,
                nombre_real: w.nombre_real ?? null, nombre_en_app: w.nombre_en_app ?? null,
                email: profileMap[s.user_id] ?? '—',
                metodo_pago: w.metodo_pago ?? null, billetera: w.billetera ?? null, agente: w.agente ?? null,
                confirmed: !!confAt, confirmed_at: confAt ?? null,
                id_aplicacion: w.id_aplicacion ?? null,
                colider_paid: null as boolean | null, cup_amount,
              }
            })
            // 8. Batch-fetch colider_marks for all workers
            const { data: colMarks } = await supabase.from('colider_marks').select('person_uid, paid, person_app').eq('person_type', 'worker').in('person_uid', userIds)
            const coliderMarkMap: Record<string,boolean> = {}
            for (const m of (colMarks ?? []) as any[]) coliderMarkMap[(m as any).person_uid] = (m as any).paid
            // 9. Fetch admin_paid_marks for all id_aplicacion values
            const allIdAplicacion = merged.map(r => r.id_aplicacion).filter(Boolean) as string[]
            const { data: adminMarks } = allIdAplicacion.length > 0
              ? await supabase.from('admin_paid_marks').select('uid').in('uid', allIdAplicacion)
              : { data: [] }
            const adminPaidSet = new Set(((adminMarks ?? []) as any[]).map((r: any) => r.uid))
            // 10. Apply colider marks + admin marks
            const final = merged.map(row => ({
              ...row,
              colider_paid: (row.user_id in coliderMarkMap) ? coliderMarkMap[row.user_id] : null,
              admin_paid: adminPaidSet.has(row.id_aplicacion ?? ''),
            }))
            setPagosData(final)
            setPagosLoading(false)
            fetchAgentPayData()
          }

  
        async function toggleAdminPaid(uid: string, app: string, semana: string) {
          if (!uid) return
          setTogglingAdminPaid(uid)
          const isPaid = pagosData.some((r: any) => r.id_aplicacion === uid && r.admin_paid)
          if (isPaid) {
            await supabase.from('admin_paid_marks').delete().eq('app_name', app).eq('semana', semana).eq('uid', uid)
            setPagosData((prev: any[]) => prev.map((r: any) => r.id_aplicacion === uid ? { ...r, admin_paid: false } : r))
          } else {
            await supabase.from('admin_paid_marks').insert({ app_name: app, semana, uid })
            setPagosData((prev: any[]) => prev.map((r: any) => r.id_aplicacion === uid ? { ...r, admin_paid: true } : r))
          }
          setTogglingAdminPaid(null)
        }

        async function toggleAgentAdminPaid(agentUserId: string, app: string, semana: string) {
          if (togglingAgentAdminPaid === agentUserId) return
          setTogglingAgentAdminPaid(agentUserId)
          const uid = `agent_${agentUserId}`
          const isPaid = agentAdminPaidIds.has(agentUserId)
          if (isPaid) {
            await supabase.from('admin_paid_marks').delete().eq('app_name', app).eq('semana', semana).eq('uid', uid)
            setAgentAdminPaidIds(prev => { const s = new Set(prev); s.delete(agentUserId); return s })
          } else {
            await supabase.from('admin_paid_marks').insert({ app_name: app, semana, uid })
            setAgentAdminPaidIds(prev => new Set([...prev, agentUserId]))
          }
          setTogglingAgentAdminPaid(null)
        }

        async function fetchAgentPayData() {
            setAgentPayLoading(true)
            const { data: latestComm } = await supabase
              .from('agent_commissions').select('semana')
              .order('semana', { ascending: false }).limit(1).maybeSingle()
            if (!latestComm) { setAgentPayData({confirmed: [], pending: []}); setAgentPayLoading(false); return }
            const semana = latestComm.semana
            const { data: comms } = await supabase
              .from('agent_commissions')
              .select('id, agent_name, app_name, semana, total_commission_usd, agent_user_id')
              .eq('semana', semana)
            const { data: confs } = await supabase
              .from('agent_payment_confirmations')
              .select('commission_id, confirmed_at')
              .in('commission_id', (comms ?? []).map((c: any) => c.id))
            const confSet = new Set(((confs ?? []) as any[]).map((c: any) => c.commission_id))
            const confMap: Record<string, string> = {}
            ;((confs ?? []) as any[]).forEach((c: any) => { confMap[c.commission_id] = c.confirmed_at })
            const all = (comms ?? []) as any[]
            // Enrich with colider_marks for agents
            const _agentUids = all.filter((c: any) => c.agent_user_id).map((c: any) => c.agent_user_id as string)
            let _agentColiderMap: Record<string, boolean> = {}
            let _agentMetodoMapLocal: Record<string, string> = {}
            let _agentAdminPaidSet = new Set<string>()
            if (_agentUids.length > 0) {
              const [{ data: _agColMarks }, { data: _agWorkers }, { data: _agAdminMarks }] = await Promise.all([
                supabase.from('colider_marks').select('person_uid, paid').eq('semana', semana).eq('person_type', 'agent').in('person_uid', _agentUids),
                supabase.from('worker_entries').select('user_id, metodo_pago, billetera').in('user_id', _agentUids),
                supabase.from('admin_paid_marks').select('uid').eq('semana', semana).in('uid', _agentUids.map((u: string) => 'agent_' + u)),
              ])
              for (const m of (_agColMarks ?? []) as any[]) _agentColiderMap[(m as any).person_uid] = (m as any).paid
              const _agentBilleteraMapLocal: Record<string, string> = {}
              for (const w of (_agWorkers ?? []) as any[]) {
                if ((w as any).metodo_pago) _agentMetodoMapLocal[(w as any).user_id] = (w as any).metodo_pago
                if ((w as any).billetera) _agentBilleteraMapLocal[(w as any).user_id] = (w as any).billetera
              }
              for (const a of (_agAdminMarks ?? []) as any[]) _agentAdminPaidSet.add((a as any).uid.replace('agent_', ''))
            }
            setAgentMetodoMap(_agentMetodoMapLocal)
            setAgentBilleteraMap(_agentBilleteraMapLocal)
            setAgentAdminPaidIds(_agentAdminPaidSet)
            setAgentPayData({
              confirmed: all.filter((c: any) => confSet.has(c.id)).map((c: any) => ({ ...c, confirmed_at: confMap[c.id], colider_paid: c.agent_user_id ? ((c.agent_user_id in _agentColiderMap) ? _agentColiderMap[c.agent_user_id] : null) : null })),
              pending: all.filter((c: any) => !confSet.has(c.id)).map((c: any) => ({ ...c, colider_paid: c.agent_user_id ? ((c.agent_user_id in _agentColiderMap) ? _agentColiderMap[c.agent_user_id] : null) : null })),
            })
            setPagosSemana(semana)
            setAgentPayLoading(false)
          }

          async function fetchLaylaDirectNotifs() {
            setLaylaDirectLoading(true)
            setLaylaDirectNeedSetup(false)
            const { data: notifs, error } = await supabase
              .from('direct_payment_notifications')
              .select('*')
              .eq('app_name', 'Layla')
              .order('notified_at', { ascending: false })
            if (error?.code === '42P01') {
              setLaylaDirectNeedSetup(true)
              setLaylaDirectLoading(false)
              return
            }
            if (!notifs || notifs.length === 0) {
              setLaylaDirectNotifs([])
              setLaylaDirectLoading(false)
              return
            }
            const userIds = (notifs as any[]).map((n: any) => n.user_id)
            const [{ data: workers }, { data: profs }] = await Promise.all([
              supabase.from('worker_entries').select('user_id, nombre_real, nombre_en_app, metodo_pago, billetera, agente').eq('app_name', 'Layla').in('user_id', userIds),
              supabase.from('profiles').select('id, email').in('id', userIds),
            ])
            const wMap: Record<string, any> = Object.fromEntries(((workers ?? []) as any[]).map((w: any) => [w.user_id, w]))
            const eMap: Record<string, string> = Object.fromEntries(((profs ?? []) as any[]).map((p: any) => [p.id, p.email]))
            const merged = (notifs as any[]).map((n: any) => ({
              ...n,
              nombre_en_app: wMap[n.user_id]?.nombre_en_app ?? null,
              nombre_real: wMap[n.user_id]?.nombre_real ?? null,
              email: eMap[n.user_id] ?? '—',
              metodo_pago: wMap[n.user_id]?.metodo_pago ?? null,
              billetera: wMap[n.user_id]?.billetera ?? null,
              agente: wMap[n.user_id]?.agente ?? null,
            }))
            setLaylaDirectNotifs(merged)
            setLaylaDirectLoading(false)
          }

          async function fetchColiderMarks() {
            setColiderMarksLoading(true)
            const { data: marks } = await supabase
              .from('colider_marks')
              .select('*')
              .order('created_at', { ascending: false })
            if (marks) {
              setColiderMarks({
                paid: (marks as any[]).filter((m: any) => m.paid),
                pending: (marks as any[]).filter((m: any) => !m.paid),
              })
            }
            setColiderMarksLoading(false)
          }


          async function fetchNoCobro() {
              setNoCobroLoading(true)
              setNoCobroSetupNeeded(false)
              try {
                const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
                const r = await fetch(`${apiBase}/api/no-cobro`, { credentials: 'include' })
                if (!r.ok) { const e = await r.json().catch(() => ({})); if ((e?.error ?? '').includes('42P01') || (e?.error ?? '').includes('does not exist')) { setNoCobroSetupNeeded(true); setNoCobroLoading(false); return } }
                const d = await r.json()
                if (d.ok) { setNoCobroEntries(d.entries ?? []) }
              } catch {}
              setNoCobroLoading(false)
            }

          async function handleToggleJustified(id: string, justified: boolean) {
            setTogglingJustified(id)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              await fetch(`${apiBase}/api/toggle-justified`, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, justified }),
              })
              setNoCobroEntries(prev => prev.map(e => e.id === id ? { ...e, justified } : e))
            } catch {}
            setTogglingJustified(null)
          }

          async function doResetAllHistory() {
              setResetLoading(true)
              setResetResult(null)
              try {
                const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
                const r = await fetch(`${apiBase}/api/admin/reset-all-history`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ confirm: 'BORRAR TODO' }),
                })
                const d = await r.json() as { ok?: boolean; error?: string; results?: Record<string,string> }
                if (!r.ok || !d.ok) {
                  setResetResult({ ok: false, message: d.error ?? 'Error desconocido' })
                } else {
                  const cleared = Object.entries(d.results ?? {}).filter(([,v]) => v === 'cleared').map(([k]) => k)
                  setResetResult({ ok: true, message: `✅ Borrado completo. Tablas limpiadas: ${cleared.join(', ')}` })
                  setResetConfirmText('')
                }
              } catch (e: unknown) {
                setResetResult({ ok: false, message: e instanceof Error ? e.message : 'Error de red' })
              }
              setResetLoading(false)
            }

            async function sendTestPushAll() {
            setPushTestLoading(true)
            setPushTestResult(null)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              const [statusRes, testRes] = await Promise.all([
                fetch(`${apiBase}/api/push/status`),
                fetch(`${apiBase}/api/push/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '🔔 Prueba desde admin', body: 'El sistema de notificaciones está funcionando.' , url: '/' }) }),
              ])
              const statusData = await statusRes.json() as { subscriptions: number }
              const testData = await testRes.json() as { sent: number; ok: boolean }
              setPushTestResult({ sent: testData.sent, ok: testData.ok, subs: statusData.subscriptions })
            } catch { setPushTestResult({ sent: 0, ok: false, subs: 0 }) }
            setPushTestLoading(false)
          }

          async function notifyApp(app: string, type: 'salary' | 'canal') {
          const key = `${app}_${type}`
          setNotifying(p => ({ ...p, [key]: true }))
          setNotifOk(p => ({ ...p, [key]: false }))
          let ids: string[] = []
          if (type === 'salary') {
            const [{ data: workers }, { data: agentProfs }, { data: coliderProfs }] = await Promise.all([
              supabase.from('worker_entries').select('user_id').eq('app_name', app),
              supabase.from('profiles').select('id').eq('is_agent', true),
              supabase.from('profiles').select('id').eq('is_colider', true),
            ])
            ids = [...new Set([
              ...(workers ?? []).map((r: any) => r.user_id),
              ...(agentProfs ?? []).map((r: any) => r.id),
              ...(coliderProfs ?? []).map((r: any) => r.id),
            ])]
          } else {
            const [{ data: channelUsers }, { data: agentProfs }, { data: colProfs }] = await Promise.all([
              supabase.from('channel_requests').select('user_id').eq('app_name', app).eq('status', 'approved'),
              supabase.from('profiles').select('id').eq('is_agent', true),
            ])
            ids = [...new Set([
              ...(channelUsers ?? []).map((r: any) => r.user_id),
              ...(agentProfs ?? []).map((r: any) => r.id),
              ...(colProfs ?? []).map((r: any) => r.id),
            ])]
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

        async function sendTestPushToAgent(ag: {id:string;agent_name:string|null}) {
          setTestPushSending(p => ({ ...p, [ag.id]: true }))
          setTestPushOk(p => ({ ...p, [ag.id]: false }))
          const greeting = ag.agent_name ? ` ${ag.agent_name}` : ''
          await sendPushViaApi(
            [ag.id],
            '🔔 Notificación de prueba',
            `Hola${greeting}! Esta es una notificación de prueba enviada desde el panel admin.`,
            '/agente'
          )
          setTestPushSending(p => ({ ...p, [ag.id]: false }))
          setTestPushOk(p => ({ ...p, [ag.id]: true }))
          setTimeout(() => setTestPushOk(p => ({ ...p, [ag.id]: false })), 4000)
        }

        async function sendTestPushToColider(c: {id:string;colider_name:string|null}) {
            setTestPushSending(p => ({ ...p, [c.id]: true }))
            setTestPushOk(p => ({ ...p, [c.id]: false }))
            const greeting = c.colider_name ? ` ${c.colider_name}` : ''
            await sendPushViaApi(
              [c.id],
              '🔔 Notificación de prueba',
              `Hola${greeting}! Esta es una notificación de prueba enviada desde el panel admin.`,
              '/colider'
            )
            setTestPushSending(p => ({ ...p, [c.id]: false }))
            setTestPushOk(p => ({ ...p, [c.id]: true }))
            setTimeout(() => setTestPushOk(p => ({ ...p, [c.id]: false })), 4000)
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

        async function resolveRequest(id: string, status: 'approved' | 'rejected', sol?: { user_id: string; app_name: string }) {
            await supabase.from('channel_requests').update({ status, resolved_at: new Date().toISOString(), resolved_by: user!.id }).eq('id', id)
            if (sol?.user_id) {
              if (status === 'approved') {
                sendPushViaApi(
                  [sol.user_id],
                  `✅ Acceso aprobado — Canal ${sol.app_name}`,
                  `Ya tienes acceso al canal ${sol.app_name}. ¡Revisa los comunicados!`,
                  '/canales',
                  true
                )
              } else {
                sendPushViaApi(
                  [sol.user_id],
                  `❌ Solicitud de canal ${sol.app_name}`,
                  `Tu solicitud al canal ${sol.app_name} no fue aprobada. Contáctanos si tienes dudas.`,
                  '/canales',
                  true
                )
              }
            }
            fetchSolicitudes()
          }

        async function fetchChannelMessages(app: string) {
          setLoadingMsgs(true)
          const { data } = await supabase.from('channel_messages').select('*').eq('app_name', app).order('created_at', { ascending: false })
          setChannelMessages((data ?? []) as any[])
          setLoadingMsgs(false)
        }

        async function postMessage() {
            if (!channelContent.trim() && !channelFile && !channelImage.trim()) return
            setChannelPosting(true)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              let finalImageUrl: string | null = channelImage.trim() || null
              // Upload file if one is selected
              if (channelFile) {
                setChannelUploading(true)
                try {
                  const b64: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = e => resolve((e.target!.result as string).split(',')[1])
                    reader.onerror = reject
                    reader.readAsDataURL(channelFile)
                  })
                  const uploadRes = await fetch(`${apiBase}/api/upload-channel-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: b64, mime: channelFile.type, filename: channelFile.name }),
                  })
                  if (uploadRes.ok) {
                    const { url } = await uploadRes.json() as { url: string }
                    finalImageUrl = url
                  }
                } catch {}
                setChannelUploading(false)
              }
              const res = await fetch(`${apiBase}/api/post-channel-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  app_name: channelApp,
                  content: channelContent.trim() || null,
                  image_url: finalImageUrl,
                  created_by: user!.id,
                }),
              })
              if (res.ok) {
                setChannelContent(''); setChannelImage(''); setChannelFile(null); setChannelPreview(null)
                fetchChannelMessages(channelApp)
              }
            } catch {}
            setChannelUploading(false)
            setChannelPosting(false)
          }

        async function deleteMessage(id: string) {
          await supabase.from('channel_messages').delete().eq('id', id)
          setChannelMessages(prev => prev.filter(m => m.id !== id))
        }

        async function fetchAgentPayData() {
            setAgentPayLoading(true)
            const { data: latestComm } = await supabase
              .from('agent_commissions').select('semana')
              .order('semana', { ascending: false }).limit(1).maybeSingle()
            if (!latestComm) { setAgentPayData({confirmed: [], pending: []}); setAgentPayLoading(false); return }
            const semana = latestComm.semana
            const { data: comms } = await supabase
              .from('agent_commissions')
              .select('id, agent_name, app_name, semana, total_commission_usd, agent_user_id')
              .eq('semana', semana)
            const { data: confs } = await supabase
              .from('agent_payment_confirmations')
              .select('commission_id, confirmed_at')
              .in('commission_id', (comms ?? []).map((c: any) => c.id))
            const confSet = new Set(((confs ?? []) as any[]).map((c: any) => c.commission_id))
            const confMap: Record<string, string> = {}
            ;((confs ?? []) as any[]).forEach((c: any) => { confMap[c.commission_id] = c.confirmed_at })
            const all = (comms ?? []) as any[]
            setAgentPayData({
              confirmed: all.filter((c: any) => confSet.has(c.id)).map((c: any) => ({...c, confirmed_at: confMap[c.id]})),
              pending: all.filter((c: any) => !confSet.has(c.id)),
            })
            setPagosSemana(semana)
            setAgentPayLoading(false)
          }

          async function fetchLaylaDirectNotifs() {
            setLaylaDirectLoading(true)
            setLaylaDirectNeedSetup(false)
            const { data: notifs, error } = await supabase
              .from('direct_payment_notifications')
              .select('*')
              .eq('app_name', 'Layla')
              .order('notified_at', { ascending: false })
            if (error?.code === '42P01') {
              setLaylaDirectNeedSetup(true)
              setLaylaDirectLoading(false)
              return
            }
            if (!notifs || notifs.length === 0) {
              setLaylaDirectNotifs([])
              setLaylaDirectLoading(false)
              return
            }
            const userIds = (notifs as any[]).map((n: any) => n.user_id)
            const [{ data: workers }, { data: profs }] = await Promise.all([
              supabase.from('worker_entries').select('user_id, nombre_real, nombre_en_app, metodo_pago, billetera, agente').eq('app_name', 'Layla').in('user_id', userIds),
              supabase.from('profiles').select('id, email').in('id', userIds),
            ])
            const wMap: Record<string, any> = Object.fromEntries(((workers ?? []) as any[]).map((w: any) => [w.user_id, w]))
            const eMap: Record<string, string> = Object.fromEntries(((profs ?? []) as any[]).map((p: any) => [p.id, p.email]))
            const merged = (notifs as any[]).map((n: any) => ({
              ...n,
              nombre_en_app: wMap[n.user_id]?.nombre_en_app ?? null,
              nombre_real: wMap[n.user_id]?.nombre_real ?? null,
              email: eMap[n.user_id] ?? '—',
              metodo_pago: wMap[n.user_id]?.metodo_pago ?? null,
              billetera: wMap[n.user_id]?.billetera ?? null,
              agente: wMap[n.user_id]?.agente ?? null,
            }))
            setLaylaDirectNotifs(merged)
            setLaylaDirectLoading(false)
          }

        async function fetchAll() {
        setLoadingData(true)
        fetchRates()
        const [{ data: entries }, { data: profiles }, { data: agentProfsAll }] = await Promise.all([
            supabase.from('worker_entries').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, email'),
            supabase.from('profiles').select('agent_name, agent_code, phone').eq('is_agent', true),
          ])
          const pm = Object.fromEntries(((profiles ?? []) as any[]).map(p => [p.id, p.email]))
          emailMapRef.current = pm
          const am: Record<string,string> = Object.fromEntries(
            ((agentProfsAll ?? []) as any[]).filter((a: any) => a.agent_code).map((a: any) => [a.agent_code, a.agent_name ?? a.agent_code])
          )
          setAgentNameMap(am)
          const pm2: Record<string,string> = Object.fromEntries(
            ((agentProfsAll ?? []) as any[]).filter((a: any) => a.agent_code && a.phone).map((a: any) => [a.agent_code, a.phone as string])
          )
          setAgentPhoneMap(pm2)
          if (entries) {
            setWorkers(entries.map((e: any) => ({ ...e, profile_email: pm[e.user_id] ?? 'desconocido' })))
          }
        setLoadingData(false)
      }

      // Reset weekly data tabs when cierre semanal is done
      useEffect(() => {
        function onCierre() {
          setPagosData([])
          setPagosSemana('')
          setNoCobroEntries([])
          setColiderMarks({ paid: [], pending: [] })
          setAgentPayData({ confirmed: [], pending: [] })
          setLaylaDirectNotifs([])
          setCierrePending([]); setCierreMsg('')
          setShowForzarModal(false)
          setEfectivoExpanded(false)
          setAgenciaExpanded(false)
          setAgentAdminPaidIds(new Set())
          setAgentMetodoMap({})
        }
        window.addEventListener('ea_cierre_done', onCierre)
        return () => window.removeEventListener('ea_cierre_done', onCierre)
      }, [])

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
        if (filterAgente && !(w.agente ?? '').toLowerCase().includes(filterAgente.toLowerCase()) && !(agentNameMap[w.agente ?? ''] ?? '').toLowerCase().includes(filterAgente.toLowerCase())) return false
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
            const { data } = await supabase.from('profiles').select('id, email, agent_name, agent_code, is_agent, phone').eq('is_agent', true).order('created_at', { ascending: false })
            setAgents((data ?? []) as {id:string;email:string;agent_name:string|null;agent_code:string|null;is_agent:boolean}[])
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              const r = await fetch(`${apiBase}/api/agent-details`)
              if (r.ok) setAgentDetails(await r.json() as {commTotals:Record<string,number>;workerCounts:Record<string,number>;commApps:Record<string,string[]>})
            } catch {}
          }

        async function createAgent() {
            if (!agentFormName.trim() || !agentFormEmail.trim() || !agentFormPassword.trim()) {
              setAgentCreateMsg({ ok: false, msg: 'Completa todos los campos.' }); return
            }
            setCreatingAgent(true); setAgentCreateMsg(null)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              const res = await fetch(`${apiBase}/api/create-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: agentFormEmail.trim(), password: agentFormPassword.trim(), agent_name: agentFormName.trim(), phone: agentFormPhone.trim() }),
              })
              const json = await res.json() as { ok?: boolean; agent_code?: string; error?: string }
              if (!res.ok || !json.ok) {
                setAgentCreateMsg({ ok: false, msg: json.error ?? 'Error al crear cuenta.' })
                setCreatingAgent(false); return
              }
              setAgentCreateMsg({ ok: true, msg: `✓ Agente "${agentFormName.trim()}" creado. Código de agente: ${json.agent_code}` })
              setAgentFormName(''); setAgentFormEmail(''); setAgentFormPassword(''); setAgentFormPhone('')
              await fetchAgents()
            } catch {
              setAgentCreateMsg({ ok: false, msg: 'Error de red al crear agente.' })
            }
            setCreatingAgent(false)
          }

          async function fetchColiders() {
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              const r = await fetch(`${apiBase}/api/admin/coliders`)
              if (r.ok) {
                const d = await r.json() as { coliders: {id:string;email:string;colider_name:string|null;telefono:string|null}[] }
                setColiders(d.coliders ?? [])
                setColiderSetupNeeded(false)
              } else {
                const err = await r.json().catch(() => ({})) as { error?: string }
                if (err?.error?.includes('does not exist') || err?.error?.includes('PGRST205')) setColiderSetupNeeded(true)
              }
            } catch {}
          }

          async function createColider() {
            if (!coliderFormEmail.trim() || !coliderFormPassword.trim()) {
              setColiderCreateMsg({ ok: false, msg: 'Email y contraseña son requeridos.' }); return
            }
            setCreatingColider(true); setColiderCreateMsg(null)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
              const res = await fetch(`${apiBase}/api/admin/create-colider`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: coliderFormEmail.trim(), password: coliderFormPassword.trim(), colider_name: coliderFormName.trim() || undefined, telefono: coliderFormTelefono.trim() || undefined }),
              })
              const json = await res.json() as { ok?: boolean; userId?: string; error?: string }
              if (!res.ok || !json.ok) {
                setColiderCreateMsg({ ok: false, msg: json.error ?? 'Error al crear cuenta de colider.' })
                setCreatingColider(false); return
              }
              setColiderCreateMsg({ ok: true, msg: `✓ Colider "${coliderFormName.trim() || coliderFormEmail.trim()}" creado correctamente.` })
              setColiderFormName(''); setColiderFormEmail(''); setColiderFormPassword(''); setColiderFormTelefono('')
              await fetchColiders()
            } catch {
              setColiderCreateMsg({ ok: false, msg: 'Error de red al crear colider.' })
            }
            setCreatingColider(false)
          }

            async function grantAgentChannels(agentId: string) {
              setGrantingChannels(p => ({ ...p, [agentId]: true }))
              try {
                const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
                const res = await fetch(`${apiBase}/api/grant-agent-channels`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: agentId }),
                })
                const json = await res.json() as { ok?: boolean; error?: string }
                if (json.ok) setChannelsGranted(p => ({ ...p, [agentId]: true }))
              } catch {}
              setGrantingChannels(p => ({ ...p, [agentId]: false }))
            }

            async function grantColiderChannels(coliderId: string) {
              setGrantingColiderChannels(p => ({ ...p, [coliderId]: true }))
              try {
                const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
                const res = await fetch(`${apiBase}/api/grant-agent-channels`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: coliderId }),
                })
                const json = await res.json() as { ok?: boolean; error?: string }
                if (json.ok) setColiderChannelsGranted(p => ({ ...p, [coliderId]: true }))
              } catch {}
              setGrantingColiderChannels(p => ({ ...p, [coliderId]: false }))
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
              const [{ data: agentData }, { data: coliderData }] = await Promise.all([
                supabase.from('profiles').select('id').eq('is_agent', true),
                supabase.from('profiles').select('id').eq('is_colider', true),
              ])
              const agentIds = ((agentData ?? []) as {id:string}[]).map(p => p.id)
              const coliderIds = ((coliderData ?? []) as {id:string}[]).map(p => p.id).filter(cid => !agentIds.includes(cid))
              const label = id === 'efectivo_agent' ? 'Efectivo' : 'Transferencia'
              if (agentIds.length > 0) sendPushViaApi(agentIds, `💱 Cambio ${label} actualizado`, `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar.`, '/agente', false)
              if (coliderIds.length > 0) sendPushViaApi(coliderIds, `💱 Cambio ${label} actualizado`, `Nuevo cambio: ${rate.toLocaleString('es-ES')} por dólar.`, '/colider', false)
            }
            setSavingRate(null); setRateSaved(id); setTimeout(() => setRateSaved(null), 3000)
          }

          async function saveCustomRate(worker: WorkerRow, tipo: 'efectivo'|'transferencia') {
            const key = `${worker.user_id}__${worker.app_name}`
            const inputs = customRateInputs[key] ?? { efectivo: '', transferencia: '' }
            const rate = parseFloat(tipo === 'efectivo' ? (inputs.efectivo||'0') : (inputs.transferencia||'0'))
            if (isNaN(rate) || rate < 0) return
            const existing = customRatesByKey[key]
            const ef = tipo === 'efectivo' ? rate : (existing?.efectivo_rate ?? 0)
            const tr = tipo === 'transferencia' ? rate : (existing?.transferencia_rate ?? 0)
            const saveKey = `${key}__${tipo}`
            setSavingCustomRate(saveKey)
            try {
              const _ab = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
              const r = await fetch(`${_ab}/api/admin/custom-worker-rates`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: worker.user_id, app_name: worker.app_name, nombre_en_app: worker.nombre_en_app, efectivo_rate: ef, transferencia_rate: tr })
              })
              if (r.ok) {
                setCustomRatesByKey(prev => ({ ...prev, [key]: { user_id: worker.user_id, app_name: worker.app_name, nombre_en_app: worker.nombre_en_app ?? '', efectivo_rate: ef, transferencia_rate: tr } }))
                setSavedCustomRate(saveKey); setTimeout(() => setSavedCustomRate(null), 3000)
              }
            } catch {}
            setSavingCustomRate(null)
          }
          async function deleteCustomRate(worker: WorkerRow) {
            const key = `${worker.user_id}__${worker.app_name}`
            setDeletingCustomRate(key)
            try {
              const _ab = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
              await fetch(`${_ab}/api/admin/custom-worker-rates?user_id=${encodeURIComponent(worker.user_id)}&app_name=${encodeURIComponent(worker.app_name)}`, { method: 'DELETE' })
              setCustomRatesByKey(prev => { const n = {...prev}; delete n[key]; return n })
              setCustomRateInputs(prev => { const n = {...prev}; delete n[key]; return n })
            } catch {}
            setDeletingCustomRate(null)
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
              <button onClick={() => { setTab('pagos'); fetchAllPagosData() }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'pagos' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <DollarSign className="w-3.5 h-3.5" />
                Control Pagos
              </button>
              <button onClick={() => { setTab('agentes'); fetchAgents(); fetchColiders() }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'agentes' ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white'}`}>
                <Users className="w-3.5 h-3.5" />
                Agentes
              </button>
              <button onClick={() => { setTab('chicas'); fetchAgents() }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'chicas' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}>
                  <Users className="w-3.5 h-3.5" />
                  Chicas/Agente
                </button>
                <button onClick={() => { setTab('nocobro'); fetchNoCobro() }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'nocobro' ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'}`}>
                🚨 No Cobraron
              </button>
            </div>

            {tab === 'config' && (<>

                  {/* Push notification subscription for admin */}
                  <PushNotificationCard userId={user?.id ?? ''} />
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

                  {/* ── Zona de Peligro ─────────────────────────────────── */}
                  <div className="mt-5 bg-red-950/30 border border-red-500/25 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-red-300">Zona de Peligro</span>
                    </div>
                    <p className="text-xs text-white/45 mb-4 leading-relaxed">
                      Borra <strong className="text-white/70">todo el historial de nóminas</strong>: salarios publicados, comisiones de agentes, confirmaciones de pago (trabajadoras y agentes), marcas del colider, lista de no-cobraron, e historial de subidas. El sistema quedará como si nunca se hubiera subido ninguna nómina.
                    </p>
                    <button
                      onClick={() => { setShowResetModal(true); setResetResult(null); setResetConfirmText('') }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/15 border border-red-500/35 text-red-300 hover:bg-red-500/25 hover:border-red-500/60 transition-all">
                      <Trash2 className="w-4 h-4" />
                      Borrar todo el historial
                    </button>
                  </div>
                </div>
              </>)}

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
                    {w.agente && (() => { const aName = agentNameMap[w.agente] ?? w.agente; const aPhone = agentPhoneMap[w.agente]; const _cp = cleanNum(aPhone); return aPhone ? (<a href={`https://wa.me/${_cp}`} target="_blank" rel="noreferrer" className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full hover:bg-green-500/20 transition-colors">{aName} 📱</a>) : (<span className="text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{aName}</span>); })()}
                                {w.telefono && (
                                  <a
                                    href={`https://wa.me/${cleanFullPhone(w.codigo_pais, w.telefono)}`}
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
                                ['Teléfono', w.codigo_pais && w.telefono ? `${w.codigo_pais} ${w.telefono}` : w.telefono, w.telefono ? `https://wa.me/${cleanFullPhone(w.codigo_pais, w.telefono)}` : undefined],
                                ['País', w.pais],
                                ['Método de pago', w.metodo_pago],
                                ['Billetera', w.billetera],
                                ['Agente', agentNameMap[w.agente ?? ''] ?? w.agente],
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
                                      <button onClick={() => resolveRequest(s.id, 'approved', s)}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all">
                                        Aprobar
                                      </button>
                                      <button onClick={() => resolveRequest(s.id, 'rejected', s)}
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
                <div style={{minHeight:0}}>
                  {/* ── App selector ──────────────────────────────────── */}
                  <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                    {(['Waha','Layla','Howdy'] as const).map(app => (
                      <button key={app} onClick={() => setChannelApp(app)}
                        style={{display:'flex',alignItems:'center',gap:8,padding:'7px 16px',borderRadius:24,border:'none',cursor:'pointer',fontWeight:700,fontSize:14,transition:'all 0.15s',
                          background: channelApp === app ? 'linear-gradient(135deg,#2ca5e0,#1a7fba)' : 'rgba(255,255,255,0.05)',
                          color: channelApp === app ? 'white' : 'rgba(255,255,255,0.4)',
                          boxShadow: channelApp === app ? '0 2px 10px rgba(44,165,224,0.35)' : 'none'}}>
                        <span style={{width:22,height:22,borderRadius:'50%',overflow:'hidden',display:'inline-flex',flexShrink:0}}>
                          <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${app.toLowerCase()}.jpg`} alt={app}
                            style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </span>
                        {app}
                      </button>
                    ))}
                  </div>

                  {/* ── Telegram-style channel view ───────────────────── */}
                  <div style={{display:'flex',flexDirection:'column',background:'#17212b',borderRadius:16,overflow:'hidden',border:'1px solid rgba(44,165,224,0.12)',marginBottom:16}}>
                    {/* Channel header */}
                    <div style={{background:'#242f3d',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid #2ca5e0'}}>
                        <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${channelApp.toLowerCase()}.jpg`} alt={channelApp}
                          style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{color:'white',fontWeight:700,fontSize:15}}>Canal {channelApp}</span>
                          <span style={{background:'#2ca5e0',borderRadius:4,padding:'1px 6px',fontSize:9,color:'white',fontWeight:700,letterSpacing:0.5}}>CANAL</span>
                        </div>
                        <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Eclipse Angels Agency · Admin</div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div style={{maxHeight:400,overflowY:'auto',padding:'10px 0'}}>
                      {loadingMsgs ? (
                        <div style={{padding:'32px 0',textAlign:'center'}}>
                          <div style={{width:28,height:28,border:'3px solid rgba(44,165,224,0.2)',borderTopColor:'#2ca5e0',borderRadius:'50%',animation:'tgspin 0.8s linear infinite',margin:'0 auto'}}/>
                        </div>
                      ) : channelMessages.length === 0 ? (
                        <div style={{textAlign:'center',padding:'48px 24px'}}>
                          <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(44,165,224,0.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24}}>📢</div>
                          <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,margin:0}}>No hay comunicados en {channelApp} aún.</p>
                        </div>
                      ) : (
                        <div>
                          {channelMessages.map(msg => (
                            <div key={msg.id} style={{padding:'0 10px 6px'}}>
                              <div style={{background:'#1a2838',borderRadius:12,overflow:'hidden'}}>
                                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px 6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                                  <div style={{width:26,height:26,borderRadius:'50%',overflow:'hidden',flexShrink:0}}>
                                    <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${channelApp.toLowerCase()}.jpg`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                  </div>
                                  <span style={{color:'#2ca5e0',fontWeight:700,fontSize:13,flex:1}}>Canal {channelApp}</span>
                                  <span style={{color:'rgba(255,255,255,0.2)',fontSize:11}}>
                                    {new Date(msg.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
                                  </span>
                                  <button onClick={() => deleteMessage(msg.id)}
                                    style={{background:'none',border:'none',color:'rgba(255,80,80,0.35)',cursor:'pointer',padding:'2px 4px',display:'flex',marginLeft:4}}
                                    title="Borrar">
                                    <Trash2 style={{width:13,height:13}}/>
                                  </button>
                                </div>
                                {msg.image_url && <img src={msg.image_url} alt="comunicado" style={{width:'100%',maxHeight:240,objectFit:'cover',display:'block'}}/>}
                                {msg.content && <div style={{padding:'7px 12px 9px',color:'rgba(255,255,255,0.85)',fontSize:14,lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{msg.content}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Compose bar */}
                    <div style={{background:'#1e2c3a',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 12px'}}>
                      {channelPreview ? (
                        <div style={{position:'relative',marginBottom:8,borderRadius:10,overflow:'hidden',border:'1px solid rgba(44,165,224,0.2)'}}>
                          <img src={channelPreview} alt="preview" style={{width:'100%',maxHeight:140,objectFit:'cover',display:'block'}}/>
                          <button onClick={() => { setChannelFile(null); setChannelPreview(null) }}
                            style={{position:'absolute',top:6,right:6,width:26,height:26,background:'rgba(0,0,0,0.65)',border:'none',color:'white',cursor:'pointer',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <X style={{width:13,height:13}}/>
                          </button>
                        </div>
                      ) : null}
                      <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                        <label style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',padding:8,display:'flex',flexShrink:0}}>
                          <ImagePlus style={{width:20,height:20}}/>
                          <input type="file" accept="image/*" style={{display:'none'}} onChange={e => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            setChannelFile(f)
                            const reader = new FileReader()
                            reader.onload = ev => setChannelPreview(ev.target?.result as string)
                            reader.readAsDataURL(f)
                            e.target.value = ''
                          }} />
                        </label>
                        <div style={{flex:1,background:'#17212b',borderRadius:20,padding:'8px 14px',display:'flex',alignItems:'flex-end'}}>
                          <textarea value={channelContent} onChange={e => setChannelContent(e.target.value)}
                            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&(channelContent.trim()||channelFile)){e.preventDefault();postMessage()}}}
                            placeholder={`Comunicado para ${channelApp}...`} rows={1}
                            style={{background:'none',border:'none',outline:'none',color:'white',fontSize:14,flex:1,resize:'none',lineHeight:1.4,maxHeight:90,overflowY:'auto',fontFamily:'inherit'}}/>
                        </div>
                        <button onClick={postMessage}
                          disabled={channelPosting||channelUploading||(!channelContent.trim()&&!channelFile&&!channelImage.trim())}
                          style={{width:40,height:40,borderRadius:'50%',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.2s',
                            background:(channelContent.trim()||channelFile||channelImage.trim())?'#2ca5e0':'rgba(255,255,255,0.08)'}}>
                          {(channelPosting||channelUploading)
                            ? <div style={{width:16,height:16,border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'tgspin 0.8s linear infinite'}}/>
                            : <Send style={{width:16,height:16,color:'white'}}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {tab === 'pagos' && (

                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Control de Pagos Semanales</p>
                        {pagosSemana && <p className="text-xs text-white/35 mt-0.5">Semana activa: {pagosSemana}</p>}
                      </div>
                      <button onClick={fetchAllPagosData} disabled={pagosLoading}
                        className="px-3 py-2 rounded-xl text-sm font-bold bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white transition-all disabled:opacity-40">
                        {pagosLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /> : '↻'}
                      </button>
                    </div>

                    {/* SQL setup notice */}
                    {pagosNeedSetup && (
                      <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
                        <p className="text-amber-300 text-sm font-bold mb-1">⚠️ Falta crear la tabla en Supabase</p>
                        <p className="text-white/40 text-xs">Ejecuta el SQL de payment_confirmations en el editor SQL de Supabase y recarga la página.</p>
                      </div>
                    )}

                    {/* The 3 bars — always visible */}
                    {(() => {
                      const allAgents = [...agentPayData.confirmed, ...agentPayData.pending]
                      const agentConfirmedIds = new Set(agentPayData.confirmed.map((r: any) => r.id))
                      const agentUserIdSet = new Set(allAgents.filter((a:any) => a.agent_user_id).map((a:any) => a.agent_user_id as string))
                      const dualUserIds = new Set((pagosData as any[]).filter((r:any) => agentUserIdSet.has(r.user_id)).map((r:any) => r.user_id as string))
                      const dualAgents = allAgents.filter((a:any) => dualUserIds.has(a.agent_user_id))
                      const normalAgents = allAgents.filter((a:any) => !dualUserIds.has(a.agent_user_id))
                      const normalWorkerRows = (pagosData as any[]).filter((r:any) => !dualUserIds.has(r.user_id))
                      const dualWorkerRowsAll = (pagosData as any[]).filter((r:any) => dualUserIds.has(r.user_id))
                      const efectivoRows = normalWorkerRows.filter((r: any) => (r.metodo_pago ?? '').toLowerCase().includes('efectivo'))
                      const agenciaRows = normalWorkerRows.filter((r: any) => !(r.metodo_pago ?? '').toLowerCase().includes('efectivo'))
                      const agentEfectivo = normalAgents.filter((a: any) => !agentMetodoMap[a.agent_user_id] || (agentMetodoMap[a.agent_user_id] ?? '').toLowerCase().includes('efectivo'))
                      const agentAgencia = normalAgents.filter((a: any) => agentMetodoMap[a.agent_user_id] && !(agentMetodoMap[a.agent_user_id] ?? '').toLowerCase().includes('efectivo'))
                      const dualCardsMap: Record<string,{agentRow:any;workerRows:any[];isEfectivo:boolean}> = {}
                      for (const ag of dualAgents) { const uid = ag.agent_user_id as string; const metodo = (agentMetodoMap[uid] ?? dualWorkerRowsAll.find((r:any)=>r.user_id===uid)?.metodo_pago ?? '').toLowerCase(); if (!dualCardsMap[uid]) dualCardsMap[uid] = { agentRow: ag, workerRows: [], isEfectivo: !metodo || metodo.includes('efectivo') } }
                      for (const r of dualWorkerRowsAll) { if (dualCardsMap[r.user_id as string]) dualCardsMap[r.user_id as string].workerRows.push(r) }
                      const dualCards = Object.values(dualCardsMap)
                      const dualEfectivo = dualCards.filter(d => d.isEfectivo)
                      const dualAgencia = dualCards.filter(d => !d.isEfectivo)
                      // Progress: Efectivo (colider)
                      const coliderWorkerDone = efectivoRows.filter((r: any) => r.colider_paid && r.confirmed).length
                      const coliderAgentDone = agentEfectivo.filter((a: any) => a.colider_paid === true && agentConfirmedIds.has(a.id)).length
                      const coliderDone = coliderWorkerDone + coliderAgentDone
                      const coliderTotal = efectivoRows.length + agentEfectivo.length
                      const coliderPct = coliderTotal > 0 ? Math.round(coliderDone / coliderTotal * 100) : 0
                      // Progress: Pagos Agencia (admin)
                      const agenciaDoneWorkers = agenciaRows.filter((r: any) => r.admin_paid && r.confirmed).length
                      const agenciaDoneAgents = agentAgencia.filter((a: any) => agentAdminPaidIds.has(a.agent_user_id) && agentConfirmedIds.has(a.id)).length
                      const agenciaDone = agenciaDoneWorkers + agenciaDoneAgents
                      const agenciaTotal = agenciaRows.length + agentAgencia.length
                      const agenciaPct = agenciaTotal > 0 ? Math.round(agenciaDone / agenciaTotal * 100) : 0
                      // Total
                      const totalDone = coliderDone + agenciaDone
                      const totalTotal = coliderTotal + agenciaTotal
                      const totalPct = totalTotal > 0 ? Math.round(totalDone / totalTotal * 100) : 0
                      const APPS = ['Waha', 'Layla', 'Howdy'] as const
                      return (
                        <div className="space-y-4">
                          {/* ── BARRA EFECTIVO ─────────────────────────────── */}
                          <div className="bg-[#0d0d1e] border border-teal-500/15 rounded-2xl overflow-hidden">
                            <button onClick={() => setEfectivoExpanded(v => !v)}
                              className="w-full p-4 text-left hover:bg-teal-500/5 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-teal-300/80 uppercase tracking-wider flex items-center gap-2">
                                  💵 Pago en Efectivo
                                  <span className="text-teal-400/40 text-[10px] font-normal">{efectivoExpanded ? '▲ Ocultar' : '▼ Ver'}</span>
                                </span>
                                <span className="text-xs font-bold text-white/40">{coliderDone}/{coliderTotal} · {coliderPct}%</span>
                              </div>
                              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-400 transition-all duration-500 rounded-full" style={{ width: `${coliderPct}%` }} />
                              </div>
                              <p className="text-xs text-white/20 mt-1.5">Colider confirma cada pago · toca para ver personas</p>
                            </button>
                            {efectivoExpanded && (
                              <div className="border-t border-teal-500/10 p-4 space-y-3">
                                {pagosLoading ? (
                                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}</div>
                                ) : (
                                  <>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-2 px-1">👩‍💻 Trabajadora</p>
                                    {/* Workers per app */}
                                    {APPS.map(app => {
                                      const appRows = efectivoRows.filter((r: any) => r.app_name === app)
                                      if (!appRows.length) return null
                                      return (
                                        <div key={app}>
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/50 mb-2 px-1">{app}</p>
                                          <div className="space-y-2">
                                            {appRows.map((row: any) => (
                                              <div key={row.salary_id} className="bg-black/30 border border-teal-500/15 rounded-2xl px-4 py-3 flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                                                  {(row.colider_paid && row.confirmed) ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <Clock className="w-3.5 h-3.5 text-teal-400/40" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-bold text-white">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                                  <p className="text-xs text-white/30 truncate">{row.email} · <span className="text-teal-400">${row.usd.toFixed(2)}</span></p>
                                                  {row.metodo_pago && <p className="text-xs text-white/20">{row.metodo_pago}{row.billetera ? ` · ${row.billetera}` : ''}</p>}
                                                  {row.cup_amount && <p className="text-xs text-amber-300/50">≈ {Math.round(row.cup_amount).toLocaleString('es-ES')} CUP</p>}
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                  {row.colider_paid === true && <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold">Colider ✓</span>}
                                                  {row.colider_paid === false && <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300/70 px-2 py-0.5 rounded-full">Sin pagar</span>}
                                                  {(row.colider_paid === null || row.colider_paid === undefined) && <span className="text-[10px] text-white/20">Sin marcar</span>}
                                                  {row.confirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {/* Efectivo agents */}
                                    {agentEfectivo.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-2 px-1">👑 Agente</p>
                                        <div className="space-y-2">
                                          {agentEfectivo.map((row: any, idx: number) => (
                                            <div key={row.id ?? idx} className="bg-black/30 border border-amber-500/15 rounded-2xl px-4 py-3 flex items-center gap-3">
                                              <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                {(row.colider_paid && agentConfirmedIds.has(row.id)) ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400/40" />}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white">{(agentNameMap[row.agent_name] ?? row.agent_name) || '—'}</p>
                                                <p className="text-xs text-white/30">{row.app_name} · <span className="text-amber-400">${Number(row.total_commission_usd || 0).toFixed(2)}</span></p>
                                                {agentMetodoMap[row.agent_user_id] && <p className="text-xs text-white/20">{agentMetodoMap[row.agent_user_id]}{agentBilleteraMap[row.agent_user_id] ? ' · ' + agentBilleteraMap[row.agent_user_id] : ''}</p>}
                                              </div>
                                              <div className="flex flex-col items-end gap-1 shrink-0">
                                                {row.colider_paid === true && <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold">Colider ✓</span>}
                                                {row.colider_paid === false && <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300/70 px-2 py-0.5 rounded-full">Sin pagar</span>}
                                                {(row.colider_paid === null || row.colider_paid === undefined) && <span className="text-[10px] text-white/20">Sin marcar</span>}
                                                {agentConfirmedIds.has(row.id) ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {dualEfectivo.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60 mb-2 px-1">🔗 Agente + Trabajadora</p>
                                        <div className="space-y-2">
                                          {dualEfectivo.map((d, _di) => {
                                            const workerTotalD = d.workerRows.reduce((s:number,r:any)=>s+Number(r.usd||0),0)
                                            const agentTotalD = Number(d.agentRow.total_commission_usd||0)
                                            const totalD = workerTotalD + agentTotalD
                                            const coliderPaidD = d.agentRow.colider_paid === true
                                            const agentConfirmedD = agentConfirmedIds.has(d.agentRow.id)
                                            const metodoD = agentMetodoMap[d.agent_user_id] ?? d.workerRows[0]?.metodo_pago ?? ''
                                            const billeteraD = agentBilleteraMap[d.agent_user_id] ?? d.workerRows[0]?.billetera ?? ''
                                            return (
                                              <div key={d.agent_user_id} className="bg-black/30 border border-violet-500/25 rounded-2xl px-4 py-3">
                                                <div className="flex items-start gap-3">
                                                  <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    {(coliderPaidD && agentConfirmedD) ? <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> : <Clock className="w-3.5 h-3.5 text-violet-400/40" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white">{(agentNameMap[d.agentRow.agent_name] ?? d.agentRow.agent_name) || '—'}</p>
                                                    {d.workerRows.map((r:any) => (<p key={r.salary_id} className="text-xs text-teal-300/60">{'💼 '}{r.app_name}: ${Number(r.usd||0).toFixed(2)}</p>))}
                                                    <p className="text-xs text-amber-300/60">{"👑 Comisión: $"}{agentTotalD.toFixed(2)}</p>
                                                    <p className="text-xs font-bold text-violet-300 mt-0.5">{"💰 Total: $"}{totalD.toFixed(2)}</p>
                                                    {metodoD && <p className="text-xs text-white/20 mt-0.5">{metodoD}{billeteraD ? ' · ' + billeteraD : ''}</p>}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {coliderPaidD && <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold">Colider ✓</span>}
                                                    {!coliderPaidD && <span className="text-[10px] text-white/20">Sin marcar</span>}
                                                    {agentConfirmedD ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {coliderTotal === 0 && !pagosLoading && (
                                      <p className="text-center text-white/25 text-sm py-6">Sin pagos en efectivo esta semana</p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── BARRA PAGOS AGENCIA ─────────────────────────── */}
                          <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl overflow-hidden">
                            <button onClick={() => setAgenciaExpanded(v => !v)}
                              className="w-full p-4 text-left hover:bg-purple-500/5 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-purple-300/80 uppercase tracking-wider flex items-center gap-2">
                                  💳 Pagos Agencia
                                  <span className="text-purple-400/40 text-[10px] font-normal">{agenciaExpanded ? '▲ Ocultar' : '▼ Ver'}</span>
                                </span>
                                <span className="text-xs font-bold text-white/40">{agenciaDone}/{agenciaTotal} · {agenciaPct}%</span>
                              </div>
                              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-400 transition-all duration-500 rounded-full" style={{ width: `${agenciaPct}%` }} />
                              </div>
                              <p className="text-xs text-white/20 mt-1.5">Admin marca pagado · toca para ver personas</p>
                            </button>
                            {agenciaExpanded && (
                              <div className="border-t border-purple-500/10 p-4 space-y-3">
                                {pagosLoading ? (
                                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}</div>
                                ) : (
                                  <>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/60 mb-2 px-1">👩‍💻 Trabajadora</p>
                                    {APPS.map(app => {
                                      const appRows = agenciaRows.filter((r: any) => r.app_name === app)
                                      if (!appRows.length) return null
                                      return (
                                        <div key={app}>
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/50 mb-2 px-1">{app}</p>
                                          <div className="space-y-2">
                                            {appRows.map((row: any) => (
                                              <div key={row.salary_id} className="bg-black/30 border border-purple-500/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                                  {(row.admin_paid && row.confirmed) ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <Clock className="w-3.5 h-3.5 text-purple-400/40" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-bold text-white">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                                  <p className="text-xs text-white/30 truncate">{row.email} · <span className="text-purple-400">${row.usd.toFixed(2)}</span></p>
                                                  {row.metodo_pago && <p className="text-xs text-white/20">{row.metodo_pago}{row.billetera ? ` · ${row.billetera}` : ''}</p>}
                                                  {row.cup_amount && <p className="text-xs text-amber-300/50">≈ {Math.round(row.cup_amount).toLocaleString('es-ES')} CUP</p>}
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                  {row.confirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                                  <button
                                                    onClick={() => toggleAdminPaid(row.id_aplicacion, row.app_name, row.semana)}
                                                    disabled={!row.id_aplicacion || togglingAdminPaid === row.id_aplicacion}
                                                    className={`flex items-center gap-1 transition-all ${!row.id_aplicacion ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${row.admin_paid ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                      {row.admin_paid && <Check className="w-2.5 h-2.5 text-white" />}
                                                      {togglingAdminPaid === row.id_aplicacion && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                    </div>
                                                    <span className={`text-[10px] font-medium ${row.admin_paid ? 'text-purple-300' : 'text-white/30'}`}>{row.admin_paid ? 'Pagado ✓' : 'Marcar'}</span>
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {/* Agencia agents */}
                                    {agentAgencia.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-2 px-1">👑 Agente</p>
                                        <div className="space-y-2">
                                          {agentAgencia.map((row: any, idx: number) => (
                                            <div key={row.id ?? idx} className="bg-black/30 border border-amber-500/15 rounded-2xl px-4 py-3 flex items-center gap-3">
                                              <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                {(agentAdminPaidIds.has(row.agent_user_id) && agentConfirmedIds.has(row.id)) ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400/40" />}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white">{(agentNameMap[row.agent_name] ?? row.agent_name) || '—'}</p>
                                                <p className="text-xs text-white/30">{row.app_name} · <span className="text-amber-400">${Number(row.total_commission_usd || 0).toFixed(2)}</span></p>
                                                {agentMetodoMap[row.agent_user_id] && <p className="text-xs text-white/20">{agentMetodoMap[row.agent_user_id]}{agentBilleteraMap[row.agent_user_id] ? ' · ' + agentBilleteraMap[row.agent_user_id] : ''}</p>}
                                              </div>
                                              <div className="flex flex-col items-end gap-1 shrink-0">
                                                {agentConfirmedIds.has(row.id) ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                                <button
                                                  onClick={() => toggleAgentAdminPaid(row.agent_user_id, row.app_name, row.semana)}
                                                  disabled={!row.agent_user_id || togglingAgentAdminPaid === row.agent_user_id}
                                                  className={`flex items-center gap-1 transition-all ${!row.agent_user_id ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${agentAdminPaidIds.has(row.agent_user_id) ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                    {agentAdminPaidIds.has(row.agent_user_id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                    {togglingAgentAdminPaid === row.agent_user_id && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                  </div>
                                                  <span className={`text-[10px] font-medium ${agentAdminPaidIds.has(row.agent_user_id) ? 'text-purple-300' : 'text-white/30'}`}>{agentAdminPaidIds.has(row.agent_user_id) ? 'Pagado ✓' : 'Marcar'}</span>
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {dualAgencia.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60 mb-2 px-1">🔗 Agente + Trabajadora</p>
                                        <div className="space-y-2">
                                          {dualAgencia.map((d, _di2) => {
                                            const workerTotalA = d.workerRows.reduce((s:number,r:any)=>s+Number(r.usd||0),0)
                                            const agentTotalA = Number(d.agentRow.total_commission_usd||0)
                                            const totalA = workerTotalA + agentTotalA
                                            const agentConfirmedA = agentConfirmedIds.has(d.agentRow.id)
                                            const adminPaidA = agentAdminPaidIds.has(d.agent_user_id)
                                            const metodoA = agentMetodoMap[d.agent_user_id] ?? d.workerRows[0]?.metodo_pago ?? ''
                                            const billeteraA = agentBilleteraMap[d.agent_user_id] ?? d.workerRows[0]?.billetera ?? ''
                                            return (
                                              <div key={d.agent_user_id} className="bg-black/30 border border-violet-500/25 rounded-2xl px-4 py-3">
                                                <div className="flex items-start gap-3">
                                                  <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    {(adminPaidA && agentConfirmedA) ? <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> : <Clock className="w-3.5 h-3.5 text-violet-400/40" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white">{(agentNameMap[d.agentRow.agent_name] ?? d.agentRow.agent_name) || '—'}</p>
                                                    {d.workerRows.map((r:any) => (<p key={r.salary_id} className="text-xs text-purple-300/60">{'💼 '}{r.app_name}: ${Number(r.usd||0).toFixed(2)}</p>))}
                                                    <p className="text-xs text-amber-300/60">{"👑 Comisión: $"}{agentTotalA.toFixed(2)}</p>
                                                    <p className="text-xs font-bold text-violet-300 mt-0.5">{"💰 Total: $"}{totalA.toFixed(2)}</p>
                                                    {metodoA && <p className="text-xs text-white/20 mt-0.5">{metodoA}{billeteraA ? ' · ' + billeteraA : ''}</p>}
                                                  </div>
                                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {agentConfirmedA ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Confirmó ✓</span> : <span className="text-[10px] text-white/25">Sin confirmar</span>}
                                                    <button onClick={() => toggleAgentAdminPaid(d.agent_user_id, d.agentRow.app_name, d.agentRow.semana)} disabled={!d.agent_user_id || togglingAgentAdminPaid === d.agent_user_id} className={`flex items-center gap-1 transition-all ${!d.agent_user_id ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${adminPaidA ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                        {adminPaidA && <Check className="w-2.5 h-2.5 text-white" />}
                                                        {togglingAgentAdminPaid === d.agent_user_id && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                      </div>
                                                      <span className={`text-[10px] font-medium ${adminPaidA ? 'text-purple-300' : 'text-white/30'}`}>{adminPaidA ? 'Pagado ✓' : 'Marcar'}</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {agenciaTotal === 0 && !pagosLoading && (
                                      <p className="text-center text-white/25 text-sm py-6">Sin pagos por agencia esta semana</p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── TOTAL GENERAL ───────────────────────────────── */}
                          <div className={`bg-[#0d0d1e] border rounded-2xl p-4 ${totalPct === 100 && totalTotal > 0 ? 'border-green-500/30' : 'border-white/8'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-bold uppercase tracking-wider ${totalPct === 100 && totalTotal > 0 ? 'text-green-300/80' : 'text-white/40'}`}>🏆 Total General</span>
                              <span className="text-xs font-bold text-white/40">{totalDone}/{totalTotal} · {totalPct}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 rounded-full ${totalPct === 100 && totalTotal > 0 ? 'bg-green-400' : 'bg-gradient-to-r from-teal-400 to-purple-400'}`} style={{ width: `${totalPct}%` }} />
                            </div>
                            <p className={`text-xs mt-1 ${totalPct === 100 && totalTotal > 0 ? 'text-green-400/60 font-semibold' : 'text-white/20'}`}>
                              {totalTotal === 0 ? 'Publica nóminas para ver el progreso' : totalPct === 100 ? '✅ Todos los pagos confirmados — cierre semanal disponible' : 'Efectivo (colíder) + Pagos Agencia (admin)'}
                            </p>
                          </div>

                          {/* ── CIERRE SEMANAL ─────────────────────────────── */}
                          <div className="pt-1">
                            {cierreMsg && (
                              <div className={`mb-3 p-3 rounded-xl text-xs font-semibold ${cierreMsg.ok ? 'bg-green-500/10 border border-green-500/25 text-green-300' : 'bg-red-500/10 border border-red-500/25 text-red-300'}`}>
                                {cierreMsg.text}
                              </div>
                            )}
                            <button
                              onClick={() => doCierre(false)}
                              disabled={cierreLoading || totalTotal === 0}
                              className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${totalPct === 100 && totalTotal > 0 ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30' : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'}`}>
                              {cierreLoading
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cerrando semana...</>
                                : <>🔒 Cerrar semana</>
                              }
                            </button>
                            {totalPct < 100 && totalTotal > 0 && !cierreLoading && (
                              <button
                                onClick={() => doCierre(true)}
                                disabled={cierreLoading}
                                className="w-full mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-400/50 hover:text-red-300/80 hover:bg-red-500/5 transition-all border border-red-500/8">
                                Forzar cierre igualmente
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })()}
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input value={agentFormName} onChange={e => setAgentFormName(e.target.value)}
                          placeholder="Nombre del agente" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                        <input value={agentFormEmail} onChange={e => setAgentFormEmail(e.target.value)}
                          placeholder="Correo electrónico" type="email" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                        <input value={agentFormPassword} onChange={e => setAgentFormPassword(e.target.value)}
                          placeholder="Contraseña" type="password" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
                        <input value={agentFormPhone} onChange={e => setAgentFormPhone(e.target.value)}
                          placeholder="Teléfono con código de país (ej: +5351234567)" type="tel" className="bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-400/50" />
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
                                {ag.phone && (
                                  <a href={`https://wa.me/${cleanNum(ag.phone)}`} target="_blank" rel="noreferrer"
                                    className="mt-1 flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                                    <span>📱</span><span>{ag.phone}</span>
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => sendTestPushToAgent(ag)}
                                    disabled={testPushSending[ag.id]}
                                    title="Enviar notificación de prueba"
                                    className={`flex items-center gap-1.5 ${testPushOk[ag.id] ? 'bg-green-600' : testPushNoSub[ag.id] ? 'bg-orange-600/80' : 'bg-blue-600/80 hover:bg-blue-500'} disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all`}>
                                    {testPushSending[ag.id]
                                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : testPushNoSub[ag.id] ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                    {testPushOk[ag.id] ? '✓ Enviado' : testPushNoSub[ag.id] ? 'Sin suscripción' : testPushSending[ag.id] ? 'Enviando...' : 'Notificar'}
                                  </button>
                                <button
                                    onClick={() => grantAgentChannels(ag.id)}
                                    disabled={!!grantingChannels[ag.id] || !!channelsGranted[ag.id]}
                                    title="Dar acceso a todos los canales"
                                    className={`flex items-center gap-1.5 ${channelsGranted[ag.id] ? 'bg-green-600' : 'bg-purple-600/80 hover:bg-purple-500'} disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all`}>
                                    {grantingChannels[ag.id]
                                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : <MessageSquare className="w-3 h-3" />}
                                    {channelsGranted[ag.id] ? '✓ Canales' : grantingChannels[ag.id] ? '...' : 'Dar canales'}
                                  </button>
                                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Agente</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-[#0d0d1e] border border-teal-500/15 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <Shield className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-semibold text-white/70">Crear cuenta de colider</span>
                      </div>
                      {coliderSetupNeeded && (
                        <div className="mb-4 bg-amber-500/8 border border-amber-500/20 rounded-xl p-4">
                          <p className="text-amber-300 text-sm font-bold mb-2">⚠️ Falta migración de base de datos</p>
                          <p className="text-white/50 text-xs mb-2">Ejecuta este SQL en el Editor SQL de Supabase:</p>
                          <pre className="text-[11px] text-emerald-300/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap select-all">{`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_colider boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS colider_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono text;

CREATE TABLE IF NOT EXISTS colider_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana text NOT NULL,
  person_uid text NOT NULL,
  person_type text NOT NULL CHECK (person_type IN ('worker', 'agent')),
  person_name text, person_real_name text, person_phone text,
  person_app text, salary_usd numeric DEFAULT 0, salary_cuba numeric DEFAULT 0,
  metodo_pago text, paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(semana, person_uid, person_app)
);

CREATE TABLE IF NOT EXISTS colider_week_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana text NOT NULL UNIQUE,
  notified boolean DEFAULT false, notified_at timestamptz,
  admin_closed boolean DEFAULT false, admin_closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE colider_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE colider_week_status ENABLE ROW LEVEL SECURITY;
GRANT ALL ON colider_marks TO service_role;
GRANT ALL ON colider_week_status TO service_role;`}</pre>
                          <p className="text-white/30 text-xs mt-2">Luego recarga esta página.</p>
                        </div>
                      )}
                      {coliderCreateMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${coliderCreateMsg.ok ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                          {coliderCreateMsg.msg}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input value={coliderFormName} onChange={e => setColiderFormName(e.target.value)}
                          placeholder="Nombre del colider" className="bg-[#07070f] border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-teal-400/50" />
                        <input value={coliderFormEmail} onChange={e => setColiderFormEmail(e.target.value)}
                          placeholder="Correo electrónico" type="email" className="bg-[#07070f] border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-teal-400/50" />
                        <input value={coliderFormPassword} onChange={e => setColiderFormPassword(e.target.value)}
                          placeholder="Contraseña" type="password" className="bg-[#07070f] border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-teal-400/50" />
                        <input value={coliderFormTelefono} onChange={e => setColiderFormTelefono(e.target.value)}
                          placeholder="Teléfono (ej: +5351234567)" type="tel" className="bg-[#07070f] border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-teal-400/50" />
                      </div>
                      <button onClick={createColider} disabled={creatingColider}
                        className="mt-3 flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                        {creatingColider ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
                        {creatingColider ? 'Creando...' : 'Crear colider'}
                      </button>
                      <p className="mt-3 text-xs text-white/25">El colider podrá marcar pagos entregados desde su panel en <code className="text-teal-400/60">/colider</code></p>
                    </div>
                    {coliders.length > 0 && (
                      <div className="bg-[#0d0d1e] border border-teal-500/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-teal-500/10">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/40">Colideres registrados</span>
                          <span className="text-xs text-white/30">{coliders.length} colider{coliders.length !== 1 ? 'es' : ''}</span>
                        </div>
                        <div className="divide-y divide-white/4">
                          {coliders.map(c => (
                            <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-white/80 text-sm font-semibold">{c.colider_name || '—'}</p>
                                <p className="text-white/35 text-xs">{c.email}</p>
                                {c.telefono && (
                                  <a href={`https://wa.me/${cleanNum(c.telefono)}`} target="_blank" rel="noreferrer"
                                    className="mt-1 flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                                    <span>📱</span><span>{c.telefono}</span>
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => sendTestPushToColider(c)}
                                    disabled={testPushSending[c.id]}
                                    title="Enviar notificación de prueba"
                                    className={`flex items-center gap-1.5 ${testPushOk[c.id] ? 'bg-green-600' : testPushNoSub[c.id] ? 'bg-orange-600/80' : 'bg-blue-600/80 hover:bg-blue-500'} disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all`}>
                                    {testPushSending[c.id]
                                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      : testPushNoSub[c.id] ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                    {testPushOk[c.id] ? '✓ Enviado' : testPushNoSub[c.id] ? 'Sin suscripción' : testPushSending[c.id] ? 'Enviando...' : 'Notificar'}
                                  </button>
                                  <button
                                    onClick={() => grantColiderChannels(c.id)}
                                    disabled={grantingColiderChannels[c.id] || coliderChannelsGranted[c.id]}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600/20 hover:bg-teal-600/40 border border-teal-500/30 text-teal-300 disabled:opacity-50 transition-all">
                                    {grantingColiderChannels[c.id]
                                      ? <div className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                                      : coliderChannelsGranted[c.id] ? '✓' : <Radio className="w-3 h-3" />}
                                    {coliderChannelsGranted[c.id] ? 'Dados' : 'Dar canales'}
                                  </button>
                                  <span className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">Colider</span>
                                </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
              )}

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

                  {/* CAMBIO PERSONALIZADO */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400/70 mb-4 flex items-center gap-2">
                      <span className="text-base">🎯</span> Cambio Personalizado por Chica
                      <span className="text-white/20 font-normal normal-case tracking-normal ml-1">— sobreescribe el general</span>
                    </h3>
                    {customRateSetupNeeded ? (
                      <div className="bg-[#0d0d1e] border border-yellow-500/20 rounded-2xl p-5">
                        <p className="text-yellow-400 text-xs font-bold mb-2">⚠️ Tabla no creada aún — ejecuta esto en Supabase SQL Editor:</p>
                        <pre className="text-white/50 text-xs bg-black/30 rounded-xl p-3 overflow-x-auto select-all">{'CREATE TABLE IF NOT EXISTS custom_worker_rates (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id text NOT NULL,\n  app_name text NOT NULL,\n  nombre_en_app text,\n  efectivo_rate numeric(10,2) NOT NULL DEFAULT 0,\n  transferencia_rate numeric(10,2) NOT NULL DEFAULT 0,\n  updated_at timestamptz DEFAULT now(),\n  UNIQUE(user_id, app_name)\n);'}</pre>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-4">
                          {(['Waha', 'Layla', 'Howdy'] as const).map(app => (
                            <button key={app} onClick={() => setCustomRateApp(app)}
                              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${customRateApp === app ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/70'}`}>
                              {app}
                            </button>
                          ))}
                        </div>
                        <input type="text" placeholder="Buscar por nombre en app..."
                          value={customRateSearch} onChange={e => setCustomRateSearch(e.target.value)}
                          className="w-full bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 mb-4"
                        />
                        <div className="space-y-3">
                          {workers.filter(w => w.app_name === customRateApp && (customRateSearch === '' || (w.nombre_en_app ?? '').toLowerCase().includes(customRateSearch.toLowerCase()))).map(w => {
                            const key = `${w.user_id}__${w.app_name}`
                            const existing = customRatesByKey[key]
                            const inputs = customRateInputs[key] ?? { efectivo: '', transferencia: '' }
                            return (
                              <div key={key} className="bg-[#0d0d1e] border border-emerald-500/10 rounded-2xl p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <p className="text-white text-sm font-semibold">{w.nombre_en_app}</p>
                                    {existing && <p className="text-emerald-400 text-xs mt-0.5">🎯 Activo · ef. {existing.efectivo_rate.toLocaleString('es-ES')} · transf. {existing.transferencia_rate.toLocaleString('es-ES')} CUP/USD</p>}
                                  </div>
                                  {existing && (
                                    <button onClick={() => deleteCustomRate(w)} disabled={deletingCustomRate === key}
                                      className="text-red-400/60 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-50">
                                      {deletingCustomRate === key ? '...' : '✕ Quitar'}
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1.5">Efectivo Cuba</p>
                                    <div className="flex gap-2">
                                      <input type="number" min="0" step="any" placeholder={existing?.efectivo_rate ? String(existing.efectivo_rate) : 'Ej: 400'}
                                        value={inputs.efectivo}
                                        onChange={e => setCustomRateInputs(prev => ({ ...prev, [key]: { ...(prev[key] ?? { efectivo: '', transferencia: '' }), efectivo: e.target.value } }))}
                                        className="flex-1 bg-[#07070f] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50 min-w-0"
                                      />
                                      <button onClick={() => saveCustomRate(w, 'efectivo')} disabled={savingCustomRate === `${key}__efectivo`}
                                        className={`flex items-center gap-1 ${savedCustomRate === `${key}__efectivo` ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0`}>
                                        {savingCustomRate === `${key}__efectivo` ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                                        {savedCustomRate === `${key}__efectivo` ? '✓' : (savingCustomRate === `${key}__efectivo` ? '' : 'Pub.')}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1.5">Transferencia Cuba</p>
                                    <div className="flex gap-2">
                                      <input type="number" min="0" step="any" placeholder={existing?.transferencia_rate ? String(existing.transferencia_rate) : 'Ej: 390'}
                                        value={inputs.transferencia}
                                        onChange={e => setCustomRateInputs(prev => ({ ...prev, [key]: { ...(prev[key] ?? { efectivo: '', transferencia: '' }), transferencia: e.target.value } }))}
                                        className="flex-1 bg-[#07070f] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none focus:border-blue-500/50 min-w-0"
                                      />
                                      <button onClick={() => saveCustomRate(w, 'transferencia')} disabled={savingCustomRate === `${key}__transferencia`}
                                        className={`flex items-center gap-1 ${savedCustomRate === `${key}__transferencia` ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0`}>
                                        {savingCustomRate === `${key}__transferencia` ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                                        {savedCustomRate === `${key}__transferencia` ? '✓' : (savingCustomRate === `${key}__transferencia` ? '' : 'Pub.')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {workers.filter(w => w.app_name === customRateApp && (customRateSearch === '' || (w.nombre_en_app ?? '').toLowerCase().includes(customRateSearch.toLowerCase()))).length === 0 && (
                            <p className="text-white/20 text-sm text-center py-4">
                              {customRateSearch ? 'No se encontraron chicas con ese nombre.' : `No hay chicas registradas en ${customRateApp}.`}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              )}

                  {/* ─── NO COBRARON TAB ─────────────────────────────────────────────── */}

                {tab === 'chicas' && (() => {
                  // Build code→name lookup from agents state
                  const agentCodeToName: Record<string, string> = {}
                  for (const a of agents) {
                    if (a.agent_code) agentCodeToName[a.agent_code.trim()] = a.agent_name || a.email || a.agent_code
                  }
                  const resolveAgentName = (code: string) => agentCodeToName[code] ?? code

                  // Group workers by agent, store full WorkerRow objects
                  const agentMap: Record<string, WorkerRow[]> = {}
                  for (const w of workers) {
                    const agente = w.agente?.trim() || '(Sin agente)'
                    if (!agentMap[agente]) agentMap[agente] = []
                    agentMap[agente].push(w)
                  }
                  const agentNames = Object.keys(agentMap).sort((a, b) => {
                    if (a === '(Sin agente)') return 1
                    if (b === '(Sin agente)') return -1
                    return resolveAgentName(a).localeCompare(resolveAgentName(b))
                  })
                  const APPS_ORDER = ['Waha', 'Layla', 'Howdy']

                  // Group girl entries by real name key
                  function groupGirls(rows: WorkerRow[]) {
                    const map: Record<string, WorkerRow[]> = {}
                    for (const w of rows) {
                      const key = (w.nombre_real || w.nombre_en_app || w.id).toLowerCase().trim()
                      if (!map[key]) map[key] = []
                      map[key].push(w)
                    }
                    return Object.values(map).sort((a, b) => (a[0].nombre_real || '').localeCompare(b[0].nombre_real || ''))
                  }

                  return (
                    <div className="space-y-4">
                      {/* Agent names header */}
                      <div className="bg-[#0d0d1e] border border-indigo-500/15 rounded-2xl p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/50 mb-3">Agentes</p>
                        <div className="flex flex-wrap gap-2">
                          {agentNames.map(agente => {
                            const cnt = groupGirls(agentMap[agente]).length
                            const isActive = selectedAgent === agente
                            return (
                              <button key={agente}
                                onClick={() => setSelectedAgent(isActive ? null : agente)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20'}`}>
                                <Users className="w-3 h-3" />
                                {resolveAgentName(agente)}
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-indigo-500/20'}`}>{cnt}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <p className="text-white/30 text-xs">
                        {agentNames.length} agente{agentNames.length !== 1 ? 's' : ''} · {workers.length} entrada{workers.length !== 1 ? 's' : ''} totales
                      </p>

                      {/* Agent accordion cards */}
                      {agentNames.map(agente => {
                        const agentWorkers = agentMap[agente]
                        const isOpen = selectedAgent === agente
                        const byApp: Record<string, WorkerRow[]> = {}
                        for (const w of agentWorkers) {
                          if (!byApp[w.app_name]) byApp[w.app_name] = []
                          byApp[w.app_name].push(w)
                        }
                        const uniqueGirls = groupGirls(agentWorkers)

                        return (
                          <div key={agente} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl overflow-hidden">
                            <button
                              onClick={() => setSelectedAgent(isOpen ? null : agente)}
                              className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/5 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                                  <Users className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">{resolveAgentName(agente)}</p>
                                  <p className="text-white/35 text-xs mt-0.5">
                                    {uniqueGirls.length} chica{uniqueGirls.length !== 1 ? 's' : ''} · {agentWorkers.length} entrada{agentWorkers.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {APPS_ORDER.filter(a => byApp[a]).map(a => (
                                  <span key={a} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                                    {a} ({byApp[a].length})
                                  </span>
                                ))}
                                {isOpen
                                  ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
                                  : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                              </div>
                            </button>

                            {isOpen && (
                              <div className="border-t border-purple-500/10 px-5 py-5 space-y-5">
                                {/* All girls */}
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-purple-400/60 mb-3">
                                    Todas ({uniqueGirls.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {uniqueGirls.map((entries, i) => {
                                      const nombre = entries[0].nombre_real || entries[0].nombre_en_app || '—'
                                      return (
                                        <button key={i} onClick={() => setChicasModal(entries)}
                                          className="bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 hover:border-purple-400/40 text-purple-200 text-xs font-medium px-3 py-1.5 rounded-xl transition-all">
                                          {nombre}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* By app */}
                                {APPS_ORDER.filter(a => byApp[a]).map(appName => (
                                  <div key={appName}>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-400/60 mb-3">
                                      {appName} ({byApp[appName].length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {byApp[appName].sort((a, b) => (a.nombre_real || '').localeCompare(b.nombre_real || '')).map((w, i) => (
                                        <button key={i}
                                          onClick={() => setChicasModal(agentWorkers.filter(aw => (aw.nombre_real || aw.nombre_en_app || '').toLowerCase().trim() === (w.nombre_real || w.nombre_en_app || '').toLowerCase().trim()))}
                                          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/15 hover:border-blue-400/30 text-blue-200 text-xs font-medium px-3 py-1.5 rounded-xl transition-all">
                                          {w.nombre_real || w.nombre_en_app || '—'}
                                          {w.nombre_en_app && w.nombre_real && w.nombre_en_app !== w.nombre_real && (
                                            <span className="text-blue-400/40 ml-1">({w.nombre_en_app})</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Girl detail modal */}
                      {chicasModal && chicasModal.length > 0 && (() => {
                        const firstPhone = chicasModal.find(w => w.telefono)
                        const phoneRaw = firstPhone ? cleanFullPhone(firstPhone.codigo_pais, firstPhone.telefono) : ''
                        const phoneDisplay = firstPhone ? `${firstPhone.codigo_pais ? firstPhone.codigo_pais + ' ' : ''}${firstPhone.telefono}` : null
                        const nombreReal = chicasModal[0].nombre_real || '—'
                        const agente = chicasModal[0].agente
                        const aName = agente ? (agentNameMap[agente] ?? agente) : null
                        const aPhone = agente ? agentPhoneMap[agente] : null
                        return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                          onClick={() => setChicasModal(null)}>
                          <div className="bg-[#0d0d1e] border border-purple-500/20 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                            onClick={e => e.stopPropagation()}>

                            {/* ── Header ── */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/10 sticky top-0 bg-[#0d0d1e]">
                              <div>
                                <p className="font-bold text-white text-base">{nombreReal}</p>
                                <p className="text-white/40 text-xs mt-0.5">{chicasModal[0].profile_email}</p>
                              </div>
                              <button onClick={() => setChicasModal(null)} className="text-white/30 hover:text-white transition-colors ml-4">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="p-5 space-y-4">

                              {/* ── Datos personales (nivel persona) ── */}
                              <div className="bg-[#07070f] rounded-xl p-4 border border-indigo-500/15 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/60">Datos personales</p>

                                {/* Nombre real */}
                                <div>
                                  <p className="text-white/30 text-xs mb-0.5">Nombre real</p>
                                  <p className="text-white/90 text-sm font-semibold">{nombreReal}</p>
                                </div>

                                {/* Teléfono — siempre visible */}
                                <div>
                                  <p className="text-white/30 text-xs mb-0.5">Teléfono</p>
                                  {phoneDisplay ? (
                                    <a
                                      href={`https://wa.me/${phoneRaw}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-semibold px-3 py-1.5 rounded-xl hover:bg-green-500/25 transition-colors"
                                    >
                                      📱 {phoneDisplay} · WhatsApp ↗
                                    </a>
                                  ) : (
                                    <p className="text-white/25 text-sm">— sin teléfono registrado</p>
                                  )}
                                </div>

                                {/* Agente */}
                                {aName && (
                                  <div>
                                    <p className="text-white/30 text-xs mb-0.5">Agente</p>
                                    {aPhone
                                      ? <a href={`https://wa.me/${cleanNum(aPhone)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-amber-300 text-sm font-medium hover:text-amber-200 transition-colors">{aName} <span>📱</span></a>
                                      : <p className="text-white/80 text-sm font-medium">{aName}</p>}
                                  </div>
                                )}

                                {/* País */}
                                {chicasModal[0].pais && (
                                  <div>
                                    <p className="text-white/30 text-xs mb-0.5">País</p>
                                    <p className="text-white/80 text-sm font-medium">{chicasModal[0].pais}</p>
                                  </div>
                                )}
                              </div>

                              {/* ── Por app ── */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/60 px-1">
                                  Apps registradas ({chicasModal.length})
                                </p>
                                {chicasModal.map((w, i) => (
                                  <div key={i} className="bg-[#07070f] rounded-xl p-4 border border-blue-500/15">
                                    {/* App badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">{w.app_name[0]}</div>
                                      <span className="text-blue-300 text-xs font-bold tracking-wide">{w.app_name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      {/* Nombre en app — siempre */}
                                      <div>
                                        <p className="text-white/30 mb-0.5">Nombre en app</p>
                                        <p className="text-white/85 font-medium">{w.nombre_en_app || '—'}</p>
                                      </div>
                                      {/* ID en app — siempre */}
                                      <div>
                                        <p className="text-white/30 mb-0.5">ID en app</p>
                                        <p className="text-white/85 font-semibold font-mono">{w.id_aplicacion || '—'}</p>
                                      </div>
                                      {/* Método de pago */}
                                      {w.metodo_pago && (
                                        <div>
                                          <p className="text-white/30 mb-0.5">Método de pago</p>
                                          <p className="text-white/80 font-medium">{w.metodo_pago}</p>
                                        </div>
                                      )}
                                      {/* Billetera */}
                                      {w.billetera && (
                                        <div className="col-span-2">
                                          <p className="text-white/30 mb-0.5">{w.metodo_pago || 'Billetera'}</p>
                                          <p className="text-white/80 font-medium font-mono break-all">{w.billetera}</p>
                                        </div>
                                      )}
                                      {/* Teléfono de esta app si es distinto al principal */}
                                      {w.telefono && cleanFullPhone(w.codigo_pais, w.telefono) !== phoneRaw && (
                                        <div className="col-span-2">
                                          <p className="text-white/30 mb-0.5">Teléfono (esta app)</p>
                                          <a href={`https://wa.me/${cleanFullPhone(w.codigo_pais, w.telefono)}`} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-green-300 font-medium hover:text-green-200 transition-colors">
                                            📱 {w.codigo_pais} {w.telefono} · WhatsApp ↗
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                            </div>
                          </div>
                        </div>
                        )
                      })()}
                    </div>
                  )
                })()}

                  {tab === 'nocobro' && (
                      <div className="space-y-6 max-w-3xl">
                        {noCobroSetupNeeded ? (
                          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-6">
                            <p className="text-amber-300 text-sm font-bold mb-2">⚠️ Falta crear las tablas en Supabase</p>
                            <p className="text-white/50 text-xs mb-3">Ejecuta este SQL en el Editor SQL de Supabase:</p>
                            <pre className="text-[11px] text-emerald-300/80 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap select-all text-left">{`CREATE TABLE IF NOT EXISTS weekly_no_cobro (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    app_name text NOT NULL,
    semana text NOT NULL,
    reason text NOT NULL DEFAULT 'not_earned',
    nombre_en_app text,
    nombre_real text,
    email text,
    created_at timestamptz DEFAULT now(),
    justified boolean NOT NULL DEFAULT false,
    UNIQUE(user_id, app_name, semana)
  );
  ALTER TABLE weekly_no_cobro ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "admin_all_nocobro" ON weekly_no_cobro
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
  CREATE POLICY "workers_insert_own_nocobro" ON weekly_no_cobro
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;`}</pre>
                          </div>
                        ) : (
                          <>
                            {/* Row 1: Justified filter + refresh */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center bg-[#0d0d1e] border border-white/8 rounded-xl p-1 gap-1">
                                {(['all','unjustified','justified'] as const).map(f => (
                                  <button key={f} onClick={() => setNoCobFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${noCobFilter === f ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}>
                                    {f === 'all' ? 'Todas' : f === 'justified' ? 'Justificadas' : 'No justificadas'}
                                  </button>
                                ))}
                              </div>
                              <button onClick={fetchNoCobro} disabled={noCobroLoading}
                                className="ml-auto px-3 py-2 rounded-xl text-sm font-bold bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white transition-all disabled:opacity-40">
                                {noCobroLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" /> : '↻'}
                              </button>
                            </div>

                            {/* No-cobro list */}
                            {noCobroLoading ? (
                              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}</div>
                            ) : noCobroEntries.length === 0 ? (
                              <div className="bg-[#0d0d1e] border border-white/8 rounded-2xl p-12 text-center">
                                <p className="text-white/40 text-sm">No hay trabajadoras en la lista de no cobraron.</p>
                                <p className="text-white/25 text-xs mt-1">Aparecerán aquí automáticamente al subir nóminas.</p>
                              </div>
                            ) : (() => {
                              // Helpers
                              const toWa = (raw: string | null | undefined) => {
                                if (!raw) return null
                                const d = raw.replace(/\D/g, '')
                                return d.length >= 7 ? `https://wa.me/${d}` : null
                              }

                              // Group by user_id+app_name → pick latest, count weeks
                              const grouped: Record<string, any[]> = {}
                              for (const e of noCobroEntries) {
                                const k = `${e.user_id}_${e.app_name}`
                                if (!grouped[k]) grouped[k] = []
                                grouped[k].push(e)
                              }
                              const workerGroups = Object.values(grouped).map(group => {
                                const latest = [...group].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                                return { ...latest, weeks_count: group.length, is_justified: !!latest.justified }
                              })

                              // Apply justified filter
                              const justFiltered = workerGroups.filter(w => {
                                if (noCobFilter === 'justified') return w.is_justified
                                if (noCobFilter === 'unjustified') return !w.is_justified
                                return true
                              })

                              // Build unique agent list
                              const agentMap: Record<string, { code: string; name: string; phone: string | null; count: number }> = {}
                              for (const w of justFiltered) {
                                if (!w.agente_code) continue
                                if (!agentMap[w.agente_code]) agentMap[w.agente_code] = { code: w.agente_code, name: w.agente_name || w.agente_code, phone: w.agente_phone, count: 0 }
                                agentMap[w.agente_code].count++
                              }
                              const agentList = Object.values(agentMap)

                              // Apply agent filter
                              const agentFiltered = noCobAgentFilter === 'all'
                                ? justFiltered
                                : noCobAgentFilter === '__none__'
                                ? justFiltered.filter(w => !w.agente_code)
                                : justFiltered.filter(w => w.agente_code === noCobAgentFilter)

                              if (agentFiltered.length === 0) return (
                                <div className="bg-[#0d0d1e] border border-white/8 rounded-2xl p-8 text-center">
                                  <p className="text-white/40 text-sm">No hay resultados para este filtro.</p>
                                </div>
                              )

                              // Group displayed rows by agent
                              const byAgent: Record<string, any[]> = {}
                              for (const w of agentFiltered) {
                                const k = w.agente_code || 'sin_agente'
                                if (!byAgent[k]) byAgent[k] = []
                                byAgent[k].push(w)
                              }

                              return (
                                <div className="space-y-6">
                                  {/* Agent filter bar */}
                                  {agentList.length > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button onClick={() => setNoCobAgentFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${noCobAgentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white'}`}>
                                        Todas ({justFiltered.length})
                                      </button>
                                      {justFiltered.some(w => !w.agente_code) && (
                                        <button onClick={() => setNoCobAgentFilter(noCobAgentFilter === '__none__' ? 'all' : '__none__')}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${noCobAgentFilter === '__none__' ? 'bg-red-600 text-white' : 'bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white'}`}>
                                          Sin agente ({justFiltered.filter(w => !w.agente_code).length})
                                        </button>
                                      )}
                                      {agentList.map(ag => {
                                        const waLink = toWa(ag.phone)
                                        return (
                                          <div key={ag.code} className="flex items-center gap-1">
                                            <button onClick={() => setNoCobAgentFilter(ag.code === noCobAgentFilter ? 'all' : ag.code)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${noCobAgentFilter === ag.code ? 'bg-purple-600 text-white' : 'bg-[#0d0d1e] border border-white/10 text-white/40 hover:text-white'}`}>
                                              {ag.name} ({ag.count})
                                            </button>
                                            {waLink && (
                                              <a href={waLink} target="_blank" rel="noopener noreferrer"
                                                className="text-[10px] bg-green-500/15 border border-green-500/25 text-green-300 px-2 py-1 rounded-lg hover:bg-green-500/25 transition-colors font-semibold">
                                                WA ↗
                                              </a>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* Cards grouped by agent */}
                                  {Object.entries(byAgent).map(([agentCode, rows]) => {
                                    const rep = rows[0]
                                    const agentWa = toWa(rep.agente_phone)
                                    return (
                                      <div key={agentCode}>
                                        {/* Agent section header */}
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
                                            {agentCode === 'sin_agente' ? `Sin agente asignado — ${rows.length} sin cobrar` : `Agente: ${rep.agente_name || agentCode} — ${rows.length} sin cobrar`}
                                          </h3>
                                          {agentWa && (
                                            <a href={agentWa} target="_blank" rel="noopener noreferrer"
                                              className="text-[10px] bg-green-500/15 border border-green-500/25 text-green-300 px-2 py-0.5 rounded-full hover:bg-green-500/25 font-semibold">
                                              WhatsApp ↗
                                            </a>
                                          )}
                                        </div>

                                        {/* Girl cards */}
                                        <div className="space-y-2">
                                          {rows.map((row: any) => {
                                            const rawPhone = `${row.codigo_pais_worker ?? ''}${row.telefono_worker ?? ''}`
                                            const workerWa = toWa(rawPhone)
                                            const weeksColor = row.weeks_count >= 3 ? '#f87171' : row.weeks_count === 2 ? '#fb923c' : '#9ca3af'
                                            return (
                                              <div key={row.id} className={`bg-[#0d0d1e] border rounded-2xl px-4 py-3 flex items-start gap-3 ${row.is_justified ? 'border-amber-500/20' : 'border-red-500/15'}`}>
                                                {/* Status icon */}
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                                  style={{background: row.is_justified ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}}>
                                                  <span className="text-sm">{row.is_justified ? '⏸' : '✕'}</span>
                                                </div>

                                                {/* Main info */}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    <p className="text-sm font-bold text-white leading-tight">{row.nombre_en_app || row.nombre_real || '—'}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${row.app_name === 'Waha' ? 'bg-blue-500/15 border-blue-500/20 text-blue-300' : row.app_name === 'Layla' ? 'bg-pink-500/15 border-pink-500/20 text-pink-300' : 'bg-orange-500/15 border-orange-500/20 text-orange-300'}`}>
                                                      {row.app_name}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-3 flex-wrap">
                                                    {row.id_aplicacion && (
                                                      <span className="text-xs text-white/40">ID: <span className="text-white/65 font-mono">{row.id_aplicacion}</span></span>
                                                    )}
                                                    {workerWa ? (
                                                      <a href={workerWa} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20 font-semibold transition-colors">
                                                        📱 {rawPhone}
                                                      </a>
                                                    ) : row.telefono_worker && (
                                                      <span className="text-xs text-white/35">📱 {row.telefono_worker}</span>
                                                    )}
                                                  </div>
                                                  <p className="text-xs mt-1 font-semibold" style={{color: weeksColor}}>
                                                    {row.weeks_count} semana{row.weeks_count > 1 ? 's' : ''} sin cobrar en {row.app_name}
                                                  </p>
                                                </div>

                                                {/* Right: justified + semana */}
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                  <label className="flex items-center gap-1.5 cursor-pointer" title="Marcar como justificada">
                                                    <input type="checkbox" checked={row.is_justified} disabled={togglingJustified === row.id}
                                                      onChange={e => handleToggleJustified(row.id, e.target.checked)}
                                                      className="w-3.5 h-3.5 accent-amber-500" />
                                                    <span className="text-xs text-white/40 whitespace-nowrap">Justificada</span>
                                                  </label>
                                                  <p className="text-[10px] text-white/20">Sem. {row.semana?.split('-')[0]}</p>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    )}



          {/* Reset History Modal */}
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#0d0d1e] border border-red-500/30 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-red-300">Borrar todo el historial</p>
                    <p className="text-xs text-white/35 mt-0.5">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <div className="bg-red-950/40 border border-red-500/15 rounded-xl p-4 mb-5 space-y-1">
                  <p className="text-xs font-bold text-red-300 mb-2">Se borrará permanentemente:</p>
                  {['Salarios publicados de todas las trabajadoras','Comisiones de todos los agentes','Confirmaciones de pago (trabajadoras y agentes)','Marcas del colider','Lista de no-cobraron','Historial de nóminas subidas al admin','Registro de comisiones publicadas del colider','Estadísticas del ranking del mes (se reiniciará desde cero)'].map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <p className="text-xs text-white/55">{item}</p>
                    </div>
                  ))}
                </div>
                {resetResult && (
                  <div className={`p-3 rounded-xl mb-4 text-xs font-semibold ${resetResult.ok ? "bg-green-500/10 border border-green-500/25 text-green-300" : "bg-red-500/10 border border-red-500/25 text-red-300"}`}>
                    {resetResult.message}
                  </div>
                )}
                {!resetResult?.ok && (
                  <>
                    <p className="text-xs text-white/50 mb-2">
                      Escribe <span className="font-bold text-red-300">BORRAR TODO</span> para confirmar:
                    </p>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={e => setResetConfirmText(e.target.value)}
                      placeholder="BORRAR TODO"
                      className="w-full bg-[#07070f] border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/60 mb-4 font-mono"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowResetModal(false); setResetConfirmText(""); setResetResult(null) }}
                        disabled={resetLoading}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
                        Cancelar
                      </button>
                      <button
                        onClick={doResetAllHistory}
                        disabled={resetConfirmText !== "BORRAR TODO" || resetLoading}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {resetLoading
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Borrando...</>
                          : <><Trash2 className="w-4 h-4" /> Borrar todo</>
                        }
                      </button>
                    </div>
                  </>
                )}
                {resetResult?.ok && (
                  <button
                    onClick={() => { setShowResetModal(false); setResetResult(null) }}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 transition-all">
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          )}

          </div>
        </div>
      )
    }
