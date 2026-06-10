import { useState, useEffect } from 'react'
  import { Bell, BellOff, RefreshCw, CheckCircle2 } from 'lucide-react'
  import { subscribeToPush, checkPushEndpointInDB, unsubscribeFromPush } from '@/lib/push'

  interface PushNotificationCardProps {
    userId: string
    lang?: string
  }

  type NotifStatus = 'checking' | 'active' | 'stale' | 'idle' | 'requesting' | 'unsubscribing' | 'denied' | 'error'

  export function PushNotificationCard({ userId, lang = 'es' }: PushNotificationCardProps) {
    const [status, setStatus] = useState<NotifStatus>('checking')
    const pt = lang === 'pt'

    useEffect(() => {
      if (!userId) return
      async function checkStatus() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          setStatus('idle'); return
        }
        if (Notification.permission === 'denied') { setStatus('denied'); return }
        if (Notification.permission !== 'granted') { setStatus('idle'); return }
        // Use endpoint comparison — more reliable than just checking DB existence
        const synced = await checkPushEndpointInDB(userId)
        setStatus(synced ? 'active' : 'stale')
      }
      checkStatus()
    }, [userId])

    async function handleSubscribe() {
      setStatus('requesting')
      const result = await subscribeToPush(userId)
      if (result === 'granted') setStatus('active')
      else if (result === 'denied') setStatus('denied')
      else setStatus('error')
    }

    async function handleUnsubscribe() {
      setStatus('unsubscribing')
      await unsubscribeFromPush(userId)
      setStatus('idle')
    }

    return (
      <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              {status === 'active'
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : status === 'denied'
                ? <BellOff className="w-4 h-4 text-red-400" />
                : <Bell className="w-4 h-4 text-purple-400" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white">
                {pt ? 'Notificações push' : 'Notificaciones push'}
              </p>
              <p className="text-white/40 text-xs mt-0.5 truncate">
                {status === 'active'
                  ? (pt ? '✓ Suscripción activa' : '✓ Suscripción activa')
                  : status === 'stale'
                  ? (pt ? '⚠ Renovar suscripción' : '⚠ Renovar suscripción')
                  : status === 'denied'
                  ? (pt ? 'Bloqueadas en el navegador' : 'Bloqueadas en el navegador')
                  : status === 'checking'
                  ? (pt ? 'Verificando...' : 'Verificando...')
                  : status === 'error'
                  ? (pt ? 'Error. Intenta de nuevo.' : 'Error. Intenta de nuevo.')
                  : (pt ? 'Receba alertas de salários' : 'Recibe alertas de salarios y comunicados')}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {status === 'checking' && (
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                {pt ? 'Verificando...' : 'Verificando...'}
              </div>
            )}

            {status === 'denied' && (
              <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                <BellOff className="w-3.5 h-3.5" /> {pt ? 'Bloqueadas' : 'Bloqueadas'}
              </span>
            )}

            {status === 'active' && (
              <div className="flex flex-col items-end gap-1.5">
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {pt ? 'Ativas' : 'Activas'}
                </span>
                <button onClick={handleUnsubscribe}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border border-white/10 hover:border-red-500/20">
                  <BellOff className="w-3 h-3" /> {pt ? 'Desativar' : 'Desactivar'}
                </button>
              </div>
            )}

            {status === 'stale' && (
              <div className="flex flex-col items-end gap-1.5">
                <span className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  ⚠ {pt ? 'Renovar' : 'Renovar'}
                </span>
                <button onClick={handleSubscribe}
                  className="flex items-center gap-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                  <RefreshCw className="w-3 h-3" /> {pt ? 'Reconectar' : 'Reconectar'}
                </button>
              </div>
            )}

            {(status === 'idle' || status === 'error') && (
              <button onClick={handleSubscribe}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                <Bell className="w-3.5 h-3.5" />
                {status === 'error' ? (pt ? 'Tentar de novo' : 'Reintentar') : (pt ? 'Ativar' : 'Activar')}
              </button>
            )}

            {(status === 'requesting' || status === 'unsubscribing') && (
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <div className="w-3.5 h-3.5 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
                {status === 'requesting'
                  ? (pt ? 'Ativando...' : 'Activando...')
                  : (pt ? 'Desativando...' : 'Desactivando...')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  