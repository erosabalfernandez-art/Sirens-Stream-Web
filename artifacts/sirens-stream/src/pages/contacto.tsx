import { Clock, MessageCircle } from "lucide-react";
  import { FaWhatsapp, FaInstagram, FaTiktok } from "react-icons/fa";
  import { useLanguage } from "@/contexts/LanguageContext";

  function getChannels(lang: 'es' | 'pt') {
    return lang === 'pt' ? [
      {
        icon: FaWhatsapp, name: "WhatsApp", handle: "+55 95 98438-1686",
        desc: "A forma mais rápida de nos contatar. Respondemos em menos de 1 hora durante o horário de atendimento.",
        color: "#25D366", bg: "rgba(37,211,102,0.1)", border: "rgba(37,211,102,0.2)",
        href: "https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency",
        cta: "Escrever pelo WhatsApp",
      },
      {
        icon: FaInstagram, name: "Instagram", handle: "@eclipse_angels1",
        desc: "Siga-nos para ver depoimentos, novidades e conteúdo da agência. Você pode nos enviar um DM.",
        color: "#E1306C", bg: "rgba(225,48,108,0.1)", border: "rgba(225,48,108,0.2)",
        href: "https://www.instagram.com/eclipse_angels1?igsh=MTY0bGpqd294NjBwYg==",
        cta: "Ir para o Instagram",
      },
      {
        icon: FaTiktok, name: "TikTok", handle: "@eclipse_angels1",
        desc: "Assista vídeos sobre como trabalhamos, depoimentos reais e dicas para streamers.",
        color: "#ffffff", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)",
        href: "https://www.tiktok.com/@eclipse_angels1?_r=1&_t=ZS-96vSGdq3JZ4",
        cta: "Ver TikTok",
      },
    ] : [
      {
        icon: FaWhatsapp, name: "WhatsApp", handle: "+55 95 98438-1686",
        desc: "La forma más rápida de contactarnos. Respondemos en menos de 1 hora durante horario de atención.",
        color: "#25D366", bg: "rgba(37,211,102,0.1)", border: "rgba(37,211,102,0.2)",
        href: "https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency",
        cta: "Escribir por WhatsApp",
      },
      {
        icon: FaInstagram, name: "Instagram", handle: "@eclipse_angels1",
        desc: "Síguenos para ver testimonios, novedades y contenido de la agencia. Puedes enviarnos un DM.",
        color: "#E1306C", bg: "rgba(225,48,108,0.1)", border: "rgba(225,48,108,0.2)",
        href: "https://www.instagram.com/eclipse_angels1?igsh=MTY0bGpqd294NjBwYg==",
        cta: "Ir a Instagram",
      },
      {
        icon: FaTiktok, name: "TikTok", handle: "@eclipse_angels1",
        desc: "Mira videos sobre cómo trabajamos, testimonios reales y consejos para streamers.",
        color: "#ffffff", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)",
        href: "https://www.tiktok.com/@eclipse_angels1?_r=1&_t=ZS-96vSGdq3JZ4",
        cta: "Ver TikTok",
      },
    ];
  }

  function getFaqs(lang: 'es' | 'pt') {
    return lang === 'pt' ? [
      { q: "Os serviços da agência têm algum custo?", a: "Não. Nunca cobraremos nenhuma taxa, mensalidade ou encargo para entrar em nossa agência. Se alguém pedir dinheiro em nosso nome, relate imediatamente." },
      { q: "Em que horário posso ser atendida?", a: "Atendemos de segunda a domingo das 9h às 23h. Respondemos em menos de 24 horas. Pelo WhatsApp costumamos responder em minutos." },
      { q: "Quanto tempo leva o processo de ingresso?", a: "O processo é rápido. Do primeiro contato até começar a trabalhar costuma levar entre 24 e 72 horas, dependendo da sua disponibilidade." },
    ] : [
      { q: "¿Tienen costo los servicios de la agencia?", a: "No. Nunca cobraremos ninguna cuota, membresía ni cargo por unirte a nuestra agencia. Si alguien te pide dinero en nuestro nombre, repórtalo de inmediato." },
      { q: "¿En qué horario me pueden atender?", a: "Atendemos de lunes a domingo de 9:00 AM a 11:00 PM. Respondemos en menos de 24 horas. Por WhatsApp solemos responder en minutos." },
      { q: "¿Cuánto tarda el proceso de ingreso?", a: "El proceso es rápido. Desde el primer contacto hasta empezar a trabajar suele tomar entre 24 y 72 horas, dependiendo de tu disponibilidad." },
    ];
  }

  export default function Contacto() {
    const { lang } = useLanguage();
    const channels = getChannels(lang);
    const faqs = getFaqs(lang);

    const T = {
      badge:      lang === 'pt' ? 'Fale Conosco'                                  : 'Contáctanos',
      hero1:      lang === 'pt' ? 'Estamos aqui para'                              : 'Estamos aquí para',
      hero2:      lang === 'pt' ? 'ajudá-la'                                        : 'ayudarte',
      heroSub:    lang === 'pt' ? 'Nossa equipe responde em menos de 24 horas, todos os dias da semana. Não hesite em nos escrever pelo canal que preferir.' : 'Nuestro equipo responde en menos de 24 horas, todos los días de la semana. No dudes en escribirnos por el canal que prefieras.',
      hoursTitle: lang === 'pt' ? 'Horário de Atendimento'                         : 'Horario de Atención',
      monFri:     lang === 'pt' ? 'Segunda – Sexta'                                : 'Lunes – Viernes',
      satSun:     lang === 'pt' ? 'Sábado – Domingo'                               : 'Sábado – Domingo',
      avgResp:    lang === 'pt' ? 'Tempo médio de resposta: <1 hora'               : 'Tiempo de respuesta promedio: <1 hora',
      faqTitle:   lang === 'pt' ? 'Perguntas Rápidas'                              : 'Preguntas Rápidas',
    };

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-blue-600/7 blur-[80px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{T.hero1} <span className="gradient-text">{T.hero2}</span></h1>
            <p className="text-white/50 max-w-xl mx-auto">{T.heroSub}</p>
          </div>
        </section>

        <section className="pb-14">
          <div className="max-w-3xl mx-auto px-5">
            <div className="space-y-4">
              {channels.map((ch, i) => (
                <a key={i} href={ch.href} target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-5 bg-[#0d0d1e] border border-blue-500/8 rounded-2xl p-5 hover:border-blue-500/25 transition-all card-hover">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: ch.bg, border: `1px solid ${ch.border}`, color: ch.color }}>
                    <ch.icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-bold">{ch.name}</h3>
                      <span className="text-white/30 text-xs font-mono">{ch.handle}</span>
                    </div>
                    <p className="text-white/45 text-sm leading-relaxed">{ch.desc}</p>
                  </div>
                  <div className="shrink-0 hidden md:block">
                    <span className="text-xs font-bold px-4 py-2 rounded-xl border border-blue-500/20 text-blue-300 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors whitespace-nowrap">
                      {ch.cta} →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="max-w-3xl mx-auto px-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-600/12 to-blue-800/6 border border-blue-500/20 rounded-2xl p-6">
              <Clock className="w-7 h-7 text-blue-400 mb-4" />
              <h3 className="font-bold text-lg mb-3">{T.hoursTitle}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/55">{T.monFri}</span>
                  <span className="font-semibold">9:00 AM – 11:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/55">{T.satSun}</span>
                  <span className="font-semibold">10:00 AM – 10:00 PM</span>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-500/15 flex items-center gap-2 text-blue-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-xs">{T.avgResp}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d1e] border border-blue-500/8 rounded-2xl p-6">
              <MessageCircle className="w-7 h-7 text-blue-400 mb-4" />
              <h3 className="font-bold text-lg mb-4">{T.faqTitle}</h3>
              <div className="space-y-4">
                {faqs.map((f, i) => (
                  <div key={i} className="border-b border-blue-500/8 pb-3 last:border-none last:pb-0">
                    <p className="font-semibold text-xs text-white/70 mb-1">{f.q}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          contacto Eclipse Angels Agency · unirme como streamer · aplicar a Eclipse Angels · cómo unirme a Eclipse Angels · aplicar streamer Waha · aplicar streamer Howdy · aplicar streamer Layla · información streamer · asesoría agencia streaming · quiero ser streamer · quiero crear agencia · registro Eclipse Angels · contactar agencia streamers · aplicar trabajo desde casa · quiero ganar dinero desde casa
        </p>
      </section>
      </div>
    );
  }
  