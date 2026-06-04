import { Link } from "wouter";
import {
  DollarSign, Shield, Smartphone, Users, Clock, TrendingUp,
  CheckCircle2, Zap, Star, CreditCard, MessageCircle, ArrowRight,
  Play, Globe, Award, HeartHandshake
} from "lucide-react";
import { useGetAgencyStats } from "@/lib/api-client";

const benefits = [
  { icon: DollarSign, title: "Pagos Semanales en Dólares", desc: "Recibe tus ganancias cada semana puntualmente. Sin retrasos, sin excusas." },
  { icon: Shield, title: "Sin Inversión Inicial", desc: "Cero costos de entrada. No pedimos dinero para empezar, solo tu tiempo y dedicación." },
  { icon: Smartphone, title: "Solo tu Celular desde Casa", desc: "Tu smartphone es toda la herramienta que necesitas. Trabaja desde donde quieras." },
  { icon: Users, title: "Soporte 24/7", desc: "Tutoras disponibles para guiarte en cada paso del camino. Nunca estarás sola." },
  { icon: Clock, title: "Horarios Totalmente Flexibles", desc: "Tú decides cuándo y cuánto trabajar. Adapta el empleo a tu estilo de vida." },
  { icon: TrendingUp, title: "Crecimiento Continuo", desc: "Capacitación gratuita, bonos por rendimiento y ascensos dentro de la agencia." },
];

const steps = [
  { n: "01", title: "Contáctanos", desc: "Escríbenos por WhatsApp o Instagram. Te responderemos en menos de 24h." },
  { n: "02", title: "Capacitación Gratuita", desc: "Nuestras tutoras te guían paso a paso en la instalación y primeras estrategias." },
  { n: "03", title: "Empieza a Trabajar", desc: "Te registras en las apps y comienzas a interactuar con usuarios." },
  { n: "04", title: "Cobra tus Ganancias", desc: "Cada semana recibes tu pago en el método de tu preferencia." },
];

const earnings = [
  { label: "$10 – $50", sub: "USD por día en promedio" },
  { label: "$100 – $500", sub: "USD semanales con constancia" },
  { label: "$1,000 – $2,000", sub: "USD mensuales con dedicación" },
];

const requirements = [
  "Ser mujer mayor de 18 años",
  "Smartphone con buena cámara",
  "Conexión WiFi o datos estables",
  "Disponibilidad de 4–5 horas diarias",
  "Actitud positiva y compromiso",
  "Sin experiencia previa requerida",
];

const infoCards = [
  { icon: Users, title: "Sobre Nosotros", desc: "Conoce nuestra historia y misión", href: "/nosotros" },
  { icon: MessageCircle, title: "Contacto Directo", desc: "Habla con nuestro equipo hoy", href: "/contacto" },
  { icon: Star, title: "Preguntas Frecuentes", desc: "Resolvemos todas tus dudas", href: "/nosotros" },
  { icon: CreditCard, title: "Métodos de Pago", desc: "Múltiples formas de recibir tu dinero", href: "/pagos" },
];

