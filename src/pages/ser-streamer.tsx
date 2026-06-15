import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
  import {CheckCircle2, MessageCircle, Video, Radio, DollarSign, Shield, Smartphone, Users, Clock, ArrowRight, Star, Zap, TrendingUp} from "lucide-react";

  const activities_es = [
    {
      icon: MessageCircle,
      title: "Chat & Mensajes",
      desc: "Tu herramienta principal de trabajo. Conversa de forma personalizada con usuarios de todo el mundo enviando mensajes, audios y respondiendo a tiempo para maximizar tus ganancias.",
      color: "bg-blue-500/15 border-blue-500/20 text-blue-400",
    },
    {
      icon: Video,
      title: "Videollamadas Match (opcionales)",
      desc: "En apps como Waha y Howdy puedes hacer videollamadas match y privadas de forma completamente opcional. A mayor tiempo en video, mayor ganancia por minuto.",
      color: "bg-purple-500/15 border-purple-500/20 text-purple-400",
    },
    {
      icon: Radio,
      title: "Salas de Audio y Lives",
      desc: "Participa en salas grupales de voz o transmisiones en vivo. Los usuarios te regalan diamantes y monedas mientras interactúas con ellos en tiempo real.",
      color: "bg-pink-500/15 border-pink-500/20 text-pink-400",
    },
  ];

  const tips_es = [
    "Sé constante: más tiempo en línea = más ganancias",
    "Responde rápido: la tasa de respuesta mejora tus bonos",
    "Personaliza cada conversación: los usuarios VIP pagan más",
    "Establece un horario fijo para crear hábito",
    "Aprovecha las metas diarias y bonos de bonificación",
    "Pide ayuda a tu tutora cuando tengas dudas — estamos aquí",
  ];

  const requisitos_es = [
    { icon: Users, text: "Ser mujer mayor de 18 años" },
    { icon: Smartphone, text: "Smartphone con buena cámara" },
    { icon: Shield, text: "Conexión WiFi estable o datos" },
    { icon: Clock, text: "4–5 horas disponibles al día" },
    { icon: Star, text: "Actitud positiva y compromiso" },
    { icon: Zap, text: "Sin experiencia previa requerida" },
  ];

  const earnings_es = [
    { val: "$10–$50 USD", label: "por día en promedio" },
    { val: "$100–$500 USD", label: "semanales con constancia" },
    { val: "$1,000–$2,000 USD", label: "mensuales con dedicación" },
  ];


  const activities_pt = [
    { icon: MessageCircle, title: "Chat & Mensagens", desc: "Sua principal ferramenta de trabalho. Converse de forma personalizada com usuários do mundo todo enviando mensagens, áudios e respondendo a tempo para maximizar seus ganhos.", color: "bg-blue-500/15 border-blue-500/20 text-blue-400" },
    { icon: Video, title: "Videochamadas Match (opcionais)", desc: "Em apps como Waha e Howdy você pode fazer videochamadas match e privadas de forma totalmente opcional. Quanto mais tempo em vídeo, maior o ganho por minuto.", color: "bg-purple-500/15 border-purple-500/20 text-purple-400" },
    { icon: Radio, title: "Salas de Áudio e Lives", desc: "Participe de salas de voz em grupo ou transmissões ao vivo. Os usuários enviam diamantes e moedas enquanto você interage com eles em tempo real.", color: "bg-pink-500/15 border-pink-500/20 text-pink-400" },
  ];
  const tips_pt = [
    "Seja constante: mais tempo online = mais ganhos",
    "Responda rápido: a taxa de resposta melhora seus bônus",
    "Personalize cada conversa: usuários VIP pagam mais",
    "Estabeleça um horário fixo para criar hábito",
    "Aproveite as metas diárias e bônus de bonificação",
    "Peça ajuda à sua tutora quando tiver dúvidas — estamos aqui",
  ];
  const requisitos_pt = [
    { icon: Users, text: "Ser mulher maior de 18 anos" },
    { icon: Smartphone, text: "Smartphone com boa câmera" },
    { icon: Shield, text: "Conexão WiFi estável ou dados" },
    { icon: Clock, text: "4–5 horas disponíveis por dia" },
    { icon: Star, text: "Atitude positiva e comprometimento" },
    { icon: Zap, text: "Sem experiência prévia necessária" },
  ];
  const earnings_pt = [
    { val: "$10–$50 USD", label: "por dia em média" },
    { val: "$100–$500 USD", label: "semanais com constância" },
    { val: "$1.000–$2.000 USD", label: "mensais com dedicação" },
  ];
  export default function SerStreamer() {
    const { lang } = useLanguage();
    const activities = lang === 'pt' ? activities_pt : activities_es;
    const tips = lang === 'pt' ? tips_pt : tips_es;
    const requisitos = lang === 'pt' ? requisitos_pt : requisitos_es;
    const earnings = lang === 'pt' ? earnings_pt : earnings_es;
    const T = {
      badge: lang === 'pt' ? "Trabalhe de Casa em Dólares" : "Trabaja desde Casa en Dólares",
      h1Hero: lang === 'pt' ? "Seu Celular é sua" : "Tu Celular es tu",
      h1HeroHighlight: lang === 'pt' ? "Ferramenta de Trabalho" : "Herramienta de Trabalho",
      heroDesc: lang === 'pt' ? "Na Eclipse Angels Agency você pode gerar renda real em dólares no conforto da sua casa usando apenas seu smartphone. Sem investimento, sem experiência prévia, com total acompanhamento." : "En Eclipse Angels Agency puedes generar ingresos reales en dólares desde la comodidad de tu hogar usando únicamente tu smartphone. Sin inversión, sin experiencia previa, con total acompañamiento.",
      ctaJoin: lang === 'pt' ? "Quero participar" : "Quiero unirme",
      ctaApps: lang === 'pt' ? "Apps Disponíveis" : "Apps Disponibles",
      whatBadge: lang === 'pt' ? "No que consiste o trabalho?" : "¿En qué consiste el trabajo?",
      whatH2: lang === 'pt' ? "O que faz uma Streamer na Eclipse Angels" : "Lo que hace una Streamer en Eclipse Angels",
      whatDesc: lang === 'pt' ? "Você interage com usuários pelo celular através de mensagens, áudio e vídeo opcionais, e recebe diamantes e moedas que se convertem em dólares." : "Interactúas con usuarios desde tu celular a través de mensajes, audio y video opcionales, y recibes diamantes y monedas que se convierten en dólares.",
      privacyNote: lang === 'pt' ? "✨ Privacidade garantida: Não precisa expor suas redes sociais pessoais. Você usa um perfil exclusivo para o app com nome e foto diferentes dos seus." : "✨ Privacidad garantizada: No necesitas exponer tus redes sociales personales. Usas un perfil exclusivo para la app con nombre y foto distintos a los tuyos.",
      reqBadge: lang === 'pt' ? "Quem buscamos?" : "¿A quién buscamos?",
      reqH2a: lang === 'pt' ? "Requisitos para" : "Requisitos para",
      reqH2b: lang === 'pt' ? "participar" : "unirte",
      reqDesc: lang === 'pt' ? "Você não precisa de experiência prévia. Só precisa de vontade de trabalhar e crescer. Nós ensinamos tudo do zero e acompanhamos cada passo." : "No necesitas experiencia previa. Solo necesitas las ganas de trabajar y crecer. Nosotras te capacitamos desde cero y te acompañamos en cada paso.",
      earningsBadge: lang === 'pt' ? "Potencial de Ganhos" : "Potencial de Ganancias",
      tipsTit: lang === 'pt' ? "Dicas para maximizar seus ganhos" : "Consejos para maximizar tus ganancias",
      stepsBadge: lang === 'pt' ? "Processo de Entrada" : "Proceso de Ingreso",
      stepsH2: lang === 'pt' ? "Como começo?" : "¿Cómo empiezo?",
      stepsSub: lang === 'pt' ? "Em poucos passos você estará gerando renda pelo celular" : "En pocos pasos estarás generando ingresos desde tu celular",
      steps: lang === 'pt' ? [
        { n: "01", t: "Entre em Contato", d: "Fale conosco pelo WhatsApp ou Instagram. Respondemos em menos de 24h." },
        { n: "02", t: "Entrevista Express", d: "Uma breve conversa para te conhecer e explicar tudo sem compromisso." },
        { n: "03", t: "Instalação e Cadastro", d: "Sua tutora te guia passo a passo na instalação e cadastro no app." },
        { n: "04", t: "Começa a Ganhar!", d: "Você começa a interagir e recebe seu primeiro pagamento na semana." },
      ] : [
        { n: "01", t: "Contáctanos", d: "Escríbenos por WhatsApp o Instagram. Respondemos en menos de 24h." },
        { n: "02", t: "Entrevista Express", d: "Una breve conversación para conocerte y explicarte todo sin compromiso." },
        { n: "03", t: "Instalación y Registro", d: "Tu tutora te guía paso a paso en la instalación y registro en la app." },
        { n: "04", t: "¡Empieza a Ganar!", d: "Comienzas a interactuar y recibes tu primer pago en la semana." },
      ],
      menBadge: lang === 'pt' ? "É homem? Também tem lugar aqui" : "¿Eres hombre? También tienes lugar aquí",
      menH3: lang === 'pt' ? "Os homens também podem ganhar na" : "Los hombres también pueden ganar en",
      menDesc: lang === 'pt' ? "Você pode participar como recrutador — indique mulheres para a agência e ganhe comissão por cada uma que começar a trabalhar. Também pode se cadastrar em alguns de nossos aplicativos. De qualquer forma, fazendo parte da nossa equipe, você sempre sairá beneficiado." : "Puedes unirte como reclutador — refiere chicas a la agencia y gana comisión por cada una que empiece a trabajar. También puedes registrarte en algunas de nuestras aplicaciones. Sea como sea, siendo parte de nuestro equipo, siempre saldrás beneficiado.",
      menBtn: lang === 'pt' ? "Quero ser recrutador" : "Quiero ser reclutador",
      ctaH2: lang === 'pt' ? "Pronta para começar?" : "¿Lista para empezar?",
      ctaDesc: lang === 'pt' ? "Milhares de mulheres já geram renda real em dólares com a Eclipse Angels Agency. Seu momento é agora. Fale conosco e comece esta semana." : "Miles de mujeres ya generan ingresos reales en dólares con Eclipse Angels Agency. Tu momento es ahora. Escríbenos y empieza esta semana.",
      ctaContact: lang === 'pt' ? "Entrar em contato" : "Contactar ahora",
    };
    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">

        {/* Header */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-[600px] h-[400px] rounded-full bg-blue-600/7 blur-[100px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.1]">
              {T.h1Hero}<br />
              <span className="gradient-text">{T.h1HeroHighlight}</span>
            </h1>
            <p className="text-white/55 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
              {T.heroDesc}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                {T.ctaJoin} <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/apps"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                {T.ctaApps}
              </Link>
            </div>
          </div>
        </section>

        {/* ¿Qué hace una streamer? */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">{T.whatBadge}</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-3">{T.whatH2}</h2>
              <p className="text-white/45 max-w-xl mx-auto text-sm">{T.whatDesc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {activities.map((a, i) => (
                <div key={i} className={`bg-[#0d0d1e] border ${a.color.split(' ')[1]} rounded-2xl p-6`}>
                  <div className={`w-12 h-12 rounded-xl ${a.color.split(' ')[0]} border ${a.color.split(' ')[1]} flex items-center justify-center mb-4`}>
                    <a.icon className={`w-5 h-5 ${a.color.split(' ')[2]}`} />
                  </div>
                  <h3 className="font-bold text-white mb-2">{a.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-5 text-center">
              <p className="text-blue-200/70 text-sm">{T.privacyNote}</p>
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">{T.reqBadge}</span>
                <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">{T.reqH2a} <span className="gradient-text">{T.reqH2b}</span></h2>
                <p className="text-white/50 text-sm mb-7 leading-relaxed">
                  {T.reqDesc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {requisitos.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-sm text-white/65">
                      <r.icon className="w-4 h-4 text-blue-400 shrink-0" />
                      {r.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">{T.earningsBadge}</span>
                  </div>
                  {earnings.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                      <span className="text-white/45 text-sm">{e.label}</span>
                      <span className="text-blue-400 font-extrabold">{e.val}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5">
                  <h4 className="font-bold text-white text-sm mb-3">{T.tipsTit}</h4>
                  <div className="space-y-2">
                    {tips.slice(0, 4).map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 bg-[#0a0a16]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70">{T.stepsBadge}</span>
              <h2 className="text-3xl font-extrabold mt-2 mb-3">{T.stepsH2}</h2>
              <p className="text-white/45 text-sm">{T.stepsSub}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {T.steps.map((s, i) => (
                <div key={i} className="relative bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 hover:border-blue-500/25 transition-colors">
                  {i < 3 && <div className="hidden lg:block absolute top-6 -right-2.5 text-blue-500/30 text-lg z-10">→</div>}
                  <p className="text-blue-500/35 font-extrabold text-4xl mb-3">{s.n}</p>
                  <h3 className="font-bold text-white mb-1.5 text-sm">{s.t}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hombres bienvenidos */}
        <section className="py-14 bg-[#07070f]">
          <div className="max-w-4xl mx-auto px-5">
            <div className="relative bg-gradient-to-r from-purple-900/30 to-blue-900/20 border border-purple-500/25 rounded-3xl p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[200px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/25 rounded-full px-3 py-1 mb-3">
                    <span className="text-purple-300 text-[11px] font-bold uppercase tracking-wider">{T.menBadge}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                    {T.menH3} <span className="text-purple-400">Eclipse Angels Agency</span>
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed mb-4">
                    {T.menDesc}
                  </p>
                  <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency%20como%20reclutador" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    {T.menBtn} <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 bg-[#07070f]">
          <div className="max-w-xl mx-auto px-5 text-center">
            <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-5" />
            <h2 className="text-3xl font-extrabold mb-3">{T.ctaH2}</h2>
            <p className="text-white/50 text-sm mb-7 leading-relaxed">
              {T.ctaDesc}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                {T.ctaContact} <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/apps"
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
                {T.ctaApps} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-10 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/10 leading-loose select-none pointer-events-none">
          trabajar en Waha · trabajar en Howdy · trabajar en Layla · cómo ser streamer · ser streamer en Waha · ser streamer en Howdy · ser streamer en Layla · streamer latina · streamers latinas · streamer desde casa · ser streamer desde cero · trabajo desde casa · trabajo online · trabajo remoto · trabajo sin inversión · trabajo online sin inversión · ganar dinero desde casa · ganar dólares desde casa · ganar dólares sin salir de casa · ganar dólares en Cuba · ganar dólares en Colombia · ganar dólares en Venezuela · ganar dólares en Mexico · ganar dólares en Argentina · chat hostess Waha · chat hostess Howdy · chat hostess Layla · qué es chat hostess · trabajo chat hostess · hostess online · videollamadas trabajo · live streaming trabajo · salas de voz trabajo · empleo online · trabajo desde el celular · trabajo sin experiencia · trabajo para mujeres · trabajo para chicas · trabajo femenino desde casa · ingresos semanales en dólares · cobrar semanalmente en dólares · oportunidad de trabajo online · trabajo flexible · trabajo sin jefe · trabajo Latinoamérica · trabajo sin horario fijo · trabajo desde cuba · trabajo online cuba · trabajo digital cuba · ingresos usd cuba · ganar usd desde cuba · dinero desde cuba · trabajo remoto cuba · empleo digital cuba · cómo ganar dinero en Waha · cómo ganar dinero en Layla · cómo ganar dinero en Howdy · cuánto gana una streamer en Waha · cuánto gana una streamer en Layla · cuánto gana una streamer en Howdy · sueldo streamer · ganancias streamer · ingresos streamer en dólares · ganar por videollamadas · ganar por mensajes · ganar por chat · ganar por audio · ganar con tu celular · trabajo celular dólares · app para ganar dinero · aplicación para ganar dinero desde casa · Waha app trabajo · Layla app trabajo · Howdy app trabajo · que es Waha · que es Layla · que es Howdy · app Waha streamer · app Layla streamer · app Howdy streamer · streaming latinoamerica · streaming cuba · streaming colombia · streaming venezuela · streamer profesional · streamer principiante · streamer sin cámara · ganar sin mostrar cara · emprendimiento mujer · negocio digital mujer · ingreso extra desde casa · segundo ingreso desde casa · ingreso complementario · ganar dinero extra · Eclipse Angels Agency streamer · unirse a Eclipse Angels · streamers Eclipse Angels
        </p>
      </section>
      </div>
    );
  }
  