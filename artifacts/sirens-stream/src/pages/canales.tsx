import { useState, useEffect, useRef } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase } from '@/lib/supabase'
  import { Send, Paperclip, Smile, X } from 'lucide-react'

  const STICKER_URLS = [
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_0_cat.jpg',
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_1_man.jpg',
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_2_pink.jpg',
  ]

  const AVATAR_COLORS = [
    '#25d366','#128c7e','#e91e63','#9c27b0','#ff5722',
    '#ff9800','#2196f3','#00bcd4','#34b7f1','#0288d1',
  ]

  function getAvatarColor(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
  }

  const APP_COLORS: Record<string, string> = { Waha: '#ff6b35', Layla: '#6c63ff', Howdy: '#00bcd4' }
  const APP_EMOJI: Record<string, string> = { Waha: '🎧', Layla: '💜', Howdy: '👋' }

  interface ChannelMessage {
    id: string; app_name: string; content: string | null; image_url: string | null; created_at: string
  }
  interface ReactionSummary {
    heart: number; like: number; user_heart: boolean; user_like: boolean
  }
  interface PaymentStickerEvent {
    id: string; user_id: string; app_name: string
    nombre_en_app: string | null; sticker_index: number; created_at: string
  }
  interface ChannelRequest { app_name: string; status: string }

  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
  function fmtDateLabel(d: string) {
    const date = new Date(d)
    const today = new Date()
    const yest = new Date(); yest.setDate(yest.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Hoy'
    if (date.toDateString() === yest.toDateString()) return 'Ayer'
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  function groupByDate(msgs: ChannelMessage[]) {
    const groups: { label: string; messages: ChannelMessage[] }[] = []
    let cur = ''
    for (const m of msgs) {
      const lbl = fmtDateLabel(m.created_at)
      if (lbl !== cur) { cur = lbl; groups.push({ label: lbl, messages: [] }) }
      groups[groups.length - 1].messages.push(m)
    }
    return groups
  }

  export default function Canales() {
    const { user, loading } = useAuth()
    const [, navigate] = useLocation()

    const [isAdmin, setIsAdmin] = useState(false)
    const [requests, setRequests] = useState<ChannelRequest[]>([])
    const [activeApp, setActiveApp] = useState('Waha')
    const [activeMode, setActiveMode] = useState<'canal' | 'pagos'>('canal')
    const [fetching, setFetching] = useState(true)

    const [messages, setMessages] = useState<ChannelMessage[]>([])
    const [reactions, setReactions] = useState<Record<string, ReactionSummary>>({})
    const [postText, setPostText] = useState('')
    const [posting, setPosting] = useState(false)
    const [lightbox, setLightbox] = useState<string | null>(null)
    const [reactionLoading, setReactionLoading] = useState<Record<string, boolean>>({})

    const [stickerEvents, setStickerEvents] = useState<PaymentStickerEvent[]>([])

    const fileRef = useRef<HTMLInputElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

    useEffect(() => { if (!loading && !user) navigate('/login') }, [loading, user])
    useEffect(() => { if (user) { checkAdmin(); loadAccess() } }, [user])
    useEffect(() => {
      if (!user || requests.length === 0) return
      if (activeMode === 'canal') loadMessages()
      else loadStickers()
    }, [user, activeApp, activeMode, requests])
    useEffect(() => {
      if (!user) return
      const t = setInterval(() => { if (activeMode === 'canal') loadMessages(); else loadStickers() }, 30000)
      return () => clearInterval(t)
    }, [user, activeApp, activeMode])
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, stickerEvents, activeMode])

    async function checkAdmin() {
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user!.id).single()
      setIsAdmin(!!(data as { is_admin?: boolean } | null)?.is_admin)
    }

    async function loadAccess() {
      setFetching(true)
      const r = await fetch(`${API}/api/channel-access?user_id=${user!.id}`)
      if (r.ok) {
        const d = await r.json()
        const reqs: ChannelRequest[] = d.requests ?? []
        setRequests(reqs)
        const approved = reqs.filter(r => r.status === 'approved').map(r => r.app_name)
        if (approved.length > 0 && !approved.includes(activeApp)) setActiveApp(approved[0])
      }
      setFetching(false)
    }

    async function loadMessages() {
      const r = await fetch(`${API}/api/channel-messages?user_id=${user!.id}`)
      if (!r.ok) return
      const d = await r.json()
      const all: ChannelMessage[] = d.messages ?? []
      const filtered = all.filter(m => m.app_name === activeApp)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setMessages(filtered)
      if (filtered.length > 0) {
        const ids = filtered.map(m => m.id)
        const rr = await fetch(`${API}/api/channel-reactions-bulk?user_id=${user!.id}&message_ids=${ids.join(',')}`)
        if (rr.ok) { const dd = await rr.json(); setReactions(dd.reactions ?? {}) }
      }
    }

    async function loadStickers() {
      const r = await fetch(`${API}/api/payment-stickers?app_name=${encodeURIComponent(activeApp)}`)
      if (r.ok) { const d = await r.json(); setStickerEvents(d.events ?? []) }
    }

    async function toggleReaction(msgId: string, type: 'heart' | 'like') {
      if (!user || isAdmin) return
      const key = `${msgId}-${type}`
      setReactionLoading(p => ({ ...p, [key]: true }))
      const r = await fetch(`${API}/api/channel-reaction`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: msgId, user_id: user.id, reaction_type: type }),
      })
      if (r.ok) { const d = await r.json(); setReactions(p => ({ ...p, [msgId]: d.summary })) }
      setReactionLoading(p => ({ ...p, [key]: false }))
    }

    async function handlePost() {
      if (!postText.trim() || posting) return
      setPosting(true)
      const r = await fetch(`${API}/api/post-channel-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: activeApp, content: postText.trim(), created_by: user?.id }),
      })
      if (r.ok) { setPostText(''); loadMessages() }
      setPosting(false)
    }

    async function handleImagePost(file: File) {
      if (!file || posting) return
      setPosting(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        const b64 = (e.target?.result as string)?.split(',')[1]
        if (!b64) { setPosting(false); return }
        const up = await fetch(`${API}/api/upload-channel-image`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: b64, mime: file.type, filename: file.name }),
        })
        if (up.ok) {
          const { url } = await up.json()
          await fetch(`${API}/api/post-channel-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_name: activeApp, content: postText.trim() || null, image_url: url, created_by: user?.id }),
          })
          setPostText(''); loadMessages()
        }
        setPosting(false)
      }
      reader.readAsDataURL(file)
    }

    const approvedApps = requests.filter(r => r.status === 'approved').map(r => r.app_name)
    const pendingApps  = requests.filter(r => r.status === 'pending').map(r => r.app_name)
    const isTg = activeMode === 'canal'

    if (loading || fetching) return (
      <div style={{ minHeight:'100vh', background:'#1b1e2e', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.4)' }}>Cargando...</div>
      </div>
    )

    if (approvedApps.length === 0) return (
      <div style={{ minHeight:'100vh', background:'#1b1e2e', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24, paddingTop:80 }}>
        <div style={{ fontSize:48 }}>{pendingApps.length > 0 ? '⏳' : '🔒'}</div>
        <p style={{ color:'rgba(255,255,255,0.5)', textAlign:'center', maxWidth:280 }}>
          {pendingApps.length > 0
            ? `Tu solicitud para ${pendingApps.join(', ')} está pendiente de aprobación.`
            : 'No tienes acceso a ningún canal. Agrega una app en tu perfil primero.'}
        </p>
      </div>
    )

    return (
      <div style={{
        height:'100dvh', background: isTg ? '#1b1e2e' : '#0b141a',
        display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>

        {/* LIGHTBOX */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.93)',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out',
          }}>
            <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
              style={{ maxWidth:'95vw', maxHeight:'92vh', objectFit:'contain', borderRadius:8 }} />
            <button onClick={() => setLightbox(null)} style={{
              position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%',
              background:'rgba(255,255,255,0.15)', border:'none', color:'white', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><X size={18} /></button>
          </div>
        )}

        {/* HEADER */}
        <div style={{
          background: isTg ? '#1e2236' : '#1f2c34',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          paddingTop:56, flexShrink:0, zIndex:10,
        }}>
          {/* Channel info row */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
            <div style={{
              width:42, height:42, borderRadius:'50%', flexShrink:0,
              background: APP_COLORS[activeApp] || '#555',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:21,
            }}>{APP_EMOJI[activeApp]}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'white', fontWeight:700, fontSize:15, lineHeight:1.3 }}>
                {isTg ? `📢 Canal ${activeApp}` : `💸 Pagos — ${activeApp}`}
              </div>
              <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12 }}>
                {isTg
                  ? `Eclipse Angels Agency${isAdmin ? ' · Admin' : ''}`
                  : 'solo los administradores pueden escribir'}
              </div>
            </div>
          </div>

          {/* App tabs */}
          <div style={{ display:'flex', paddingLeft:12, overflowX:'auto' }}>
            {approvedApps.map(app => {
              const active = activeApp === app
              const color = isTg ? '#2ca5e0' : '#25d366'
              return (
                <button key={app} onClick={() => setActiveApp(app)} style={{
                  padding:'6px 16px', border:'none', background:'none', cursor:'pointer',
                  color: active ? color : 'rgba(255,255,255,0.45)',
                  fontWeight: active ? 700 : 500, fontSize:14, whiteSpace:'nowrap',
                  borderBottom: `2px solid ${active ? color : 'transparent'}`,
                  transition:'all 0.15s',
                }}>{app}</button>
              )
            })}
          </div>

          {/* Mode tabs */}
          <div style={{ display:'flex', paddingLeft:12 }}>
            {[
              { key:'canal', label:'📢 Canal', color:'#2ca5e0' },
              { key:'pagos', label:'💳 Pagos',  color:'#25d366' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveMode(tab.key as 'canal' | 'pagos')} style={{
                padding:'6px 14px', border:'none', background:'none', cursor:'pointer',
                color: activeMode === tab.key ? tab.color : 'rgba(255,255,255,0.4)',
                fontWeight: activeMode === tab.key ? 700 : 500, fontSize:13,
                borderBottom: `2px solid ${activeMode === tab.key ? tab.color : 'transparent'}`,
                transition:'all 0.15s',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* ===================== TELEGRAM CHANNEL ===================== */}
        {isTg && (
          <>
            <div style={{
              flex:1, overflowY:'auto',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ctext y='50' font-size='30' opacity='0.025' fill='white'%3E%F0%9F%8E%AE%3C/text%3E%3Ctext x='90' y='110' font-size='24' opacity='0.025' fill='white'%3E%F0%9F%8C%99%3C/text%3E%3Ctext x='15' y='160' font-size='22' opacity='0.025' fill='white'%3E%E2%AD%90%3C/text%3E%3Ctext x='120' y='180' font-size='20' opacity='0.025' fill='white'%3E%F0%9F%8E%AF%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat:'repeat', backgroundSize:'200px 200px',
            }}>
              <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:6, minHeight:'100%' }}>
                {messages.length === 0 ? (
                  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
                    <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:12, padding:'8px 18px' }}>
                      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:14 }}>No hay mensajes aún</span>
                    </div>
                  </div>
                ) : groupByDate(messages).map(group => (
                  <div key={group.label}>
                    {/* Date separator */}
                    <div style={{ display:'flex', justifyContent:'center', margin:'8px 0' }}>
                      <span style={{
                        background:'rgba(0,0,0,0.4)', color:'rgba(255,255,255,0.65)',
                        fontSize:12, padding:'4px 14px', borderRadius:8, backdropFilter:'blur(4px)',
                        textTransform:'capitalize',
                      }}>{group.label}</span>
                    </div>

                    {group.messages.map(msg => {
                      const rx = reactions[msg.id] || { heart:0, like:0, user_heart:false, user_like:false }
                      return (
                        <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:8 }}>
                          {/* Bubble */}
                          <div style={{
                            background:'#212134', borderRadius:12, overflow:'hidden',
                            maxWidth: 'min(85vw, 520px)', minWidth:100,
                            boxShadow:'0 1px 4px rgba(0,0,0,0.5)',
                          }}>
                            {msg.image_url && (
                              <div onClick={() => setLightbox(msg.image_url)} style={{ cursor:'zoom-in' }}>
                                <img src={msg.image_url} alt=""
                                  style={{ width:'100%', maxHeight:380, objectFit:'cover', display:'block' }} />
                              </div>
                            )}
                            {msg.content && (
                              <div style={{ padding: msg.image_url ? '6px 14px 4px' : '8px 14px 4px' }}>
                                <p style={{ color:'rgba(255,255,255,0.9)', fontSize:14, lineHeight:1.55, margin:0, whiteSpace:'pre-wrap' }}>
                                  {msg.content}
                                </p>
                              </div>
                            )}
                            <div style={{ padding:'2px 12px 8px', display:'flex', justifyContent:'flex-end', alignItems:'center', gap:4 }}>
                              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{fmtTime(msg.created_at)}</span>
                              <span style={{ color:'#2ca5e0', fontSize:11 }}>✓✓</span>
                            </div>
                          </div>

                          {/* Reactions */}
                          <div style={{ display:'flex', gap:6, marginTop:5 }}>
                            {(['heart','like'] as const).map(type => {
                              const cnt   = type === 'heart' ? rx.heart : rx.like
                              const on    = type === 'heart' ? rx.user_heart : rx.user_like
                              const emoji = type === 'heart' ? '❤️' : '👍'
                              const col   = type === 'heart' ? '#ff5252' : '#53bdeb'
                              const busy  = reactionLoading[`${msg.id}-${type}`]
                              return (
                                <button key={type}
                                  onClick={() => toggleReaction(msg.id, type)}
                                  disabled={isAdmin || !!busy}
                                  style={{
                                    display:'flex', alignItems:'center', gap:5,
                                    background: on ? `${col}22` : 'rgba(255,255,255,0.07)',
                                    border: `1px solid ${on ? `${col}60` : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius:20, padding:'3px 10px',
                                    cursor: isAdmin ? 'default' : 'pointer',
                                    transition:'all 0.15s', opacity: busy ? 0.6 : 1,
                                  }}>
                                  <span style={{ fontSize:13 }}>{emoji}</span>
                                  <span style={{ color: on ? col : 'rgba(255,255,255,0.55)', fontSize:12, fontWeight:600 }}>{cnt}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Admin post bar */}
            {isAdmin && (
              <div style={{
                background:'#1f222e', borderTop:'1px solid rgba(255,255,255,0.07)',
                padding:'8px 12px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
              }}>
                <button style={{ color:'rgba(255,255,255,0.4)', background:'none', border:'none', padding:6, cursor:'pointer', flexShrink:0 }}>
                  <Smile size={22} />
                </button>
                <input value={postText} onChange={e => setPostText(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handlePost() } }}
                  placeholder="Publicar..."
                  style={{
                    flex:1, background:'#2a2d3d', border:'none', borderRadius:22,
                    padding:'9px 16px', color:'white', fontSize:14, outline:'none', minWidth:0,
                  }} />
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => { if (e.target.files?.[0]) { handleImagePost(e.target.files[0]); e.target.value = '' } }} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ color:'rgba(255,255,255,0.4)', background:'none', border:'none', padding:6, cursor:'pointer', flexShrink:0 }}>
                  <Paperclip size={20} />
                </button>
                <button onClick={handlePost} disabled={posting || !postText.trim()} style={{
                  width:38, height:38, borderRadius:'50%', border:'none', flexShrink:0,
                  background: postText.trim() && !posting ? '#2ca5e0' : '#2a2d3d',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor: postText.trim() && !posting ? 'pointer' : 'default', transition:'all 0.15s',
                }}>
                  {posting
                    ? <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%' }} />
                    : <Send size={16} color={postText.trim() ? 'white' : 'rgba(255,255,255,0.3)'} />}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===================== WHATSAPP PAYMENTS ===================== */}
        {!isTg && (
          <>
            <div style={{
              flex:1, overflowY:'auto',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Ctext y='55' font-size='38' opacity='0.035' fill='%2325d366'%3E%F0%9F%92%AC%3C/text%3E%3Ctext x='75' y='130' font-size='30' opacity='0.035' fill='%2325d366'%3E%F0%9F%93%B1%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat:'repeat', backgroundSize:'150px 150px',
            }}>
              <div style={{ padding:'8px 14px', display:'flex', flexDirection:'column', gap:4 }}>
                {stickerEvents.length === 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:10 }}>
                    <div style={{ fontSize:44 }}>💸</div>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, textAlign:'center' }}>
                      Aún no hay pagos confirmados en {activeApp}
                    </p>
                  </div>
                ) : stickerEvents.map(ev => {
                  const name  = ev.nombre_en_app || 'Anónima'
                  const color = getAvatarColor(name)
                  const init  = name[0]?.toUpperCase() || '?'
                  const surl  = STICKER_URLS[ev.sticker_index % 3]
                  return (
                    <div key={ev.id} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'4px 0' }}>
                      {/* Avatar */}
                      <div style={{
                        width:38, height:38, borderRadius:'50%', flexShrink:0, background:color,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16, fontWeight:700, color:'white', marginTop:20,
                      }}>{init}</div>

                      {/* Message */}
                      <div style={{ maxWidth:'74%' }}>
                        <div style={{ color:'#53bdeb', fontSize:13, fontWeight:600, marginBottom:4, marginLeft:2 }}>
                          ~ {name}
                        </div>
                        <div style={{
                          background:'#1f2c34', borderRadius:'0 8px 8px 8px',
                          overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.5)', maxWidth:220,
                        }}>
                          <img src={surl} alt="Pago recibido"
                            style={{ width:'100%', display:'block' }} />
                        </div>
                        <div style={{ color:'#8696a0', fontSize:11, marginTop:3, textAlign:'right', marginRight:4 }}>
                          {fmtTime(ev.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Decorative WhatsApp input bar */}
            <div style={{
              background:'#1f2c34', borderTop:'1px solid rgba(255,255,255,0.05)',
              padding:'8px 12px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
            }}>
              <button style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', padding:6, cursor:'not-allowed', flexShrink:0 }}>
                <Smile size={22} />
              </button>
              <div style={{
                flex:1, background:'#2a3942', borderRadius:22, minWidth:0,
                padding:'9px 16px', color:'rgba(255,255,255,0.3)', fontSize:14,
              }}>
                Solo los administradores pueden escribir
              </div>
              <button style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', padding:6, cursor:'not-allowed', flexShrink:0 }}>
                <Paperclip size={20} />
              </button>
              <div style={{
                width:38, height:38, borderRadius:'50%', flexShrink:0,
                background:'#25d366', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
              }}>🎤</div>
            </div>
          </>
        )}
      </div>
    )
  }
  