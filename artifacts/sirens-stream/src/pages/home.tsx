import { useState, useEffect } from "react";
  import { Link } from "wouter";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    DollarSign, Shield, Smartphone, Users, Clock, TrendingUp,
    CheckCircle2, Zap, Star, CreditCard, MessageCircle, ArrowRight,
    Globe, Award, ChevronLeft, ChevronRight, Wifi, Camera, Heart
  } from "lucide-react";
  import { useGetAgencyStats } from "@/lib/api-client";

  const slides = [
    {
      badge: "Bienvenida a Eclipse Angels Agency",
      title: "Agencia de Streamers",
      highlight: "& Chat Hostess",
      sub: "Cero Inversión · Desde Casa · En Dólares",
      desc: "Conectamos a mujeres mayores de 18 años con las mejores plataformas internacionales. Genera ingresos reales usando solo tu celular.",
      cta: { label: "Unirme a la Agencia", href: "/ser-streamer" },
      accent: "from-blue-600 to-purple-600",
      glow: "bg-blue-600/10",
      items: ["Sin inversión inicial", "Pagos semanales garantizados", "Soporte 24/7"],
    },
    {
      badge: "Potencial de Ganancias",
      title: "Gana Hasta",
      highlight: "$2,000 USD/mes",
      sub: "Muchas de nuestras streamers superan los $500 semanales",
      desc: "Con constancia y la guía de nuestro equipo, tus ingresos crecen semana a semana. Empiezas desde cero y llegas lejos.",
      cta: { label: "Ver cómo funciona", href: "/ser-streamer" },
      accent: "from-emerald-500 to-teal-600",
      glow: "bg-emerald-600/10",
      bg: "/images/slide-bg-2.png",
      items: ["$10–$50 USD por día", "$100–$500 USD semanales", "$1,000–$2,000 USD/mes"],
    },
    {
      badge: "Apps Verificadas",
      title: "Waha & Layla",
      highlight: "Plataformas Líderes",
      sub: "Las apps más rentables del mercado",
      desc: "Trabajamos con las plataformas internacionales más seguras y rentables. Retiros semanales, meta mínima baja y soporte constante.",
      cta: { label: "Ver Apps Disponibles", href: "/apps" },
      accent: "from-pink-500 to-red-500",
      glow: "bg-pink-600/10",
      items: ["Waha: mensajes + videollamadas", "Layla: solo mensajes, horario libre", "Retiro desde $2 USD"],
    },
    {
      badge: "Tu Agencia, Tu Equipo",
      title: "Crea Tu Propia",
      highlight: "Agencia de Streamers",
      sub: "Lidera un equipo y multiplica tus ingresos",
      desc: "¿Ya conoces el mundo del streaming? Forma tu propio equipo, gana comisiones y construye tu negocio desde cero con nuestro respaldo.",
      cta: { label: "Crear mi Agencia", href: "/crear-agencia" },
      accent: "from-amber-500 to-orange-500",
      glow: "bg-amber-600/10",
      bg: "/images/slide-bg-4.png",
      items: ["Capacitación completa", "Bonos por rendimiento", "Herramientas de gestión"],
    },
  ];

  const benefits = [
    { icon: DollarSign, title: "Cobras cada semana", desc: "Tus ganancias llegan en dólares cada semana, sin esperas ni excusas." },
    { icon: Shield, title: "Empiezas sin poner dinero", desc: "No necesitas invertir nada. Solo tu celular y tus ganas de trabajar." },
    { icon: Smartphone, title: "Solo necesitas tu celular", desc: "Trabaja desde tu casa, a cualquier hora, sin salir ni comprar nada." },
    { icon: Users, title: "Siempre tienes a alguien", desc: "Hay una persona disponible para ayudarte en cualquier momento del día." },
    { icon: Clock, title: "Tú pones tu horario", desc: "Decides cuándo trabajar y cuánto tiempo. El trabajo se adapta a ti." },
    { icon: TrendingUp, title: "Creces con nosotras", desc: "Entrenamiento gratis, bonos por resultados y más oportunidades cuanto mejor te va." },
  ];

  const steps = [
    { n: "01", title: "Escríbenos", desc: "Mándanos un mensaje por WhatsApp. Te contestamos en menos de 24 horas." },
    { n: "02", title: "Te enseñamos todo", desc: "Una de nuestras guías te explica cómo instalar la app y cómo empezar a ganar desde el primer día." },
    { n: "03", title: "Empieza a ganar", desc: "Abres la app, chateas con personas de cualquier parte del mundo y empiezas a acumular dinero." },
    { n: "04", title: "Recibes tu pago", desc: "Cada semana te mandamos lo que ganaste, al método de cobro que más te convenga." },
  ];

  const earnings = [
    { label: "$10 – $50", sub: "lo que puedes ganar en un día" },
    { label: "$100 – $500", sub: "a la semana si eres constante" },
    { label: "$1,000 – $2,000", sub: "al mes si le dedicas tiempo" },
  ];

  const requirements = [
    { icon: Heart, text: "Tener 18 años o más" },
    { icon: Camera, text: "Un celular con buena cámara" },
    { icon: Wifi, text: "Tener WiFi o datos en tu celular" },
    { icon: Clock, text: "4–5 horas libres al día" },
    { icon: Star, text: "Ganas de aprender y mejorar" },
    { icon: Shield, text: "No necesitas experiencia" },
  ];

  const infoCards = [
    { icon: Users, title: "Sobre Nosotros", desc: "Conoce nuestra historia y misión", href: "/nosotros" },
    { icon: MessageCircle, title: "Contacto Directo", desc: "Habla con nuestro equipo hoy", href: "/contacto" },
    { icon: Star, title: "Preguntas Frecuentes", desc: "Resolvemos todas tus dudas", href: "/nosotros" },
    { icon: CreditCard, title: "Métodos de Pago", desc: "Múltiples formas de recibir tu dinero", href: "/pagos" },
  ];

  export default function Home() {
    const { data: stats } = useGetAgencyStats();
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
      const t = setInterval(() => {
        setDirection(1);
        setCurrent((c) => (c + 1) % slides.length);
      }, 5000);
      return () => clearInterval(t);
    }, []);

    const goTo = (i: number) => {
      setDirection(i > current ? 1 : -1);
      setCurrent(i);
    };
    const prev = () => { setDirection(-1); setCurrent((c) => (c - 1 + slides.length) % slides.length); };
    const next = () => { setDirection(1); setCurrent((c) => (c + 1) % slides.length); };

    const slide = slides[current];

    return (
      <div className="min-h-screen bg-[#07070f] text-white">

        {/* ── HERO SLIDER ── */}
        <section className="relative flex items-center overflow-hidden" style={{ minHeight: "60vh" }}>
          {/* Animated background image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current + "-bg-img"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${slide.bg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "brightness(0.25) saturate(0.7)",
                }}
              />
            </AnimatePresence>
            {/* Animated glow overlay */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current + "-bg"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className={`absolute inset-0 pointer-events-none ${slide.glow} blur-[120px] scale-150`}
              />
            </AnimatePresence>

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{ backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          {/* Floating social sidebar */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-3">
            {[
              { href: "https://wa.me/1234567890", color: "bg-[#25D366]", label: "WA" },
              { href: "https://instagram.com/eclipseangelsagency", color: "bg-gradient-to-br from-purple-500 to-pink-600", label: "IG" },
              { href: "https://t.me/eclipseangelsagency", color: "bg-[#2CA5E0]", label: "TG" },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform`}>
                {s.label}
              </a>
            ))}
          </div>

          {/* Slide content */}
          <div className="relative z-10 max-w-7xl mx-auto px-5 py-14 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: text */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current + "-text"}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 60 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-1.5 mb-6">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{slide.badge}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold leading-[1.08] tracking-tight mb-3">
                    {slide.title}<br />
                    <span className={`bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent`}>{slide.highlight}</span>
                  </h1>
                  <p className="text-lg font-bold text-white/60 mb-4">{slide.sub}</p>
                  <p className="text-white/50 max-w-lg mb-8 leading-relaxed">{slide.desc}</p>

                  <div className="space-y-2 mb-8">
                    {slide.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/65">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href={slide.cta.href}
                      className={`flex items-center gap-2 bg-gradient-to-r ${slide.accent} text-white font-bold px-7 py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all hover:opacity-90 shadow-lg`}>
                      {slide.cta.label} <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/contacto"
                      className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                      Contactar
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Right: animated cards column */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current + "-cards"}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 80 }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
                  className="hidden lg:flex flex-col gap-4"
                >
                  {/* Big feature card */}
                  <div className={`rounded-2xl border border-white/10 p-6 bg-gradient-to-br ${slide.accent} bg-opacity-10 backdrop-blur-sm relative overflow-hidden`}
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} opacity-10`} />
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${slide.accent} flex items-center justify-center mb-4`}>
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-extrabold text-2xl text-white mb-1">{slide.highlight}</p>
                      <p className="text-white/50 text-sm">{slide.sub}</p>
                    </div>
                  </div>
                  {/* Stats mini cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: `+${stats?.streamersRepresented ?? 500}`, label: "Streamers" },
                      { val: `+${stats?.yearsActive ?? 5}`, label: "Años exp." },
                      { val: `+${stats?.platforms?.length ? stats.platforms.length * 2 : 10}`, label: "Apps" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/4 border border-white/10 rounded-xl p-4 text-center">
                        <p className={`font-extrabold text-lg bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent`}>{s.val}</p>
                        <p className="text-white/40 text-xs mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Trust points */}
                  <div className="bg-white/4 border border-white/10 rounded-xl p-4 space-y-2">
                    {["Sin inversión · Sin experiencia", "Pagos semanales en dólares", "Soporte y capacitación gratis"].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/55">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />{t}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slider controls */}
            <div className="flex items-center gap-4 mt-6">
              <button onClick={prev} className="w-9 h-9 rounded-full bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/15 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === current ? "w-8 bg-blue-400" : "w-3 bg-white/20"}`} />
                ))}
              </div>
              <button onClick={next} className="w-9 h-9 rounded-full bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/15 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="bg-[#0a0a16] border-y border-blue-500/10 py-8">
          <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: "Soporte 24/7", label: "Siempre disponibles para ayudarte" },
              { val: "Pagos Semanales", label: "Cobras puntual cada semana en dólares" },
              { val: "$0 Inversión", label: "Empieza sin gastar nada" },
              { val: "Todos los Países", label: "Operamos a nivel mundial" },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-blue-400 font-extrabold text-3xl md:text-4xl">{s.val}</p>
                <p className="text-white/40 text-xs mt-1 max-w-[120px] mx-auto">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── POR QUÉ ELEGIRNOS ── */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">¿Por qué elegirnos?</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                La plataforma líder para<br />
                <span className="gradient-text">generar ingresos online</span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto">
                En Eclipse Angels Agency conectamos a mujeres mayores de 18 años con las mejores apps de streaming y chat en vivo, para que generen ingresos reales en dólares desde casa, sin experiencia y con total acompañamiento.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((b, i) => (
                <div key={i} className="group bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 hover:border-blue-500/25 hover:bg-[#0f0f22] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
                    <b.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{b.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ¿A QUIÉN BUSCAMOS? ── */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">¿Esta oportunidad es para ti?</span>
                </div>
                <h2 className="text-4xl font-bold mb-4">
                  Gana dinero real desde casa <span className="gradient-text">siendo tú misma</span>
                </h2>
                <p className="text-white/50 mb-6 leading-relaxed">
                  En Eclipse Angels Agency te ayudamos a ganar dinero en dólares desde tu celular. Sin poner un peso, sin saber nada del tema y con total discreción.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {requirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-sm text-white/65">
                      <r.icon className="w-4 h-4 text-blue-400 shrink-0" />
                      {r.text}
                    </div>
                  ))}
                </div>
                <Link href="/ser-streamer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                  Me uno ahora <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-4">
                <div className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-4">¿Cuánto puedes ganar?</p>
                  {earnings.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                      <span className="text-white/50 text-sm">{e.sub}</span>
                      <span className="text-blue-400 font-extrabold">{e.label} USD</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Tu horario, tus reglas", icon: Clock },
                    { label: "Nadie sabe que trabajas", icon: Shield },
                    { label: "Cobras cada semana", icon: DollarSign },
                  ].map((c, i) => (
                    <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-xl p-4 text-center">
                      <c.icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <p className="text-white/60 text-xs">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ── */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Así de fácil es</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">¿Cómo empiezo?</h2>
              <p className="text-white/50">En 4 pasos sencillos ya estás ganando dinero real</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((s, i) => (
                <div key={i} className="relative bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 hover:border-blue-500/25 transition-colors">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 -right-2.5 w-5 text-blue-500/30 text-lg z-10">→</div>
                  )}
                  <p className="text-blue-500/40 font-extrabold text-4xl mb-3">{s.n}</p>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ÚNETE ── */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">Únete a Eclipse Angels Agency</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">Elige tu camino</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-8 flex flex-col hover:border-blue-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">Conviértete en Streamer</h3>
                <p className="text-white/50 text-sm mb-6 flex-1">Gana dinero en dólares trabajando desde casa con tu celular. Sin inversión, sin experiencia previa.</p>
                <Link href="/ser-streamer"
                  className="flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                  Ver beneficios <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl p-8 flex flex-col hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">Crea tu Agencia</h3>
                <p className="text-white/50 text-sm mb-6 flex-1">Lidera un equipo de streamers y multiplica tus ingresos. Conviértete en manager y construye tu negocio.</p>
                <Link href="/crear-agencia"
                  className="flex items-center gap-2 justify-center bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all">
                  Ver requisitos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── INFO CARDS ── */}
        <section className="py-16 bg-[#07070f] border-t border-blue-500/8">
          <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {infoCards.map((c, i) => (
              <Link key={i} href={c.href}
                className="group bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 flex flex-col items-center text-center hover:border-blue-500/25 hover:bg-[#0f0f22] transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3 group-hover:bg-blue-500/25 transition-colors">
                  <c.icon className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-bold text-sm text-white mb-1">{c.title}</h3>
                <p className="text-white/35 text-xs">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    );
  }
  