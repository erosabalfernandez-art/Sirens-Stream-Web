import { useState } from "react";
    import { Link } from "wouter";
    import { ChevronDown, ChevronUp, Shield, Users, TrendingUp, Globe, ArrowRight, Star, Heart, Clock, DollarSign } from "lucide-react";

    const stats = [
      { val: "Soporte 24/7", label: "Siempre hay alguien para ayudarte" },
      { val: "Pagos Semanales", label: "Cobras puntual cada semana en dólares" },
      { val: "$0 Inversión", label: "Empiezas sin gastar nada" },
      { val: "Todos los Países", label: "Operamos a nivel mundial" },
    ];

    const valores = [
      { icon: Shield, title: "Honestidad ante todo", desc: "No hay costos ocultos ni sorpresas. Desde el primer mensaje te decimos exactamente cómo funciona todo." },
      { icon: Heart, title: "Somos una comunidad", desc: "Una red de mujeres que se apoyan entre sí. Compartimos estrategias, experiencias y crecemos juntas." },
      { icon: TrendingUp, title: "Resultados de verdad", desc: "No prometemos lo que no podemos cumplir. Las ganancias que mostramos son reales y alcanzables con constancia." },
      { icon: Star, title: "Tú decides cuánto creces", desc: "Capacitación gratis, bonos por resultados y más oportunidades cuanto mejor te vaya." },
    ];

    const faqs = [
      {
        q: "¿Los hombres pueden trabajar con Eclipse Angels Agency?",
        a: "¡Sí, absolutamente! Los hombres también tienen un lugar en nuestro equipo. Pueden participar de dos formas: creándose cuentas en algunas de nuestras aplicaciones asociadas, o como reclutadores, refiriendo chicas a la agencia y ganando comisión por cada una que se una y empiece a generar. Siendo parte de Eclipse Angels Agency, siempre saldrán beneficiados."
      },
      {
        q: "¿Cómo puede ganar dinero un hombre en la agencia?",
        a: "Hay dos caminos claros. El primero es registrarse en ciertas aplicaciones de nuestra red y generar ingresos propios. El segundo es convertirse en reclutador: presentar chicas interesadas a la agencia y cobrar una comisión por cada incorporación exitosa. Es una forma flexible de ganar sin límite de horario ni de ingresos."
      },
      {
        q: "¿Los hombres reciben el mismo soporte que las chicas?",
        a: "Sí. Cualquier persona que forme parte de nuestro equipo recibe capacitación, guías y acompañamiento constante. No importa cómo decidas participar, siempre tendrás a alguien disponible para ayudarte a crecer y maximizar tus ganancias."
      },
      {
        q: "¿Qué es Eclipse Angels Agency?",
        a: "Eclipse Angels Agency es una agencia de streamers y chat hostess que conecta a mujeres mayores de 18 años con plataformas internacionales de videochat y mensajería. Puedes ganar dinero en dólares desde tu celular, sin invertir nada y sin experiencia previa."
      },
      {
        q: "¿Es seguro trabajar con Eclipse Angels Agency?",
        a: "Sí, totalmente. Solo trabajamos con plataformas verificadas y reconocidas a nivel internacional. Nunca te pedimos dinero para empezar, y toda tu información personal se maneja con total privacidad."
      },
      {
        q: "¿Necesito mostrar mi cara o mis datos personales?",
        a: "No es obligatorio. Puedes trabajar con nombre artístico, foto diferente y sin vincular tus redes personales. Tu privacidad es nuestra prioridad."
      },
      {
        q: "¿Cuánto puedo ganar?",
        a: "Depende del tiempo que le dediques y la plataforma que uses. En promedio puedes ganar entre $10 y $50 USD por día. Con constancia muchas chicas superan los $500 USD a la semana."
      },
      {
        q: "¿Cuántas horas tengo que trabajar al día?",
        a: "Se recomiendan 4–5 horas diarias para cumplir metas y acceder a bonos. Pero el horario es completamente tuyo — trabajas cuando quieres y el tiempo que quieras."
      },
      {
        q: "¿Cuándo y cómo me pagan?",
        a: "Los pagos son semanales. Puedes recibir tu dinero por Binance (USDT), Pix (Brasil), transferencia bancaria en Cuba o efectivo en Cuba, según tu país."
      },
      {
        q: "¿Necesito tener experiencia?",
        a: "Para nada. Te enseñamos todo desde cero. Una de nuestras guías te explica paso a paso cómo instalar la app y cómo empezar a ganar desde el primer día."
      },
      {
        q: "¿Qué apps puedo usar?",
        a: "Trabajamos con Waha, Layla y Howdy, tres de las plataformas internacionales más rentables del mercado. Cada una tiene características diferentes — videollamadas, mensajes, live streaming — y nuestro equipo te ayuda a elegir la más adecuada para ti."
      },
      {
        q: "¿Puedo trabajar desde cualquier país?",
        a: "Sí. Trabajamos con chicas de toda Latinoamérica y el mundo. Solo necesitas un celular con buena cámara y conexión a internet."
      },
      {
        q: "¿Qué pasa si tengo dudas mientras trabajo?",
        a: "Siempre tienes a alguien disponible para ayudarte. Contamos con guías de apoyo y grupos donde compartimos consejos y estrategias constantemente. Nunca estás sola."
      },
    ];

    export default function Nosotros() {
      const [openFaq, setOpenFaq] = useState<number | null>(null);

      return (
        <div className="min-h-screen bg-[#07070f] text-white pt-16">

          {/* Header */}
          <section className="relative py-20 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/3 w-[600px] h-[400px] rounded-full bg-purple-600/7 blur-[100px]" />
            </div>
            <div className="relative max-w-4xl mx-auto px-5 text-center">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-4 py-1.5 mb-5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Sobre Nosotros</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-[1.1]">
                Conectamos mujeres con<br />
                <span className="gradient-text">oportunidades reales en dólares</span>
              </h1>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">
                Eclipse Angels Agency nació para que cualquier mujer pueda generar ingresos reales desde su celular, sin poner dinero, sin experiencia y con todo el apoyo que necesite para crecer.
              </p>
            </div>
          </section>

          {/* Stats */}
          <div className="bg-[#0a0a16] border-y border-purple-500/8 py-8">
            <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-purple-400 font-extrabold text-2xl md:text-3xl">{s.val}</p>
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
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400/70">Nuestra Misión</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">
                    Que cada mujer pueda<br /><span className="gradient-text">ganar dinero desde casa</span>
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">
                    Creemos que toda mujer merece acceso a ingresos reales, flexibles y en dólares. En Eclipse Angels Agency lo hacemos posible conectándote con las mejores apps internacionales, dándote capacitación gratuita y acompañándote en cada paso.
                  </p>
                  <p className="text-white/50 text-sm leading-relaxed">
                    No somos una promesa vacía. Somos un equipo real, con chicas reales, ganando dinero real cada semana. Únete y compruébalo tú misma.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {valores.map((v, i) => (
                    <div key={i} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 hover:border-purple-500/25 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center mb-3">
                        <v.icon className="w-4 h-4 text-purple-400" />
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
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400/70">Preguntas Frecuentes</span>
                <h2 className="text-3xl font-extrabold mt-2 mb-3">Todo lo que quieres saber</h2>
                <p className="text-white/45 text-sm">Resolvemos tus dudas antes de que empieces</p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={i} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-purple-500/30" : "border-purple-500/8"}`}>
                      <button
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                      >
                        <span className="font-semibold text-sm text-white pr-4">{faq.q}</span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
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
              <Star className="w-10 h-10 text-purple-400 mx-auto mb-5" />
              <h2 className="text-3xl font-extrabold mb-3">¿Tienes más preguntas?</h2>
              <p className="text-white/50 text-sm mb-7">Nuestro equipo te contesta en menos de 24 horas. Escríbenos sin compromiso.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  Escríbenos <ArrowRight className="w-4 h-4" />
                </a>
                <Link href="/ser-streamer"
                  className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  Únete ahora
                </Link>
              </div>
            </div>
          </section>
        </div>
      );
    }
  