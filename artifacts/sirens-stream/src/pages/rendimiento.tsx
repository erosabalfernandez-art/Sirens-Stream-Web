import { useState, useEffect, useMemo } from 'react'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLocation } from 'wouter'
  import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'
  import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  } from 'recharts'

  const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')

  interface PubComm {
    semana: string
    commission_usd: number
    app_name: string
  }

  interface WeekData {
    semana: string
    usd: number
    cup_efectivo: number
    cup_transferencia: number
  }

  function fmt(n: number) {
    return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtCUP(n: number) {
    return Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })
  }

  function CustomTooltip({ active, payload, label, exchangeRates, payMethod }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; exchangeRates: Record<string,number>; payMethod: string | null }) {
    if (!active || !payload?.length) return null
    const usd = payload[0]?.value ?? 0
    const rate = payMethod ? (exchangeRates[`${payMethod}_agent`] ?? 0) : 0
    const cup = usd * rate
    return (
      <div className="bg-[#12121f] border border-purple-500/20 rounded-xl p-3 text-sm shadow-xl">
        <p className="text-white/40 text-xs font-bold mb-1">{label}</p>
        <p className="text-green-400 font-extrabold">${fmt(usd)} USD</p>
        {rate > 0 && cup > 0 && (
          <p className={`font-bold text-xs mt-0.5 ${payMethod === 'efectivo' ? 'text-amber-400' : 'text-blue-400'}`}>
            {fmtCUP(cup)} CUP {payMethod === 'efectivo' ? 'efectivo' : 'transferencia'}
          </p>
        )}
      </div>
    )
  }

  export default function Rendimiento() {
    const { profile, loading } = useAuth()
    const [, navigate] = useLocation()
    const [commissions, setCommissions] = useState<PubComm[]>([])
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
    const [dataLoading, setDataLoading] = useState(true)
    const [agentPayMethod, setAgentPayMethod] = useState<'efectivo' | 'transferencia' | null>(null)

    useEffect(() => {
      if (!loading && profile !== undefined && !profile?.is_agent && !profile?.is_colider) navigate('/')
    }, [loading, profile])

    useEffect(() => {
      if (profile?.id) {
        const saved = localStorage.getItem(`apm_${profile.id}`)
        if (saved === 'efectivo' || saved === 'transferencia') setAgentPayMethod(saved as 'efectivo' | 'transferencia')
        fetchData()
      }
    }, [profile])

    async function fetchData() {
      if (!profile?.id) return
      setDataLoading(true)
      try {
        const res = await fetch(`${API}/api/agent/published-commissions?agent_id=${profile.id}`)
        if (res.ok) {
          const data = await res.json() as { commissions?: PubComm[]; exchange_rates?: Record<string,number> }
          setCommissions(data.commissions ?? [])
          if (data.exchange_rates) setExchangeRates(data.exchange_rates)
        }
      } catch {}
      setDataLoading(false)
    }

    const weeklyData = useMemo((): WeekData[] => {
      const map = new Map<string, number>()
      for (const c of commissions) {
        if (c.semana) map.set(c.semana, (map.get(c.semana) ?? 0) + (Number(c.commission_usd) || 0))
      }
      const rateEf = exchangeRates['efectivo_agent'] ?? 0
      const rateTr = exchangeRates['transferencia_agent'] ?? 0
      return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-13)
        .map(([semana, usd]) => ({
          semana,
          usd,
          cup_efectivo: usd * rateEf,
          cup_transferencia: usd * rateTr,
        }))
    }, [commissions, exchangeRates])

    const totalUSD = weeklyData.reduce((s, w) => s + w.usd, 0)
    const avgUSD = weeklyData.length > 0 ? totalUSD / weeklyData.length : 0
    const bestWeek = weeklyData.reduce(
      (best, w) => w.usd > best.usd ? w : best,
      { semana: '', usd: 0, cup_efectivo: 0, cup_transferencia: 0 }
    )
    const rate = agentPayMethod ? (exchangeRates[`${agentPayMethod}_agent`] ?? 0) : 0

    if (loading || (profile !== undefined && !profile?.is_agent && !profile?.is_colider)) return null

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">

          <button onClick={() => navigate('/agente')}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">Volver al panel</span>
          </button>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-3 py-1 mb-3">
              <BarChart2 className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Rendimiento</span>
            </div>
            <h1 className="text-2xl font-black text-white">Tu rendimiento semanal</h1>
            <p className="text-white/35 text-sm mt-1">Últimos 3 meses · Comisiones por semana</p>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-3xl p-12 text-center">
              <BarChart2 className="w-10 h-10 text-purple-500/30 mx-auto mb-3" />
              <p className="text-white/35 font-semibold">Sin historial aún</p>
              <p className="text-white/20 text-sm mt-1">Aquí aparecerán tus comisiones una vez que el admin las publique.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-4">
                  <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                  <p className="text-white font-extrabold text-lg">${fmt(totalUSD)}</p>
                  <p className="text-white/25 text-xs">USD acumulado</p>
                </div>
                <div className="bg-[#0d0d1e] border border-amber-500/10 rounded-2xl p-4">
                  <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-1">Promedio</p>
                  <p className="text-amber-400 font-extrabold text-lg">${fmt(avgUSD)}</p>
                  <p className="text-white/25 text-xs">USD por semana</p>
                </div>
                <div className="bg-[#0d0d1e] border border-green-500/10 rounded-2xl p-4">
                  <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-1">Mejor semana</p>
                  <p className="text-green-400 font-extrabold text-lg">${fmt(bestWeek.usd)}</p>
                  <p className="text-white/25 text-xs truncate">{bestWeek.semana || '—'}</p>
                </div>
              </div>

              <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-3xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <p className="text-white font-bold text-sm">Comisión en USD por semana</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
                    <XAxis dataKey="semana" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip content={<CustomTooltip exchangeRates={exchangeRates} payMethod={agentPayMethod} />} />
                    <Bar dataKey="usd" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {weeklyData.map((entry, i) => {
                        const isLatest = i === weeklyData.length - 1
                        const isBest = entry.semana === bestWeek.semana && bestWeek.usd > 0
                        return <Cell key={i} fill={isLatest ? '#22c55e' : isBest ? '#f59e0b' : '#7c3aed'} fillOpacity={isLatest || isBest ? 1 : 0.6} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span className="text-white/35 text-xs">Semana actual</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-white/35 text-xs">Mejor semana</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-700" /><span className="text-white/35 text-xs">Semanas anteriores</span></div>
                </div>
              </div>

              {(exchangeRates['efectivo_agent'] ?? 0) > 0 && (
                <div className="bg-[#0d0d1e] border border-amber-500/10 rounded-3xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-400 text-base">💵</span>
                    <p className="text-white font-bold text-sm">Equivalente en CUP · Efectivo</p>
                    <span className="text-white/25 text-xs ml-auto">×{exchangeRates['efectivo_agent']}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,158,11,0.08)" />
                      <XAxis dataKey="semana" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                      <Tooltip formatter={(v: number) => [`${fmtCUP(v)} CUP`, 'Efectivo']} contentStyle={{ background: '#12121f', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }} itemStyle={{ color: '#f59e0b' }} />
                      <Bar dataKey="cup_efectivo" fill="#f59e0b" fillOpacity={0.75} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {(exchangeRates['transferencia_agent'] ?? 0) > 0 && (
                <div className="bg-[#0d0d1e] border border-blue-500/10 rounded-3xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-blue-400 text-base">🏦</span>
                    <p className="text-white font-bold text-sm">Equivalente en CUP · Transferencia</p>
                    <span className="text-white/25 text-xs ml-auto">×{exchangeRates['transferencia_agent']}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                      <XAxis dataKey="semana" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                      <Tooltip formatter={(v: number) => [`${fmtCUP(v)} CUP`, 'Transferencia']} contentStyle={{ background: '#12121f', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }} itemStyle={{ color: '#60a5fa' }} />
                      <Bar dataKey="cup_transferencia" fill="#3b82f6" fillOpacity={0.75} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-[#0d0d1e] border border-purple-500/10 rounded-3xl p-5">
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">Historial semana a semana</p>
                <div className="space-y-2">
                  {[...weeklyData].reverse().map((w, i) => {
                    const isLatest = i === 0
                    const origIdx = weeklyData.length - 1 - i
                    const prev = origIdx > 0 ? weeklyData[origIdx - 1] : null
                    const trend = prev ? w.usd - prev.usd : 0
                    return (
                      <div key={w.semana} className={`flex items-center justify-between p-3 rounded-xl ${isLatest ? 'bg-amber-500/8 border border-amber-500/20' : 'bg-white/2'}`}>
                        <div>
                          <p className={`text-sm font-bold ${isLatest ? 'text-amber-300' : 'text-white/70'}`}>
                            {w.semana}{isLatest && <span className="text-xs font-normal text-amber-400/60 ml-1">· actual</span>}
                          </p>
                          {rate > 0 && w.usd > 0 && (
                            <p className={`text-xs mt-0.5 ${agentPayMethod === 'efectivo' ? 'text-amber-400/60' : 'text-blue-400/60'}`}>
                              {fmtCUP(w.usd * rate)} CUP
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isLatest && prev && (
                            trend > 0
                              ? <TrendingUp className="w-3 h-3 text-green-400" />
                              : trend < 0
                                ? <TrendingDown className="w-3 h-3 text-red-400" />
                                : null
                          )}
                          <p className={`font-extrabold text-base ${isLatest ? 'text-amber-400' : 'text-white'}`}>${fmt(w.usd)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
  