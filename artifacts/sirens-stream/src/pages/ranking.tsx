import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Trophy, RotateCcw, AlertCircle, TrendingUp, Loader2 } from 'lucide-react'

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

interface AppEntry { app_name: string; usd: number }
interface RankingEntry {
  rank: number; user_id: string; nombre: string; nombre_real: string | null
  total_usd: number; apps: AppEntry[]
}
interface UserRank { rank: number; total_usd: number; apps: AppEntry[]; nombre: string }
interface RankingData {
  ok: boolean; ranking: RankingEntry[]; userRank: UserRank | null
  monthStart: string; totalParticipants: number
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const APP_COLORS: Record<string, string> = {
  Waha:  'rgba(6,182,212,0.2) 1px solid rgba(6,182,212,0.4) #67e8f9',
  Layla: 'rgba(236,72,153,0.2) 1px solid rgba(236,72,153,0.4) #f9a8d4',
  Howdy: 'rgba(16,185,129,0.2) 1px solid rgba(16,185,129,0.4) #6ee7b7',
}

const PALETTES: [string,string][] = [
  ['#f472b6','#a855f7'],['#fb923c','#f43f5e'],['#34d399','#06b6d4'],
  ['#818cf8','#c084fc'],['#facc15','#fb923c'],['#2dd4bf','#818cf8'],
  ['#f9a8d4','#c084fc'],['#60a5fa','#34d399'],['#a78bfa','#f472b6'],
  ['#fcd34d','#f9a8d4'],['#86efac','#34d399'],['#fda4af','#fb7185'],
]

function getColors(name: string): [string,string] {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const CSS = `
  @keyframes sparkle-rise { 0%{transform:translateY(100vh) rotate(0deg) scale(0.5);opacity:0} 5%{opacity:1;transform:translateY(90vh) rotate(30deg) scale(1)} 90%{opacity:0.7} 100%{transform:translateY(-10vh) rotate(720deg) scale(0.3);opacity:0} }
  @keyframes star-blink { 0%,100%{opacity:0.15;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.3)} }
  @keyframes shimmer-text { 0%{background-position:0%} 100%{background-position:300%} }
  @keyframes slide-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px var(--glow),0 4px 30px var(--glow2)} 50%{box-shadow:0 0 40px var(--glow),0 8px 60px var(--glow2),0 0 80px var(--glow)} }
  @keyframes trophy-float { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  .spark { position:absolute; animation: sparkle-rise linear infinite; pointer-events:none; font-size:14px; will-change:transform; }
  .blink-star { position:absolute; animation: star-blink ease-in-out infinite; pointer-events:none; color:rgba(255,255,255,0.6); font-size:10px; }
  .card-in { animation: slide-up 0.5s ease both; }
  .rank-hover:hover { transform: translateX(4px) scale(1.01); transition: transform 0.2s ease; }
`

function Sparks() {
  const sparks = [
    {l:'4%',d:'0s',t:'9s',e:'✨'},{l:'12%',d:'1.8s',t:'12s',e:'⭐'},
    {l:'22%',d:'3.2s',t:'10s',e:'💫'},{l:'33%',d:'0.6s',t:'13s',e:'✨'},
    {l:'44%',d:'2.4s',t:'11s',e:'🌟'},{l:'55%',d:'4.1s',t:'9s',e:'✨'},
    {l:'64%',d:'1.1s',t:'14s',e:'⭐'},{l:'75%',d:'2.9s',t:'10s',e:'💫'},
    {l:'85%',d:'3.7s',t:'12s',e:'✨'},{l:'93%',d:'0.9s',t:'11s',e:'🌟'},
  ]
  const stars = [
    {t:'7%',l:'2%',d:'0s',du:'2.1s'},{t:'18%',l:'95%',d:'0.8s',du:'2.8s'},
    {t:'35%',l:'5%',d:'1.5s',du:'1.9s'},{t:'52%',l:'97%',d:'0.3s',du:'3.2s'},
    {t:'68%',l:'1%',d:'2s',du:'2.4s'},{t:'82%',l:'91%',d:'1.1s',du:'2s'},
    {t:'12%',l:'48%',d:'0.5s',du:'1.7s'},{t:'88%',l:'52%',d:'1.8s',du:'2.6s'},
  ]
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {sparks.map((s,i)=>(
        <div key={i} className="spark" style={{left:s.l,bottom:'-5%',animationDelay:s.d,animationDuration:s.t}}>{s.e}</div>
      ))}
      {stars.map((s,i)=>(
        <div key={i} className="blink-star" style={{top:s.t,left:s.l,animationDelay:s.d,animationDuration:s.du}}>✦</div>
      ))}
    </div>
  )
}

function Avatar({ nombre, size = 56 }: { nombre: string; size?: number }) {
  const [c1, c2] = getColors(nombre)
  const seed = encodeURIComponent((nombre.replace(/\s+/g,'').slice(0,20)) || 'girl')
  const letter = (nombre.replace(/[^\p{L}]/gu,'')[0] ?? '?').toUpperCase()
  const r = Math.min(size * 0.28, 16)
  return (
    <div style={{
      width:size, height:size, borderRadius: r,
      background:`linear-gradient(135deg,${c1},${c2})`,
      boxShadow:`0 4px 20px ${c1}66`,
      flexShrink:0, position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <img
        src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=transparent`}
        alt={nombre}
        style={{position:'absolute',bottom:-3,width:'88%',height:'88%',objectFit:'cover'}}
        onError={e=>{(e.target as HTMLImageElement).style.display='none'}}
      />
      <span style={{
        position:'absolute', color:'rgba(255,255,255,0.25)', fontWeight:900,
        fontSize:size*0.35, fontFamily:'system-ui',
      }}>{letter}</span>
    </div>
  )
}

function AppPill({ app }: { app: AppEntry }) {
  const styles: Record<string,[string,string]> = {
    Waha:  ['rgba(6,182,212,0.15)','rgba(6,182,212,0.4)'],
    Layla: ['rgba(236,72,153,0.15)','rgba(236,72,153,0.4)'],
    Howdy: ['rgba(16,185,129,0.15)','rgba(16,185,129,0.4)'],
  }
  const [bg, border] = styles[app.app_name] ?? ['rgba(168,85,247,0.15)','rgba(168,85,247,0.4)']
  const colors: Record<string,string> = { Waha:'#67e8f9', Layla:'#f9a8d4', Howdy:'#6ee7b7' }
  const col = colors[app.app_name] ?? '#d8b4fe'
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background:bg, border:`1px solid ${border}`,
      color:col, padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700,
    }}>
      {app.app_name} <span style={{opacity:0.5}}>·</span> ${fmt(app.usd)}
    </span>
  )
}

const PODIUM_GRAD = [
  'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)',
  'linear-gradient(135deg,#e2e8f0,#cbd5e1,#94a3b8)',
  'linear-gradient(135deg,#d97706,#b45309,#92400e)',
]
const PODIUM_GLOW = ['rgba(251,191,36,0.5)','rgba(148,163,184,0.35)','rgba(180,83,9,0.4)']
const PODIUM_H = [90, 60, 40]
const MEDALS = ['🥇','🥈','🥉']

function PodiumCard({ entry, myId }: { entry: RankingEntry; myId?: string }) {
  const isMe = myId && entry.user_id === myId
  const idx = entry.rank - 1
  return (
    <div style={{flex:1,minWidth:0,textAlign:'center'}}>
      <div style={{display:'flex',justifyContent:'center',marginBottom:6,position:'relative'}}>
        <Avatar nombre={entry.nombre} size={entry.rank===1?76:60} />
        {isMe && (
          <span style={{
            position:'absolute',top:-6,right:-6,background:'#a855f7',
            borderRadius:999,padding:'2px 5px',fontSize:8,fontWeight:900,color:'white',
            border:'1px solid rgba(255,255,255,0.3)',
          }}>TÚ</span>
        )}
        {entry.rank === 1 && (
          <span style={{position:'absolute',top:-14,fontSize:18}}>👑</span>
        )}
      </div>
      <div style={{fontSize:entry.rank===1?24:18,marginBottom:3}}>{MEDALS[idx]}</div>
      <p style={{
        fontWeight:900, color:'white',
        fontSize:entry.rank===1?13:11,
        margin:'0 0 3px',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        padding:'0 4px',
      }}>{entry.nombre}</p>
      <p style={{
        background:PODIUM_GRAD[idx],WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
        fontWeight:900,fontSize:entry.rank===1?19:15,margin:'0 0 6px',
        fontVariantNumeric:'tabular-nums',
      }}>${fmt(entry.total_usd)}</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',marginBottom:8,padding:'0 2px'}}>
        {entry.apps.map(a=><AppPill key={a.app_name} app={a}/>)}
      </div>
      <div style={{
        background:PODIUM_GRAD[idx],
        boxShadow:`0 -6px 30px ${PODIUM_GLOW[idx]}`,
        borderRadius:'10px 10px 0 0',
        height:PODIUM_H[idx],
        display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        <span style={{color:'rgba(255,255,255,0.7)',fontWeight:900,fontSize:22}}>#{entry.rank}</span>
      </div>
    </div>
  )
}

export default function Ranking() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = (profile as {is_admin?:boolean}|null)?.is_admin ?? false

  async function load() {
    setLoading(true); setError(null)
    try {
      const url = user ? `${API}/api/ranking?user_id=${encodeURIComponent(user.id)}` : `${API}/api/ranking`
      const r = await fetch(url)
      if (!r.ok) throw new Error(await r.text())
      setData(await r.json() as RankingData)
    } catch(e) { setError(e instanceof Error ? e.message : 'Error cargando ranking') }
    finally { setLoading(false) }
  }

  async function resetRanking() {
    if (!confirm('¿Seguro que quieres borrar todo el ranking? Esta acción no se puede deshacer.')) return
    setResetting(true)
    try {
      const r = await fetch(`${API}/api/ranking/reset`,{method:'POST',headers:{'Content-Type':'application/json'}})
      if (!r.ok) throw new Error(await r.text())
      await load()
    } catch(e) { alert('Error: '+(e instanceof Error?e.message:'unknown')) }
    finally { setResetting(false) }
  }

  useEffect(()=>{load()}, [user?.id])

  const monthLabel = data?.monthStart ? (()=>{
    const d = new Date(data.monthStart)
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  })() : ''

  // Podium order: 2nd, 1st, 3rd (visual podium layout)
  const top3 = data?.ranking.slice(0,3) ?? []
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as RankingEntry[]
  const rest = data?.ranking.slice(3) ?? []
  const userInTop10 = data?.userRank ? data.userRank.rank <= 10 : false

  return (
    <div style={{
      minHeight:'100vh', position:'relative', overflow:'hidden',
      background:'linear-gradient(180deg, #07070f 0%, #0c0520 45%, #07070f 100%)',
      color:'white',
    }}>
      <style>{CSS}</style>
      <Sparks />

      {/* Radial glow background blobs */}
      <div style={{position:'fixed',top:'10%',left:'50%',transform:'translateX(-50%)',width:600,height:400,background:'radial-gradient(ellipse,rgba(168,85,247,0.06),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',top:'60%',left:'20%',width:300,height:300,background:'radial-gradient(ellipse,rgba(251,191,36,0.05),transparent 70%)',pointerEvents:'none',zIndex:0}} />
      <div style={{position:'fixed',top:'40%',right:'10%',width:250,height:250,background:'radial-gradient(ellipse,rgba(236,72,153,0.04),transparent 70%)',pointerEvents:'none',zIndex:0}} />

      <div style={{maxWidth:680,margin:'0 auto',padding:'40px 16px 100px',position:'relative',zIndex:1}}>

        {/* ── HEADER ── */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:88,height:88,borderRadius:28,marginBottom:18,
            background:'linear-gradient(135deg,rgba(251,191,36,0.25),rgba(245,158,11,0.08))',
            border:'1px solid rgba(251,191,36,0.3)',
            boxShadow:'0 0 50px rgba(251,191,36,0.2),0 0 100px rgba(251,191,36,0.08)',
            animation:'trophy-float 4s ease-in-out infinite',
            fontSize:44,
          }}>🏆</div>

          <h1 style={{
            fontSize:'clamp(30px,7vw,48px)',fontWeight:900,letterSpacing:'-1.5px',margin:'0 0 10px',
            background:'linear-gradient(90deg,#fde68a 0%,#fbbf24 25%,#f59e0b 50%,#fde68a 75%,#fbbf24 100%)',
            backgroundSize:'300% auto',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            animation:'shimmer-text 4s linear infinite',
          }}>Ranking del Mes</h1>

          {monthLabel && (
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,margin:'0 0 8px',fontWeight:600,letterSpacing:'0.1em'}}>
              ✦ {monthLabel} ✦
            </p>
          )}
          {data && data.totalParticipants > 0 && (
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:999,background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.15)'}}>
              <TrendingUp size={11} style={{color:'#a855f7'}} />
              <span style={{color:'rgba(255,255,255,0.25)',fontSize:11,fontWeight:600}}>
                {data.totalParticipants} streamers este mes
              </span>
            </div>
          )}
        </div>

        {/* Admin reset */}
        {isAdmin && (
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20}}>
            <button onClick={resetRanking} disabled={resetting} style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:12,cursor:'pointer',
              background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',
              color:'#f87171',fontSize:12,fontWeight:700,
              opacity:resetting?0.5:1,transition:'all 0.2s',
            }}>
              <RotateCcw size={13} style={{animation:resetting?'spin 1s linear infinite':'none'}} />
              {resetting ? 'Borrando...' : 'Borrar Ranking'}
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div style={{display:'flex',justifyContent:'center',padding:'80px 0'}}>
            <Loader2 size={44} style={{animation:'spin 1s linear infinite',color:'#a855f7',opacity:0.5}} />
          </div>
        )}

        {/* ── ERROR ── */}
        {!loading && error && (
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:20,padding:24,textAlign:'center'}}>
            <AlertCircle size={30} style={{color:'#f87171',marginBottom:8}} />
            <p style={{color:'#fca5a5',fontSize:13,margin:'0 0 12px'}}>{error}</p>
            <button onClick={load} style={{color:'#f87171',fontSize:12,fontWeight:700,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Reintentar</button>
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && !error && data && data.ranking.length === 0 && (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <div style={{fontSize:72,marginBottom:20,filter:'drop-shadow(0 0 20px rgba(251,191,36,0.3))'}}>🌟</div>
            <p style={{color:'rgba(255,255,255,0.45)',fontWeight:700,fontSize:18,margin:'0 0 8px'}}>El ranking aún está vacío</p>
            <p style={{color:'rgba(255,255,255,0.18)',fontSize:13}}>Aparecerá cuando se publique la primera nómina del mes ✨</p>
          </div>
        )}

        {/* ── PODIUM ── */}
        {!loading && !error && top3.length > 0 && (
          <div style={{
            background:'linear-gradient(135deg,rgba(168,85,247,0.07),rgba(251,191,36,0.04))',
            border:'1px solid rgba(251,191,36,0.18)',borderRadius:28,
            padding:'28px 12px 0',marginBottom:20,
            boxShadow:'0 8px 60px rgba(0,0,0,0.4),0 0 40px rgba(251,191,36,0.05)',
          }}>
            <p style={{
              textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:9,
              fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',marginBottom:22,
            }}>✦ TOP 3 DEL MES ✦</p>
            <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
              {podiumOrder.map(e=>(
                <PodiumCard key={e.user_id} entry={e} myId={user?.id} />
              ))}
              {podiumOrder.length < 3 && Array.from({length:3-podiumOrder.length}).map((_,i)=>(
                <div key={i} style={{flex:1}} />
              ))}
            </div>
          </div>
        )}

        {/* ── RANKS 4-10 ── */}
        {!loading && !error && rest.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {rest.map((entry,idx)=>{
              const isMe = user && entry.user_id === user.id
              const [c1,c2] = getColors(entry.nombre)
              return (
                <div key={entry.user_id} className="card-in rank-hover" style={{
                  animationDelay:`${idx*0.06}s`,
                  background: isMe
                    ? 'linear-gradient(135deg,rgba(168,85,247,0.14),rgba(139,92,246,0.07))'
                    : 'rgba(13,13,30,0.85)',
                  border: isMe ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius:18, padding:'14px 16px',
                  display:'flex', alignItems:'center', gap:12,
                  backdropFilter:'blur(10px)',
                  boxShadow: isMe ? '0 0 30px rgba(168,85,247,0.15),inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                  transition:'transform 0.2s,box-shadow 0.2s',
                }}>
                  {/* Rank badge */}
                  <div style={{
                    width:38,height:38,borderRadius:11,flexShrink:0,
                    background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.18)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:900,fontSize:13,color:'#c084fc',
                  }}>#{entry.rank}</div>

                  <Avatar nombre={entry.nombre} size={44} />

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:5}}>
                      <p style={{fontWeight:800,fontSize:14,color:'white',margin:0}}>{entry.nombre}</p>
                      {isMe && (
                        <span style={{
                          background:'rgba(168,85,247,0.3)',border:'1px solid rgba(168,85,247,0.45)',
                          color:'#d8b4fe',fontSize:9,fontWeight:900,padding:'2px 6px',borderRadius:999,
                        }}>TÚ</span>
                      )}
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {entry.apps.map(a=><AppPill key={a.app_name} app={a}/>)}
                    </div>
                  </div>

                  <div style={{textAlign:'right',flexShrink:0}}>
                    <p style={{
                      fontWeight:900,fontSize:20,fontVariantNumeric:'tabular-nums',margin:0,
                      background:`linear-gradient(135deg,${c1},${c2})`,
                      WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                    }}>${fmt(entry.total_usd)}</p>
                    <p style={{color:'rgba(255,255,255,0.18)',fontSize:10,margin:'2px 0 0'}}>total mes</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── USER RANK (outside top 10) ── */}
        {!loading && !error && user && data?.userRank && !userInTop10 && (
          <div style={{marginTop:28}}>
            <div style={{
              background:'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(139,92,246,0.05))',
              border:'1px solid rgba(168,85,247,0.3)',borderRadius:22,overflow:'hidden',
              boxShadow:'0 4px 40px rgba(168,85,247,0.12)',
            }}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(168,85,247,0.12)',display:'flex',alignItems:'center',gap:8}}>
                <TrendingUp size={13} style={{color:'#a855f7'}} />
                <p style={{color:'#c084fc',fontSize:10,fontWeight:900,letterSpacing:'0.18em',textTransform:'uppercase',margin:0}}>
                  Tu posición este mes
                </p>
              </div>
              <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:40,height:40,borderRadius:12,flexShrink:0,
                  background:'rgba(168,85,247,0.12)',border:'1px solid rgba(168,85,247,0.28)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:13,color:'#c084fc',
                }}>#{data.userRank.rank}</div>
                <Avatar nombre={data.userRank.nombre} size={44} />
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:800,fontSize:14,color:'white',margin:'0 0 5px'}}>{data.userRank.nombre}</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {data.userRank.apps.map(a=><AppPill key={a.app_name} app={a}/>)}
                  </div>
                </div>
                <p style={{fontWeight:900,fontSize:22,color:'#4ade80',fontVariantNumeric:'tabular-nums'}}>
                  ${fmt(data.userRank.total_usd)}
                </p>
              </div>
              <div style={{padding:'0 16px 14px'}}>
                <p style={{color:'rgba(255,255,255,0.22)',fontSize:12,margin:0}}>
                  💪 Estás en el puesto #{data.userRank.rank} de {data.totalParticipants} participantes. ¡Sigue adelante!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && !error && data && data.ranking.length > 0 && (
          <p style={{textAlign:'center',color:'rgba(255,255,255,0.1)',fontSize:10,marginTop:44,lineHeight:1.7}}>
            El ranking acumula ganancias de todas las nóminas del mes ✦ Se reinicia al borrar el ranking o manualmente
          </p>
        )}

      </div>
    </div>
  )
}
