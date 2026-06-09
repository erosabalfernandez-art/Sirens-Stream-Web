import { useState, useEffect } from 'react'
import { Bell, X, AlertCircle } from 'lucide-react'
import { subscribeToPush } from '@/lib/push'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

const DISMISSED_KEY = 'ea_push_dismissed_v1'

export function PushPromptBanner() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<'idle' | 'requesting' | 'done' | 'denied' | 'error'>('idle')

  const T = {
    title:      lang === 'pt' ? '🔔 Ativar notificações'   : '🔔 Activar notificaciones',
    body:       lang === 'pt'
      ? 'Receba alertas de salários, comunicados e comissões direto no celular.'
      : 'Recibe alertas de salarios, comunicados y comisiones directo en tu celular.',
    btn:        lang === 'pt' ? 'Ativar'                    : 'Activar',
    activating: lang === 'pt' ? 'Ativando...'               : 'Activando...',
    done:       lang === 'pt' ? '✅ Notificações ativadas!' : '✅ ¡Notificaciones activadas!',
    denied:     lang === 'pt'
      ? 'Permissão bloqueada. Ativa nas configurações do navegador.'
      : 'Permiso bloqueado. Actívalas desde la configuración del navegador.',
    error:      lang === 'pt' ? 'Erro ao ativar. Tente novamente.' : 'Error al activar. Intenta de nuevo.',
    retry:      lang === 'pt' ? 'Tentar novamente'          : 'Reintentar',
  }

  useEffect(() => {
    if (!user) return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    try { if (localStorage.getItem(DISMISSED_KEY)) return } catch {}
    const t = setTimeout(() => setVisible(true), 4000)
    return () => clearTimeout(t)
  }, [user])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }

  async function activate() {
    if (!user) return
    setStatus('requesting')
    const result = await subscribeToPush(user.id)
    if (result === 'granted') {
      setStatus('done')
      setTimeout(() => { setVisible(false) }, 3000)
    } else if (result === 'denied') {
      setStatus('denied')
    } else {
      setStatus('error')
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#0d0d1e] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black/60 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white mb-0.5">{T.title}</p>
            {status === 'done' ? (
              <p className="text-xs text-green-400 font-semibold">{T.done}</p>
            ) : status === 'denied' ? (
              <p className="text-xs text-red-400">{T.denied}</p>
            ) : status === 'error' ? (
              <div>
                <p className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {T.error}
                </p>
                <button
                  onClick={activate}
                  className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                >
                  <Bell className="w-3 h-3" /> {T.retry}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/50 leading-relaxed mb-3">{T.body}</p>
                <button
                  onClick={activate}
                  disabled={status === 'requesting'}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                >
                  {status === 'requesting'
                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> {T.activating}</>
                    : <><Bell className="w-3 h-3" /> {T.btn}</>
                  }
                </button>
              </>
            )}
          </div>
          <button onClick={dismiss} className="text-white/25 hover:text-white/60 transition-colors mt-0.5 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
