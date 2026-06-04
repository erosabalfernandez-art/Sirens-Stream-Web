import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, CheckCircle2, Smartphone, Clock, DollarSign, MessageCircle, ArrowRight } from "lucide-react";

const LAYLA_COINS = [
  { monedas: "15,500", usd: "$1" },
  { monedas: "155,000", usd: "$10" },
  { monedas: "465,000", usd: "$30" },
  { monedas: "775,000", usd: "$50" },
  { monedas: "1,240,000", usd: "$80" },
  { monedas: "1,550,500", usd: "$100" },
  { monedas: "3,101,000", usd: "$200" },
];

const LAYLA_PRICES = [
  { concepto: "Ticket chat mensajes", monedas: 45 },
  { concepto: "SayHi", monedas: 14 },
  { concepto: "Enviar mensaje", monedas: 90 },
];

const apps = [
  {
    id: "waha",
    color: "#ef4444",
    colorLight: "rgba(239,68,68,0.12)",
    name: "Waha",
    tagline: "Mensajes · Salas de Audio · Videollamadas",
    badge: "Retiro semanal",
    badgeColor: "bg-red-500/15 text-red-300 border-red-500/20",
    desc: "Plataforma de interacción completa con usuarios de todo el mundo. Compatible con múltiples modos de comunicación incluyendo mensajes de texto, salas de audio grupales y videollamadas opcionales.",
    specs: [
      { icon: Smartphone, label: "Android", val: "Waha" },
      { icon: Smartphone, label: "iOS", val: "Liyo" },
      { icon: Clock, label: "Tiempo diario", val: "+4 horas" },
      { icon: DollarSign, label: "Meta mínima", val: "$2 USD" },
      { icon: DollarSign, label: "Retiro", val: "Semanal (no acumulable)" },
      { icon: MessageCircle, label: "Modo", val: "Mensajes, Salas Audio, Videollamadas" },
    ],
    requisitos: ["Mayor de 18 años", "WiFi estable o datos móviles", "4–5 horas disponibles al día", "Actitud positiva y responsable"],
    ganancias: [
      { tipo: "Usuarios VIP", val: "70 diamantes por mensaje" },
      { tipo: "Usuarios Free", val: "5 puntos por mensaje" },
    ],
    coins: null,
    precios: null,
  },
  {
    id: "layla",
    color: "#8b5cf6",
    colorLight: "rgba(139,92,246,0.12)",
    name: "Layla",
    tagline: "Solo Mensajes · Ganancias acumulables · Horario libre",
    badge: "Retiro acumulable",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/20",
    desc: "Plataforma de mensajería enfocada en la interacción por texto. Sin obligación de videollamada, con horarios completamente flexibles y retiro acumulable desde $10 USD. Ideal para quienes buscan trabajar a su propio ritmo.",
    specs: [
      { icon: Smartphone, label: "Android", val: "Layla" },
      { icon: Smartphone, label: "iOS", val: "Nivi" },
      { icon: Clock, label: "Tiempo diario", val: "Flexible" },
      { icon: DollarSign, label: "Meta mínima", val: "$10 USD" },
      { icon: DollarSign, label: "Retiro", val: "Acumulable" },
      { icon: MessageCircle, label: "Modo", val: "Solo Mensajes (sin videollamada)" },
    ],
    requisitos: ["Mayor de 18 años", "Smartphone con buena cámara", "WiFi / datos estables", "Compromiso y responsabilidad"],
    ganancias: null,
    coins: LAYLA_COINS,
    precios: LAYLA_PRICES,
  },
];

export default function Apps() {
  const [open, setOpen] = useState<string | null>("waha");

  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">
      {/* Header */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-blue-600/6 blur-[80px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Plataformas disponibles</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Catálogo de <span className="gradient-text">Apps</span></h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Trabajamos únicamente con las mejores plataformas internacionales verificadas. Cada app ha sido seleccionada para garantizar pagos seguros y el mayor potencial de ganancias.
          </p>
        </div>
      </section>

      {/* Apps accordion */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-5 space-y-4">
          {apps.map((app) => {
            const isOpen = open === app.id;
            return (
              <div key={app.id} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.08)]" : "border-blue-500/10"}`}>
                {/* Header */}
                <button className="w-full flex items-start gap-4 p-6 text-left hover:bg-white/2 transition-colors"
                  onClick={() => setOpen(isOpen ? null : app.id)}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-bold"
                    style={{ background: app.colorLight, border: `1px solid ${app.color}33`, color: app.color }}>
                    {app.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h2 className="font-extrabold text-xl">{app.name}</h2>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${app.badgeColor}`}>{app.badge}</span>
                    </div>
                    <p className="text-white/45 text-sm">{app.tagline}</p>
                    <p className="text-white/30 text-xs mt-2 line-clamp-2">{app.desc}</p>
                  </div>
                  <div className="shrink-0 mt-1 text-white/30">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Content */}
                {isOpen && (
                  <div className="border-t border-blue-500/10 p-6 space-y-7">
                    {/* Description */}
                    <p className="text-white/55 text-sm leading-relaxed">{app.desc}</p>

                    {/* Specs grid */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Información General</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {app.specs.map((s, i) => (
                          <div key={i} className="bg-[#0a0a14] border border-blue-500/8 rounded-xl px-4 py-3">
                            <p className="text-white/30 text-xs mb-1 flex items-center gap-1.5">
                              <s.icon className="w-3 h-3" /> {s.label}
                            </p>
                            <p className="font-semibold text-sm text-white/85">{s.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Requisitos Esenciales</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {app.requisitos.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />{r}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Waha earnings */}
                    {app.ganancias && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Ganancias por Actividad</h3>
                        <div className="bg-[#0a0a14] border border-blue-500/8 rounded-xl overflow-hidden">
                          {app.ganancias.map((g, i) => (
                            <div key={i} className={`flex justify-between items-center px-4 py-3 text-sm ${i > 0 ? "border-t border-blue-500/8" : ""}`}>
                              <span className="text-white/55">{g.tipo}</span>
                              <span className="text-blue-300 font-bold">{g.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Layla coin table */}
                    {app.coins && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Conversión de Monedas → USD</h3>
                        <div className="bg-[#0a0a14] border border-blue-500/8 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-widest px-4 py-2.5 border-b border-blue-500/8">
                            <span>Monedas</span><span className="text-right">USD</span>
                          </div>
                          {app.coins.map((row, i) => (
                            <div key={i} className={`grid grid-cols-2 px-4 py-2.5 text-sm ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
                              <span className="text-white/60">{row.monedas}</span>
                              <span className="text-right text-blue-400 font-bold">{row.usd}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-blue-300 font-semibold">
                          Meta mínima de retiro: 155,000 monedas = $10 USD
                        </div>
                      </div>
                    )}

                    {/* Layla activity prices */}
                    {app.precios && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Precios por Actividad</h3>
                        <div className="bg-[#0a0a14] border border-blue-500/8 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-widest px-4 py-2.5 border-b border-blue-500/8">
                            <span>Concepto</span><span className="text-right">Monedas</span>
                          </div>
                          {app.precios.map((row, i) => (
                            <div key={i} className={`grid grid-cols-2 px-4 py-2.5 text-sm ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
                              <span className="text-white/60">{row.concepto}</span>
                              <span className="text-right text-blue-400 font-bold">{row.monedas}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto px-5 mt-8 text-center">
          <p className="text-white/40 text-sm mb-4">¿No sabes qué app elegir? Nuestro equipo te orienta sin compromiso</p>
          <Link href="/contacto"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            Asesoría Gratuita <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
