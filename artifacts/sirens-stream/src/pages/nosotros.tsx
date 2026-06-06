import { useState } from "react";
    import { Link } from "wouter";
    import { useLanguage } from "@/contexts/LanguageContext";
    import {ChevronDown, ChevronUp, Shield, Users, TrendingUp, Globe, ArrowRight, Star, Heart, Clock, DollarSign} from "lucide-react";

    const stats_es = [
      { val: "Soporte 24/7", label: "Siempre hay alguien para ayudarte" },
      { val: "Pagos Semanales", label: "Cobras puntual cada semana en dólares" },
      { val: "$0 Inversión", label: "Empiezas sin gastar nada" },
      { val: "Todos los Países", label: "Operamos a nivel mundial" },
    ];

    const valores_es = [
      { icon: Shield, title: "Honestidad ante todo", desc: "No hay costos ocultos ni sorpresas. Desde el primer mensaje te decimos exactamente cómo funciona todo." },
      { icon: Heart, title: "Somos una comunidad", desc: "Una red de mujeres que se apoyan entre sí. Compartimos estrategias, experiencias y crecemos juntas." },
      { icon: TrendingUp, title: "Resultados de verdad", desc: "No prometemos lo que no podemos cumplir. Las ganancias que mostramos son reales y alcanzables con constancia." },
      { icon: Star, title: "Tú decides cuánto creces", desc: "Capacitación gratis, bonos por resultados y más oportunidades cuanto mejor te vaya." },
    ];

    const faqs_es = [
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


    const stats_pt = [
      { val: "Suporte 24/7", label: "Sempre há alguém para te ajudar" },
      { val: "Pagamentos Semanais", label: "Recebe pontual toda semana em dólares" },
      { val: "$0 Investimento", label: "Começa sem gastar nada" },
      { val: "Todos os Países", label: "Operamos em nível mundial" },
    ];
    const valores_pt = [
      { icon: Shield, title: "Honestidade acima de tudo", desc: "Sem custos ocultos nem surpresas. Desde a primeira mensagem te dizemos exatamente como tudo funciona." },
      { icon: Heart, title: "Somos uma comunidade", desc: "Uma rede de mulheres que se apoiam entre si. Compartilhamos estratégias, experiências e crescemos juntas." },
      { icon: TrendingUp, title: "Resultados de verdade", desc: "Não prometemos o que não podemos cumprir. Os ganhos que mostramos são reais e alcançáveis com constância." },
      { icon: Star, title: "Você decide o quanto cresce", desc: "Capacitação grátis, bônus por resultados e mais oportunidades quanto melhor for seu desempenho." },
    ];
    const faqs_pt = [
      { q: "Os homens podem trabalhar com a Eclipse Angels Agency?", a: "Sim, absolutamente! Os homens também têm um lugar na nossa equipe. Podem participar de duas formas: criando contas em alguns de nossos aplicativos associados, ou como recrutadores, indicando mulheres para a agência e ganhando comissão por cada uma que entrar e começar a gerar. Fazendo parte da Eclipse Angels Agency, sempre sairão beneficiados." },
      { q: "Como um homem pode ganhar dinheiro na agência?", a: "Há dois caminhos claros. O primeiro é registrar-se em certos aplicativos da nossa rede e gerar renda própria. O segundo é tornar-se recrutador: apresentar mulheres interessadas à agência e receber uma comissão por cada incorporação bem-sucedida. É uma forma flexível de ganhar sem limite de horário nem de renda." },
      { q: "Os homens recebem o mesmo suporte que as mulheres?", a: "Sim. Qualquer pessoa que faça parte da nossa equipe recebe capacitação, guias e acompanhamento constante. Não importa como você decide participar, sempre terá alguém disponível para te ajudar a crescer e maximizar seus ganhos." },
      { q: "O que é a Eclipse Angels Agency?", a: "Eclipse Angels Agency é uma agência de streamers e chat hostess que conecta mulheres maiores de 18 anos com plataformas internacionais de videochat e mensagens. Você pode ganhar dinheiro em dólares pelo celular, sem investir nada e sem experiência prévia." },
      { q: "É seguro trabalhar com a Eclipse Angels Agency?", a: "Sim, totalmente. Trabalhamos apenas com plataformas verificadas e reconhecidas internacionalmente. Nunca pedimos dinheiro para começar, e todas as suas informações pessoais são tratadas com total privacidade." },
      { q: "Preciso mostrar meu rosto ou meus dados pessoais?", a: "Não é obrigatório. Você pode trabalhar com nome artístico, foto diferente e sem vincular suas redes pessoais. Sua privacidade é nossa prioridade." },
      { q: "Quanto posso ganhar?", a: "Depende do tempo que você dedicar e da plataforma que usar. Em média você pode ganhar entre $10 e $50 USD por dia. Com constância, muitas mulheres superam os $500 USD por semana." },
      { q: "Quantas horas tenho que trabalhar por dia?", a: "Recomendamos 4–5 horas diárias para cumprir metas e acessar bônus. Mas o horário é totalmente seu — trabalha quando quer e o tempo que quiser." },
      { q: "Quando e como recebo meu pagamento?", a: "Os pagamentos são semanais. Você pode receber seu dinheiro por Binance (USDT), Pix (Brasil), transferência bancária em Cuba ou dinheiro em espécie em Cuba, conforme seu país." },
      { q: "Preciso ter experiência?", a: "De forma alguma. Ensinamos tudo do zero. Uma de nossas guias te explica passo a passo como instalar o app e começar a ganhar desde o primeiro dia." },
      { q: "Quais apps posso usar?", a: "Trabalhamos com Waha, Layla e Howdy, três das plataformas internacionais mais rentáveis do mercado. Cada uma tem características diferentes e nossa equipe te ajuda a escolher a mais adequada." },
      { q: "Posso trabalhar de qualquer país?", a: "Sim. Trabalhamos com mulheres de toda a América Latina e do mundo. Só precisa de um celular com boa câmera e conexão à internet." },
      { q: "O que acontece se eu tiver dúvidas durante o trabalho?", a: "Sempre tem alguém disponível para te ajudar. Temos guias de apoio e grupos onde compartilhamos dicas e estratégias constantemente. Você nunca está sozinha." },
    ];
    export default function Nosotros() {
      const [openFaq, setOpenFaq] = useState<number | null>(null);
      const { lang } = useLanguage();
      const stats = lang === 'pt' ? stats_pt : stats_es;
      const valores = lang === 'pt' ? valores_pt : valores_es;
      const faqs = lang === 'pt' ? faqs_pt : faqs_es;
      const T = {
        badge: lang === 'pt' ? "Sobre Nós" : "Sobre Nosotros",
        h1: lang === 'pt' ? "Conectamos mulheres com\noportunidades reais em dólares" : "Conectamos mujeres con\noportunidades reales en dólares",
        sub: lang === 'pt' ? "Eclipse Angels Agency nasceu para que qualquer mulher possa gerar renda real pelo celular, sem colocar dinheiro, sem experiência e com todo o apoio que precisar para crescer." : "Eclipse Angels Agency nació para que cualquier mujer pueda generar ingresos reales desde su celular, sin poner dinero, sin experiencia y con todo el apoyo que necesite para crecer.",
        misionBadge: lang === 'pt' ? "Nossa Missão" : "Nuestra Misión",
        misionH2: lang === 'pt' ? "Que cada mulher possa\nganhar dinheiro em casa" : "Que cada mujer pueda\nganar dinero desde casa",
        valBadge: lang === 'pt' ? "Nossos Valores" : "Nuestros Valores",
        valH2: lang === 'pt' ? "Em que acreditamos" : "En qué creemos",
        faqBadge: lang === 'pt' ? "Perguntas Frequentes" : "Preguntas Frecuentes",
        faqH2: lang === 'pt' ? "Respondemos suas dúvidas" : "Todo lo que quieres saber",
        ctaH2: lang === 'pt' ? "Pronta para dar o primeiro passo?" : "¿Tienes más preguntas?",
        ctaDesc: lang === 'pt' ? "Fale conosco agora mesmo. Sem compromisso, sem custos. Te explicamos tudo e te ajudamos a começar." : "Nuestro equipo te contesta en menos de 24 horas. Escríbenos sin compromiso.",
        ctaBtn: lang === 'pt' ? "Entrar em Contato" : "Escríbenos",
        ctaApps: lang === 'pt' ? "Ver Apps" : "Ver Apps",
        misionDesc1: lang === 'pt' ? "Acreditamos que toda mulher merece acesso a renda real, flexível e em dólares. Na Eclipse Angels Agency tornamos isso possível conectando você com os melhores apps internacionais, dando capacitação gratuita e acompanhando cada passo." : "Creemos que toda mujer merece acceso a ingresos reales, flexibles y en dólares. En Eclipse Angels Agency lo hacemos posible conectándote con las mejores apps internacionales, dándote capacitación gratuita y acompañándote en cada paso.",
        misionDesc2: lang === 'pt' ? "Não somos uma promessa vazia. Somos uma equipe real, com mulheres reais, ganhando dinheiro real toda semana. Junte-se e comprove você mesma." : "No somos una promesa vacía. Somos un equipo real, con chicas reales, ganando dinero real cada semana. Únete y compruébalo tú misma.",
        faqSub: lang === 'pt' ? "Respondemos suas dúvidas antes de você começar" : "Resolvemos tus dudas antes de que empieces",
        ctaJoinBtn: lang === 'pt' ? "Participe agora" : "Únete ahora",
      };
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
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-[1.1]">
                {lang === 'pt' ? 'Conectamos mulheres com' : 'Conectamos mujeres con'}<br />
                <span className="gradient-text">{lang === 'pt' ? 'oportunidades reais em dólares' : 'oportunidades reales en dólares'}</span>
              </h1>
              <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">{T.sub}</p>
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
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-400/70">{T.misionBadge}</span>
                  <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">
                    {lang === 'pt' ? 'Que cada mulher possa' : 'Que cada mujer pueda'}<br /><span className="gradient-text">{lang === 'pt' ? 'ganhar dinheiro em casa' : 'ganar dinero desde casa'}</span>
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{T.misionDesc1}</p>
                  <p className="text-white/50 text-sm leading-relaxed">{T.misionDesc2}</p>
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
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400/70">{T.faqBadge}</span>
                <h2 className="text-3xl font-extrabold mt-2 mb-3">{T.faqH2}</h2>
                <p className="text-white/45 text-sm">{T.faqSub}</p>
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
              <h2 className="text-3xl font-extrabold mb-3">{T.ctaH2}</h2>
              <p className="text-white/50 text-sm mb-7">{T.ctaDesc}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  {T.ctaBtn} <ArrowRight className="w-4 h-4" />
                </a>
                <Link href="/ser-streamer"
                  className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  {T.ctaJoinBtn}
                </Link>
              </div>
            </div>
          </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          Eclipse Angels Agency · quiénes somos Eclipse Angels · agencia de streamers latinoamérica · agencia confiable de streaming · mejor agencia de streamers · agencia streamers Waha · agencia streamers Howdy · agencia streamers Layla · agencia verificada · chat hostess agencia · empresa de streaming latina · equipo Eclipse Angels · sobre nosotros Eclipse Angels · agencia streamers profesional · agencia latinoamérica
        </p>
      </section>
        </div>
      );
    }
  