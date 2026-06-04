import { Link } from "wouter";
  import { Users, TrendingUp, DollarSign, CheckCircle2, ArrowRight, Star, Zap, Globe, Shield, Clock, Award } from "lucide-react";

  const ofertas = [
    {
      icon: Zap,
      title: "Capacitación Completa",
      desc: "Te enseñamos todo lo que necesitas saber para gestionar un equipo de streamers exitosas. Desde cero hasta avanzado.",
    },
    {
      icon: DollarSign,
      title: "Comisiones por Equipo",
      desc: "Gana un porcentaje de las ganancias de cada streamer que reclutes y gestiones. A mayor equipo, mayor ingreso pasivo.",
    },
    {
      icon: Users,
      title: "Herramientas de Gestión",
      desc: "Acceso a dashboards, materiales de capacitación, plantillas de comunicación y todo lo que necesitas para liderar tu agencia.",
    },
    {
      icon: Shield,
      title: "Respaldo de Sirens Stream",
      desc: "No estás solo/a. Contamos con soporte técnico, asesoría de managers experimentados y actualizaciones constantes.",
    },
    {
      icon: Globe,
      title: "Red Internacional",
      desc: "Conecta con streamers de toda Latinoamérica. Construye un equipo diverso con alcance en múltiples países.",
    },
    {
      icon: Award,
      title: "Bonos por Desempeño",
      desc: "Recibe bonificaciones adicionales cuando tu equipo supera metas. El éxito de tus streamers es tu éxito.",
    },
  ];

  const requisitos = [
    "Mayor de 18 años",
    "Conocimiento básico de apps de streaming (o disposición para aprender)",
    "Disponibilidad para gestionar y apoyar a tu equipo",
    "Habilidades de comunicación y liderazgo",
    "Acceso a redes sociales para reclutar streamers",
    "Compromiso y responsabilidad",
  ];

  const queHaces = [
    {
      n: "01",
      title: "Recluta Streamers",
      desc: "Buscas y contactas a mujeres interesadas en generar ingresos desde casa. Las orientas sobre el trabajo y las motivas a unirse.",
    },
    {
      n: "02",
      title: "Registras y Acompañas",
      desc: "Guías a cada streamer nueva en su registro e instalación de la app. Estás disponible para resolver dudas en las primeras semanas.",
    },
    {
      n: "03",
      title: "Monitoreas el Equipo",
      desc: "Revisas el rendimiento de tu equipo, motivas a quienes estén bajas y compartes estrategias para mejorar ganancias.",
    },
    {
      n: "04",
      title: "Cobras tus Comisiones",
      desc: "Recibes semanalmente un porcentaje de las ganancias de cada streamer de tu equipo, además de bonos por cumplimiento de metas.",
    },
  ];

  const perfil = [
    "Personas organizadas y comprometidas",
    "Con habilidad para motivar y liderar equipos",
    "Proactivas en redes sociales",
    "Con experiencia previa como streamer (no obligatorio pero valorado)",
    "Disponibles para atender a su equipo y resolver dudas",
    "Con visión de negocio a largo plazo",
  ];

  export default function CrearAgencia() {
    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">

        {/* Header */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-amber-500/6 blur-[120px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 mb-5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Crear Agencia</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.1]">
              Construye tu Propia<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Agencia de Streamers</span>
            </h1>
            <p className="text-white/55 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
              Conviértete en manager, lidera un equipo de streamers y genera ingresos pasivos por las ganancias de tu equipo. Una oportunidad de negocio real con respaldo total de Sirens Stream.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/contacto"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-7 py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                Quiero ser Manager <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/nosotros"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                Conocer más
              </Link>
            </div>
          </div>
        </section>

        {/* ¿Qué hace un manager? */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">¿Qué hace un Manager?</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-3">Tu rol como líder de agencia</h2>
              <p className="text-white/45 text-sm max-w-xl mx-auto">Como manager de Sirens Stream, eres la persona que recluta, capacita y acompaña a un equipo de streamers, y ganas por sus resultados.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {queHaces.map((s, i) => (
                <div key={i} className="relative bg-[#0d0d1e] border border-amber-500/10 rounded-2xl p-5 hover:border-amber-500/25 transition-colors">
                  {i < queHaces.length - 1 && <div className="hidden lg:block absolute top-6 -right-2.5 text-amber-500/30 text-lg z-10">→</div>}
                  <p className="text-amber-500/35 font-extrabold text-4xl mb-3">{s.n}</p>
                  <h3 className="font-bold text-white mb-1.5 text-sm">{s.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 text-center">
              <p className="text-amber-200/70 text-sm">
                💡 <strong>Ingresos escalables:</strong> Cuantas más streamers tenga tu equipo, más ganas. No hay límite de equipo ni de ingresos.
              </p>
            </div>
          </div>
        </section>

        {/* Lo que ofrecemos */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-5xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">Lo que ofrecemos</span>
              <h2 className="text-3xl font-extrabold mt-2 mb-3">Todo lo que necesitas para triunfar</h2>
              <p className="text-white/45 text-sm">Como manager de Sirens Stream tendrás acceso a todos estos recursos y más</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ofertas.map((o, i) => (
                <div key={i} className="group bg-[#0d0d1e] border border-amber-500/10 rounded-2xl p-6 hover:border-amber-500/25 hover:bg-[#0f0f1a] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/25 transition-colors">
                    <o.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{o.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{o.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Perfil buscado */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">¿A quién buscamos?</span>
                <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">El perfil del<br /><span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Manager ideal</span></h2>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">
                  No necesitas experiencia en management. Si tienes las actitudes correctas y las ganas de construir algo propio, nosotras te enseñamos todo.
                </p>
                <div className="space-y-3">
                  {requisitos.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-4">Buscamos personas que sean...</p>
                  <div className="space-y-3">
                    {perfil.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-white/55">
                        <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-sm text-amber-300">¿Por qué ser manager?</span>
                  </div>
                  <p className="text-white/45 text-xs leading-relaxed">Los managers de Sirens Stream generan ingresos recurrentes semanales por las ganancias de su equipo. Es una fuente de ingresos escalable y sostenible a largo plazo.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-xl mx-auto px-5 text-center">
            <Users className="w-12 h-12 text-amber-400 mx-auto mb-5" />
            <h2 className="text-3xl font-extrabold mb-3">¿Listo para liderar tu agencia?</h2>
            <p className="text-white/50 text-sm mb-7 leading-relaxed">
              Da el primer paso hoy. Contáctanos y te explicamos todo el proceso para empezar a construir tu equipo de streamers con el respaldo de Sirens Stream.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/contacto"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                Aplicar como Manager <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/ser-streamer"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
                Ser Streamer primero
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }
  