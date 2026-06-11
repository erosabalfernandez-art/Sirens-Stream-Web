import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/contexts/AuthContext'
import { Send, X, ChevronLeft, Image as ImgIcon, CheckCheck, Megaphone, Phone, MoreVertical, Search } from 'lucide-react'

const STICKER_URLS = [
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_0_money.jpg',
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_1_lady.jpg',
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_2_cat.jpg',
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_3_gold.jpg',
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_4_pink.jpg',
  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/stickers/sticker_5_man.jpg',
]
const APP_ICONS: Record<string, string> = {
  Waha:  'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/waha.jpg',
  Layla: 'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/layla.jpg',
  Howdy: 'https://eyeklnjwbyvsgirsglbx.supabase.co/storage/v1/object/public/app-icons/howdy.jpg',
}
const AV_COLORS = ['#e91e63','#9c27b0','#ff5722','#ff9800','#2196f3','#00bcd4','#4caf50','#795548','#f06292','#7e57c2']
function avColor(name: string) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length] }
function avInit(name: string) { return (name||'?')[0].toUpperCase() }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) }
function fmtDate(d: string) {
  const dt=new Date(d),today=new Date(),yest=new Date(); yest.setDate(yest.getDate()-1)
  if(dt.toDateString()===today.toDateString()) return 'Hoy'
  if(dt.toDateString()===yest.toDateString()) return 'Ayer'
  return dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})
}

interface Msg { id:string; app_name:string; content:string|null; image_url:string|null; created_at:string }
interface Rx  { heart:number; like:number; user_heart:boolean; user_like:boolean }
interface Stk { id:string; user_id:string; app_name:string; nombre_en_app:string|null; sticker_index:number; created_at:string }
interface CReq { app_name:string; status:string }