export default function Home() {
  const { data: stats } = useGetAgencyStats();

  return (
    <div className="min-h-screen bg-[#07070f] text-white">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] rounded-full bg-blue-600/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-800/6 blur-[100px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        {/* Floating social sidebar */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-3">
          {[
            { href: "https://wa.me/1234567890", color: "bg-[#25D366]", label: "WA" },
            { href: "https://instagram.com/sirensstream", color: "bg-gradient-to-br from-purple-500 to-pink-600", label: "IG" },
            { href: "https://t.me/sirensstream", color: "bg-[#2CA5E0]", label: "TG" },
          ].map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform`}>
              {s.label}
            </a>
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 py-28">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Bienvenida a Sirens Stream</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-4">
            Agencia de<br />
            <span className="gradient-text">Streamers &amp; Chat</span><br />
            Hostess
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-blue-400 mb-6">Sin inversión · Desde casa · En dólares</p>
          <p className="text-white/55 text-lg max-w-2xl mb-10 leading-relaxed">
            Conectamos a mujeres mayores de 18 años con las mejores plataformas internacionales de streaming y videochat. Genera ingresos reales en dólares usando solo tu celular, sin experiencia previa y con acompañamiento constante.
          </p>

          <div className="flex flex-wrap gap-4 mb-14">
            <Link href="/ser-streamer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_45px_rgba(59,130,246,0.6)]">
              Unirse a la Agencia <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/apps"
              className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider hover:bg-white/10 transition-colors">
              <Play className="w-4 h-4 text-blue-400" /> Ver Apps Disponibles
            </Link>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap gap-6 text-sm text-white/40 border-t border-white/6 pt-6">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sin inversión inicial</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Pagos semanales garantizados</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Capacitación gratis incluida</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Soporte 24/7</span>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#0a0a16] border-y border-blue-500/10 py-8">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { val: `+${stats?.streamersRepresented ?? 500}`, label: "Streamers registradas" },
            { val: `+${stats?.yearsActive ?? 3}`, label: "Años de experiencia" },
            { val: stats?.platforms?.length ? `${stats.platforms.length} Apps` : "2 Apps", label: "Plataformas disponibles" },
            { val: "+20 Países", label: "Alcance internacional" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-blue-400 font-extrabold text-3xl md:text-4xl">{s.val}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
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
              La agencia líder para<br />
              <span className="gradient-text">generar ingresos online</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              En Sirens Stream tenemos todo lo que necesitas para empezar a ganar dinero real desde casa. Sin riesgos, sin costos ocultos, con el respaldo de un equipo experto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="group bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 card-hover">
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

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-20 bg-[#0a0a16]">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Proceso simple</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">¿Cómo funciona?</h2>
            <p className="text-white/50">En solo 4 pasos empiezas a generar ingresos</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <div key={i} className="relative bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 card-hover">
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

      {/* ── GANANCIAS ── */}
      <section className="py-20 bg-[#07070f]">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Potencial de ganancias</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Trabaja como <span className="gradient-text">Modelo de Videochat</span> desde Casa
              </h2>
              <p className="text-white/50 mb-6 leading-relaxed">
                Con Sirens Stream puedes generar ingresos reales en dólares usando únicamente tu celular. Muchas de nuestras streamers superan los $500 USD semanales con constancia y dedicación.
              </p>
              <div className="space-y-3 mb-8">
                {["No necesitas experiencia previa — te capacitamos gratis", "Sin inversión inicial — empiezas con cero riesgo", "Horarios 100% flexibles — tú defines tus horas", "Privacidad total — no debes exponer tus redes sociales", "Pagos semanales — Binance, Zelle, PayPal y más"].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-white/65">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/ser-streamer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                Quiero unirme <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {earnings.map((e, i) => (
                <div key={i} className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-6 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-400 font-extrabold text-2xl">{e.label} <span className="text-white/70 text-base font-semibold">USD</span></p>
                    <p className="text-white/40 text-sm">{e.sub}</p>
                  </div>
                </div>
              ))}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 text-sm text-blue-200/70">
                <Globe className="w-4 h-4 text-blue-400 mb-2" />
                Las ganancias dependen de tu dedicación, constancia y estrategia. Nuestro equipo te ayuda a maximizar tus resultados desde el primer día.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── A QUIÉN BUSCAMOS ── */}
      <section className="py-20 bg-[#0a0a16]">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
              <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Requisitos</span>
            </div>
            <h2 className="text-4xl font-bold">¿A quién buscamos?</h2>
          </div>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requirements.map((r, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#0d0d1e] border border-blue-500/10 rounded-xl px-5 py-4">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-white/70 text-sm">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFO CARDS ── */}
      <section className="py-16 bg-[#07070f]">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {infoCards.map((card, i) => (
            <Link key={i} href={card.href}
              className="group bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6 flex flex-col items-center text-center gap-3 card-hover">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                <card.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-sm">{card.title}</h3>
              <p className="text-white/40 text-xs">{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
