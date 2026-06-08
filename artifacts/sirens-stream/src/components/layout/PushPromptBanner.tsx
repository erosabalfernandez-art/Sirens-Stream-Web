import { useState, useEffect } from 'react'
  import { Bell, X } from 'lucide-react'
  import { subscribeToPush } from '@/lib/push'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLanguage } from '@/contexts/LanguageContext'

  const DISMISSED_KEY = 'ea_push_dismissed_v1'

  export function PushPromptBanner() {
    const { user } = useAuth()
    const { lang } = useLanguage()
    const [visible, setVisible] = useState(false)
    const [status, setStatus] = useState<'idle' | 'requesting' | 'done' | 'denied'>('idle')

    const T = {
      title:   lang === 'pt' ? '🔔 Ativar notificações' : '🔔 Activar notificaciones',
      body:    lang === 'pt' ? 'Receba alertas de salários, comunicados e comissões direto no celular.' : 'Recibe alertas de salarios, comunicados y comisiones directo en tu celular.',
      btn:     lang === 'pt' ? 'Ativar' : 'Activar',
      activating: lang === 'pt' ? 'Ativando...' : 'Activando...',
      done:    lang === 'pt' ? '✅ ¡Listo! Notificaciones activadas.' : '✅ ¡Listo! Notificaciones activadas.',
      denied:  lang === 'pt' ? 'Permissão bloqueada. Ativa nas configurações do navegador.' : 'Permiso bloqueado. Actívalas desde la configuración del navegador.',
    }

    useEffect(() => {
      if (!user) return
      if (!('Notification' in window)) return
      if (Notification.permission !== 'default') return
      try { if (localStorage.getItem(DISMISSED_KEY)) return } catch {}
      // Delay 4 seconds so it doesn't feel aggressive
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
      const ok = await subscribeToPush(user.id)
      if (ok) {
        setStatus('done')
        setTimeout(() => { setVisible(false) }, 3000)
      } else {
        if (Notification.permission === 'denied') setStatus('denied')
        else setStatus('idle')
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
  