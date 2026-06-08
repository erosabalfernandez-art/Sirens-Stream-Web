import { useState, useEffect } from 'react'
  import { useLanguage } from '@/contexts/LanguageContext'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { MessageSquare, Clock, Radio } from 'lucide-react'

  interface ChannelMessage {
    id: string
    app_name: string
    content: string | null
    image_url: string | null
    created_at: string
  }

  interface ChannelRequest {
    app_name: string
    status: string
  }

  export default function Canales() {
    const { user, loading } = useAuth()
      const { lang } = useLanguage()
      const T = {
        badge:        lang === 'pt' ? 'Canal da Agência'                    : 'Canal de la Agencia',
        title:        lang === 'pt' ? 'Comunicados'                          : 'Comunicados',
        subtitle:     lang === 'pt' ? 'Mensagens oficiais da Eclipse Angels Agency' : 'Mensajes oficiales de Eclipse Angels Agency',
        loading:      lang === 'pt' ? 'Carregando...'                        : 'Cargando...',
        noAccess1:    lang === 'pt' ? 'Você ainda não tem acesso a nenhum canal.' : 'No tienes acceso a ningún canal todavía.',
        noAccess2:    lang === 'pt' ? 'Adicione um app no seu perfil para solicitar acesso automaticamente.' : 'Agrega una app en tu perfil para solicitar acceso automáticamente.',
        pending:      lang === 'pt' ? '⏳ Solicitações pendentes de aprovação' : '⏳ Solicitudes pendientes de aprobación',
        pendingDesc:  lang === 'pt' ? 'Sua agência revisará sua solicitação em breve.' : 'Tu agencia revisará tu solicitud pronto.',
        reviewing1:   lang === 'pt' ? 'Sua solicitação está sendo revisada.'  : 'Tu solicitud está siendo revisada.',
        reviewing2:   lang === 'pt' ? 'Te avisaremos quando for aprovada.'    : 'Te notificaremos cuando seas aprobada.',
        noMessages1:  lang === 'pt' ? 'Nenhum comunicado ainda.'              : 'No hay comunicados todavía.',
        noMessages2:  lang === 'pt' ? 'Os comunicados aparecerão aqui quando forem publicados.' : 'Los comunicados aparecerán aquí cuando se publiquen.',
      }
    const [, navigate] = useLocation()
    const [requests, setRequests] = useState<ChannelRequest[]>([])
    const [messages, setMessages] = useState<ChannelMessage[]>([])
    const [activeApp, setActiveApp] = useState<string | null>(null)
    const [fetching, setFetching] = useState(true)

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => { if (user) fetchData() }, [user])

    async function fetchData() {
        setFetching(true)
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        const [accessRes, msgsRes] = await Promise.all([
          fetch(`${apiBase}/api/channel-access?user_id=${user!.id}`).then(r => r.ok ? r.json() : { requests: [] }),
          // Use service-role API endpoint so Supabase RLS never blocks workers from seeing messages
          fetch(`${apiBase}/api/channel-messages?user_id=${user!.id}`).then(r => r.ok ? r.json() : { messages: [] }),
        ])
        const reqs: ChannelRequest[] = accessRes.requests ?? []
        setRequests(reqs)
        const msgs: ChannelMessage[] = msgsRes.messages ?? []
        setMessages(msgs)
        const approved = reqs.filter(r => r.status === 'approved').map(r => r.app_name)
        if (approved.length > 0) setActiveApp(prev => prev ?? approved[0])
        setFetching(false)
      }

    const approvedApps = requests.filter(r => r.status === 'approved').map(r => r.app_name)
    const pendingApps = requests.filter(r => r.status === 'pending').map(r => r.app_name)
    const activeMessages = messages.filter(m => m.app_name === activeApp)

    if (loading) return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <div className="text-white/40 animate-pulse">{T.loading}</div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1 mb-3">
              <Radio className="w-3 h-3 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
            </div>
            <h1 className="text-2xl font-extrabold">{T.title}</h1>
            <p className="text-white/40 text-sm mt-1">{T.subtitle}</p>
          </div>

          {fetching ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-[#0d0d1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
              <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">{T.noAccess1}</p>
              <p className="text-white/25 text-xs mt-1">{T.noAccess2}</p>
            </div>
          ) : (
            <>
              {pendingApps.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                  <p className="text-amber-300 text-sm font-semibold mb-1">{T.pending}</p>
                  <p className="text-amber-200/60 text-xs">
                    {pendingApps.join(', ')} — {T.pendingDesc}
                  </p>
                </div>
              )}

              {approvedApps.length > 0 && (
                <div className="flex gap-2 mb-6 flex-wrap">
                  {approvedApps.map(app => (
                    <button key={app} onClick={() => setActiveApp(app)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeApp === app ? 'bg-blue-600 text-white' : 'bg-[#0d0d1e] border border-purple-500/15 text-white/50 hover:text-white hover:border-purple-500/40'}`}>
                      {app}
                    </button>
                  ))}
                </div>
              )}

              {approvedApps.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
                  <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 text-sm">{T.reviewing1}</p>
                  <p className="text-white/25 text-xs mt-1">{T.reviewing2}</p>
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-16 text-center">
                  <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 text-sm">No hay comunicados en el canal de {activeApp} aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMessages.map(msg => (
                    <div key={msg.id} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl overflow-hidden">
                      {msg.image_url && (
                        <img src={msg.image_url} alt="comunicado"
                          className="w-full max-h-96 object-cover" />
                      )}
                      {msg.content && (
                        <div className="px-5 py-4">
                          <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      )}
                      <div className="px-5 py-3 border-t border-purple-500/8 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-white/20" />
                        <span className="text-white/30 text-xs">
                          {new Date(msg.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  