export default function Canales() {
  const { user, profile, loading } = useAuth()
  const [, navigate] = useLocation()
  const API = ((import.meta.env.VITE_API_URL as string|undefined)??'').replace(/\/$/, '')

  const isAdmin = !!(profile as any)?.is_admin
  const [reqs, setReqs] = useState<CReq[]>([])
  const [fetching, setFetching] = useState(true)
  const [activeCh, setActiveCh] = useState<string|null>(null)
  const [sidebar, setSidebar] = useState(true)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [rx, setRx] = useState<Record<string,Rx>>({})
  const [stickers, setStickers] = useState<Stk[]>([])
  const [txt, setTxt] = useState('')
  const [posting, setPosting] = useState(false)
  const [lb, setLb] = useState<string|null>(null)
  const [rxLoad, setRxLoad] = useState<Record<string,boolean>>({})
  const [msgLoading, setMsgLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const activeChRef = useRef<string|null>(null)
  const btmRef = useRef<HTMLDivElement>(null)
    const lbPinchRef = useRef<number|null>(null)
    const lbDragRef = useRef<{x:number,y:number,px:number,py:number}|null>(null)
    const [lbScale, setLbScale] = useState(1)
    const [lbPan, setLbPan] = useState<{x:number,y:number}>({x:0,y:0})

  useEffect(()=>{ if(!loading&&!user) navigate('/login') },[loading,user])
  useEffect(()=>{ if(user) loadAccess() },[user])

  const approved = reqs.filter(r=>r.status==='approved').map(r=>r.app_name)

  type CType = 'canal'|'pagos'
  interface Ch { id:string; type:CType; app:string }
  const chans: Ch[] = [
      ...approved.map(app=>({id:'canal-'+app, type:'canal' as CType, app})),
      ...(isAdmin ? [{id:'pagos-all', type:'pagos' as CType, app:'all'}] : []),
    ]
  const ch = chans.find(c=>c.id===activeCh)

  useEffect(()=>{ if(chans.length>0&&!activeCh) setActiveCh(chans[0].id) },[chans.length])
  useEffect(()=>{
    activeChRef.current = activeCh
    if(!user||!ch) return
    setMsgs([]); setStickers([])
    if(ch.type==='canal') loadMsgs(ch.app); else loadStk(ch.app)
  },[activeCh])
  useEffect(()=>{
    if(!user) return
    const t=setInterval(()=>{ if(!ch) return; if(ch.type==='canal') loadMsgs(ch.app); else loadStk(ch.app) },10000)
    return ()=>clearInterval(t)
  },[activeCh,user])
  useEffect(()=>{ btmRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs,stickers,activeCh])
  useEffect(()=>{ setLbScale(1); setLbPan({x:0,y:0}) },[lb])

  async function loadAccess(){
    setFetching(true)
    const r=await fetch(`${API}/api/channel-access?user_id=${user!.id}`)
    if(r.ok){ const d=await r.json(); setReqs(d.requests??[]) }
    setFetching(false)
  }
  async function loadMsgs(app:string, attempt=0){
      const myChannelId='canal-'+app
      setMsgLoading(true)
      try {
        const r=await fetch(`${API}/api/channel-messages?user_id=${user!.id}`)
        if(!r.ok) throw new Error('not-ok')
        const d=await r.json()
        if(activeChRef.current!==myChannelId) return
        const sorted:Msg[]=(d.messages??[]).filter((m:Msg)=>m.app_name===app).sort((a:Msg,b:Msg)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())
        setMsgs(sorted)
        if(sorted.length>0){
          const ids=sorted.map((m:Msg)=>m.id)
          const rr=await fetch(`${API}/api/channel-reactions-bulk?user_id=${user!.id}&message_ids=${ids.join(',')}`)
          if(rr.ok){ const dd=await rr.json(); setRx(prev=>({...prev,...(dd.reactions??{})})) }
        }
      } catch(e:unknown) {
        if(e instanceof Error&&e.name==='AbortError') return
        if(attempt<2){ setTimeout(()=>loadMsgs(app, attempt+1), 3000*(attempt+1)); return }
      } finally {
        setMsgLoading(false)
      }
    }
  async function loadStk(app:string){
    if(app==='all'){
      const results=await Promise.all(['Waha','Layla','Howdy'].map(a=>fetch(`${API}/api/payment-stickers?app_name=${encodeURIComponent(a)}`).then(r=>r.ok?r.json():{events:[]}).catch(()=>({events:[]}))))
      setStickers(results.flatMap((d:any)=>d.events??[]))
    } else {
      const r=await fetch(`${API}/api/payment-stickers?app_name=${encodeURIComponent(app)}`)
      if(r.ok){ const d=await r.json(); setStickers(d.events??[]) }
    }
  }
  async function toggleRx(id:string, type:'heart'){
    if(!user||isAdmin) return
    const k=id+'-'+type
    setRxLoad(p=>({...p,[k]:true}))
    const r=await fetch(`${API}/api/channel-reaction`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message_id:id,user_id:user.id,reaction_type:type})})
    if(r.ok){ const d=await r.json(); setRx(p=>({...p,[id]:d.summary})) }
    setRxLoad(p=>({...p,[k]:false}))
  }
  async function doPost(){
    if(!txt.trim()||posting||!ch) return
    setPosting(true)
    const r=await fetch(`${API}/api/post-channel-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_name:ch.app,content:txt.trim(),created_by:user?.id})})
    if(r.ok){ setTxt(''); loadMsgs(ch.app) }
    setPosting(false)
  }
  async function doImg(file:File){
    if(!file||posting||!ch) return
    setPosting(true)
    const reader=new FileReader()
    reader.onload=async(e)=>{
      const b64=(e.target?.result as string)?.split(',')[1]
      if(!b64){ setPosting(false); return }
      const up=await fetch(`${API}/api/upload-channel-image`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64:b64,mime:file.type,filename:file.name})})
      if(up.ok){
        const {url}=await up.json()
        await fetch(`${API}/api/post-channel-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_name:ch.app,content:txt.trim()||null,image_url:url,created_by:user?.id})})
        setTxt(''); loadMsgs(ch.app)
      }
      setPosting(false)
    }
    reader.readAsDataURL(file)
  }

  if(loading||fetching) return (
    <div style={{minHeight:'100vh',background:'#17212b',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{'@keyframes tgspin{to{transform:rotate(360deg)}}'}</style>
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:'3px solid rgba(44,165,224,0.2)',borderTopColor:'#2ca5e0',borderRadius:'50%',animation:'tgspin 0.8s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:14,margin:0}}>Cargando canales...</p>
      </div>
    </div>
  )

  if(approved.length===0){
    const pend=reqs.filter(r=>r.status==='pending').map(r=>r.app_name)
    const isAgentOrColider = !!(profile as any)?.is_agent || !!(profile as any)?.is_colider
    return (
      <div style={{minHeight:'100vh',background:'#17212b',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:24,paddingTop:80}}>
        <div style={{fontSize:52}}>{pend.length>0?'⏳':'🔒'}</div>
        <p style={{color:'rgba(255,255,255,0.45)',textAlign:'center',maxWidth:300,margin:0,lineHeight:1.6}}>
          {pend.length>0
            ? 'Tu solicitud para '+pend.join(', ')+' está pendiente de aprobación.'
            : isAgentOrColider
              ? 'Aún no tienes acceso a los canales. El administrador te los asignará desde el panel de admin.'
              : 'No tienes acceso a ningún canal. Agrega una app en tu perfil primero.'}
        </p>
      </div>
    )
  }

  function groupBy<T extends {created_at:string}>(arr:T[]){
    const groups:{label:string;items:T[]}[]=[]
    let cur=''
    for(const x of arr){ const l=fmtDate(x.created_at); if(l!==cur){cur=l;groups.push({label:l,items:[]})} groups[groups.length-1].items.push(x) }
    return groups
  }

  /* ── SIDEBAR ─────────────────────────────────────────────────── */
  function Sidebar(){
    return (
      <div style={{width:'100%',height:'100%',background:'#17212b',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'12px 16px 12px',background:'#242f3d',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#2ca5e0,#1a7fba)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Megaphone size={18} color="white"/>
          </div>
          <div>
            <div style={{color:'white',fontWeight:700,fontSize:15}}>Canales</div>
            <div style={{color:'rgba(255,255,255,0.35)',fontSize:11}}>Eclipse Angels Agency</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{padding:'12px 16px 4px'}}>
            <span style={{color:'rgba(44,165,224,0.7)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2}}>📢 Comunicados · Telegram</span>
          </div>
          {chans.filter(c=>c.type==='canal').map(c=>{
            const isActive=activeCh===c.id
            return (
              <button key={c.id} onClick={()=>{setActiveCh(c.id);setSidebar(false);setMsgs([]);setStickers([])}}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'8px 14px',border:'none',cursor:'pointer',textAlign:'left',background:isActive?'rgba(44,165,224,0.13)':'transparent',transition:'background 0.15s',borderLeft:`3px solid ${isActive?'#2ca5e0':'transparent'}`}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',border:`2px solid ${isActive?'#2ca5e0':'rgba(255,255,255,0.08)'}`}}>
                    <img src={APP_ICONS[c.app]} alt={c.app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  </div>
                  <div style={{position:'absolute',bottom:-1,right:-1,width:17,height:17,borderRadius:'50%',background:'#2ca5e0',border:'2px solid #17212b',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Megaphone size={8} color="white"/>
                  </div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:isActive?'#fff':'rgba(255,255,255,0.85)',fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Canal {c.app}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1}}>Comunicados oficiales</div>
                </div>
              </button>
            )
          })}
          {isAdmin && (<>
            <div style={{padding:'14px 16px 4px',borderTop:'1px solid rgba(255,255,255,0.05)',marginTop:6}}>
              <span style={{color:'rgba(37,211,102,0.7)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2}}>💰 Pagos · Todas las Apps</span>
            </div>
            {(()=>{
              const isActive=activeCh==='pagos-all'
              return (
                <button onClick={()=>{setActiveCh('pagos-all');setSidebar(false);setMsgs([]);setStickers([])}}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'8px 14px',border:'none',cursor:'pointer',textAlign:'left',background:isActive?'rgba(37,211,102,0.1)':'transparent',transition:'background 0.15s',borderLeft:`3px solid ${isActive?'#25d366':'transparent'}`}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',border:`2px solid ${isActive?'#25d366':'rgba(255,255,255,0.08)'}`}}>
                      <img src="/images/eclipse-logo-nobg.png" alt="Eclipse Angels" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    </div>
                    <div style={{position:'absolute',bottom:-1,right:-1,width:17,height:17,borderRadius:'50%',background:'#25d366',border:'2px solid #17212b',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,fontWeight:900}}>$</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:isActive?'#fff':'rgba(255,255,255,0.85)',fontWeight:600,fontSize:14}}>Canal de Pagos</div>
                    <div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1}}>Waha · Layla · Howdy</div>
                  </div>
                </button>
              )
            })()}
          </>)}
        </div>
      </div>
    )
  }

  /* ── TELEGRAM CANAL VIEW ─────────────────────────────────────── */
  function TgChannel(){
    if(!ch) return null
    const groups=groupBy(msgs)
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'#17212b'}}>
        {/* Header */}
        <div style={{background:'#242f3d',borderBottom:'1px solid rgba(255,255,255,0.04)',padding:'0 12px',height:56,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <button onClick={()=>setSidebar(true)} className="ch-back" style={{background:'none',border:'none',color:'#2ca5e0',cursor:'pointer',padding:4,display:'flex',flexShrink:0}}>
            <ChevronLeft size={22}/>
          </button>
          <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',flexShrink:0}}>
            <img src={APP_ICONS[ch.app]} alt={ch.app} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'white',fontWeight:700,fontSize:15}}>Canal {ch.app}</span>
              <span style={{background:'#2ca5e0',borderRadius:4,padding:'1px 5px',fontSize:9,color:'white',fontWeight:700,letterSpacing:0.5,display:'inline-flex',alignItems:'center',gap:2,flexShrink:0}}>
                <Megaphone size={8} color="white"/> CANAL
              </span>
            </div>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>{msgs.length} publicaciones{isAdmin?' · Admin':''}</div>
          </div>
          <Search size={17} color="rgba(255,255,255,0.3)" style={{cursor:'pointer',flexShrink:0}}/>
        </div>
        {/* Messages */}
        <div className="tg-msgs-bg" style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {msgLoading&&msgs.length===0&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 24px',gap:12}}>
                <div style={{width:28,height:28,border:'3px solid rgba(44,165,224,0.2)',borderTopColor:'#2ca5e0',borderRadius:'50%',animation:'tgspin 0.8s linear infinite'}}/>
                <span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Cargando mensajes...</span>
              </div>
            )}
            {groups.length===0&&(
            <div style={{textAlign:'center',padding:'64px 24px'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(44,165,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                <Megaphone size={30} color="#2ca5e0"/>
              </div>
              <p style={{color:'rgba(255,255,255,0.28)',fontSize:14,margin:0}}>Sin publicaciones aún</p>
              <p style={{color:'rgba(255,255,255,0.16)',fontSize:12,marginTop:4}}>Los comunicados aparecerán aquí</p>
            </div>
          )}
          {groups.map(g=>(
            <div key={g.label}>
              <div style={{display:'flex',justifyContent:'center',padding:'10px 0 6px'}}>
                <span style={{background:'rgba(0,0,0,0.35)',color:'rgba(255,255,255,0.45)',fontSize:11,padding:'3px 10px',borderRadius:8,fontWeight:500}}>{g.label}</span>
              </div>
              {g.items.map((m,mi)=>{
                const rxm=rx[m.id]??{heart:0,like:0,user_heart:false,user_like:false}
                const hasReactions=rxm.heart>0
                return (
                  <div key={m.id} style={{padding:'0 10px',marginBottom:8,marginTop:mi===0?4:0}}>
                    {/* Telegram-style channel bubble */}
                    <div style={{background:'#182533',borderRadius:18,overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.3)'}}>
                      {/* Channel identity row — compact, no divider */}
                      <div style={{display:'flex',alignItems:'center',gap:7,padding:'10px 14px 5px'}}>
                        <div style={{width:22,height:22,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'1.5px solid rgba(44,165,224,0.4)'}}>
                          <img src={APP_ICONS[ch.app]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </div>
                        <span style={{color:'#2ca5e0',fontWeight:700,fontSize:13,lineHeight:1}}>Canal {ch.app}</span>
                        <span style={{color:'rgba(255,255,255,0.2)',fontSize:10,marginLeft:1}}>· Eclipse Angels</span>
                      </div>
                      {/* Image */}
                      {m.image_url&&(
                        <div style={{cursor:'zoom-in',margin:'2px 0'}} onClick={()=>setLb(m.image_url)}>
                          <img src={m.image_url} alt="" style={{width:'100%',maxHeight:300,objectFit:'cover',display:'block'}}/>
                        </div>
                      )}
                      {/* Text content */}
                      {m.content&&(
                        <div style={{padding:`${m.image_url?'8px':'2px'} 14px 0`,color:'rgba(255,255,255,0.9)',fontSize:14.5,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                          {m.content}
                        </div>
                      )}
                      {/* Timestamp — bottom right, Telegram style */}
                      <div style={{display:'flex',justifyContent:'flex-end',padding:'3px 14px 10px',gap:4,alignItems:'center'}}>
                        <span style={{color:'rgba(255,255,255,0.26)',fontSize:11}}>{fmtTime(m.created_at)}</span>
                      </div>
                    </div>
                    {/* Reactions — float below the bubble like Telegram */}
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:5,paddingLeft:4,flexWrap:'wrap'}}>
                      {(()=>{
                        const active=rxm.user_heart; const count=rxm.heart; const k=m.id+'-heart'
                        return (
                          <button onClick={!isAdmin?()=>toggleRx(m.id,'heart'):undefined} disabled={rxLoad[k]}
                            style={{display:'flex',alignItems:'center',gap:5,background:active?'rgba(44,165,224,0.22)':'rgba(255,255,255,0.07)',border:`1.5px solid ${active?'rgba(44,165,224,0.55)':'rgba(255,255,255,0.1)'}`,borderRadius:20,padding:'5px 12px',cursor:isAdmin?'default':'pointer',transition:'all 0.18s',opacity:rxLoad[k]?0.5:1,backdropFilter:'blur(4px)'}}>
                            <span style={{fontSize:15,lineHeight:1}}>❤️</span>
                            <span style={{color:active?'#64bfed':'rgba(255,255,255,0.5)',fontSize:13,fontWeight:700,minWidth:8}}>{isAdmin?count:(count>0?count:'')}</span>
                          </button>
                        )
                      })()}
                    </div>       </div>
                )
              })}
            </div>
          ))}
          <div ref={btmRef}/>
        </div>
        {/* Input */}
        <div style={{background:'#1e2c3a',borderTop:'1px solid rgba(255,255,255,0.05)',padding:'10px 12px',flexShrink:0}}>
          {isAdmin?(
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
              <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0]) doImg(e.target.files[0])}}/>
              <button onClick={()=>fileRef.current?.click()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',padding:8,display:'flex',flexShrink:0}}>
                <ImgIcon size={20}/>
              </button>
              <div style={{flex:1,background:'#17212b',borderRadius:20,padding:'8px 14px',display:'flex',alignItems:'center'}}>
                <textarea value={txt} onChange={e=>setTxt(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doPost()}}}
                  placeholder="Escribe un comunicado..." rows={1}
                  style={{background:'none',border:'none',outline:'none',color:'white',fontSize:14,flex:1,resize:'none',lineHeight:1.4,maxHeight:100,overflowY:'auto',fontFamily:'inherit'}}/>
              </div>
              <button onClick={doPost} disabled={!txt.trim()||posting}
                style={{width:40,height:40,borderRadius:'50%',background:txt.trim()?'#2ca5e0':'rgba(255,255,255,0.08)',border:'none',cursor:txt.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s',flexShrink:0}}>
                <Send size={16} color="white"/>
              </button>
            </div>
          ):(
            <div style={{textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:12,padding:'4px 0'}}>Solo los administradores pueden publicar en este canal</div>
          )}
        </div>
      </div>
    )
  }

  /* ── WHATSAPP PAGOS VIEW ──────────────────────────────────────── */
  function WaChannel(){
    if(!ch) return null
    const sorted=[...stickers].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())
    const groups=groupBy(sorted)
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
        {/* WA Header */}
        <div style={{background:'#1f2c34',borderBottom:'1px solid rgba(0,0,0,0.3)',padding:'0 12px',height:56,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <button onClick={()=>setSidebar(true)} className="ch-back" style={{background:'none',border:'none',color:'#25d366',cursor:'pointer',padding:4,display:'flex',flexShrink:0}}>
            <ChevronLeft size={22}/>
          </button>
          <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(37,211,102,0.4)'}}>
            <img src="/images/eclipse-logo-nobg.png" alt="Eclipse Angels" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'white',fontWeight:700,fontSize:15}}>Canal de Pagos</div>
            <div style={{color:'#25d366',fontSize:12}}>Canal de pagos confirmados</div>
          </div>
          <Phone size={17} color="rgba(255,255,255,0.3)" style={{cursor:'pointer',flexShrink:0}}/>
          <MoreVertical size={17} color="rgba(255,255,255,0.3)" style={{cursor:'pointer',flexShrink:0,marginLeft:4}}/>
        </div>
        {/* WA Chat Background */}
        <div className="wa-msgs-bg" style={{flex:1,overflowY:'auto',padding:'10px 10px'}}>
          {groups.length===0&&(
            <div style={{textAlign:'center',padding:'64px 24px'}}>
              <div style={{width:70,height:70,borderRadius:'50%',background:'rgba(37,211,102,0.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                <span style={{fontSize:36}}>💰</span>
              </div>
              <p style={{color:'rgba(255,255,255,0.3)',fontSize:14,margin:0,fontWeight:500}}>Sin pagos confirmados aún</p>
              <p style={{color:'rgba(255,255,255,0.16)',fontSize:12,marginTop:6,lineHeight:1.5}}>Cuando una trabajadora o agente confirme su pago aparecerá aquí automáticamente</p>
            </div>
          )}
          {groups.map(g=>(
            <div key={g.label}>
              <div style={{display:'flex',justifyContent:'center',margin:'6px 0 10px'}}>
                <span style={{background:'rgba(0,0,0,0.5)',color:'rgba(255,255,255,0.5)',fontSize:11,padding:'3px 10px',borderRadius:8,fontWeight:500}}>{g.label}</span>
              </div>
              {g.items.map(stk=>{
                const stickerImg=STICKER_URLS[stk.sticker_index%STICKER_URLS.length]
                const senderName=stk.nombre_en_app||'Usuario'
                return (
                  <div key={stk.id} style={{display:'flex',justifyContent:'flex-start',marginBottom:12,alignItems:'flex-end',gap:7}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:avColor(senderName),display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0,marginBottom:2}}>
                      {avInit(senderName)}
                    </div>
                    <div style={{maxWidth:'72%'}}>
                      <div style={{background:'#1f2c34',borderRadius:'0 10px 10px 10px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.4)'}}>
                        <div style={{padding:'5px 10px 3px'}}>
                          <span style={{color:'#25d366',fontSize:12,fontWeight:700}}>{senderName}</span>
                          <span style={{color:'rgba(255,255,255,0.22)',fontSize:10,marginLeft:5}}>{stk.app_name}</span>
                        </div>
                        <div style={{position:'relative',background:'#111b21'}}>
                          <img src={stickerImg} alt="Pago recibido" style={{width:160,height:160,objectFit:'cover',display:'block'}}/>
                          <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 55%, rgba(0,0,0,0.75))',display:'flex',alignItems:'flex-end',justifyContent:'center',paddingBottom:8}}>
                            <div style={{textAlign:'center'}}>
                              <div style={{color:'#25d366',fontWeight:800,fontSize:13,textShadow:'0 1px 3px rgba(0,0,0,0.7)'}}>💰 PAGO RECIBIDO</div>
                              <div style={{color:'rgba(255,255,255,0.7)',fontSize:10,marginTop:1}}>✅ Confirmado</div>
                            </div>
                          </div>
                        </div>
                        <div style={{padding:'5px 10px 7px',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}>
                          <span style={{color:'rgba(255,255,255,0.35)',fontSize:11}}>{fmtTime(stk.created_at)}</span>
                          <CheckCheck size={13} color="#25d366"/>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={btmRef}/>
        </div>
        {/* WA Bottom Bar */}
        <div style={{background:'#1f2c34',borderTop:'1px solid rgba(0,0,0,0.3)',padding:'10px 14px',flexShrink:0}}>
          <div style={{background:'rgba(255,255,255,0.05)',borderRadius:24,padding:'9px 16px',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:15}}>🔒</span>
            <span style={{color:'rgba(255,255,255,0.22)',fontSize:13,flex:1}}>Los stickers se envían automáticamente al confirmar pagos</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── LIGHTBOX ────────────────────────────────────────────────── */
  const Lightbox = lb ? (
      <div
        onClick={()=>setLb(null)}
        onWheel={(e)=>{
          const delta=e.deltaY>0?0.85:1.18
          setLbScale(s=>{ const ns=Math.min(Math.max(s*delta,1),6); if(ns===1) setLbPan({x:0,y:0}); return ns })
        }}
        style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',cursor:lbScale>1?'grab':'zoom-out',overflow:'hidden',touchAction:'none'}}>
        <button onClick={()=>setLb(null)} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,0.1)',border:'none',color:'white',cursor:'pointer',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>
          <X size={18}/>
        </button>
        {lbScale>1&&<span style={{position:'absolute',top:16,left:16,background:'rgba(0,0,0,0.5)',color:'rgba(255,255,255,0.7)',fontSize:12,padding:'4px 10px',borderRadius:20}}>{Math.round(lbScale*100)}%</span>}
        <img
          src={lb} alt=""
          draggable={false}
          style={{maxWidth:'92vw',maxHeight:'88vh',objectFit:'contain',borderRadius:8,transform:'scale('+lbScale+') translate('+(lbPan.x/lbScale)+'px,'+(lbPan.y/lbScale)+'px)',transformOrigin:'center center',userSelect:'none',cursor:lbScale>1?'grab':'default'}}
          onClick={e=>e.stopPropagation()}
          onMouseDown={(e)=>{ e.preventDefault(); if(lbScale>1) lbDragRef.current={x:e.clientX,y:e.clientY,px:lbPan.x,py:lbPan.y} }}
          onMouseMove={(e)=>{ if(lbDragRef.current) setLbPan({x:lbDragRef.current.px+(e.clientX-lbDragRef.current.x),y:lbDragRef.current.py+(e.clientY-lbDragRef.current.y)}) }}
          onMouseUp={()=>{ lbDragRef.current=null }}
          onMouseLeave={()=>{ lbDragRef.current=null }}
          onTouchStart={(e)=>{
            e.stopPropagation()
            if(e.touches.length===2){
              const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY
              lbPinchRef.current=Math.sqrt(dx*dx+dy*dy)
            } else if(e.touches.length===1&&lbScale>1){
              lbDragRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,px:lbPan.x,py:lbPan.y}
            }
          }}
          onTouchMove={(e)=>{
            e.preventDefault(); e.stopPropagation()
            if(e.touches.length===2&&lbPinchRef.current!==null){
              const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY
              const dist=Math.sqrt(dx*dx+dy*dy); const ratio=dist/lbPinchRef.current
              setLbScale(s=>{ const ns=Math.min(Math.max(s*ratio,1),6); if(ns===1) setLbPan({x:0,y:0}); return ns })
              lbPinchRef.current=dist
            } else if(e.touches.length===1&&lbDragRef.current){
              setLbPan({x:lbDragRef.current.px+(e.touches[0].clientX-lbDragRef.current.x),y:lbDragRef.current.py+(e.touches[0].clientY-lbDragRef.current.y)})
            }
          }}
          onTouchEnd={(e)=>{ e.stopPropagation(); lbPinchRef.current=null; if(e.touches.length===0) lbDragRef.current=null }}
        />
      </div>
    ) : null

  /* ── LAYOUT ──────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
          .ch-back { display: none !important }
          @media(max-width:639px){
            .ch-back { display: flex !important }
            .ch-sidebar { width: 100% !important; min-width: 100% !important }
            .ch-main { display: none }
            .ch-main.active { display: flex }
            .ch-sidebar.collapsed { display: none !important }
          }
          * { box-sizing: border-box }
          ::-webkit-scrollbar { width: 4px }
          ::-webkit-scrollbar-track { background: transparent }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px }
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
          @keyframes tgspin { to { transform: rotate(360deg); } }
`}</style>
      {Lightbox}
      <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
        <div className={`ch-sidebar${!sidebar?' collapsed':''}`} style={{width:300,minWidth:300,height:'100%',flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.05)',display:'flex'}}>
          <Sidebar/>
        </div>
        <div className={`ch-main${activeCh?' active':''}`} style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
          {ch?.type==='canal'?<TgChannel/>:ch?.type==='pagos'?<WaChannel/>:(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#17212b'}}>
              <p style={{color:'rgba(255,255,255,0.18)',fontSize:14}}>Selecciona un canal</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
