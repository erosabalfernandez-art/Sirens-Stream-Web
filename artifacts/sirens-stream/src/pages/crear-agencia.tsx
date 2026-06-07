import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useShowAgencia } from "@/hooks/useShowAgencia";
import { useLanguage } from "@/contexts/LanguageContext";
  import {Users, TrendingUp, DollarSign, CheckCircle2, ArrowRight, Star, Zap, Globe, Shield, Clock, Award} from "lucide-react";

  const ofertas_es = [
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
      title: "Respaldo de Eclipse Angels Agency",
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

  const requisitos_es = [
    "Mayor de 18 años",
    "Conocimiento básico de apps de streaming (o disposición para aprender)",
    "Disponibilidad para gestionar y apoyar a tu equipo",
    "Habilidades de comunicación y liderazgo",
    "Acceso a redes sociales para reclutar streamers",
    "Compromiso y responsabilidad",
  ];

  const queHaces_es = [
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

  const perfil_es = [
    "Personas organizadas y comprometidas",
    "Con habilidad para motivar y liderar equipos",
    "Proactivas en redes sociales",
    "Con experiencia previa como streamer (no obligatorio pero valorado)",
    "Disponibles para atender a su equipo y resolver dudas",
    "Con visión de negocio a largo plazo",
  ];


  const ofertas_pt = [
    { icon: Zap, title: "Capacitação Completa", desc: "Ensinamos tudo o que você precisa saber para gerenciar uma equipe de streamers bem-sucedidas. Do zero ao avançado." },
    { icon: DollarSign, title: "Comissões por Equipe", desc: "Ganhe uma porcentagem dos ganhos de cada streamer que você recrutar e gerenciar. Quanto maior a equipe, maior a renda passiva." },
    { icon: Users, title: "Ferramentas de Gestão", desc: "Acesso a dashboards, materiais de capacitação, modelos de comunicação e tudo que você precisa para liderar sua agência." },
    { icon: Shield, title: "Apoio da Eclipse Angels Agency", desc: "Você não está sozinho/a. Temos suporte técnico, assessoria de managers experientes e atualizações constantes." },
    { icon: Globe, title: "Rede Internacional", desc: "Conecte-se com streamers de toda a América Latina. Construa uma equipe diversa com alcance em múltiplos países." },
    { icon: Award, title: "Bônus por Desempenho", desc: "Receba bonificações adicionais quando sua equipe superar metas. O sucesso das suas streamers é o seu sucesso." },
  ];
  const requisitos_pt = [
    "Maior de 18 anos",
    "Conhecimento básico de apps de streaming (ou disposição para aprender)",
    "Disponibilidade para gerenciar e apoiar sua equipe",
    "Habilidades de comunicação e liderança",
    "Acesso a redes sociais para recrutar streamers",
    "Comprometimento e responsabilidade",
  ];
  const queHaces_pt = [
    { n: "01", title: "Recrutamento", desc: "Você busca e contata mulheres interessadas em gerar renda em casa. Orienta sobre o trabalho e as motiva a entrar." },
    { n: "02", title: "Registro e Acompanhamento", desc: "Guia cada nova streamer no cadastro e instalação do app. Fica disponível para resolver dúvidas nas primeiras semanas." },
    { n: "03", title: "Monitoramento da Equipe", desc: "Acompanha o desempenho da equipe, motiva quem estiver com dificuldades e compartilha estratégias para melhorar os ganhos." },
    { n: "04", title: "Recebe suas Comissões", desc: "Recebe semanalmente uma porcentagem dos ganhos de cada streamer da sua equipe, além de bônus por cumprimento de metas." },
  ];
  const perfil_pt = [
    "Pessoas organizadas e comprometidas",
    "Com habilidade para motivar e liderar equipes",
    "Proativas nas redes sociais",
    "Com experiência prévia como streamer (não obrigatório mas valorizado)",
    "Disponíveis para atender sua equipe e resolver dúvidas",
    "Com visão de negócio a longo prazo",
  ];
  export default function CrearAgencia() {
    const showAgencia = useShowAgencia();
    const [, navigate] = useLocation();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
      // Small delay to let geo-check resolve before deciding to block
      const t = setTimeout(() => setChecked(true), 1200);
      return () => clearTimeout(t);
    }, []);

    useEffect(() => {
      if (checked && !showAgencia) navigate('/');
    }, [checked, showAgencia, navigate]);

    if (!checked) return null; // wait for geo-check
    if (!showAgencia) return null; // redirect in progress

    const { lang } = useLanguage();
    const ofertas = lang === 'pt' ? ofertas_pt : ofertas_es;
    const requisitos = lang === 'pt' ? requisitos_pt : requisitos_es;
    const queHaces = lang === 'pt' ? queHaces_pt : queHaces_es;
    const perfil = lang === 'pt' ? perfil_pt : perfil_es;
    const T = {
      badge: lang === 'pt' ? "Criar Agência" : "Crear Agencia",
      h1a: lang === 'pt' ? "Construa sua Própria" : "Construye tu Propia",
      h1b: lang === 'pt' ? "Agência de Streamers" : "Agencia de Streamers",
      sub: lang === 'pt' ? "Torne-se manager, lidere uma equipe de streamers e gere renda passiva pelos ganhos da sua equipe. Uma oportunidade de negócio real com apoio total da Eclipse Angels Agency." : "Convíertete en manager, lidera un equipo de streamers y genera ingresos pasivos por las ganancias de tu equipo. Una oportunidad de negocio real con respaldo total de Eclipse Angels Agency.",
      ctaManager: lang === 'pt' ? "Quero ser Manager" : "{T.ctaManager}",
      ctaMore: lang === 'pt' ? "Saiba mais" : "{T.ctaMore}",
      roleBadge: lang === 'pt' ? "O que faz um Manager?" : "¿Qué hace un Manager?",
      roleH2: lang === 'pt' ? "Seu papel como líder de agência" : "{T.roleH2}",
      roleSub: lang === 'pt' ? "Como manager da Eclipse Angels Agency, você é a pessoa que recruta, capacita e acompanha uma equipe de streamers, e ganha pelos resultados delas." : "{T.roleSub}",
      ofBadge: lang === 'pt' ? "O que oferecemos" : "Lo que ofrecemos",
      ofH2: lang === 'pt' ? "Tudo o que você precisa para ter sucesso" : "{T.ofH2}",
      ofSub: lang === 'pt' ? "Como manager da Eclipse Angels Agency você terá acesso a todos esses recursos e mais" : "{T.ofSub}",
      perBadge: lang === 'pt' ? "Quem buscamos?" : "¿A quién buscamos?",
      perH2: lang === 'pt' ? "O perfil do Manager ideal" : "El perfil del Manager ideal",
      perSub: lang === 'pt' ? "Você não precisa de experiência em gestão. Se tiver as atitudes certas e vontade de construir algo próprio, nós ensinamos tudo." : "{T.perSub}",
      perProBadge: lang === 'pt' ? "Buscamos pessoas que sejam..." : "Buscamos personas que sean...",
      ctaH2: lang === 'pt' ? "Pronto para liderar sua agência?" : "{T.ctaH2}",
      ctaDesc: lang === 'pt' ? "Dê o primeiro passo hoje. Entre em contato e explicamos todo o processo para começar a construir sua equipe de streamers com o apoio da Eclipse Angels Agency." : "{T.ctaDesc}",
      ctaApply: lang === 'pt' ? "{T.ctaApply}" : "{T.ctaApply}",
      ctaStreamer: lang === 'pt' ? "Ser Streamer primeiro" : "{T.ctaStreamer}",
    };
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
              <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.1]">
              {T.h1a}<br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{T.h1b}</span>
            </h1>
            <p className="text-white/55 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
              {T.sub}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20ser%20Manager%20en%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-7 py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                Quiero ser Manager <ArrowRight className="w-4 h-4" />
              </a>
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
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">{T.roleBadge}</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-3">Tu rol como líder de agencia</h2>
              <p className="text-white/45 text-sm max-w-xl mx-auto">Como manager de Eclipse Angels Agency, eres la persona que recluta, capacita y acompaña a un equipo de streamers, y ganas por sus resultados.</p>
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
                {lang === 'pt' ? '💡 ' : '💡 '}<strong>{lang === 'pt' ? 'Renda escalável:' : 'Ingresos escalables:'}</strong> {lang === 'pt' ? 'Quanto mais streamers tiver na sua equipe, mais você ganha. Não há limite de equipe nem de renda.' : 'Cuantas más streamers tenga tu equipo, más ganas. No hay límite de equipo ni de ingresos.'}
              </p>
            </div>
          </div>
        </section>

        {/* Lo que ofrecemos */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-5xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">{T.ofBadge}</span>
              <h2 className="text-3xl font-extrabold mt-2 mb-3">Todo lo que necesitas para triunfar</h2>
              <p className="text-white/45 text-sm">Como manager de Eclipse Angels Agency tendrás acceso a todos estos recursos y más</p>
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
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70">{T.perBadge}</span>
                <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">{T.perH2.split(' ').slice(0,-2).join(' ')}<br /><span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{lang === 'pt' ? 'Manager ideal' : 'Manager ideal'}</span></h2>
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
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-4">{T.perProBadge}</p>
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
                    <span className="font-bold text-sm text-amber-300">{lang === 'pt' ? 'Por que ser manager?' : '¿Por qué ser manager?'}</span>
                  </div>
                  <p className="text-white/45 text-xs leading-relaxed">{lang === 'pt' ? 'Os managers da Eclipse Angels Agency geram renda recorrente semanal pelos ganhos da equipe. É uma fonte de renda escalável e sustentável a longo prazo.' : 'Los managers de Eclipse Angels Agency generan ingresos recurrentes semanales por las ganancias de su equipo. Es una fuente de ingresos escalable y sostenible a largo plazo.'}</p>
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
              Da el primer paso hoy. Contáctanos y te explicamos todo el proceso para empezar a construir tu equipo de streamers con el respaldo de Eclipse Angels Agency.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20aplicar%20como%20Manager%20en%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                {T.ctaApply} <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/ser-streamer"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
                Ser Streamer primero
              </Link>
            </div>
          </div>
        </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          crear agencia de streamers · crear agencia Waha · crear agencia Howdy · crear agencia Layla · cómo crear mi primera agencia de streamers · primera agencia de streamers · agencia de streamers Waha · agencia de streamers Howdy · agencia de streamers Layla · abrir agencia de streaming · ser manager de streamers · manager streaming · ganar comisiones streamers · ingreso pasivo streamers · crear equipo de streamers · reclutar streamers · gestionar streamers · negocio online desde casa · negocio sin inversión · emprendimiento digital · agencia Waha Layla Howdy · cómo montar una agencia de streamers · Eclipse Angels agencia · ganar dinero gestionando streamers
        </p>
      </section>
      </div>
    );
  }
  