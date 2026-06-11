import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Trophy, Medal, Crown, Star, Loader2, RotateCcw, AlertCircle, TrendingUp } from 'lucide-react'

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

interface AppEntry {
  app_name: string
  usd: number
}

interface RankingEntry {
  rank: number
  user_id: string
  nombre: string
  nombre_real: string | null
  total_usd: number
  apps: AppEntry[]
}

interface UserRank {
  rank: number
  total_usd: number
  apps: AppEntry[]
  nombre: string
}

interface RankingData {
  ok: boolean
  ranking: RankingEntry[]
  userRank: UserRank | null
  monthStart: string
  totalParticipants: number
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const APP_COLORS: Record<string, string> = {
  Waha:   'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Layla:  'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Howdy:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/40 shrink-0">
      <Crown className="w-6 h-6 text-white" />
    </div>
  )
  if (rank === 2) return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-400/25 shrink-0">
      <Medal className="w-6 h-6 text-white" />
    </div>
  )
  if (rank === 3) return (
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-700/30 shrink-0">
      <Medal className="w-6 h-6 text-white" />
    </div>
  )
  return (
    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
      <span className="text-purple-300 font-extrabold text-base">#{rank}</span>
    </div>
  )
}

function AppPill({ app }: { app: AppEntry }) {
  const cls = APP_COLORS[app.app_name] ?? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {app.app_name}&nbsp;<span className="opacity-70">·</span>&nbsp;${fmt(app.usd)}
    </span>
  )
}

export default function Ranking() {
  const { user, profile } = useAuth()
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin ?? false

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const url = user
        ? `${API}/api/ranking?user_id=${encodeURIComponent(user.id)}`
        : `${API}/api/ranking`
      const r = await fetch(url)
      if (!r.ok) throw new Error(await r.text())
      const d = await r.json() as RankingData
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando el ranking')
    } finally {
      setLoading(false)
    }
  }

  async function resetRanking() {
    if (!confirm('¿Seguro que quieres borrar todo el progreso del ranking? Esta acción no se puede deshacer.')) return
    setResetting(true)
    try {
      const r = await fetch(`${API}/api/ranking/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!r.ok) throw new Error(await r.text())
      await load()
    } catch (e) {
      alert('Error al resetear: ' + (e instanceof Error ? e.message : 'unknown'))
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const monthLabel = data?.monthStart ? (() => {
    const d = new Date(data.monthStart)
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  })() : ''

  const userInTop10 = data?.userRank ? data.userRank.rank <= 10 : false

  return (
    <div className="min-h-screen bg-[#07070f] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-500/25 mb-5 shadow-xl shadow-yellow-500/10">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500 bg-clip-text text-transparent leading-tight">
            Ranking del Mes
          </h1>
          {monthLabel && (
            <p className="text-white/40 text-sm mt-2 font-medium">{monthLabel}</p>
          )}
          {data && data.totalParticipants > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-white/30 text-xs">{data.totalParticipants} participantes este mes</span>
            </div>
          )}
        </div>

        {/* Admin reset button */}
        {isAdmin && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={resetRanking}
              disabled={resetting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 transition-all text-sm font-bold disabled:opacity-40"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Borrando...' : 'Borrar Ranking'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400 opacity-60" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-rose-300 text-sm">{error}</p>
            <button onClick={load} className="mt-3 text-xs font-bold text-rose-300 underline">Reintentar</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data && data.ranking.length === 0 && (
          <div className="text-center py-20">
            <Star className="w-14 h-14 text-yellow-400/20 mx-auto mb-5" />
            <p className="text-white/50 font-bold text-lg">Ranking sin resultados aún</p>
            <p className="text-white/25 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
              El ranking aparecerá cuando se publique la primera nómina del mes.
            </p>
          </div>
        )}

        {/* Top 10 */}
        {!loading && !error && data && data.ranking.length > 0 && (
          <div className="space-y-3">
            {data.ranking.map((entry) => {
              const isCurrentUser = user && entry.user_id === user.id
              return (
                <div
                  key={entry.user_id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isCurrentUser
                      ? 'ring-2 ring-purple-500/40'
                      : ''
                  } ${
                    entry.rank === 1
                      ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30'
                      : entry.rank === 2
                      ? 'bg-gradient-to-r from-slate-500/8 to-slate-600/5 border-slate-400/20'
                      : entry.rank === 3
                      ? 'bg-gradient-to-r from-amber-700/8 to-amber-800/5 border-amber-700/20'
                      : 'bg-[#0d0d1e] border-purple-500/10'
                  }`}
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    <RankBadge rank={entry.rank} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-extrabold text-base leading-tight ${
                          entry.rank === 1 ? 'text-yellow-300' :
                          entry.rank === 2 ? 'text-slate-200' :
                          entry.rank === 3 ? 'text-amber-500' : 'text-white'
                        }`}>
                          {entry.nombre}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-bold">Tú</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {entry.apps.map(app => <AppPill key={app.app_name} app={app} />)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-extrabold tabular-nums ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-slate-300' :
                        entry.rank === 3 ? 'text-amber-500' : 'text-green-400'
                      }`}>
                        ${fmt(entry.total_usd)}
                      </p>
                      <p className="text-white/25 text-xs mt-0.5">total mes</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Worker's personal rank — shown only when NOT in top 10 */}
        {!loading && !error && user && data?.userRank && !userInTop10 && (
          <div className="mt-8">
            <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/25 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-purple-500/15 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <p className="text-purple-300 text-xs font-extrabold uppercase tracking-wider">Tu posición este mes</p>
              </div>
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <span className="text-purple-300 font-extrabold text-base">#{data.userRank.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-base text-white">{data.userRank.nombre}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.userRank.apps.map(app => <AppPill key={app.app_name} app={app} />)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-green-400 tabular-nums">${fmt(data.userRank.total_usd)}</p>
                  <p className="text-white/25 text-xs mt-0.5">total mes</p>
                </div>
              </div>
              <div className="px-5 pb-4">
                <p className="text-white/30 text-xs leading-relaxed">
                  ¡Sigue adelante! Llegarás al top 10 cuando superes a la chica en el puesto #10.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && data && data.ranking.length > 0 && (
          <p className="text-center text-white/15 text-xs mt-10 leading-relaxed">
            El ranking acumula ganancias de todas las nóminas del mes y se reinicia automáticamente al inicio de cada mes.
          </p>
        )}

      </div>
    </div>
  )
}
