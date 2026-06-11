import { useState, useEffect, useRef } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { supabase } from '@/lib/supabase'
  import { Send, X, ChevronLeft, Image as ImgIcon } from 'lucide-react'

  const STICKER_URLS = [
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_0_cat.jpg',
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_1_man.jpg',
    'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_2_pink.jpg',
  ]

  const APP_ICONS: Record<string, string> = {
    Waha:  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/waha.jpg',
    Layla: 'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/layla.jpg',
    Howdy: 'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/howdy.jpg',
  }

  const AVATAR_COLORS = ['#e91e63','#9c27b0','#ff5722','#ff9800','#2196f3','#00bcd4','#4caf50','#795548','#f06292','#7e57c2']
  function avatarColor(name: string) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length] }
  function initial(name: string) { return (name||'?')[0].toUpperCase() }

  function fmtTime(d: string) { return new Date(d).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) }
  function fmtDateLabel(d: string) {
    const dt=new Date(d), today=new Date(), yest=new Date(); yest.setDate(yest.getDate()-1)
    if(dt.toDateString()===today.toDateString()) return 'Hoy'
    if(dt.toDateString()===yest.toDateString()) return 'Ayer'
    return dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})
  }

  interface Msg { id:string; app_name:string; content:string|null; image_url:string|null; created_at:string }
  interface Rx { heart:number; like:number; user_heart:boolean; user_like:boolean }
  interface StickerEv { id:string; user_id:string; app_name:string; nombre_en_app:string|null; sticker_index:number; created_at:string }
  interface ChanReq { app_name:string; status:string }
  type ChType = 'canal'|'pagos'
  interface Chan { id:string; type:ChType; app:string }

  export default function Canales() {
    const { user, loading } = useAuth()
    const [, navigate] = useLocation()
    const API = ((import.meta.env.VITE_API_URL as string|undefined)??'').replace(/\/$/,'')

    const [isAdmin, setIsAdmin] = useState(false)
    const [requests, setRequests] = useState<ChanReq[]>([])
    const [fetching, setFetching] = useState(true)
    const [activeCh, setActiveCh] = useState<string|null>(null)
    const [showSidebar, setShowSidebar] = useState(true)

    const [msgs, setMsgs] = useState<Msg[]>([])
    const [rx, setRx] = useState<Record<string,Rx>>({})
    const [postText, setPostText] = useState('')
    const [posting, setPosting] = useState(false)
    const [lightbox, setLightbox] = useState<string|null>(null)
    const [rxLoading, setRxLoading] = useState<Record<string,boolean>>({})
    const [stickers, setStickers] = useState<StickerEv[]>([])

    const fileRef = useRef<HTMLInputElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(()=>{ if(!loading&&!user) navigate('/login') },[loading,user])
    useEffect(()=>{ if(user){ checkAdmin(); loadAccess() } },[user])

    const approved = requests.filter(r=>r.status==='approved').map(r=>r.app_name)
    const channels: Chan[] = [
      ...approved.map(app=>({ id:`canal-${app}`, type:'canal' as ChType, app })),
      ...approved.map(app=>({ id:`pagos-${app}`, type:'pagos' as ChType, app })),
    ]
    const ch = channels.find(c=>c.id===activeCh)

    useEffect(()=>{ if(channels.length>0&&!activeCh) setActiveCh(channels[0].id) },[channels.length])

    useEffect(()=>{
      if(!user||!ch) return
      setMsgs([]); setStickers([])
      if(ch.type==='canal') loadMsgs(ch.app)
      else loadStickers(ch.app)
    },[activeCh])

    useEffect(()=>{
      if(!user) return
      const t=setInterval(()=>{ if(!ch) return; if(ch.type==='canal') loadMsgs(ch.app); else loadStickers(ch.app) },30000)
      return ()=>clearInterval(t)
    },[activeCh, user])

    useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs,stickers,activeCh])

    async function checkAdmin() {
      const {data}=await supabase.from('profiles').select('is_admin').eq('id',user!.id).single()
      setIsAdmin(!!(data as {is_admin?:boolean}|null)?.is_admin)
    }
    async function loadAccess() {
      setFetching(true)
      const r=await fetch(`${API}/api/channel-access?user_id=${user!.id}`)
      if(r.ok){ const d=await r.json(); setRequests(d.requests??[]) }
      setFetching(false)
    }
    async function loadMsgs(app: string) {
      const r=await fetch(`${API}/api/channel-messages?user_id=${user!.id}`)
      if(!r.ok) return
      const d=await r.json()
      const all:Msg[]=d.messages??[]
      const filtered=all.filter(m=>m.app_name===app).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())
      setMsgs(filtered)
      if(filtered.length>0){
        const ids=filtered.map(m=>m.id)
        const rr=await fetch(`${API}/api/channel-reactions-bulk?user_id=${user!.id}&message_ids=${ids.join(',')}`)
        if(rr.ok){ const dd=await rr.json(); setRx(dd.reactions??{}) }
      }
    }
    async function loadStickers(app: string) {
      const r=await fetch(`${API}/api/payment-stickers?app_name=${encodeURIComponent(app)}`)
      if(r.ok){ const d=await r.json(); setStickers(d.events??[]) }
    }
    async function toggleRx(msgId:string, type:'heart'|'like') {
      if(!user||isAdmin) return
      const k=`${msgId}-${type}`
      setRxLoading(p=>({...p,[k]:true}))
      const r=await fetch(`${API}/api/channel-reaction`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message_id:msgId,user_id:user.id,reaction_type:type})})
      if(r.ok){ const d=await r.json(); setRx(p=>({...p,[msgId]:d.summary})) }
      setRxLoading(p=>({...p,[k]:false}))
    }
    async function doPost() {
      if(!postText.trim()||posting||!ch) return
      setPosting(true)
      const r=await fetch(`${API}/api/post-channel-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_name:ch.app,content:postText.trim(),created_by:user?.id})})
      if(r.ok){ setPostText(''); loadMsgs(ch.app) }
      setPosting(false)
    }
    async function doImgPost(file:File) {
      if(!file||posting||!ch) return
      setPosting(true)
      const reader=new FileReader()
      reader.onload=async(e)=>{
        const b64=(e.target?.result as string)?.split(',')[1]
        if(!b64){ setPosting(false); return }
        const up=await fetch(`${API}/api/upload-channel-image`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64:b64,mime:file.type,filename:file.name})})
        if(up.ok){
          const {url}=await up.json()
          await fetch(`${API}/api/post-channel-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_name:ch.app,content:postText.trim()||null,image_url:url,created_by:user?.id})})
          setPostText(''); loadMsgs(ch.app)
        }
        setPosting(false)
      }
      reader.readAsDataURL(file)
    }
    function pickCh(id:string){ setActiveCh(id); setShowSidebar(false) }

    /* ---- SIDEBAR ---- */
    function Sidebar() {
      return (
        <div style={{width:'100%',height:'100%',background:'#1a1f2e',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'60px 16px 14px',background:'#1e2436',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <h2 style={{margin:0,color:'white',fontSize:17,fontWeight:700}}>Canales</h2>
            <p style={{margin:'2px 0 0',color:'rgba(255,255,255,0.35)',fontSize:12}}>Eclipse Angels Agency</p>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <p style={{margin:0,padding:'12px 16px 4px',color:'rgba(255,255,255,0.3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>📢 Comunicados</p>
            {channels.filter(c=>c.type==='canal').map(c=><SideItem key={c.id} c={c}/>)}
            <p style={{margin:0,padding:'14px 16px 4px',color:'rgba(255,255,255,0.3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>💸 Pagos</p>
            {channels.filter(c=>c.type==='pagos').map(c=><SideItem key={c.id} c={c}/>)}
          </div>
        </div>
      )
    }

    function SideItem({c}:{c:Chan}) {
      const active=activeCh===c.id
      const accent=c.type==='canal'?'#2ca5e0':'#25d366'
      return (
        <button onClick={()=>pickCh(c.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:11,padding:'9px 16px',border:'none',cursor:'pointer',textAlign:'left',background:active?'rgba(44,165,224,0.1)':'transparent',borderLeft:`3px solid ${active?accent:'transparent'}`,transition:'all 0.15s'}}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:44,height:44,borderRadius:'50%',overflow:'hidden',border:`2px solid ${accent}40`}}>
              <img src={APP_ICONS[c.app]} alt={c.app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div style={{position:'absolute',bottom:0,right:0,width:16,height:16,borderRadius:'50%',background:c.type==='canal'?'#2ca5e0':'#25d366',border:'2px solid #1a1f2e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8}}>
              {c.type==='canal'?'📢':'💸'}
            </div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:active?'white':'rgba(255,255,255,0.82)',fontWeight:active?700:500,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {c.type==='canal'?`Canal ${c.app}`:`Pagos ${c.app}`}
            </div>
            <div style={{color:'rgba(255,255,255,0.32)',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {c.type==='canal'?'Comunicados oficiales':'Confirmaciones de pago'}
            </div>
          </div>
        </button>
      )
    }

    /* ---- TELEGRAM CHANNEL ---- */
    function TelegramCh({c}:{c:Chan}) {
      const groups:{ label:string; ms:Msg[] }[]=[]
      let cur=''
      for(const m of msgs){
        const lbl=fmtDateLabel(m.created_at)
        if(lbl!==cur){ cur=lbl; groups.push({label:lbl,ms:[]}) }
        groups[groups.length-1].ms.push(m)
      }
      return (
        <div style={{flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'#17212b'}}>
          {/* Header */}
          <div style={{background:'#1e2c3a',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'10px 14px',display:'flex',alignItems:'center',gap:11,flexShrink:0,paddingTop:'max(10px, env(safe-area-inset-top))'}}>
            <button className="ch-back" onClick={()=>setShowSidebar(true)} style={{background:'none',border:'none',color:'#2ca5e0',cursor:'pointer',padding:4,display:'flex',marginRight:2}}>
              <ChevronLeft size={22}/>
            </button>
            <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(44,165,224,0.25)'}}>
              <img src={APP_ICONS[c.app]} alt={c.app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:'white',fontWeight:700,fontSize:15}}>Canal {c.app}</div>
              <div style={{color:'#2ca5e0',fontSize:12}}>Eclipse Angels Agency{isAdmin?' · Admin':''}</div>
            </div>
            <svg width="22" height="22" viewBox="0 0 240 240" fill="none" opacity="0.35"><circle cx="120" cy="120" r="120" fill="#2ca5e0"/><path d="M73 135l14 28 10-17 47 22-57-110-14 77z" fill="white"/><path d="M73 135l31-20 16 15-47 5z" fill="rgba(255,255,255,0.7)"/></svg>
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'12px 14px',background:'#17212b'}}>
            <style>{`
              .tg-bg{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='rgba(255,255,255,0.015)' stroke-width='1'/%3E%3C/svg%3E");background-repeat:repeat;background-size:100px 100px;}
            `}</style>
            {groups.length===0&&(
              <div style={{textAlign:'center',color:'rgba(255,255,255,0.22)',marginTop:64,fontSize:14}}>
                <div style={{fontSize:44,marginBottom:12}}>📢</div>
                <div>Aún no hay mensajes en este canal.</div>
              </div>
            )}
            {groups.map(g=>(
              <div key={g.label}>
                <div style={{textAlign:'center',margin:'14px 0 8px'}}>
                  <span style={{background:'rgba(30,44,58,0.85)',backdropFilter:'blur(4px)',color:'rgba(255,255,255,0.48)',fontSize:12,padding:'3px 12px',borderRadius:12}}>{g.label}</span>
                </div>
                {g.ms.map(m=>{
                  const r=rx[m.id]??{heart:0,like:0,user_heart:false,user_like:false}
                  return (
                    <div key={m.id} style={{display:'flex',gap:8,marginBottom:10,maxWidth:'82%'}}>
                      <div style={{width:34,height:34,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'1.5px solid rgba(44,165,224,0.28)',marginTop:2}}>
                        <img src={APP_ICONS[c.app]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                      <div>
                        <div style={{color:'#2ca5e0',fontSize:12,fontWeight:700,marginBottom:3}}>Eclipse Angels Agency</div>
                        <div style={{background:'#1e2c3a',borderRadius:'2px 14px 14px 14px',padding:'9px 12px',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}>
                          {m.image_url&&<img src={m.image_url} alt="" onClick={()=>setLightbox(m.image_url!)} style={{maxWidth:260,width:'100%',borderRadius:8,display:'block',marginBottom:m.content?8:0,cursor:'zoom-in'}}/>}
                          {m.content&&<div style={{color:'rgba(255,255,255,0.9)',fontSize:14,lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{m.content}</div>}
                          <div style={{color:'rgba(255,255,255,0.28)',fontSize:11,textAlign:'right',marginTop:5,display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}>
                            <span>{fmtTime(m.created_at)}</span>
                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L4.5 9L13 1" stroke="#2ca5e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L9.5 9" stroke="#2ca5e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          {(!isAdmin||(r.heart>0||r.like>0))&&(
                            <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
                              {(['heart','like'] as const).map(type=>{
                                const count=type==='heart'?r.heart:r.like
                                const active=type==='heart'?r.user_heart:r.user_like
                                const emoji=type==='heart'?'❤️':'👍'
                                if(isAdmin&&count===0) return null
                                return (
                                  <button key={type} onClick={()=>toggleRx(m.id,type)} disabled={isAdmin||rxLoading[`${m.id}-${type}`]} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:12,border:`1px solid ${active?'#2ca5e0':'rgba(255,255,255,0.1)'}`,background:active?'rgba(44,165,224,0.15)':'rgba(255,255,255,0.04)',cursor:isAdmin?'default':'pointer',fontSize:13,color:active?'#2ca5e0':'rgba(255,255,255,0.45)',transition:'all 0.15s'}}>
                                    <span>{emoji}</span>{count>0&&<span style={{fontWeight:600,fontSize:12}}>{count}</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          {/* Input */}
          {isAdmin?(
            <div style={{background:'#1e2c3a',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'10px 12px',display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
              <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f) doImgPost(f);e.target.value=''}}/>
              <button onClick={()=>fileRef.current?.click()} style={{background:'rgba(44,165,224,0.12)',border:'none',borderRadius:10,color:'#2ca5e0',cursor:'pointer',padding:'10px 12px',flexShrink:0}}><ImgIcon size={18}/></button>
              <div style={{flex:1,background:'#243342',borderRadius:22,padding:'9px 14px',display:'flex',alignItems:'center'}}>
                <textarea value={postText} onChange={e=>setPostText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doPost()}}} placeholder="Escribir en el canal..." rows={1} style={{background:'none',border:'none',outline:'none',color:'white',fontSize:14,flex:1,resize:'none',lineHeight:1.4,fontFamily:'inherit',margin:0,padding:0,maxHeight:96,overflow:'auto'}}/>
              </div>
              <button onClick={doPost} disabled={!postText.trim()||posting} style={{background:postText.trim()?'#2ca5e0':'rgba(44,165,224,0.18)',border:'none',borderRadius:'50%',width:42,height:42,color:'white',cursor:postText.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s'}}>
                {posting?<div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<Send size={16}/>}
              </button>
            </div>
          ):(
            <div style={{background:'#1e2c3a',borderTop:'1px solid rgba(255,255,255,0.06)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#2ca5e0',flexShrink:0}}/>
              <span style={{color:'rgba(255,255,255,0.32)',fontSize:12}}>Solo los administradores pueden publicar</span>
            </div>
          )}
        </div>
      )
    }

    /* ---- WHATSAPP PAYMENT CHANNEL ---- */
    function WhatsAppCh({c}:{c:Chan}) {
      const groups:{ label:string; evs:StickerEv[] }[]=[]
      let cur=''
      for(const e of stickers){
        const lbl=fmtDateLabel(e.created_at)
        if(lbl!==cur){ cur=lbl; groups.push({label:lbl,evs:[]}) }
        groups[groups.length-1].evs.push(e)
      }
      return (
        <div style={{flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'#0b141a'}}>
          {/* Header */}
          <div style={{background:'#1f2c34',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'10px 14px',display:'flex',alignItems:'center',gap:11,flexShrink:0,paddingTop:'max(10px, env(safe-area-inset-top))'}}>
            <button className="ch-back" onClick={()=>setShowSidebar(true)} style={{background:'none',border:'none',color:'#25d366',cursor:'pointer',padding:4,display:'flex',marginRight:2}}>
              <ChevronLeft size={22}/>
            </button>
            <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(37,211,102,0.28)'}}>
              <img src={APP_ICONS[c.app]} alt={c.app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:'white',fontWeight:700,fontSize:15}}>Pagos {c.app}</div>
              <div style={{color:'#25d366',fontSize:12}}>Confirmaciones automáticas · {stickers.length} pago{stickers.length!==1?'s':''}</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none" opacity="0.4"><circle cx="24" cy="24" r="24" fill="#25d366"/><path d="M34 14H14a2 2 0 00-2 2v20l4-4h18a2 2 0 002-2V16a2 2 0 00-2-2z" fill="white"/></svg>
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'12px 14px',background:'#0b141a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath d='M10 10h20v20H10z' fill='none' stroke='rgba(255,255,255,0.015)' stroke-width='0.5'/%3E%3Cpath d='M110 110h20v20H110z' fill='none' stroke='rgba(255,255,255,0.015)' stroke-width='0.5'/%3E%3C/svg%3E") repeat'}}>
            {/* Info badge */}
            <div style={{textAlign:'center',marginBottom:18}}>
              <div style={{display:'inline-block',background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.18)',borderRadius:14,padding:'7px 14px',color:'rgba(255,255,255,0.4)',fontSize:12,maxWidth:300,lineHeight:1.5}}>
                🔒 Este canal es automático. Un sticker aparece cada vez que alguien confirma su pago.
              </div>
            </div>
            {groups.length===0&&(
              <div style={{textAlign:'center',color:'rgba(255,255,255,0.22)',marginTop:48,fontSize:14}}>
                <div style={{fontSize:44,marginBottom:12}}>💸</div>
                <div>Aún no hay confirmaciones de pago para {c.app}.</div>
              </div>
            )}
            {groups.map(g=>(
              <div key={g.label}>
                <div style={{textAlign:'center',margin:'14px 0 8px'}}>
                  <span style={{background:'rgba(31,44,52,0.88)',color:'rgba(255,255,255,0.45)',fontSize:12,padding:'3px 12px',borderRadius:12}}>{g.label}</span>
                </div>
                {g.evs.map(ev=>{
                  const name=ev.nombre_en_app??'Trabajadora'
                  const url=STICKER_URLS[ev.sticker_index%STICKER_URLS.length]
                  const ac=avatarColor(name)
                  return (
                    <div key={ev.id} style={{display:'flex',gap:9,marginBottom:14,maxWidth:'78%'}}>
                      <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,background:ac,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14,marginTop:2,boxShadow:'0 2px 6px rgba(0,0,0,0.35)'}}>
                        {initial(name)}
                      </div>
                      <div>
                        <div style={{color:ac,fontSize:13,fontWeight:700,marginBottom:3}}>{name}</div>
                        <div style={{background:'#1f2c34',borderRadius:'2px 14px 14px 14px',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.4)'}}>
                          <div style={{padding:'8px 8px 4px 8px'}}>
                            <img src={url} alt="sticker" onClick={()=>setLightbox(url)} style={{width:150,height:150,objectFit:'cover',borderRadius:10,display:'block',cursor:'zoom-in',border:'2px solid rgba(37,211,102,0.2)'}}/>
                          </div>
                          <div style={{padding:'2px 12px 10px'}}>
                            <div style={{color:'#25d366',fontSize:14,fontWeight:700}}>✅ Pago recibido</div>
                            <div style={{color:'rgba(255,255,255,0.38)',fontSize:12,marginTop:2}}>App: {ev.app_name}</div>
                            <div style={{color:'rgba(255,255,255,0.25)',fontSize:11,textAlign:'right',marginTop:5,display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}>
                              <span>{fmtTime(ev.created_at)}</span>
                              <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L4.5 9L13 1" stroke="#25d366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 5.5L9.5 9" stroke="#25d366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          {/* Footer */}
          <div style={{background:'#1f2c34',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 16px',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#25d366',flexShrink:0}}/>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:12}}>Los stickers se envían al confirmar pagos en tu perfil</span>
          </div>
        </div>
      )
    }

    /* ---- STATES ---- */
    if(loading||fetching) return (
      <div style={{minHeight:'100vh',background:'#17212b',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:36,height:36,border:'3px solid rgba(44,165,224,0.2)',borderTopColor:'#2ca5e0',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:14,margin:0}}>Cargando canales...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )

    if(approved.length===0){
      const pending=requests.filter(r=>r.status==='pending').map(r=>r.app_name)
      return (
        <div style={{minHeight:'100vh',background:'#17212b',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24,paddingTop:80}}>
          <div style={{fontSize:52}}>{pending.length>0?'⏳':'🔒'}</div>
          <p style={{color:'rgba(255,255,255,0.45)',textAlign:'center',maxWidth:280,margin:0,lineHeight:1.6}}>
            {pending.length>0?`Tu solicitud para ${pending.join(', ')} está pendiente.`:'No tienes acceso a ningún canal. Agrega una app en tu perfil primero.'}
          </p>
        </div>
      )
    }

    /* ---- MAIN LAYOUT ---- */
    return (
      <div style={{height:'100dvh',display:'flex',overflow:'hidden',background:'#17212b',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          .ch-sidebar{display:flex;flex-direction:column;width:100%;max-width:300px;flex-shrink:0;}
          .ch-content{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
          .ch-back{display:none!important;}
          @media(max-width:640px){
            .ch-sidebar{max-width:100%!important;display:${showSidebar?'flex':'none'}!important;}
            .ch-content{display:${showSidebar?'none':'flex'}!important;}
            .ch-back{display:flex!important;}
          }
          @media(min-width:641px){
            .ch-sidebar{display:flex!important;}
            .ch-content{display:flex!important;}
          }
        `}</style>

        {lightbox&&(
          <div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.93)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
            <img src={lightbox} alt="" onClick={e=>e.stopPropagation()} style={{maxWidth:'95vw',maxHeight:'92vh',objectFit:'contain',borderRadius:8}}/>
            <button onClick={()=>setLightbox(null)} style={{position:'absolute',top:16,right:16,width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',color:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <X size={18}/>
            </button>
          </div>
        )}

        <div className="ch-sidebar"><Sidebar/></div>
        <div className="ch-content">
          {!ch?(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#17212b'}}>
              <div style={{textAlign:'center',color:'rgba(255,255,255,0.2)'}}>
                <div style={{fontSize:48,marginBottom:10}}>💬</div>
                <p style={{margin:0,fontSize:14}}>Selecciona un canal</p>
              </div>
            </div>
          ):ch.type==='canal'?<TelegramCh c={ch}/>:<WhatsAppCh c={ch}/>}
        </div>
      </div>
    )
  }
  