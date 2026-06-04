import { useState } from "react";
  import { Link } from "wouter";
  import { ChevronDown, ChevronUp, Shield, Users, TrendingUp, Globe, ArrowRight, Star, Award, Heart } from "lucide-react";

  const stats = [
    { icon: Users, val: "+5,000", label: "Streamers activas ganando desde casa" },
    { icon: TrendingUp, val: "+5 años", label: "De experiencia en la industria" },
    { icon: Globe, val: "+20", label: "Países con streamers activas" },
    { icon: Award, val: "+10", label: "Apps y plataformas verificadas" },
  ];

  const valores = [
    { icon: Shield, title: "Transparencia Total", desc: "Sin costos ocultos, sin engaños. Todo lo que necesitas saber te lo decimos desde el primer contacto." },
    { icon: Heart, title: "Comunidad Femenina", desc: "Una red de mujeres que se apoyan mutuamente. Crecemos juntas compartiendo estrategias y experiencias." },
    { icon: TrendingUp, title: "Resultados Reales", desc: "No prometemos imposibles. Te mostramos ganancias realistas basadas en la experiencia de nuestras streamers actuales." },
    { icon: Star, title: "Crecimiento Constante", desc: "Capacitación continua, nuevas apps, bonos por rendimiento y ascensos dentro de la agencia." },
  ];

  const faqs = [
    {
      q: "¿Qué es Eclipse Angels Agency?",
      a: "Eclipse Angels Agency es una agencia de streamers y chat hostess que conecta a mujeres mayores de 18 años con las mejores plataformas internacionales de videochat y mensajería. Generamos ingresos reales en dólares sin inversión inicial."
    },
    {
      q: "¿Es seguro trabajar con Eclipse Angels Agency?",
      a: "Sí, completamente. Trabajamos únicamente con plataformas verificadas y de confianza a nivel internacional. Nunca pedimos dinero para empezar, y toda la información de nuestras streamers es manejada con total privacidad y discreción."
    },
    {
      q: "¿Necesito mostrar mi cara o datos personales?",
      a: "No es obligatorio. Puedes trabajar con un perfil completamente distinto al tuyo: nombre artístico, foto diferente y sin vincular tus redes sociales personales. La privacidad es una prioridad para nosotras."
    },
    {
      q: "¿Cuánto puedo ganar realmente?",
      a: "Los ingresos varían según el tiempo dedicado y la plataforma. En promedio nuestras streamers ganan entre $10 y $50 USD por día. Con constancia y las estrategias correctas, muchas superan los $500 USD semanales."
    },
    {
      q: "¿Cuántas horas debo trabajar al día?",
      a: "Se recomienda un mínimo de 4–5 horas diarias para cumplir metas y acceder a bonos. Sin embargo, los horarios son totalmente flexibles: tú decides cuándo y cuánto trabajar."
    },
    {
      q: "¿Cuándo y cómo me pagan?",
      a: "Los pagos son semanales, cada martes. Puedes recibir tu dinero por Binance (USDT), Zelle, Pix, Pago Móvil Venezuela, transferencia bancaria en Cuba o efectivo en Cuba, según tu país."
    },
    {
      q: "¿Necesito experiencia previa?",
      a: "No. Capacitamos a todas nuestras streamers desde cero. Nuestras tutoras te guían paso a paso desde la instalación de la app hasta las primeras estrategias de comunicación para maximizar tus ganancias."
    },
    {
      q: "¿Qué apps puedo usar?",
      a: "Actualmente trabajamos con Waha, Layla, Dates y Mango Live, entre otras. Cada una tiene sus características y tipo de trabajo. Nuestro equipo te ayuda a elegir la más adecuada según tu perfil y disponibilidad."
    },
    {
      q: "¿Puedo trabajar desde cualquier país?",
      a: "Sí. Trabajamos con streamers de toda Latinoamérica y el mundo. Solo necesitas un smartphone con buena cámara y conexión a internet estable."
    },
    {
      q: "¿Qué pasa si tengo dudas durante el trabajo?",
      a: "Contamos con tutoras disponibles para apoyarte en cualquier momento. Nunca estarás sola en el proceso. También tenemos grupos de apoyo donde compartimos consejos y estrategias constantemente."
    },
  ];

  export default function Nosotros() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">

        {/* Header */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-[600px] h-[400px] rounded-full bg-blue-600/7 blur-[100px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Sobre Nosotros</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-[1.1]">
              Más de 5 años conectando<br />
              <span className="gradient-text">mujeres con oportunidades reales</span>
            </h1>
            <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
              Eclipse Angels Agency nació con la misión de empoderar económicamente a mujeres de toda Latinoamérica, conectándolas con las mejores plataformas internacionales de streaming y chat. Sin inversión, sin riesgos, con resultados reales.
            </p>
          </div>
        </section>

        {/* Stats */}
        <div className="bg-[#0a0a16] border-y border-blue-500/8 py-8">
          <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <p className="text-blue-400 font-extrabold text-3xl md:text-4xl">{s.val}</p>
                <p className="text-white/40 text-xs mt-1 max-w-[110px] mx-auto">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Misión */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-5xl mx-auto px-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">Nuestra Misión</span>
                <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">
                  Empoderamiento económico<br /><span className="gradient-text">para cada mujer</span>
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  Creemos que toda mujer merece acceso a una fuente de ingresos digna, flexible y en dólares. En Eclipse Angels Agency hacemos eso posible conectándote con las mejores apps internacionales de la industria, brindando capacitación gratuita y soporte constante.
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  No somos una promesa vacía. Somos un equipo real, con streamers reales, generando resultados reales cada semana. Únete y compruébalo tú misma.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {valores.map((v, i) => (
                  <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 hover:border-blue-500/25 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3">
                      <v.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1.5">{v.title}</h3>
                    <p className="text-white/40 text-xs leading-relaxed">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-3xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">Preguntas Frecuentes</span>
              <h2 className="text-3xl font-extrabold mt-2 mb-3">Todo lo que necesitas saber</h2>
              <p className="text-white/45 text-sm">Resolvemos tus dudas antes de que empieces</p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-blue-500/30" : "border-blue-500/8"}`}>
                    <button
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span className="font-semibold text-sm text-white pr-4">{faq.q}</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                      }
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-white/5 pt-4">
                        <p className="text-white/50 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-xl mx-auto px-5 text-center">
            <Star className="w-10 h-10 text-blue-400 mx-auto mb-5" />
            <h2 className="text-3xl font-extrabold mb-3">¿Tienes más preguntas?</h2>
            <p className="text-white/50 text-sm mb-7">Nuestro equipo responde en menos de 24 horas. Escríbenos sin compromiso.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/contacto"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                Contactar <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/ser-streamer"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                Ser Streamer
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }
  