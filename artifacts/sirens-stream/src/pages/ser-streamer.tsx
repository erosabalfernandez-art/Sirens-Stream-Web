import { Link } from "wouter";
import { CheckCircle2, MessageCircle, Video, Radio, DollarSign, Shield, Smartphone, Users, Clock, ArrowRight, Star } from "lucide-react";

const activities = [
  { icon: MessageCircle, title: "Chat & Mensajes", desc: "Conversa de forma personalizada con usuarios de todo el mundo. Crea conexiones auténticas y genera ingresos por cada interacción." },
  { icon: Video, title: "Videollamadas", desc: "Interacción cara a cara en tiempo real. Transmite tu personalidad y conecta a un nivel más profundo con los usuarios." },
  { icon: Radio, title: "Salas de Audio / Lives", desc: "Transmisiones en vivo donde cantas, juegas, entretienen y construyes una comunidad fiel que te apoya." },
];

const benefits = [
  { icon: DollarSign, title: "Pagos Semanales Garantizados", desc: "Al finalizar cada semana procesamos tu pago de forma puntual. Múltiples métodos de cobro disponibles: Binance, Zelle, PayPal, Pix y más." },
  { icon: Shield, title: "Cero Inversión Inicial", desc: "No necesitas pagar absolutamente nada para empezar. Sin costos ocultos, sin cuotas, sin riesgos. Solo tu tiempo y ganas." },
  { icon: Smartphone, title: "Solo tu Celular desde Casa", desc: "Trabaja desde cualquier lugar con conexión a internet. Tu smartphone es toda la herramienta que necesitas. Tú defines tu horario." },
  { icon: Users, title: "Tutoras y Soporte 24/7", desc: "No estarás sola. Un equipo de expertas te guiará desde el primer día con capacitación, estrategias y soporte constante." },
  { icon: Clock, title: "Horarios 100% Flexibles", desc: "Trabaja las horas que quieras. Muchas de nuestras streamers compaginan este trabajo con estudios u otros empleos." },
  { icon: Star, title: "Bonos y Ascensos", desc: "Premiamos tu esfuerzo con bonos especiales por cumplimiento de metas y la posibilidad de convertirte en tutora o manager." },
];

const requirements = [
  "Ser mujer mayor de 18 años",
  "Smartphone con cámara de buena calidad",
  "Conexión WiFi estable o datos móviles",
  "Disponibilidad mínima de 4–5 horas diarias",
  "Actitud positiva, comprometida y responsable",
  "Sin experiencia previa — te capacitamos gratis",
];

export default function SerStreamer() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Únete como Streamer</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5">
            Tu celular es tu<br />
            <span className="gradient-text">herramienta de trabajo</span>
          </h1>
          <p className="text-white/55 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Buscamos mujeres mayores de 18 años interesadas en trabajar como streamers o chat hostess en apps internacionales. Sin inversión, sin experiencia previa, con ingresos reales en dólares desde casa.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contacto"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)]">
              Quiero Unirme <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/apps"
              className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider hover:bg-white/10 transition-colors">
              Ver Apps Disponibles
            </Link>
          </div>
        </div>
      </section>

      {/* What does a streamer do */}
      <section className="py-16 bg-[#0a0a16]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">¿Qué hace una Streamer o Chat Hostess?</h2>
            <p className="text-white/50 max-w-2xl mx-auto text-sm">
              Una streamer o chat hostess interactúa en tiempo real con usuarios de todo el mundo dentro de aplicaciones de videochat y mensajería. Su objetivo es entretener, acompañar y crear conexiones genuinas, generando ingresos con cada interacción.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activities.map((a, i) => (
              <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 card-hover">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
                  <a.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold mb-2">{a.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-blue-500/8 border border-blue-500/15 rounded-2xl p-5 text-sm text-white/50 text-center">
            Interactuarás con usuarios masculinos de distintos países. El trabajo es completamente digital, discreto y dentro de los límites marcados por cada plataforma. <span className="text-blue-400 font-medium">Tú decides hasta dónde llegas.</span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-[#07070f]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Beneficios de trabajar con Sirens Stream</h2>
            <p className="text-white/50">Todo lo que necesitas para empezar y crecer</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 card-hover">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
                  <b.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">{b.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements + CTA */}
      <section className="py-16 bg-[#0a0a16]">
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Requisitos para empezar</h2>
              <div className="space-y-3">
                {requirements.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0d0d1e] border border-blue-500/10 rounded-xl px-4 py-3.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="text-white/70 text-sm">{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/25 rounded-2xl p-7 text-center flex-1 flex flex-col justify-center">
                <DollarSign className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">¿Cuánto puedes ganar?</h3>
                <div className="space-y-2 mb-5">
                  {[["$10 – $50", "por día en promedio"], ["$100 – $500", "semanales con constancia"], ["$1,000 – $2,000+", "mensuales con dedicación"]].map(([v, l], i) => (
                    <div key={i} className="text-center">
                      <span className="text-blue-300 font-bold">{v} USD</span>
                      <span className="text-white/40 text-xs ml-2">{l}</span>
                    </div>
                  ))}
                </div>
                <p className="text-white/40 text-xs">Los resultados dependen de tu dedicación y estrategia.</p>
              </div>
              <Link href="/contacto"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                Contactar Ahora y Empezar <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
