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
          const [adminPayStk, setAdminPayStk] = useState<{id:string;user_id:string;app_name:string;nombre_en_app:string|null;sticker_index:number;created_at:string}[]>([])
          const [loadingPayStk, setLoadingPayStk] = useState(false)
          const [adminPayApp, setAdminPayApp] = useState<'Waha'|'Layla'|'Howdy'>('Waha')
          const [tgOpen, setTgOpen] = useState(true)
          const [waOpen, setWaOpen] = useState(true)
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
            const [deleteUserEmail, setDeleteUserEmail] = useState('')
            const [deleteUserConfirmEmail, setDeleteUserConfirmEmail] = useState('')
            const [deletingUserAccount, setDeletingUserAccount] = useState(false)
            const [deleteUserMsg, setDeleteUserMsg] = useState<{ok:boolean;msg:string}|null>(null)
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
        const [copiedBilletera, setCopiedBilletera] = useState<string|null>(null)
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
        const [customRateFilterId, setCustomRateFilterId] = useState('')
        const [customRateFilterPhone, setCustomRateFilterPhone] = useState('')
        const [savingCustomRate, setSavingCustomRate] = useState<string|null>(null)
        const [savedCustomRate, setSavedCustomRate] = useState<string|null>(null)
        const [deletingCustomRate, setDeletingCustomRate] = useState<string|null>(null)
        const [customRateSetupNeeded, setCustomRateSetupNeeded] = useState(false)
        const [agentUserIds, setAgentUserIds] = useState<Set<string>>(new Set())
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
          const _apiBasePc = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
          // Use API server (service role) to bypass RLS on published_salaries and admin_paid_marks
          const salApiRes = await fetch(`${_apiBasePc}/api/admin/pagos-salaries/single?app=${encodeURIComponent(app)}`, { credentials: 'include' }).catch(() => null)
          if (!salApiRes?.ok) { setPagosData([]); setPagosSemana(''); setPagosLoading(false); return }
          const salApiData = await salApiRes.json() as { semana: string | null; salaries: any[]; adminPaidUids: string[]; coliderPaidUids: string[] }
          if (!salApiData.semana || !salApiData.salaries || salApiData.salaries.length === 0) { setPagosData([]); setPagosSemana(salApiData.semana ?? ''); setPagosLoading(false); return }
          const semana = salApiData.semana
          const salaries = salApiData.salaries
          const apiAdminPaidUids = salApiData.adminPaidUids ?? []
          const apiColiderPaidUids: string[] = salApiData.coliderPaidUids ?? []
          setPagosSemana(semana)
          const userIds = (salaries as any[]).map((s: any) => s.user_id)
          const salaryIds = (salaries as any[]).map((s: any) => s.id)
          const [{ data: profiles }, { data: workers }, _confResPc, { data: exRates }, _customRatesPc] = await Promise.all([
            supabase.from('profiles').select('id, email').in('id', userIds),
            supabase.from('worker_entries').select('user_id, nombre_real, nombre_en_app, id_aplicacion, metodo_pago, billetera, agente').eq('app_name', app).in('user_id', userIds),
            salaryIds.length > 0 ? fetch(`${_apiBasePc}/api/payment-confirmations?salary_ids=${salaryIds.join(',')}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { confirmations: [] }).catch(() => ({ confirmations: [] })) : Promise.resolve({ confirmations: [] }),
            supabase.from('exchange_rates').select('id, rate'),
            fetch(`${_apiBasePc}/api/admin/custom-worker-rates`, { credentials: 'include' }).then(r => r.ok ? r.json() : { rates: [] }).catch(() => ({ rates: [] })),
          ])
          const confirmations = (_confResPc as any)?.confirmations ?? []
          const profileMap: Record<string,string> = Object.fromEntries(((profiles ?? []) as any[]).map((p: any) => [p.id, p.email]))
          const workerMap: Record<string,any> = Object.fromEntries(((workers ?? []) as any[]).map((w: any) => [w.user_id, w]))
          const confMap: Record<string,string> = Object.fromEntries((confirmations as any[]).map((c: any) => [c.salary_id, c.confirmed_at]))
          const _rateMap: Record<string, number> = {}
          for (const r of (exRates ?? []) as any[]) _rateMap[(r as any).id] = (r as any).rate
          const _customRateMapPc: Record<string, any> = {}
          for (const cr of ((_customRatesPc as any)?.rates ?? [])) _customRateMapPc[`${cr.user_id}__${cr.app_name}`] = cr
          const merged = (salaries as any[]).map((s: any) => {
            const w = workerMap[s.user_id] ?? {}
            const confAt = confMap[s.id]
            return {
              salary_id: s.id, user_id: s.user_id, semana: s.semana, usd: Number(s.usd), app_name: app,
              apodo: (s.extras?.Apodo ?? s.extras?.apodo ?? s.extras?.Nick ?? w.nombre_en_app ?? '—') as string,
              nombre_real: w.nombre_real ?? null, nombre_en_app: w.nombre_en_app ?? null,
              email: profileMap[s.user_id] ?? '—',
              metodo_pago: w.metodo_pago ?? null, billetera: w.billetera ?? null,
              agente: w.agente ?? null,
              confirmed: !!confAt, confirmed_at: confAt ?? null,
              id_aplicacion: w.id_aplicacion ?? null,
            }
          })
          const _adminPaidSet = new Set(apiAdminPaidUids)
          const _coliderPaidSet = new Set(apiColiderPaidUids)
          const mergedWithAdmin = merged.map((row: any) => {
            const colider_paid = _coliderPaidSet.has(row.user_id) ? true : (_coliderPaidSet.size > 0 ? false : null)
            const customRate = _customRateMapPc[`${row.user_id}__${app}`]
            const mp = (row.metodo_pago ?? '').toLowerCase()
            const isEf = mp.includes('efectivo')
            let cup_amount: number | null = null
            if (mp.includes('cuba')) {
              const rate = customRate
                ? (isEf ? (customRate.efectivo_rate ?? 0) : (customRate.transferencia_rate ?? 0))
                : (isEf ? (_rateMap['efectivo_worker'] ?? 0) : (_rateMap['transferencia_worker'] ?? 0))
              if (rate > 0) cup_amount = row.usd * rate
            }
            return {
              ...row, colider_paid, cup_amount, admin_paid: _adminPaidSet.has(row.id_aplicacion ?? ''),
              has_custom: !!customRate,
              custom_ef_rate: customRate?.efectivo_rate ?? null,
              custom_tr_rate: customRate?.transferencia_rate ?? null,
              global_ef_rate: _rateMap['efectivo_worker'] ?? null,
              global_tr_rate: _rateMap['transferencia_worker'] ?? null,
            }
          })
          setPagosData(mergedWithAdmin); setPagosLoading(false)
          fetchAgentPayData()
        }


          async function fetchAllPagosData() {
            setPagosLoading(true); setPagosNeedSetup(false)
            const _apiBaseAll = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
            // Use API server (service role) to bypass RLS on published_salaries
            const salApiRes = await fetch(`${_apiBaseAll}/api/admin/pagos-salaries?apps=Waha,Layla,Howdy`, { credentials: 'include' }).catch(() => null)
            if (!salApiRes?.ok) { setPagosData([]); setPagosSemana(''); setPagosLoading(false); fetchAgentPayData(); return }
            const salApiData = await salApiRes.json() as { appSemanas: {app:string;semana:string}[]; salaries: any[]; adminPaidUids: string[]; coliderPaidUids: string[] }
            const appSemanas = salApiData.appSemanas ?? []
            const allSalaries: any[] = salApiData.salaries ?? []
            const apiAdminPaidUids: string[] = salApiData.adminPaidUids ?? []
            const apiColiderPaidUids: string[] = salApiData.coliderPaidUids ?? []
            if (appSemanas.length === 0 || allSalaries.length === 0) {
              setPagosData([]); setPagosSemana(''); setPagosLoading(false)
              fetchAgentPayData(); return
            }
            const mostRecentSemana = appSemanas.map(x => x.semana).sort().reverse()[0]
            setPagosSemana(mostRecentSemana)
            // 5. Collect ids for batch queries
            const userIds = [...new Set(allSalaries.map(s => s.user_id))] as string[]
            const salaryIds = allSalaries.map(s => s.id) as string[]
            const [{ data: profiles }, { data: workers }, _confResAll, { data: exRates }, _customRatesAll] = await Promise.all([
              supabase.from('profiles').select('id, email').in('id', userIds),
              supabase.from('worker_entries').select('user_id, app_name, nombre_real, nombre_en_app, id_aplicacion, metodo_pago, billetera, agente'),
              salaryIds.length > 0 ? fetch(`${_apiBaseAll}/api/payment-confirmations?salary_ids=${salaryIds.join(',')}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { confirmations: [] }).catch(() => ({ confirmations: [] })) : Promise.resolve({ confirmations: [] }),
              supabase.from('exchange_rates').select('id, rate'),
              fetch(`${_apiBaseAll}/api/admin/custom-worker-rates`, { credentials: 'include' }).then(r => r.ok ? r.json() : { rates: [] }).catch(() => ({ rates: [] })),
            ])
            // 6. Build lookup maps
            const profileMap: Record<string,string> = Object.fromEntries(((profiles ?? []) as any[]).map((p: any) => [p.id, p.email]))
            // worker map keyed by user_id+app_name
            const workerMap: Record<string,any> = {}
            for (const w of (workers ?? []) as any[]) workerMap[`${w.user_id}_${w.app_name}`] = w
            const confirmationsAll = (_confResAll as any)?.confirmations ?? []
            const confMap: Record<string,string> = Object.fromEntries((confirmationsAll as any[]).map((c: any) => [c.salary_id, c.confirmed_at]))
            const rateMap: Record<string,number> = {}
            for (const r of (exRates ?? []) as any[]) rateMap[(r as any).id] = (r as any).rate
            const _customRateMapAll: Record<string, any> = {}
            for (const cr of ((_customRatesAll as any)?.rates ?? [])) _customRateMapAll[`${cr.user_id}__${cr.app_name}`] = cr
            // 7. Enrich salaries
            const merged = allSalaries.map(s => {
              const app = s._app ?? s.app_name
              const w = workerMap[`${s.user_id}_${app}`] ?? workerMap[Object.keys(workerMap).find(k => k.startsWith(s.user_id)) ?? ''] ?? {}
              const confAt = confMap[s.id]
              const customRate = _customRateMapAll[`${s.user_id}__${app}`]
              const mp = (w.metodo_pago ?? '').toLowerCase()
              const isEf = mp.includes('efectivo')
              let cup_amount: number | null = null
              if (mp.includes('cuba')) {
                const rate = customRate
                  ? (isEf ? (customRate.efectivo_rate ?? 0) : (customRate.transferencia_rate ?? 0))
                  : (isEf ? (rateMap['efectivo_worker'] ?? 0) : (rateMap['transferencia_worker'] ?? 0))
                if (rate > 0) cup_amount = Number(s.usd) * rate
              }
              return {
                salary_id: s.id, user_id: s.user_id, app_name: app, semana: s._semana ?? s.semana, usd: Number(s.usd),
                apodo: (s.extras?.Apodo ?? s.extras?.apodo ?? s.extras?.Nick ?? w.nombre_en_app ?? '—') as string,
                nombre_real: w.nombre_real ?? null, nombre_en_app: w.nombre_en_app ?? null,
                email: profileMap[s.user_id] ?? '—',
                metodo_pago: w.metodo_pago ?? null, billetera: w.billetera ?? null, agente: w.agente ?? null,
                confirmed: !!confAt, confirmed_at: confAt ?? null,
                id_aplicacion: w.id_aplicacion ?? null,
                colider_paid: null as boolean | null, cup_amount,
                has_custom: !!customRate,
                custom_ef_rate: customRate?.efectivo_rate ?? null,
                custom_tr_rate: customRate?.transferencia_rate ?? null,
                global_ef_rate: rateMap['efectivo_worker'] ?? null,
                global_tr_rate: rateMap['transferencia_worker'] ?? null,
              }
            })
            // 8. Apply colider marks + admin marks — both from service-role API (bypasses RLS)
            const coliderPaidSet = new Set(apiColiderPaidUids)
            const adminPaidSet = new Set(apiAdminPaidUids)
            const final = merged.map(row => ({
              ...row,
              colider_paid: coliderPaidSet.has(row.user_id) ? true : (coliderPaidSet.size > 0 ? false : null),
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
            // Filter deleted agents (profile no longer has is_agent=true → "phantom agents")
              const { data: _activeAgentProfs } = await supabase.from('profiles').select('id').eq('is_agent', true)
              const _activeAgentIdSet = new Set((_activeAgentProfs ?? []).map((p: any) => p.id as string))
              const all = (comms ?? []).filter((c: any) => !c.agent_user_id || _activeAgentIdSet.has(c.agent_user_id)) as any[]
              // Enrich with colider_marks for agents
            const _agentUids = all.filter((c: any) => c.agent_user_id).map((c: any) => c.agent_user_id as string)
            let _agentColiderMap: Record<string, boolean> = {}
            let _agentMetodoMapLocal: Record<string, string> = {}
            let _agentAdminPaidSet = new Set<string>()

              if (_agentUids.length > 0) {
                const _apiBaseAgent = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
                const [_coliderApiData, { data: _agWorkers }, { data: _agProfiles }] = await Promise.all([
                    fetch(`${_apiBaseAgent}/api/admin/agent-colider-marks?semana=${encodeURIComponent(semana)}&agent_uids=${_agentUids.join(',')}`, { credentials: 'include' })
                      .then(r => r.ok ? r.json() : { coliderMap: {}, adminPaidIds: [] })
                      .catch(() => ({ coliderMap: {}, adminPaidIds: [] })),
                    supabase.from('worker_entries').select('user_id, metodo_pago, billetera').in('user_id', _agentUids),
                    supabase.from('profiles').select('id, agent_payment_method').in('id', _agentUids),
                  ])
                  _agentColiderMap = _coliderApiData.coliderMap ?? {}
                  _agentAdminPaidSet = new Set<string>(_coliderApiData.adminPaidIds ?? [])
                  const _agentBilleteraMapLocal: Record<string, string> = {}
                  // Build profile fallback map (agent_payment_method stored when agent selects method)
                  const _profileMetodoMap: Record<string, string> = {}
                  for (const p of (_agProfiles ?? []) as any[]) {
                    if (p.agent_payment_method) _profileMetodoMap[p.id] = p.agent_payment_method
                  }
                  for (const w of (_agWorkers ?? []) as any[]) {
                    if ((w as any).metodo_pago) _agentMetodoMapLocal[(w as any).user_id] = (w as any).metodo_pago
                    if ((w as any).billetera) _agentBilleteraMapLocal[(w as any).user_id] = (w as any).billetera
                  }
                  // Fill gaps: use profile.agent_payment_method for agents not in worker_entries
                  for (const uid of _agentUids) {
                    if (!_agentMetodoMapLocal[uid] && _profileMetodoMap[uid]) {
                      _agentMetodoMapLocal[uid] = _profileMetodoMap[uid]
                    }
                  }
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

      async function handleDeleteUser() {
        if (!deleteUserEmail || deleteUserEmail !== deleteUserConfirmEmail) return
        setDeletingUserAccount(true)
        setDeleteUserMsg(null)
        try {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', deleteUserEmail.trim().toLowerCase())
            .limit(1)
          if (!profs?.length) {
            setDeleteUserMsg({ ok: false, msg: `Usuario no encontrado: ${deleteUserEmail}` })
            return
          }
          const userId = (profs as any[])[0].id
          const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
          const res = await fetch(`${apiBase}/api/admin/delete-user?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
          const data = await res.json()
          if (res.ok) {
            setDeleteUserMsg({ ok: true, msg: `✅ Usuario "${deleteUserEmail}" eliminado correctamente` })
            setDeleteUserEmail('')
            setDeleteUserConfirmEmail('')
            setAgents(prev => prev.filter(a => a.id !== userId))
            setColiders(prev => prev.filter(c => c.id !== userId))
          } else {
            setDeleteUserMsg({ ok: false, msg: data.error ?? 'Error al eliminar usuario' })
          }
        } catch (e: any) {
          setDeleteUserMsg({ ok: false, msg: e?.message ?? 'Error de red' })
        } finally {
          setDeletingUserAccount(false)
        }
      }

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

        async function fetchAdminPayStk(app: string) {
            setLoadingPayStk(true)
            try {
              const apiBase = ((import.meta.env.VITE_API_URL as string|undefined)??'').replace(/\/$/, '')
              const r = await fetch(`${apiBase}/api/payment-stickers?app_name=${encodeURIComponent(app)}`)
              if(r.ok){ const d = await r.json(); setAdminPayStk(d.events??[]) }
            } catch {}
            setLoadingPayStk(false)
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
                // Load colider marks, admin paid marks, and metodo_pago on every fetch (ensures reload works)
                const _agUids2 = all.filter((c: any) => c.agent_user_id).map((c: any) => c.agent_user_id as string)
                let _coliderMap2: Record<string, boolean> = {}
                let _metodoMap2: Record<string, string> = {}
                let _adminPaidSet2 = new Set<string>()
                if (_agUids2.length > 0) {
                  const _apiBase2 = ((import.meta.env.VITE_API_URL as string|undefined) ?? '').replace(/\/$/, '')
                  const [_coliderApiData2, { data: _agW2 }, { data: _agP2 }] = await Promise.all([
                    fetch(_apiBase2 + '/api/admin/agent-colider-marks?semana=' + encodeURIComponent(semana) + '&agent_uids=' + _agUids2.join(','), { credentials: 'include' })
                      .then(r => r.ok ? r.json() : { coliderMap: {}, adminPaidIds: [] })
                      .catch(() => ({ coliderMap: {}, adminPaidIds: [] })),
                    supabase.from('worker_entries').select('user_id, metodo_pago').in('user_id', _agUids2),
                    supabase.from('profiles').select('id, agent_payment_method').in('id', _agUids2),
                  ])
                  _coliderMap2 = _coliderApiData2.coliderMap ?? {}
                  _adminPaidSet2 = new Set<string>(_coliderApiData2.adminPaidIds ?? [])
                  const _profMetodo2: Record<string, string> = {}
                  for (const p of (_agP2 ?? []) as any[]) { if (p.agent_payment_method) _profMetodo2[p.id] = p.agent_payment_method }
                  for (const w of (_agW2 ?? []) as any[]) { if ((w as any).metodo_pago) _metodoMap2[(w as any).user_id] = (w as any).metodo_pago }
                  for (const uid of _agUids2) { if (!_metodoMap2[uid] && _profMetodo2[uid]) _metodoMap2[uid] = _profMetodo2[uid] }
                }
                setAgentMetodoMap(_metodoMap2)
                setAgentAdminPaidIds(_adminPaidSet2)
                setAgentPayData({
                  confirmed: all.filter((c: any) => confSet.has(c.id)).map((c: any) => ({ ...c, confirmed_at: confMap[c.id], colider_paid: c.agent_user_id ? ((c.agent_user_id in _coliderMap2) ? _coliderMap2[c.agent_user_id] : null) : null })),
                  pending: all.filter((c: any) => !confSet.has(c.id)).map((c: any) => ({ ...c, colider_paid: c.agent_user_id ? ((c.agent_user_id in _coliderMap2) ? _coliderMap2[c.agent_user_id] : null) : null })),
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
        const [{ data: entries }, { data: profiles }, { data: agentProfsAll }, { data: agentProfileIds }] = await Promise.all([
            supabase.from('worker_entries').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, email'),
            supabase.from('profiles').select('agent_name, colider_name, agent_code, phone').not('agent_code', 'is', null),
            supabase.from('profiles').select('id').or('is_agent.eq.true,is_colider.eq.true'),
          ])
          const pm = Object.fromEntries(((profiles ?? []) as any[]).map(p => [p.id, p.email]))
          emailMapRef.current = pm
          const am: Record<string,string> = Object.fromEntries(
            ((agentProfsAll ?? []) as any[]).filter((a: any) => a.agent_code).map((a: any) => [a.agent_code, a.agent_name ?? a.colider_name ?? a.agent_code])
          )
          setAgentNameMap(am)
          const pm2: Record<string,string> = Object.fromEntries(
            ((agentProfsAll ?? []) as any[]).filter((a: any) => a.agent_code && a.phone).map((a: any) => [a.agent_code, a.phone as string])
          )
          setAgentPhoneMap(pm2)
          setAgentUserIds(new Set(((agentProfileIds ?? []) as {id:string}[]).map(p => p.id)))
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
            const { data } = await supabase.from('profiles').select('id, email, agent_name, colider_name, agent_code, is_agent, phone').not('agent_code', 'is', null).order('created_at', { ascending: false })
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
              <button onClick={() => { setTab('canales'); fetchChannelMessages(channelApp); fetchAdminPayStk(adminPayApp) }}
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
                  <style>{`
                      @keyframes tgspin{to{transform:rotate(360deg)}}
                      .sec-collapse{transition:all 0.25s ease}
                      .tg-msgs-bg {
                        background-color: #0e1621;
                        background-image:
                          radial-gradient(rgba(44,165,224,0.1) 1.5px, transparent 1.5px),
                          radial-gradient(rgba(44,165,224,0.05) 1px, transparent 1px);
                        background-size: 28px 28px, 14px 14px;
                        background-position: 0 0, 7px 7px;
                      }
                      .wa-msgs-bg {
                        background-color: #0b141a;
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='none' stroke='%2325d366' stroke-width='1.4' opacity='0.08'%3E%3Cpath d='M20,60 C20,35 40,35 40,60 C40,85 20,85 20,60Z'/%3E%3Cpath d='M80,30 C80,5 100,5 100,30 C100,55 80,55 80,30Z'/%3E%3Cpath d='M80,90 C80,65 100,65 100,90 C100,115 80,115 80,90Z'/%3E%3Cpath d='M-5,30 C-5,5 15,5 15,30 C15,55 -5,55 -5,30Z'/%3E%3Cpath d='M30,0 C55,0 55,20 30,20 C5,20 5,0 30,0Z'/%3E%3Cpath d='M90,60 C115,60 115,80 90,80 C65,80 65,60 90,60Z'/%3E%3C/g%3E%3C/svg%3E");
                        background-size: 120px 120px;
                      }
                    `}</style>

                  {/* ── App selector ───────────────────────────────────── */}
                  <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
                    {(['Waha','Layla','Howdy'] as const).map(app => (
                      <button key={app} onClick={() => { setChannelApp(app); setChannelContent(''); setChannelFile(null); setChannelPreview(null); setChannelImage(''); fetchChannelMessages(app); if(adminPayApp===app) fetchAdminPayStk(app) }}
                        style={{display:'flex',alignItems:'center',gap:9,padding:'8px 18px',borderRadius:30,border:'none',cursor:'pointer',fontWeight:700,fontSize:14,transition:'all 0.2s',
                          background: channelApp === app ? 'linear-gradient(135deg,#2ca5e0,#1a7fba)' : 'rgba(255,255,255,0.06)',
                          color: channelApp === app ? 'white' : 'rgba(255,255,255,0.45)',
                          boxShadow: channelApp === app ? '0 4px 14px rgba(44,165,224,0.4)' : 'none',
                          transform: channelApp === app ? 'translateY(-1px)' : 'none'}}>
                        <span style={{width:24,height:24,borderRadius:'50%',overflow:'hidden',display:'inline-flex',flexShrink:0,boxShadow:'0 2px 6px rgba(0,0,0,0.3)'}}>
                          <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${app.toLowerCase()}.jpg`} alt={app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </span>
                        {app}
                      </button>
                    ))}
                  </div>

                  {/* ══ SECCIÓN TELEGRAM ══════════════════════════════════ */}
                  <div style={{marginBottom:16,borderRadius:18,overflow:'hidden',border:'1px solid rgba(44,165,224,0.18)',boxShadow:'0 2px 20px rgba(0,0,0,0.25)'}}>
                    {/* Collapse header */}
                    <button onClick={()=>setTgOpen(o=>!o)}
                      style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'rgba(44,165,224,0.1)',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(44,165,224,0.16)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='rgba(44,165,224,0.1)')}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#2ca5e0,#1a7fba)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(44,165,224,0.4)'}}>
                        <Send style={{width:16,height:16,color:'white'}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:'white',fontWeight:700,fontSize:15}}>Canal Telegram — {channelApp}</div>
                        <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Comunicados oficiales a trabajadoras y agentes</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{background:'rgba(44,165,224,0.2)',color:'#2ca5e0',fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{channelMessages.length} msgs</span>
                        <span style={{color:'rgba(255,255,255,0.4)',fontSize:18,transition:'transform 0.25s',display:'inline-block',transform:tgOpen?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
                      </div>
                    </button>

                    {/* Telegram body */}
                    {tgOpen && (
                      <div style={{background:'#17212b'}}>
                        {/* Channel header bar */}
                        <div style={{background:'#242f3d',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid #2ca5e0',boxShadow:'0 2px 8px rgba(44,165,224,0.3)'}}>
                            <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${channelApp.toLowerCase()}.jpg`} alt={channelApp} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <span style={{color:'white',fontWeight:700,fontSize:15}}>Canal {channelApp}</span>
                              <span style={{background:'#2ca5e0',borderRadius:5,padding:'1px 7px',fontSize:9,color:'white',fontWeight:800,letterSpacing:0.5}}>CANAL</span>
                            </div>
                            <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Eclipse Angels Agency · Vista Admin</div>
                          </div>
                        </div>
                        {/* Messages list */}
                        <div className="tg-msgs-bg" style={{maxHeight:450,minHeight:120,overflowY:'auto',padding:'12px 10px'}}>
                          {loadingMsgs ? (
                            <div style={{padding:'40px 0',textAlign:'center'}}>
                              <div style={{width:30,height:30,border:'3px solid rgba(44,165,224,0.2)',borderTopColor:'#2ca5e0',borderRadius:'50%',animation:'tgspin 0.8s linear infinite',margin:'0 auto 10px'}}/>
                              <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,margin:0}}>Cargando mensajes...</p>
                            </div>
                          ) : channelMessages.length === 0 ? (
                            <div style={{textAlign:'center',padding:'56px 24px'}}>
                              <div style={{width:58,height:58,borderRadius:'50%',background:'rgba(44,165,224,0.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                                <span style={{fontSize:28}}>📢</span>
                              </div>
                              <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,margin:0}}>Sin publicaciones en {channelApp} aún</p>
                            </div>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column',gap:8}}>
                              {channelMessages.map(msg => (
                                <div key={msg.id} style={{background:'#1a2838',borderRadius:14,overflow:'hidden',border:'1px solid rgba(44,165,224,0.08)'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 13px 7px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                                    <div style={{width:27,height:27,borderRadius:'50%',overflow:'hidden',flexShrink:0}}>
                                      <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${channelApp.toLowerCase()}.jpg`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                    </div>
                                    <span style={{color:'#2ca5e0',fontWeight:700,fontSize:13,flex:1}}>Canal {channelApp}</span>
                                    <span style={{color:'rgba(255,255,255,0.22)',fontSize:11}}>{new Date(msg.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
                                    <button onClick={() => deleteMessage(msg.id)} title="Borrar"
                                      style={{background:'none',border:'none',color:'rgba(255,80,80,0.4)',cursor:'pointer',padding:'2px 5px',display:'flex',marginLeft:4,transition:'color 0.15s'}}
                                      onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,80,80,0.9)')}
                                      onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,80,80,0.4)')}>
                                      <Trash2 style={{width:14,height:14}}/>
                                    </button>
                                  </div>
                                  {msg.image_url && <img src={msg.image_url} alt="" style={{width:'100%',maxHeight:260,objectFit:'cover',display:'block'}}/>}
                                  {msg.content && <div style={{padding:'9px 13px 11px',color:'rgba(255,255,255,0.85)',fontSize:14,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{msg.content}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Compose */}
                        <div style={{background:'#1e2c3a',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'12px 14px'}}>
                          {channelPreview && (
                            <div style={{position:'relative',marginBottom:10,borderRadius:12,overflow:'hidden',border:'1px solid rgba(44,165,224,0.2)'}}>
                              <img src={channelPreview} alt="preview" style={{width:'100%',maxHeight:160,objectFit:'cover',display:'block'}}/>
                              <button onClick={()=>{setChannelFile(null);setChannelPreview(null)}}
                                style={{position:'absolute',top:7,right:7,width:28,height:28,background:'rgba(0,0,0,0.65)',border:'none',color:'white',cursor:'pointer',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <X style={{width:14,height:14}}/>
                              </button>
                            </div>
                          )}
                          <div style={{display:'flex',alignItems:'flex-end',gap:10}}>
                            <label style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',padding:8,display:'flex',flexShrink:0,transition:'color 0.15s'}}
                              onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.7)')}
                              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.35)')}>
                              <ImagePlus style={{width:20,height:20}}/>
                              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                                const f=e.target.files?.[0]; if(!f) return; setChannelFile(f)
                                const reader=new FileReader(); reader.onload=ev=>setChannelPreview(ev.target?.result as string); reader.readAsDataURL(f); e.target.value=''
                              }}/>
                            </label>
                            <div style={{flex:1,background:'#17212b',borderRadius:22,padding:'10px 16px',display:'flex',alignItems:'flex-end',border:'1px solid rgba(44,165,224,0.1)'}}>
                              <textarea value={channelContent} onChange={e=>setChannelContent(e.target.value)}
                                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&(channelContent.trim()||channelFile)){e.preventDefault();postMessage()}}}
                                placeholder={`Comunicado para ${channelApp}...`} rows={1}
                                style={{background:'none',border:'none',outline:'none',color:'white',fontSize:14,flex:1,resize:'none',lineHeight:1.5,maxHeight:100,overflowY:'auto',fontFamily:'inherit',padding:0}}/>
                            </div>
                            <button onClick={postMessage} disabled={channelPosting||channelUploading||(!channelContent.trim()&&!channelFile&&!channelImage.trim())}
                              style={{width:44,height:44,borderRadius:'50%',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s',
                                background:(channelContent.trim()||channelFile||channelImage.trim())?'linear-gradient(135deg,#2ca5e0,#1a7fba)':'rgba(255,255,255,0.07)',
                                boxShadow:(channelContent.trim()||channelFile||channelImage.trim())?'0 3px 12px rgba(44,165,224,0.4)':'none',
                                transform:(channelContent.trim()||channelFile||channelImage.trim())?'scale(1.05)':'scale(1)'}}>
                              {(channelPosting||channelUploading)
                                ? <div style={{width:17,height:17,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'tgspin 0.8s linear infinite'}}/>
                                : <Send style={{width:17,height:17,color:'white'}}/>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ══ SECCIÓN WHATSAPP PAGOS ════════════════════════════ */}
                  <div style={{borderRadius:18,overflow:'hidden',border:'1px solid rgba(37,211,102,0.18)',boxShadow:'0 2px 20px rgba(0,0,0,0.25)'}}>
                    {/* Collapse header */}
                    <button onClick={()=>setWaOpen(o=>!o)}
                      style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'rgba(37,211,102,0.08)',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(37,211,102,0.14)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='rgba(37,211,102,0.08)')}>
                      <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(37,211,102,0.5)',boxShadow:'0 2px 8px rgba(37,211,102,0.4)'}}>
                          <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${adminPayApp.toLowerCase()}.jpg`} alt={adminPayApp} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </div>
                      <div style={{flex:1}}>
                        <div style={{color:'white',fontWeight:700,fontSize:15}}>Pagos WhatsApp — {adminPayApp}</div>
                        <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Stickers enviados al confirmar pagos</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{background:'rgba(37,211,102,0.15)',color:'#25d366',fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{adminPayStk.filter(s=>s.app_name===adminPayApp).length} pagos</span>
                        <span style={{color:'rgba(255,255,255,0.4)',fontSize:18,transition:'transform 0.25s',display:'inline-block',transform:waOpen?'rotate(180deg)':'rotate(0deg)'}}>⌄</span>
                      </div>
                    </button>

                    {/* WhatsApp body */}
                    {waOpen && (
                      <div style={{background:'#0b141a'}}>
                        {/* Channel header bar */}
                        <div style={{background:'#1f2c34',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(0,0,0,0.3)'}}>
                          <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid #25d366',boxShadow:'0 2px 8px rgba(37,211,102,0.3)'}}>
                            <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${adminPayApp.toLowerCase()}.jpg`} alt={adminPayApp} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <span style={{color:'white',fontWeight:700,fontSize:15}}>Pagos {adminPayApp}</span>
                              <span style={{background:'#25d366',borderRadius:5,padding:'1px 7px',fontSize:9,color:'white',fontWeight:800,letterSpacing:0.5}}>PAGOS</span>
                            </div>
                            <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Canal de confirmaciones de pago · Vista Admin</div>
                          </div>
                        </div>
                        {/* App sub-selector */}
                        <div style={{padding:'12px 16px 8px',background:'#111c22',display:'flex',gap:6,flexWrap:'wrap',borderBottom:'1px solid rgba(255,255,255,0.04)',alignItems:'center'}}>
                          {(['Waha','Layla','Howdy'] as const).map(app=>(
                            <button key={app} onClick={()=>{setAdminPayApp(app);fetchAdminPayStk(app)}}
                              style={{display:'flex',alignItems:'center',gap:7,padding:'5px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,transition:'all 0.15s',
                                background:adminPayApp===app?'#25d366':'rgba(255,255,255,0.06)',
                                color:adminPayApp===app?'white':'rgba(255,255,255,0.4)',
                                boxShadow:adminPayApp===app?'0 2px 8px rgba(37,211,102,0.35)':'none'}}>
                              <span style={{width:20,height:20,borderRadius:'50%',overflow:'hidden',display:'inline-flex',flexShrink:0}}>
                                <img src={`https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/${app.toLowerCase()}.jpg`} alt={app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              </span>
                              {app}
                            </button>
                          ))}
                          <button onClick={()=>fetchAdminPayStk(adminPayApp)}
                            style={{marginLeft:'auto',padding:'5px 12px',borderRadius:20,border:'1px solid rgba(37,211,102,0.3)',background:'transparent',cursor:'pointer',color:'#25d366',fontSize:12,fontWeight:700,transition:'all 0.15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.background='rgba(37,211,102,0.1)'}}
                            onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                            ↻ Refrescar
                          </button>
                        </div>
                        {/* Stickers list */}
                        <div className="wa-msgs-bg" style={{maxHeight:460,minHeight:120,overflowY:'auto',padding:'14px 14px'}}>
                          {loadingPayStk ? (
                            <div style={{textAlign:'center',padding:'40px 0'}}>
                              <div style={{width:28,height:28,border:'3px solid rgba(37,211,102,0.2)',borderTopColor:'#25d366',borderRadius:'50%',animation:'tgspin 0.8s linear infinite',margin:'0 auto 10px'}}/>
                              <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,margin:0}}>Cargando pagos...</p>
                            </div>
                          ) : adminPayStk.filter(s=>s.app_name===adminPayApp).length===0 ? (
                            <div style={{textAlign:'center',padding:'56px 24px'}}>
                              <div style={{fontSize:42,marginBottom:12}}>💸</div>
                              <p style={{color:'rgba(255,255,255,0.3)',fontSize:14,margin:0,fontWeight:600}}>Sin pagos confirmados en {adminPayApp}</p>
                              <p style={{color:'rgba(255,255,255,0.15)',fontSize:12,marginTop:6}}>Aparecerán aquí cuando alguien confirme su pago</p>
                            </div>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column',gap:10}}>
                              {[...adminPayStk.filter(s=>s.app_name===adminPayApp)].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(stk=>{
                                const stkUrls = ['https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_0_money.jpg','https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_1_lady.jpg','https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_2_cat.jpg','https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_3_gold.jpg','https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_4_pink.jpg','https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_5_man.jpg'];
                                const nm = stk.nombre_en_app||'Usuario';
                                const stickerImg = stkUrls[stk.sticker_index % stkUrls.length];
                                const sentTime = new Date(stk.created_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
                                const sentDate = new Date(stk.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
                                return (
                                  <div key={stk.id} style={{display:'flex',alignItems:'flex-end',gap:8}}>
                                    <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#7e57c2,#9c27b0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'white',flexShrink:0,marginBottom:2}}>
                                      {(nm[0]||'?').toUpperCase()}
                                    </div>
                                    <div style={{maxWidth:220,background:'#1f2c34',borderRadius:'14px 14px 14px 4px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.35)',border:'1px solid rgba(37,211,102,0.1)'}}>
                                      <div style={{padding:'5px 10px 3px',color:'#25d366',fontSize:12,fontWeight:700}}>{nm}</div>
                                      <div style={{position:'relative'}}>
                                        <img src={stickerImg} alt="Pago recibido" style={{width:200,height:200,objectFit:'cover',display:'block'}}/>
                                        <div style={{position:'absolute',bottom:6,right:8,background:'rgba(0,0,0,0.55)',borderRadius:8,padding:'2px 7px',display:'flex',alignItems:'center',gap:4}}>
                                          <span style={{color:'rgba(255,255,255,0.9)',fontSize:11,fontWeight:600}}>{sentTime}</span>
                                          <span style={{color:'rgba(255,255,255,0.5)',fontSize:10}}>· {sentDate}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                      // Multi-app map: user_id → [{app_name, nombre_en_app, id_aplicacion}]
                      const workerAppsMap: Record<string, {app_name:string;nombre_en_app:string|null;id_aplicacion:string|null}[]> = {}
                      for (const r of (pagosData as any[])) {
                        if (!workerAppsMap[r.user_id]) workerAppsMap[r.user_id] = []
                        if (!workerAppsMap[r.user_id].some((a:any) => a.app_name === r.app_name))
                          workerAppsMap[r.user_id].push({ app_name: r.app_name, nombre_en_app: r.nombre_en_app, id_aplicacion: r.id_aplicacion })
                      }
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
                      // Progress: 2 pasos por persona — (1) marcado pagado + (2) trabajadora/agente confirma recepcion
                        // Barra Efectivo (colider)
                        const coliderWorkerPaid = efectivoRows.filter((r: any) => r.colider_paid === true).length
                        const coliderWorkerConf = efectivoRows.filter((r: any) => r.confirmed === true).length
                        const coliderAgentPaid = agentEfectivo.filter((a: any) => a.colider_paid === true).length
                        const coliderAgentConf = agentEfectivo.filter((a: any) => agentConfirmedIds.has(a.id)).length
                        const dualEfectivoPaid = dualEfectivo.filter((d: any) => d.agentRow.colider_paid === true).length
                        const dualEfectivoConf = dualEfectivo.filter((d: any) => agentConfirmedIds.has(d.agentRow.id)).length
                        const coliderDone = coliderWorkerPaid + coliderWorkerConf + coliderAgentPaid + coliderAgentConf + dualEfectivoPaid + dualEfectivoConf
                        const coliderTotal = (efectivoRows.length + agentEfectivo.length + dualEfectivo.length) * 2
                        const coliderPct = coliderTotal > 0 ? Math.round(coliderDone / coliderTotal * 100) : 0
                        // Barra Agencia (admin)
                        const agenciaWorkerPaid = agenciaRows.filter((r: any) => r.admin_paid === true).length
                        const agenciaWorkerConf = agenciaRows.filter((r: any) => r.confirmed === true).length
                        const agenciaAgentPaid = agentAgencia.filter((a: any) => agentAdminPaidIds.has(a.agent_user_id)).length
                        const agenciaAgentConf = agentAgencia.filter((a: any) => agentConfirmedIds.has(a.id)).length
                        const dualAgenciaPaid = dualAgencia.filter((d: any) => agentAdminPaidIds.has(d.agentRow.agent_user_id)).length
                        const dualAgenciaConf = dualAgencia.filter((d: any) => agentConfirmedIds.has(d.agentRow.id)).length
                        const agenciaDone = agenciaWorkerPaid + agenciaWorkerConf + agenciaAgentPaid + agenciaAgentConf + dualAgenciaPaid + dualAgenciaConf
                        const agenciaTotal = (agenciaRows.length + agentAgencia.length + dualAgencia.length) * 2
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
                                            {appRows.map((row: any) => {
                                              const allApps = workerAppsMap[row.user_id] ?? []
                                              const isEf = (row.metodo_pago ?? '').toLowerCase().includes('efectivo')
                                              const usedRate = row.has_custom ? (isEf ? row.custom_ef_rate : row.custom_tr_rate) : (isEf ? row.global_ef_rate : row.global_tr_rate)
                                              const initials = (row.apodo || row.nombre_en_app || row.nombre_real || '?')[0].toUpperCase()
                                              const fullyDone = row.colider_paid && row.confirmed
                                              return (
                                              <div key={row.salary_id} className={`rounded-2xl overflow-hidden border transition-all ${fullyDone ? 'border-teal-500/30 bg-gradient-to-br from-teal-950/50 to-black/50' : 'border-white/8 bg-gradient-to-br from-white/3 to-black/40'}`}>
                                                {/* Top row */}
                                                <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${fullyDone ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-white/6 text-white/50 border border-white/10'}`}>
                                                    {initials}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                      <p className="text-sm font-bold text-white leading-tight">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                                      {row.nombre_real && row.nombre_real !== row.apodo && <p className="text-[11px] text-white/35 leading-tight">{row.nombre_real}</p>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                      {allApps.map((a:any) => (
                                                        <span key={a.app_name} className="inline-flex items-center gap-1 bg-teal-500/8 border border-teal-500/15 rounded-lg px-2 py-0.5">
                                                          <span className="text-[10px] text-teal-400/80 font-semibold">{a.app_name}</span>
                                                          {a.nombre_en_app && <span className="text-[10px] text-white/45">{a.nombre_en_app}</span>}
                                                          {a.id_aplicacion && <span className="text-[10px] text-white/25 font-mono">#{a.id_aplicacion}</span>}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-teal-300 leading-tight">${row.usd.toFixed(2)}</p>
                                                    {row.cup_amount ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{Math.round(row.cup_amount).toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                  </div>
                                                </div>
                                                {/* Bottom strip */}
                                                <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${row.has_custom ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'bg-white/5 border border-white/10 text-white/35'}`}>
                                                      {row.has_custom ? '★ Excl' : 'Global'}{usedRate ? ` ×${usedRate}` : ''}
                                                    </span>
                                                    {row.metodo_pago && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {row.metodo_pago}</span>}
                                                      {row.billetera ? (
                                                        <button onClick={() => { navigator.clipboard.writeText(row.billetera); setCopiedBilletera(row.salary_id + 'w'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group">
                                                          <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                          <span className="text-[10px] font-mono text-teal-300/60 group-hover:text-teal-200 transition-colors truncate max-w-[110px]">{row.billetera}</span>
                                                          {copiedBilletera === row.salary_id + 'w' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-teal-400 shrink-0 transition-colors" />}
                                                        </button>
                                                      ) : null}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {row.colider_paid === true && <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Colider ✓</span>}
                                                    {row.colider_paid === false && <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300/70 px-2 py-0.5 rounded-full whitespace-nowrap">Sin pagar</span>}
                                                    {(row.colider_paid === null || row.colider_paid === undefined) && <span className="text-[10px] text-white/20 whitespace-nowrap">Sin marcar</span>}
                                                    {row.confirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                  </div>
                                                </div>
                                              </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {/* Efectivo agents */}
                                    {agentEfectivo.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-2 px-1">👑 Agente</p>
                                        <div className="space-y-2">
                                          {agentEfectivo.map((row: any, idx: number) => {
                                            const agentDisplayName = (agentNameMap[row.agent_name] ?? row.agent_name) || '—'
                                            const agentInitial = agentDisplayName[0]?.toUpperCase() ?? '?'
                                            const isConfirmed = agentConfirmedIds.has(row.id)
                                            const fullyDone = row.colider_paid && isConfirmed
                                            const usd = Number(row.total_commission_usd || 0)
                                            const cupAmt = (rates['efectivo_agent'] ?? 0) > 0 ? Math.round(usd * rates['efectivo_agent']) : null
                                            const billetera = agentBilleteraMap[row.agent_user_id]
                                            const metodo = agentMetodoMap[row.agent_user_id]
                                            return (
                                            <div key={row.id ?? idx} className={`rounded-2xl overflow-hidden border transition-all ${fullyDone ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-black/50' : 'border-white/8 bg-gradient-to-br from-white/3 to-black/40'}`}>
                                              <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${fullyDone ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/6 text-white/50 border border-white/10'}`}>
                                                  {agentInitial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-bold text-white leading-tight">{agentDisplayName}</p>
                                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                                    <span className="inline-flex items-center gap-1 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-0.5">
                                                      <span className="text-[10px] text-amber-400/80 font-semibold">{row.app_name}</span>
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                  <p className="text-base font-bold text-amber-300 leading-tight">${usd.toFixed(2)}</p>
                                                  {cupAmt ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{cupAmt.toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                </div>
                                              </div>
                                              <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">


                                                  {metodo && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {metodo}</span>}
                                                  {billetera && (
                                                    <button onClick={() => { navigator.clipboard.writeText(billetera); setCopiedBilletera(row.id + 'ae'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group">
                                                      <span className="text-[10px] font-mono text-amber-300/60 group-hover:text-amber-200 transition-colors truncate max-w-[120px]">{billetera}</span>
                                                      <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                        <span className="text-[10px] font-mono text-amber-300/60 group-hover:text-amber-200 transition-colors truncate max-w-[110px]">{billetera}</span>
                                                      {copiedBilletera === row.id + 'ae' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-amber-400 shrink-0 transition-colors" />}
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  {row.colider_paid === true && <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Colider ✓</span>}
                                                  {row.colider_paid === false && <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300/70 px-2 py-0.5 rounded-full whitespace-nowrap">Sin pagar</span>}
                                                  {(row.colider_paid === null || row.colider_paid === undefined) && <span className="text-[10px] text-white/20 whitespace-nowrap">Sin marcar</span>}
                                                  {isConfirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                </div>
                                              </div>
                                            </div>
                                            )
                                          })}
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

                                              const workerCupD = d.workerRows.reduce((s: number, r: any) => s + (Number(r.cup_amount) || 0), 0)
                                              const agentCupD = (rates['efectivo_agent'] ?? 0) > 0 ? Math.round(agentTotalD * rates['efectivo_agent']) : null
                                              const totalCupD = agentCupD !== null || workerCupD > 0 ? Math.round(workerCupD + (agentCupD ?? 0)) : null

                                            return (

                                              <div key={d.agent_user_id} className="bg-black/30 border border-violet-500/25 rounded-2xl px-4 py-3">
                                                <div className="flex items-start gap-3">
                                                  <div className="w-7 h-7 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    {(coliderPaidD && agentConfirmedD) ? <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> : <Clock className="w-3.5 h-3.5 text-violet-400/40" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                      <p className="text-sm font-bold text-white leading-tight">{(agentNameMap[d.agentRow.agent_name] ?? d.agentRow.agent_name) || '—'}</p>
                                                      {d.workerRows[0]?.nombre_real && <p className="text-[11px] text-white/35">{d.workerRows[0].nombre_real}</p>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                      {d.workerRows.map((r:any) => (
                                                        <span key={r.salary_id} className="inline-flex items-center gap-1 bg-teal-500/8 border border-teal-500/15 rounded-lg px-2 py-0.5">
                                                          <span className="text-[10px] text-teal-400/80 font-semibold">{r.app_name}</span>
                                                          {(r.nombre_en_app || r.apodo) && <span className="text-[10px] text-white/45">{r.nombre_en_app || r.apodo}</span>}
                                                          {r.id_aplicacion && <span className="text-[10px] text-white/25 font-mono">#{r.id_aplicacion}</span>}
                                                          <span className="text-[10px] text-teal-300/60">${Number(r.usd||0).toFixed(2)}</span>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-violet-300 leading-tight">${totalD.toFixed(2)}</p>

                                                    {totalCupD ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{totalCupD.toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                </div>
                                                {/* Bottom strip */}
                                                <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">

                                                  <div className="flex items-start gap-2 min-w-0 flex-1 flex-col">





                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      {d.workerRows[0]?.has_custom !== undefined && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${d.workerRows[0]?.has_custom ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'bg-white/5 border border-white/10 text-white/35'}`}>
                                                          {d.workerRows[0]?.has_custom ? '★ Excl' : 'Global'}
                                                        </span>
                                                      )}
                                                      {metodoD && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {metodoD}</span>}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                                                      <span className="text-[10px] text-violet-300/70">👑 Comisión: <span className="font-bold">${agentTotalD.toFixed(2)}</span>{agentCupD != null ? <span className="text-amber-300/60"> / {agentCupD.toLocaleString('es-ES')} CUP</span> : null}</span>
                                                      {d.workerRows.map((r: any) => (
                                                        <span key={r.salary_id} className="text-[10px] text-teal-300/70">💼 {r.app_name}{r.nombre_en_app || r.apodo ? ` · ${r.nombre_en_app || r.apodo}` : ''}: <span className="font-bold">${Number(r.usd||0).toFixed(2)}</span>{r.cup_amount ? <span className="text-amber-300/60"> / {Math.round(Number(r.cup_amount)).toLocaleString('es-ES')} CUP</span> : null}</span>
                                                      ))}
                                                      <span className="text-[10px] text-white/60 font-bold border-t border-white/10 pt-0.5 mt-0.5">= Total: ${totalD.toFixed(2)}{totalCupD ? <span className="text-amber-300/70"> / {totalCupD.toLocaleString('es-ES')} CUP</span> : null}</span>
                                                    </div>
                                                    {billeteraD && (
                                                      <button onClick={() => { navigator.clipboard.writeText(billeteraD); setCopiedBilletera(d.agent_user_id + 'de'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group mt-0.5">
                                                        <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                        <span className="text-[10px] font-mono text-violet-300/60 group-hover:text-violet-200 transition-colors truncate max-w-[130px]">{billeteraD}</span>
                                                        {copiedBilletera === d.agent_user_id + 'de' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-violet-400 shrink-0 transition-colors" />}
                                                      </button>
                                                    )}







                                                  </div>
                                                    {coliderPaidD ? <span className="text-[10px] bg-teal-500/15 border border-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Colider ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin marcar</span>}
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {agentConfirmedD ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                  </div>
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
                                            {appRows.map((row: any) => {
                                              const allApps = workerAppsMap[row.user_id] ?? []
                                              const isEf = (row.metodo_pago ?? '').toLowerCase().includes('efectivo')
                                              const usedRate = row.has_custom ? (isEf ? row.custom_ef_rate : row.custom_tr_rate) : (isEf ? row.global_ef_rate : row.global_tr_rate)
                                              const initials = (row.apodo || row.nombre_en_app || row.nombre_real || '?')[0].toUpperCase()
                                              const fullyDone = row.admin_paid && row.confirmed
                                              return (
                                              <div key={row.salary_id} className={`rounded-2xl overflow-hidden border transition-all ${fullyDone ? 'border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-black/50' : 'border-white/8 bg-gradient-to-br from-white/3 to-black/40'}`}>
                                                {/* Top row */}
                                                <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${fullyDone ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/6 text-white/50 border border-white/10'}`}>
                                                    {initials}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                      <p className="text-sm font-bold text-white leading-tight">{row.apodo || row.nombre_en_app || row.nombre_real || '—'}</p>
                                                      {row.nombre_real && row.nombre_real !== row.apodo && <p className="text-[11px] text-white/35 leading-tight">{row.nombre_real}</p>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                      {allApps.map((a:any) => (
                                                        <span key={a.app_name} className="inline-flex items-center gap-1 bg-purple-500/8 border border-purple-500/15 rounded-lg px-2 py-0.5">
                                                          <span className="text-[10px] text-purple-400/80 font-semibold">{a.app_name}</span>
                                                          {a.nombre_en_app && <span className="text-[10px] text-white/45">{a.nombre_en_app}</span>}
                                                          {a.id_aplicacion && <span className="text-[10px] text-white/25 font-mono">#{a.id_aplicacion}</span>}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-purple-300 leading-tight">${row.usd.toFixed(2)}</p>
                                                    {row.cup_amount ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{Math.round(row.cup_amount).toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                  </div>
                                                </div>
                                                {/* Bottom strip */}
                                                <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${row.has_custom ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'bg-white/5 border border-white/10 text-white/35'}`}>
                                                      {row.has_custom ? '★ Excl' : 'Global'}{usedRate ? ` ×${usedRate}` : ''}
                                                    </span>

                                                    {row.metodo_pago && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {row.metodo_pago}</span>}
                                                    {row.billetera && (
                                                      <button onClick={() => { navigator.clipboard.writeText(row.billetera); setCopiedBilletera((row.user_id || '') + 'wa'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group">
                                                      <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                        <span className="text-[10px] font-mono text-purple-300/60 group-hover:text-purple-200 transition-colors truncate max-w-[110px]">{row.billetera}</span>
                                                        {copiedBilletera === (row.user_id || '') + 'wa' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-purple-400 shrink-0 transition-colors" />}
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {row.confirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                    <button
                                                      onClick={() => toggleAdminPaid(row.id_aplicacion, row.app_name, row.semana)}
                                                      disabled={!row.id_aplicacion || togglingAdminPaid === row.id_aplicacion}
                                                      className={`flex items-center gap-1 transition-all ${!row.id_aplicacion ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${row.admin_paid ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                        {row.admin_paid && <Check className="w-2.5 h-2.5 text-white" />}
                                                        {togglingAdminPaid === row.id_aplicacion && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                      </div>
                                                      <span className={`text-[10px] font-medium whitespace-nowrap ${row.admin_paid ? 'text-purple-300' : 'text-white/30'}`}>{row.admin_paid ? 'Pagado ✓' : 'Marcar'}</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}
                                    {/* Agencia agents */}
                                    {agentAgencia.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-2 px-1">👑 Agente</p>
                                        <div className="space-y-2">
                                          {agentAgencia.map((row: any, idx: number) => {
                                            const agentDisplayName = (agentNameMap[row.agent_name] ?? row.agent_name) || '—'
                                            const agentInitial = agentDisplayName[0]?.toUpperCase() ?? '?'
                                            const isConfirmed = agentConfirmedIds.has(row.id)
                                            const isPaid = agentAdminPaidIds.has(row.agent_user_id)
                                            const fullyDone = isPaid && isConfirmed
                                            const usd = Number(row.total_commission_usd || 0)
                                            const cupAmt = (rates['transferencia_agent'] ?? 0) > 0 ? Math.round(usd * rates['transferencia_agent']) : null
                                            const billetera = agentBilleteraMap[row.agent_user_id]
                                            const metodo = agentMetodoMap[row.agent_user_id]
                                            return (
                                            <div key={row.id ?? idx} className={`rounded-2xl overflow-hidden border transition-all ${fullyDone ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-black/50' : 'border-white/8 bg-gradient-to-br from-white/3 to-black/40'}`}>
                                              <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${fullyDone ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/6 text-white/50 border border-white/10'}`}>
                                                  {agentInitial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-bold text-white leading-tight">{agentDisplayName}</p>
                                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                                    <span className="inline-flex items-center gap-1 bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-0.5">
                                                      <span className="text-[10px] text-amber-400/80 font-semibold">{row.app_name}</span>
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                  <p className="text-base font-bold text-amber-300 leading-tight">${usd.toFixed(2)}</p>
                                                  {cupAmt ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{cupAmt.toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                </div>
                                              </div>
                                              <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                  {(rates['transferencia_agent'] ?? 0) > 0 && <span className="text-[10px] text-white/30 shrink-0">×{rates['transferencia_agent']}</span>}

                                                  {metodo && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {metodo}</span>}
                                                  {billetera && (
                                                    <button onClick={() => { navigator.clipboard.writeText(billetera); setCopiedBilletera(row.id + 'a'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group">

                                                      <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                        <span className="text-[10px] font-mono text-amber-300/60 group-hover:text-amber-200 transition-colors truncate max-w-[110px]">{billetera}</span>
                                                      {copiedBilletera === row.id + 'a' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-amber-400 shrink-0 transition-colors" />}
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  {isConfirmed ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                  <button
                                                    onClick={() => toggleAgentAdminPaid(row.agent_user_id, row.app_name, row.semana)}
                                                    disabled={!row.agent_user_id || togglingAgentAdminPaid === row.agent_user_id}
                                                    className={`flex items-center gap-1 transition-all ${!row.agent_user_id ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isPaid ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                      {isPaid && <Check className="w-2.5 h-2.5 text-white" />}
                                                      {togglingAgentAdminPaid === row.agent_user_id && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                    </div>
                                                    <span className={`text-[10px] font-medium whitespace-nowrap ${isPaid ? 'text-purple-300' : 'text-white/30'}`}>{isPaid ? 'Pagado ✓' : 'Marcar'}</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                            )
                                          })}
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
                                            const workerCupA = d.workerRows.reduce((s: number, r: any) => s + (Number(r.cup_amount) || 0), 0)
                                              const agentCupA = (rates['transferencia_agent'] ?? 0) > 0 ? Math.round(agentTotalA * rates['transferencia_agent']) : null
                                              const totalCupA = agentCupA !== null || workerCupA > 0 ? Math.round(workerCupA + (agentCupA ?? 0)) : null
                                              return (



                                              <div key={d.agent_user_id} className={`rounded-2xl overflow-hidden border transition-all ${adminPaidA && agentConfirmedA ? 'border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-black/50' : 'border-white/8 bg-gradient-to-br from-white/3 to-black/40'}`}>
                                                {/* Top row */}
                                                <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${adminPaidA && agentConfirmedA ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/6 text-white/50 border border-white/10'}`}>
                                                    {((agentNameMap[d.agentRow.agent_name] ?? d.agentRow.agent_name) || '?')[0].toUpperCase()}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                      <p className="text-sm font-bold text-white leading-tight">{(agentNameMap[d.agentRow.agent_name] ?? d.agentRow.agent_name) || '—'}</p>
                                                      {d.workerRows[0]?.nombre_real && <p className="text-[11px] text-white/35">{d.workerRows[0].nombre_real}</p>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                      {d.workerRows.map((r:any) => (
                                                        <span key={r.salary_id} className="inline-flex items-center gap-1 bg-purple-500/8 border border-purple-500/15 rounded-lg px-2 py-0.5">
                                                          <span className="text-[10px] text-purple-400/80 font-semibold">{r.app_name}</span>
                                                          {(r.nombre_en_app || r.apodo) && <span className="text-[10px] text-white/45">{r.nombre_en_app || r.apodo}</span>}
                                                          {r.id_aplicacion && <span className="text-[10px] text-white/25 font-mono">#{r.id_aplicacion}</span>}
                                                          <span className="text-[10px] text-purple-300/60">${Number(r.usd||0).toFixed(2)}</span>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-violet-300 leading-tight">${totalA.toFixed(2)}</p>

                                                    {totalCupA ? <p className="text-xs text-amber-300/75 font-semibold mt-0.5">{totalCupA.toLocaleString('es-ES')} <span className="text-amber-300/40 font-normal text-[10px]">CUP</span></p> : null}
                                                  </div>
                                                </div>
                                                {/* Bottom strip */}
                                                <div className="px-4 pb-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2">

                                                  <div className="flex items-start gap-2 min-w-0 flex-1 flex-col">





                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                      {d.workerRows[0]?.has_custom !== undefined && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${d.workerRows[0]?.has_custom ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300' : 'bg-white/5 border border-white/10 text-white/35'}`}>
                                                          {d.workerRows[0]?.has_custom ? '★ Excl' : 'Global'}
                                                        </span>
                                                      )}
                                                      {metodoA && <span className="text-[10px] text-white/45"><span className="text-white/25">Método:</span> {metodoA}</span>}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                                                      <span className="text-[10px] text-violet-300/70">👑 Comisión: <span className="font-bold">${agentTotalA.toFixed(2)}</span>{agentCupA != null ? <span className="text-amber-300/60"> / {agentCupA.toLocaleString('es-ES')} CUP</span> : null}</span>
                                                      {d.workerRows.map((r: any) => (
                                                        <span key={r.salary_id} className="text-[10px] text-teal-300/70">💼 {r.app_name}{r.nombre_en_app || r.apodo ? ` · ${r.nombre_en_app || r.apodo}` : ''}: <span className="font-bold">${Number(r.usd||0).toFixed(2)}</span>{r.cup_amount ? <span className="text-amber-300/60"> / {Math.round(Number(r.cup_amount)).toLocaleString('es-ES')} CUP</span> : null}</span>
                                                      ))}
                                                      <span className="text-[10px] text-white/60 font-bold border-t border-white/10 pt-0.5 mt-0.5">= Total: ${totalA.toFixed(2)}{totalCupA ? <span className="text-amber-300/70"> / {totalCupA.toLocaleString('es-ES')} CUP</span> : null}</span>
                                                    </div>
                                                    {billeteraA && (
                                                      <button onClick={() => { navigator.clipboard.writeText(billeteraA); setCopiedBilletera(d.agent_user_id + 'd'); setTimeout(() => setCopiedBilletera(null), 1500) }} className="flex items-center gap-1 group mt-0.5">
                                                        <span className="text-[10px] text-white/25 shrink-0 font-semibold">Billetera:</span>
                                                        <span className="text-[10px] font-mono text-violet-300/60 group-hover:text-violet-200 transition-colors truncate max-w-[130px]">{billeteraA}</span>
                                                        {copiedBilletera === d.agent_user_id + 'd' ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 text-white/20 group-hover:text-violet-400 shrink-0 transition-colors" />}
                                                      </button>
                                                    )}







                                                  </div>
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {agentConfirmedA ? <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Confirmó ✓</span> : <span className="text-[10px] text-white/20 whitespace-nowrap">Sin confirmar</span>}
                                                    <button onClick={() => toggleAgentAdminPaid(d.agent_user_id, d.agentRow.app_name, d.agentRow.semana)} disabled={!d.agent_user_id || togglingAgentAdminPaid === d.agent_user_id} className={`flex items-center gap-1 transition-all ${!d.agent_user_id ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}>
                                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${adminPaidA ? 'bg-purple-500 border-purple-500' : 'border-white/25 hover:border-purple-400/60'}`}>
                                                        {adminPaidA && <Check className="w-2.5 h-2.5 text-white" />}
                                                        {togglingAgentAdminPaid === d.agent_user_id && <div className="w-2 h-2 border border-white/50 border-t-transparent rounded-full animate-spin" />}
                                                      </div>
                                                      <span className={`text-[10px] font-medium whitespace-nowrap ${adminPaidA ? 'text-purple-300' : 'text-white/30'}`}>{adminPaidA ? 'Pagado ✓' : 'Marcar'}</span>
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
GRANT ALL ON colider_week_status TO service_role;

-- Bloqueo semanal de método de pago (trabajadoras, agentes, coliders)
CREATE TABLE IF NOT EXISTS payment_method_locks (
  user_id text PRIMARY KEY,
  locked boolean DEFAULT false,
  locked_at timestamptz DEFAULT now()
);
ALTER TABLE payment_method_locks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON payment_method_locks TO service_role;`}</pre>
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

                    {/* ELIMINAR CUENTA DE USUARIO */}
                    <div className="bg-[#0d0d1e] border border-red-500/15 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-white/70">Eliminar cuenta de usuario</span>
                      </div>
                      {deleteUserMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${deleteUserMsg.ok ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                          {deleteUserMsg.msg}
                        </div>
                      )}
                      <p className="text-xs text-white/40 mb-3">Ingresa el correo del usuario a eliminar permanentemente. Se borrarán todos sus datos.</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          value={deleteUserEmail}
                          onChange={e => { setDeleteUserEmail(e.target.value); setDeleteUserMsg(null) }}
                          placeholder="Correo del usuario"
                          type="email"
                          className="bg-[#07070f] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-red-400/50"
                        />
                        <input
                          value={deleteUserConfirmEmail}
                          onChange={e => setDeleteUserConfirmEmail(e.target.value)}
                          placeholder="Confirma el correo"
                          type="email"
                          className="bg-[#07070f] border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-red-400/50"
                        />
                      </div>
                      <button
                        onClick={handleDeleteUser}
                        disabled={deletingUserAccount || !deleteUserEmail || deleteUserEmail !== deleteUserConfirmEmail}
                        className="mt-3 flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                        {deletingUserAccount
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                        {deletingUserAccount ? 'Eliminando...' : 'Eliminar usuario permanentemente'}
                      </button>
                      <p className="mt-2 text-xs text-red-300/40">⚠️ Esta acción es irreversible. No se puede deshacer.</p>
                    </div>
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
                    ) : (() => {
                      // Group workers by user_id, excluding agents/coliders
                      const workerGroups: Record<string, WorkerRow[]> = {}
                      for (const w of workers) {
                        if (agentUserIds.has(w.user_id)) continue
                        if (!workerGroups[w.user_id]) workerGroups[w.user_id] = []
                        workerGroups[w.user_id].push(w)
                      }
                      const srch = customRateSearch.toLowerCase()
                      const idF  = customRateFilterId.toLowerCase()
                      const phF  = customRateFilterPhone.toLowerCase()
                      const filteredGroups = Object.values(workerGroups).filter(group => {
                        if (srch && !group.some(w => (w.nombre_real ?? '').toLowerCase().includes(srch) || (w.nombre_en_app ?? '').toLowerCase().includes(srch))) return false
                        if (idF  && !group.some(w => (w.id_aplicacion ?? '').toLowerCase().includes(idF))) return false
                        if (phF  && !group.some(w => (w.telefono ?? '').toLowerCase().includes(phF) || (`${w.codigo_pais ?? ''}${w.telefono ?? ''}`).replace(/\s/g,'').includes(phF.replace(/\s/g,'')))) return false
                        return true
                      }).sort((a, b) => (a[0].nombre_real ?? '').localeCompare(b[0].nombre_real ?? ''))

                      return (
                        <>
                          {/* Filters */}
                          <div className="flex flex-col gap-2 mb-4">
                            <input type="text" placeholder="🔍 Buscar por nombre real o nombre en app..."
                              value={customRateSearch} onChange={e => setCustomRateSearch(e.target.value)}
                              className="w-full bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="🔑 Filtrar por ID de app..."
                                value={customRateFilterId} onChange={e => setCustomRateFilterId(e.target.value)}
                                className="bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                              />
                              <input type="text" placeholder="📱 Filtrar por teléfono..."
                                value={customRateFilterPhone} onChange={e => setCustomRateFilterPhone(e.target.value)}
                                className="bg-[#07070f] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            {filteredGroups.map(group => {
                              const first = group[0]
                              const rawPhone = `${first.codigo_pais ?? ''}${first.telefono ?? ''}`.replace(/[\s\-\(\)]/g, '')
                              const displayPhone = first.telefono ? `+${first.codigo_pais ?? ''}${first.telefono}` : null

                              return (
                                <div key={first.user_id} className="bg-[#0d0d1e] border border-emerald-500/10 rounded-2xl p-4">
                                  {/* Girl header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-white text-sm font-bold">{first.nombre_real || '—'}</p>
                                    {displayPhone && rawPhone ? (
                                      <a href={`https://wa.me/${rawPhone}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1.5 text-xs bg-green-500/10 border border-green-500/20 text-green-300 px-2.5 py-1 rounded-full hover:bg-green-500/20 transition-colors font-semibold">
                                        📱 {displayPhone}
                                      </a>
                                    ) : first.telefono ? (
                                      <span className="text-xs text-white/30 font-mono">{first.telefono}</span>
                                    ) : null}
                                  </div>

                                  {/* Per-app entries */}
                                  <div className="space-y-4">
                                    {group.map((w, wi) => {
                                      const key = `${w.user_id}__${w.app_name}`
                                      const existing = customRatesByKey[key]
                                      const inputs = customRateInputs[key] ?? { efectivo: '', transferencia: '' }
                                      return (
                                        <div key={key} className={wi > 0 ? 'border-t border-white/5 pt-4' : ''}>
                                          {/* App info row */}
                                          <div className="flex items-center flex-wrap gap-2 mb-2.5">
                                            <span className="text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">{w.app_name}</span>
                                            <span className="text-xs text-white/70 font-semibold">{w.nombre_en_app}</span>
                                            {w.id_aplicacion && (
                                              <span className="text-xs text-white/35 font-mono bg-white/4 px-2 py-0.5 rounded">ID: {w.id_aplicacion}</span>
                                            )}
                                            {existing && (
                                              <span className="text-emerald-400 text-xs">🎯 ef. {existing.efectivo_rate.toLocaleString('es-ES')} · tr. {existing.transferencia_rate.toLocaleString('es-ES')}</span>
                                            )}
                                            {existing && (
                                              <button onClick={() => deleteCustomRate(w)} disabled={deletingCustomRate === key}
                                                className="ml-auto text-red-400/60 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-50">
                                                {deletingCustomRate === key ? '...' : '✕ Quitar'}
                                              </button>
                                            )}
                                          </div>
                                          {/* Rate inputs */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1.5">💵 Efectivo CUP</p>
                                              <div className="flex gap-2">
                                                <input type="number" min="0" step="any"
                                                  placeholder={existing?.efectivo_rate ? String(existing.efectivo_rate) : 'Ej: 400'}
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
                                              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1.5">🏦 Transferencia CUP</p>
                                              <div className="flex gap-2">
                                                <input type="number" min="0" step="any"
                                                  placeholder={existing?.transferencia_rate ? String(existing.transferencia_rate) : 'Ej: 390'}
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
                                  </div>
                                </div>
                              )
                            })}
                            {filteredGroups.length === 0 && (
                              <p className="text-white/20 text-sm text-center py-4">
                                {(srch || idF || phF) ? 'No se encontraron chicas con esos filtros.' : 'No hay trabajadoras registradas.'}
                              </p>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                </div>
              )}

                  {/* ─── NO COBRARON TAB ─────────────────────────────────────────────── */}

                {tab === 'chicas' && (() => {
                  // Build code→name lookup from agents state
                  const agentCodeToName: Record<string, string> = {}
                  for (const a of agents) {
                    if (a.agent_code) agentCodeToName[a.agent_code.trim()] = a.agent_name || a.colider_name || a.email || a.agent_code
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
                  {['Salarios publicados de todas las trabajadoras','Comisiones de todos los agentes','Confirmaciones de pago (trabajadoras y agentes)','Marcas del colider','Lista de no-cobraron','Historial de nóminas subidas al admin','Registro de comisiones publicadas del colider','Estadísticas del ranking del mes (se reiniciará desde cero)','Mensajes de los canales Telegram (Waha, Layla, Howdy)','Stickers de pagos del canal WhatsApp'].map(item => (
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
