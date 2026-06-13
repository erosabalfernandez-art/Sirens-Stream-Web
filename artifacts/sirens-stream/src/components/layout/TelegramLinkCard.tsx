import { useState, useEffect, useCallback } from 'react'
  import { Send, CheckCircle2, Link2Off, Loader2, ExternalLink } from 'lucide-react'

  interface Props {
    userId: string
    lang?: string
  }

  interface TgStatus {
    linked: boolean
    username?: string
    first_name?: string
    linked_at?: string
  }

  const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

  export function TelegramLinkCard({ userId, lang = 'es' }: Props) {
    const pt = lang === 'pt'
    const [status, setStatus] = useState<TgStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [unlinking, setUnlinking] = useState(false)
    const [waitingLink, setWaitingLink] = useState(false)

    const fetchStatus = useCallback(async () => {
      try {
        const res = await fetch(`${API}/api/telegram/status/${userId}`)
        if (res.ok) setStatus(await res.json())
      } catch { /* ignore */ } finally { setLoading(false) }
    }, [userId])

    useEffect(() => { void fetchStatus() }, [fetchStatus])

    // Poll every 3 seconds while waiting for user to click Start in Telegram
    useEffect(() => {
      if (!waitingLink) return
      const iv = setInterval(async () => {
        try {
          const res = await fetch(`${API}/api/telegram/status/${userId}`)
          if (res.ok) {
            const data: TgStatus = await res.json()
            if (data.linked) { setStatus(data); setWaitingLink(false) }
          }
        } catch { /* ignore */ }
      }, 3000)
      return () => clearInterval(iv)
    }, [waitingLink, userId])

    async function handleConnect() {
      setConnecting(true)
      try {
        const res = await fetch(`${API}/api/telegram/link/init`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        if (!res.ok) { setConnecting(false); return }
        const { code, botUsername } = await res.json() as { code: string; botUsername: string }
        const tgUrl = `https://t.me/${botUsername}?start=${code}`
        window.open(tgUrl, '_blank')
        setWaitingLink(true)
      } catch { /* ignore */ }
      setConnecting(false)
    }

    async function handleUnlink() {
      setUnlinking(true)
      try {
        await fetch(`${API}/api/telegram/link/${userId}`, { method: 'DELETE' })
        setStatus({ linked: false })
      } catch { /* ignore */ }
      setUnlinking(false)
    }

    if (loading) return (
      <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
        <span className="text-white/30 text-sm">{pt ? 'Verificando...' : 'Verificando...'}</span>
      </div>
    )

    return (
      <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              {status?.linked
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <Send className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white">
                {pt ? 'Notificações via Telegram' : 'Notificaciones por Telegram'}
              </p>
              <p className="text-white/40 text-xs mt-0.5 truncate">
                {status?.linked
                  ? (status.first_name
                      ? `✓ ${status.first_name}${status.username ? ' (@' + status.username + ')' : ''}`
                      : (pt ? '✓ Conta vinculada' : '✓ Cuenta vinculada'))
                  : waitingLink
                    ? (pt ? '⏳ Esperando confirmación en Telegram...' : '⏳ Esperando confirmación en Telegram...')
                    : (pt ? 'Receba alertas direto no Telegram' : 'Recibe alertas de salarios y comunicados')}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {status?.linked ? (
              <div className="flex flex-col items-end gap-1.5">
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {pt ? 'Conectado' : 'Conectado'}
                </span>
                <button
                  onClick={handleUnlink} disabled={unlinking}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border border-white/10 hover:border-red-500/20 disabled:opacity-40">
                  {unlinking
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> {pt ? 'Desconectando...' : 'Desconectando...'}</>
                    : <><Link2Off className="w-3 h-3" /> {pt ? 'Desconectar' : 'Desconectar'}</>}
                </button>
              </div>
            ) : waitingLink ? (
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {pt ? 'Aguardando...' : 'Esperando...'}
              </div>
            ) : (
              <button
                onClick={handleConnect} disabled={connecting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                {connecting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {pt ? 'Abrindo...' : 'Abriendo...'}</>
                  : <><ExternalLink className="w-3.5 h-3.5" /> {pt ? 'Conectar Telegram' : 'Conectar Telegram'}</>}
              </button>
            )}
          </div>
        </div>

        {waitingLink && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/35 leading-relaxed">
            {pt
              ? 'Abrimos o Telegram. Clique em "Iniciar" para vincular sua conta. Esta janela se atualizará automaticamente.'
              : 'Abrimos Telegram. Haz clic en "Iniciar" para vincular tu cuenta. Esta ventana se actualizará automáticamente.'}
          </div>
        )}
      </div>
    )
  }
  