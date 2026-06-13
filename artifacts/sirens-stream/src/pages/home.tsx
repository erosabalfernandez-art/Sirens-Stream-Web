import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
  import { Link } from "wouter";
  import { motion, AnimatePresence } from "framer-motion";
  import {DollarSign, Shield, Smartphone, Users, Clock, TrendingUp, CheckCircle2, Zap, Star, CreditCard, MessageCircle, ArrowRight, Globe, Award, ChevronLeft, ChevronRight, Wifi, Camera, Heart} from "lucide-react";
  import { useGetAgencyStats } from "@/lib/api-client";
  import { useShowAgencia } from "@/hooks/useShowAgencia";

  const slides_es = [
    {
      badge: "Bienvenida a Eclipse Angels Agency",
      title: "Agencia de Streamers",
      highlight: "& Chat Hostess",
      sub: "Cero Inversión · Desde Casa · En Dólares",
      desc: "Conectamos a mujeres mayores de 18 años con las mejores plataformas internacionales. Genera ingresos reales usando solo tu celular.",
      cta: { label: "Unirme a la Agencia", href: "/ser-streamer" },
      accent: "from-blue-600 to-purple-600",
      glow: "bg-blue-600/10",
      bg: "/images/slide-bg-1.png",
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
      title: "Waha, Layla & Howdy",
      highlight: "Plataformas Líderes",
      sub: "Las apps más rentables del mercado",
      desc: "Trabajamos con las plataformas internacionales más seguras y rentables. Retiros semanales, meta mínima baja y soporte constante.",
      cta: { label: "Ver Apps Disponibles", href: "/apps" },
      accent: "from-pink-500 to-red-500",
      glow: "bg-pink-600/10",
      bg: "/images/slide-bg-3.png",
      items: ["Waha: mensajes + videollamadas", "Layla: mensajes + salas de audio", "Howdy: videollamadas + live + match"],
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

  const benefits_es = [
    { icon: DollarSign, title: "Cobras cada semana", desc: "Tus ganancias llegan en dólares cada semana, sin esperas ni excusas." },
    { icon: Shield, title: "Empiezas sin poner dinero", desc: "No necesitas invertir nada. Solo tu celular y tus ganas de trabajar." },
    { icon: Smartphone, title: "Solo necesitas tu celular", desc: "Trabaja desde tu casa, a cualquier hora, sin salir ni comprar nada." },
    { icon: Users, title: "Siempre tienes a alguien", desc: "Hay una persona disponible para ayudarte en cualquier momento del día." },
    { icon: Clock, title: "Tú pones tu horario", desc: "Decides cuándo trabajar y cuánto tiempo. El trabajo se adapta a ti." },
    { icon: TrendingUp, title: "Creces con nosotras", desc: "Entrenamiento gratis, bonos por resultados y más oportunidades cuanto mejor te va." },
  ];

  const steps_es = [
    { n: "01", title: "Escríbenos", desc: "Mándanos un mensaje por WhatsApp. Te contestamos en menos de 24 horas." },
    { n: "02", title: "Te enseñamos todo", desc: "Una de nuestras guías te explica cómo instalar la app y cómo empezar a ganar desde el primer día." },
    { n: "03", title: "Empieza a ganar", desc: "Abres la app, chateas con personas de cualquier parte del mundo y empiezas a acumular dinero." },
    { n: "04", title: "Recibes tu pago", desc: "Cada semana te mandamos lo que ganaste, al método de cobro que más te convenga." },
  ];

  const earnings_es = [
    { label: "$10 – $50", sub: "lo que puedes ganar en un día" },
    { label: "$100 – $500", sub: "a la semana si eres constante" },
    { label: "$1,000 – $2,000", sub: "al mes si le dedicas tiempo" },
  ];

  const requirements_es = [
    { icon: Heart, text: "Tener 18 años o más" },
    { icon: Camera, text: "Un celular con buena cámara" },
    { icon: Wifi, text: "Tener WiFi o datos en tu celular" },
    { icon: Clock, text: "4–5 horas libres al día" },
    { icon: Star, text: "Ganas de aprender y mejorar" },
    { icon: Shield, text: "No necesitas experiencia" },
  ];

  const infoCards_es = [
    { icon: Users, title: "Sobre Nosotros", desc: "Conoce nuestra historia y misión", href: "/nosotros" },
    { icon: MessageCircle, title: "Contacto Directo", desc: "Habla con nuestro equipo hoy", href: "/contacto" },
    { icon: Star, title: "Preguntas Frecuentes", desc: "Resolvemos todas tus dudas", href: "/nosotros" },
    { icon: CreditCard, title: "Métodos de Pago", desc: "Múltiples formas de recibir tu dinero", href: "/pagos" },
  ];


  const slides_pt = [
    { badge: "Bem-vinda à Eclipse Angels Agency", title: "Agência de Streamers", highlight: "& Chat Hostess", sub: "Zero Investimento · Em Casa · Em Dólares", desc: "Conectamos mulheres maiores de 18 anos com as melhores plataformas internacionais. Gere renda real usando apenas seu celular.", cta: { label: "Entrar na Agência", href: "/ser-streamer" }, accent: "from-blue-600 to-purple-600", glow: "bg-blue-600/10", bg: "/images/slide-bg-1.png", items: ["Sem investimento inicial", "Pagamentos semanais garantidos", "Suporte 24/7"] },
    { badge: "Potencial de Ganhos", title: "Ganhe Até", highlight: "$2.000 USD/mês", sub: "Muitas das nossas streamers superam $500 semanais", desc: "Com constância e a orientação da nossa equipe, sua renda cresce semana a semana. Você começa do zero e vai longe.", cta: { label: "Ver como funciona", href: "/ser-streamer" }, accent: "from-emerald-500 to-teal-600", glow: "bg-emerald-600/10", bg: "/images/slide-bg-2.png", items: ["$10–$50 USD por dia", "$100–$500 USD semanais", "$1.000–$2.000 USD/mês"] },
    { badge: "Apps Verificados", title: "Waha, Layla & Howdy", highlight: "Plataformas Líderes", sub: "Os apps mais rentáveis do mercado", desc: "Trabalhamos com as plataformas internacionais mais seguras e rentáveis. Saques semanais, meta mínima baixa e suporte constante.", cta: { label: "Ver Apps Disponíveis", href: "/apps" }, accent: "from-pink-500 to-red-500", glow: "bg-pink-600/10", bg: "/images/slide-bg-3.png", items: ["Waha: mensagens + videochamadas", "Layla: mensagens + salas de áudio", "Howdy: videochamadas + live + match"] },
    { badge: "Sua Agência, Seu Time", title: "Crie Sua Própria", highlight: "Agência de Streamers", sub: "Lidere um time e multiplique sua renda", desc: "Já conhece o mundo do streaming? Forme seu próprio time, ganhe comissões e construa seu negócio do zero com nosso apoio.", cta: { label: "Criar minha Agência", href: "/crear-agencia" }, accent: "from-amber-500 to-orange-500", glow: "bg-amber-600/10", bg: "/images/slide-bg-4.png", items: ["Capacitação completa", "Bônus por desempenho", "Ferramentas de gestão"] },
  ];
  const benefits_pt = [
    { icon: DollarSign, title: "Recebe toda semana", desc: "Seus ganhos chegam em dólares toda semana, sem esperas nem desculpas." },
    { icon: Shield, title: "Começa sem investir nada", desc: "Não precisa investir nada. Só seu celular e vontade de trabalhar." },
    { icon: Smartphone, title: "Só precisa do seu celular", desc: "Trabalhe de casa, a qualquer hora, sem sair nem comprar nada." },
    { icon: Users, title: "Sempre tem alguém", desc: "Há alguém disponível para te ajudar a qualquer momento do dia." },
    { icon: Clock, title: "Você define seu horário", desc: "Decide quando trabalhar e por quanto tempo. O trabalho se adapta a você." },
    { icon: TrendingUp, title: "Cresce com a gente", desc: "Treinamento grátis, bônus por resultados e mais oportunidades quanto melhor for seu desempenho." },
  ];
  const steps_pt = [
    { n: "01", title: "Fale conosco", desc: "Mande uma mensagem pelo WhatsApp. Respondemos em menos de 24 horas." },
    { n: "02", title: "Ensinamos tudo", desc: "Uma de nossas guias te explica como instalar o app e como começar a ganhar desde o primeiro dia." },
    { n: "03", title: "Começa a ganhar", desc: "Você abre o app, conversa com pessoas de qualquer parte do mundo e começa a acumular dinheiro." },
    { n: "04", title: "Recebe seu pagamento", desc: "Toda semana te enviamos o que você ganhou, pelo método de recebimento mais conveniente." },
  ];
  const earnings_pt = [
    { label: "$10 – $50", sub: "o que você pode ganhar em um dia" },
    { label: "$100 – $500", sub: "por semana se for constante" },
    { label: "$1.000 – $2.000", sub: "por mês se dedicar tempo" },
  ];
  const requirements_pt = [
    { icon: Heart, text: "Ter 18 anos ou mais" },
    { icon: Camera, text: "Um celular com boa câmera" },
    { icon: Wifi, text: "Ter WiFi ou dados no celular" },
    { icon: Clock, text: "4–5 horas livres por dia" },
    { icon: Star, text: "Vontade de aprender e melhorar" },
    { icon: Shield, text: "Não precisa de experiência" },
  ];
  const infoCards_pt = [
    { icon: Users, title: "Sobre Nós", desc: "Conheça nossa história e missão", href: "/nosotros" },
    { icon: MessageCircle, title: "Contato Direto", desc: "Fale com nossa equipe hoje", href: "/contacto" },
    { icon: Star, title: "Perguntas Frequentes", desc: "Respondemos todas as suas dúvidas", href: "/nosotros" },
    { icon: CreditCard, title: "Métodos de Pagamento", desc: "Múltiplas formas de receber seu dinheiro", href: "/pagos" },
  ];
  export default function Home() {
    const showAgencia = useShowAgencia();
    const { lang } = useLanguage();
    const slides = lang === 'pt' ? slides_pt : slides_es;
    const benefits = lang === 'pt' ? benefits_pt : benefits_es;
    const steps = lang === 'pt' ? steps_pt : steps_es;
    const earnings = lang === 'pt' ? earnings_pt : earnings_es;
    const requirements = lang === 'pt' ? requirements_pt : requirements_es;
    const infoCards = lang === 'pt' ? infoCards_pt : infoCards_es;

    const T = {
      yearsLabel: lang === 'pt' ? 'Anos exp.' : 'Años exp.',
      trustPoints: lang === 'pt'
        ? ["Sem investimento · Sem experiência", "Pagamentos semanais em dólares", "Suporte e capacitação grátis"]
        : ["Sin inversión · Sin experiencia", "Pagos semanales en dólares", "Soporte y capacitación gratis"],
      stats: lang === 'pt'
        ? [
            { val: "Suporte 24/7", label: "Sempre disponíveis para te ajudar" },
            { val: "Pagamentos Semanais", label: "Recebe pontual toda semana em dólares" },
            { val: "$0 Investimento", label: "Começa sem gastar nada" },
            { val: "Todos os Países", label: "Operamos em nível mundial" },
          ]
        : [
            { val: "Soporte 24/7", label: "Siempre disponibles para ayudarte" },
            { val: "Pagos Semanales", label: "Cobras puntual cada semana en dólares" },
            { val: "$0 Inversión", label: "Empieza sin gastar nada" },
            { val: "Todos los Países", label: "Operamos a nivel mundial" },
          ],
      whyBadge: lang === 'pt' ? "Por que nos escolher?" : "¿Por qué elegirnos?",
      whyH2a: lang === 'pt' ? "A plataforma líder para" : "La plataforma líder para",
      whyH2b: lang === 'pt' ? "gerar renda online" : "generar ingresos online",
      whyDesc: lang === 'pt'
        ? "Na Eclipse Angels Agency conectamos mulheres maiores de 18 anos com os melhores apps de streaming e chat ao vivo, para que gerem renda real em dólares de casa, sem experiência e com total acompanhamento."
        : "En Eclipse Angels Agency conectamos a mujeres mayores de 18 años con las mejores apps de streaming y chat en vivo, para que generen ingresos reales en dólares desde casa, sin experiencia y con total acompañamiento.",
      oppBadge: lang === 'pt' ? "Esta oportunidade é para você?" : "¿Esta oportunidad es para ti?",
      oppH2a: lang === 'pt' ? "Ganhe dinheiro real de casa" : "Gana dinero real desde casa",
      oppH2b: lang === 'pt' ? "sendo você mesma" : "siendo tú misma",
      oppDesc: lang === 'pt'
        ? "Na Eclipse Angels Agency te ajudamos a ganhar dinheiro em dólares pelo celular. Sem colocar um centavo, sem saber nada do assunto e com total discrição."
        : "En Eclipse Angels Agency te ayudamos a ganar dinero en dólares desde tu celular. Sin poner un peso, sin saber nada del tema y con total discreción.",
      joinBtn: lang === 'pt' ? "Entro agora" : "Me uno ahora",
      earningsLabel: lang === 'pt' ? "¿Quanto você pode ganhar?" : "¿Cuánto puedes ganar?",
      miniCards: lang === 'pt'
        ? [
            { label: "Seu horário, suas regras", icon: "Clock" },
            { label: "Ninguém sabe que você trabalha", icon: "Shield" },
            { label: "Recebe toda semana", icon: "DollarSign" },
          ]
        : [
            { label: "Tu horario, tus reglas", icon: "Clock" },
            { label: "Nadie sabe que trabajas", icon: "Shield" },
            { label: "Cobras cada semana", icon: "DollarSign" },
          ],
      howBadge: lang === 'pt' ? "É assim tão fácil" : "Así de fácil es",
      howH2: lang === 'pt' ? "Como começo?" : "¿Cómo empiezo?",
      howSub: lang === 'pt' ? "Em 4 passos simples você já está ganhando dinheiro real" : "En 4 pasos sencillos ya estás ganando dinero real",
      joinBadge: lang === 'pt' ? "Entre na Eclipse Angels Agency" : "Únete a Eclipse Angels Agency",
      joinTitle: lang === 'pt' ? "Escolha seu caminho" : "Elige tu camino",
      streamerCardH3: lang === 'pt' ? "Torne-se Streamer" : "Conviértete en Streamer",
      streamerCardDesc: lang === 'pt' ? "Ganhe dinheiro em dólares trabalhando de casa com seu celular. Sem investimento, sem experiência prévia." : "Gana dinero en dólares trabajando desde casa con tu celular. Sin inversión, sin experiencia previa.",
      streamerCardBtn: lang === 'pt' ? "Ver benefícios" : "Ver beneficios",
      agenciaCardH3: lang === 'pt' ? "Crie sua Agência" : "Crea tu Agencia",
      agenciaCardDesc: lang === 'pt' ? "Lidere um time de streamers e multiplique sua renda. Torne-se manager e construa seu negócio." : "Lidera un equipo de streamers y multiplica tus ingresos. Conviértete en manager y construye tu negocio.",
      agenciaCardBtn: lang === 'pt' ? "Ver requisitos" : "Ver requisitos",
    };
    const { data: stats } = useGetAgencyStats();
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(1);

    // Exclude the "crear agencia" slide when the section is disabled
    const activeSlides = showAgencia ? slides : slides.filter(s => s.cta.href !== '/crear-agencia');

    // Clamp current index if activeSlides shrinks (e.g. agencia slide removed)
    useEffect(() => {
      setCurrent(c => c >= activeSlides.length ? 0 : c);
    }, [activeSlides.length]);

    useEffect(() => {
      const t = setInterval(() => {
        setDirection(1);
        setCurrent((c) => (c + 1) % activeSlides.length);
      }, 5000);
      return () => clearInterval(t);
    }, [activeSlides.length]);

    const goTo = (i: number) => {
      setDirection(i > current ? 1 : -1);
      setCurrent(i);
    };
    const prev = () => { setDirection(-1); setCurrent((c) => (c - 1 + activeSlides.length) % activeSlides.length); };
    const next = () => { setDirection(1); setCurrent((c) => (c + 1) % activeSlides.length); };

    const slide = activeSlides[current] ?? activeSlides[0];

    return (
      <div className="min-h-screen bg-[#07070f] text-white">

        {/* ── HERO SLIDER ── */}
        <section className="relative flex items-center overflow-hidden" style={{ minHeight: "60vh" }}>
          {/* Animated background image */}
            <AnimatePresence initial={false} mode="wait">
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
            <AnimatePresence initial={false} mode="wait">
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

          {/* Floating social sidebar removed — global FloatingSocials used instead */}

          {/* Slide content */}
          <div className="relative z-10 max-w-7xl mx-auto px-5 py-14 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: text */}
              <AnimatePresence initial={false} mode="wait" custom={direction}>
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
                    <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                      {lang === 'pt' ? 'Contato' : 'Contactar'}
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Right: animated cards column */}
              <AnimatePresence initial={false} mode="wait" custom={direction}>
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
                      {slide.appIcons ? (
                          <div className="flex gap-3">
                            {slide.appIcons.map((src: string, idx: number) => (
                              <img key={idx} src={src} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20 shadow-lg" />
                            ))}
                          </div>
                        ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${slide.accent} flex items-center justify-center mb-4`}>
                        <Zap className="w-6 h-6 text-white" />
                        </div>
                        )}
                      </div>
                      <p className="font-extrabold text-2xl text-white mb-1">{slide.highlight}</p>
                      <p className="text-white/50 text-sm">{slide.sub}</p>
                    </div>
                  {/* Stats mini cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: `+${stats?.streamersRepresented ?? 500}`, label: "Streamers" },
                      { val: `+${stats?.yearsActive ?? 5}`, label: T.yearsLabel },
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
                    {T.trustPoints.map((t, i) => (
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
                {activeSlides.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === current ? "w-8 bg-blue-400" : "w-3 bg-white/20"}`} />
                ))}
              </div>
              <button onClick={next} className="w-9 h-9 rounded-full bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/15 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="bg-[#0a0a16] border-y border-blue-500/10 py-8">
          <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              ...T.stats
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
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.whyBadge}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                {T.whyH2a}<br />
                <span className="gradient-text">{T.whyH2b}</span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto">{T.whyDesc}</p>
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
                  <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.oppBadge}</span>
                </div>
                <h2 className="text-4xl font-bold mb-4">
                  {T.oppH2a} <span className="gradient-text">{T.oppH2b}</span>
                </h2>
                <p className="text-white/50 mb-6 leading-relaxed">{T.oppDesc}</p>
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
                  {T.joinBtn} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-4">
                <div className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-4">{T.earningsLabel}</p>
                  {earnings.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                      <span className="text-white/50 text-sm">{e.sub}</span>
                      <span className="text-blue-400 font-extrabold">{e.label} USD</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[Clock, Shield, DollarSign].map((Icon, i) => (
                    <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-xl p-4 text-center">
                      <Icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <p className="text-white/60 text-xs">{T.miniCards[i].label}</p>
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
                <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.howBadge}</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">{T.howH2}</h2>
              <p className="text-white/50">{T.howSub}</p>
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
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">{T.joinBadge}</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">{T.joinTitle}</h2>
            </div>
            <div className={`grid grid-cols-1 ${showAgencia ? 'md:grid-cols-2' : ''} gap-6 max-w-4xl mx-auto`}>
              <div className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-8 flex flex-col hover:border-blue-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">{T.streamerCardH3}</h3>
                <p className="text-white/50 text-sm mb-6 flex-1">{T.streamerCardDesc}</p>
                <Link href="/ser-streamer"
                  className="flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                  {T.streamerCardBtn} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {showAgencia && (
              <div className="bg-[#0d0d1e] border border-amber-500/15 rounded-2xl p-8 flex flex-col hover:border-amber-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-5">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-2xl font-extrabold mb-2">{T.agenciaCardH3}</h3>
                <p className="text-white/50 text-sm mb-6 flex-1">{T.agenciaCardDesc}</p>
                <Link href="/crear-agencia"
                  className="flex items-center gap-2 justify-center bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all">
                  {T.agenciaCardBtn} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              )}
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
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          Eclipse Angels Agency · agencia de streamers · agencia de chat hostess · trabajar desde casa · trabajo online · trabajo remoto · trabajo sin inversión · trabajo online sin inversión · oportunidad de trabajo · empleo para mujeres · streamers latinas · ganar dinero desde casa · ganar dólares desde casa · trabajo desde celular · ingreso pasivo · emprendimiento online · agencia Waha · agencia Layla · agencia Howdy · chat hostess · ser streamer · trabajo sin experiencia · trabajo flexible · latinoamérica · trabajo en dólares
        </p>
      </section>

      </div>
    );
  }
  