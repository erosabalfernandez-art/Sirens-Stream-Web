import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
    import {CheckCircle2, ArrowRight, DollarSign, Clock, Shield} from "lucide-react";

    /* ── Payment method SVG icons ── */
    const BinanceIcon = () => (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="url(#bg1)"/>
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed"/>
            <stop offset="1" stopColor="#4f46e5"/>
          </linearGradient>
        </defs>
        {/* BNB real logo — 5 diamonds in cross pattern */}
        <polygon points="20,5 23.5,8.5 20,12 16.5,8.5" fill="white"/>
        <polygon points="7,20 10.5,16.5 14,20 10.5,23.5" fill="white"/>
        <polygon points="16.5,20 20,16.5 23.5,20 20,23.5" fill="white"/>
        <polygon points="26,20 29.5,16.5 33,20 29.5,23.5" fill="white"/>
        <polygon points="20,28 23.5,31.5 20,35 16.5,31.5" fill="white"/>
      </svg>
    );

    const PixIcon = () => (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="url(#bg2)"/>
        <defs>
          <linearGradient id="bg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563eb"/>
            <stop offset="1" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        {/* Pix real logo — 4-blade pinwheel */}
        <path d="M20,20 L22,13 Q24,8 29,11 Q26,16 20,20Z" fill="white"/>
        <path d="M20,20 L27,18 Q32,16 29,11 Q24,14 20,20Z" fill="white" fillOpacity="0.75"/>
        <path d="M20,20 L18,27 Q16,32 11,29 Q14,24 20,20Z" fill="white"/>
        <path d="M20,20 L13,22 Q8,24 11,29 Q16,26 20,20Z" fill="white" fillOpacity="0.75"/>
        <path d="M20,20 L22,27 Q24,32 29,29 Q26,24 20,20Z" fill="white"/>
        <path d="M20,20 L27,22 Q32,24 29,29 Q24,26 20,20Z" fill="white" fillOpacity="0.75"/>
        <path d="M20,20 L18,13 Q16,8 11,11 Q14,16 20,20Z" fill="white"/>
        <path d="M20,20 L13,18 Q8,16 11,11 Q16,14 20,20Z" fill="white" fillOpacity="0.75"/>
      </svg>
    );

    const EfectivoIcon = () => (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="url(#bg3)"/>
        <defs>
          <linearGradient id="bg3" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6d28d9"/>
            <stop offset="1" stopColor="#9333ea"/>
          </linearGradient>
        </defs>
        <rect x="7" y="13" width="26" height="16" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.4" strokeWidth="1.5"/>
        <circle cx="20" cy="21" r="4" fill="white" fillOpacity="0.9"/>
        <circle cx="20" cy="21" r="2" fill="url(#bg3)"/>
        <rect x="10" y="16" width="3" height="2" rx="1" fill="white" fillOpacity="0.5"/>
        <rect x="27" y="23" width="3" height="2" rx="1" fill="white" fillOpacity="0.5"/>
      </svg>
    );

    const TransferenciaIcon = () => (
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="url(#bg4)"/>
        <defs>
          <linearGradient id="bg4" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1d4ed8"/>
            <stop offset="1" stopColor="#6d28d9"/>
          </linearGradient>
        </defs>
        <rect x="7" y="12" width="26" height="18" rx="3" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
        <rect x="7" y="16" width="26" height="5" fill="white" fillOpacity="0.2"/>
        <rect x="10" y="24" width="8" height="2.5" rx="1.2" fill="white" fillOpacity="0.7"/>
        <rect x="21" y="24" width="5" height="2.5" rx="1.2" fill="white" fillOpacity="0.4"/>
      </svg>
    );

    const methods_es = [
      {
        Icon: BinanceIcon,
        name: "Binance",
        tag: "Cripto",
        tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/25",
        desc: "Transferencia internacional en criptomonedas (USDT, BTC y más). Disponible para todos los países.",
        nota: "Sin mínimo — comisión de red variable",
      },
      {
        Icon: PixIcon,
        name: "Pix",
        tag: "Brasil",
        tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/25",
        desc: "Transferencia bancaria instantánea para streamers en Brasil. Rápido y sin comisiones.",
        nota: "Disponible solo en Brasil",
      },
      {
        Icon: EfectivoIcon,
        name: "Efectivo (Cuba)",
        tag: "Cuba",
        tagColor: "bg-violet-500/15 text-violet-300 border-violet-500/25",
        desc: "Pago en efectivo coordinado a través de contacto local en Cuba.",
        nota: "Coordinación previa requerida",
      },
      {
        Icon: TransferenciaIcon,
        name: "Transferencia Bancaria (Cuba)",
        tag: "Cuba",
        tagColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
        desc: "Transferencia a cuenta bancaria en Cuba (MLC o CUP según disponibilidad).",
        nota: "Sujeto a disponibilidad de tasa",
      },
    ];

    const faqs_es = [
      { q: "¿Con qué frecuencia se paga?", a: "Los pagos se realizan semanalmente. Waha: cada martes. Layla: acumulable a partir de $10 USD. Howdy: cada miércoles o jueves." },
      { q: "¿Hay un mínimo de retiro?", a: "Para Waha: $2.50 USD (10,000 diamantes). Para Layla: $10 USD. Para Howdy: $10 USD (100,000 puntos). Para las demás apps se informa en el registro." },
      { q: "¿Cuánto tarda en llegar el pago?", a: "Binance: inmediato. Pix: inmediato. Transferencia Cuba: 1-3 días hábiles." },
      { q: "¿Pagan en dólares reales?", a: "Sí. Todos nuestros pagos son en USD. La conversión a moneda local depende del método que elijas." },
    ];


    const methods_pt = [
      { Icon: BinanceIcon, name: "Binance", tag: "Cripto", tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/25", desc: "Transferência internacional em criptomoedas (USDT, BTC e mais). Disponível para todos os países.", nota: "Sem mínimo — taxa de rede variável" },
      { Icon: PixIcon, name: "Pix", tag: "Brasil", tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/25", desc: "Transferência bancária instantânea para streamers no Brasil. Rápido e sem taxas.", nota: "Disponível apenas no Brasil" },
      { Icon: EfectivoIcon, name: "Dinheiro em Espécie (Cuba)", tag: "Cuba", tagColor: "bg-violet-500/15 text-violet-300 border-violet-500/25", desc: "Pagamento em dinheiro coordenado através de contato local em Cuba.", nota: "Coordenação prévia necessária" },
      { Icon: TransferenciaIcon, name: "Transferência Bancária (Cuba)", tag: "Cuba", tagColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25", desc: "Transferência para conta bancária em Cuba (MLC ou CUP conforme disponibilidade).", nota: "Sujeito a disponibilidade de taxa" },
    ];
    const faqs_pt = [
      { q: "Com que frequência se paga?", a: "Os pagamentos são semanais. Waha: toda terça-feira. Layla: acumulável a partir de $10 USD. Howdy: toda quarta ou quinta." },
      { q: "Há um mínimo de saque?", a: "Para Waha: $2,50 USD (10.000 diamantes). Para Layla: $10 USD. Para Howdy: $10 USD (100.000 pontos). Para os demais apps é informado no cadastro." },
      { q: "Quanto tempo leva para chegar o pagamento?", a: "Binance: imediato. Pix: imediato. Transferência Cuba: 1–3 dias úteis." },
      { q: "Pagam em dólares reais?", a: "Sim. Todos os nossos pagamentos são em USD. A conversão para moeda local depende do método que você escolher." },
    ];
    export default function Pagos() {
      const { lang } = useLanguage();
      const methods = lang === 'pt' ? methods_pt : methods_es;
      const faqs = lang === 'pt' ? faqs_pt : faqs_es;
      const T = {
        badge: lang === 'pt' ? "Métodos de Pagamento" : "Métodos de Pago",
        h1a: lang === 'pt' ? "Receba no" : "Cobra en",
        h1b: lang === 'pt' ? "seu método favorito" : "tu método favorito",
        sub: lang === 'pt' ? "Pagamos toda semana de forma pontual. Escolha o método que melhor se adapta ao seu país e preferência. Todos os pagamentos são em dólares americanos (USD)." : "Pagamos cada semana de forma puntual. Elige el método que mejor se adapte a tu país y preferencia. Todos los pagos son en dólares estadounidenses (USD).",
        trustItems: lang === 'pt' ? [
          { icon: Clock, text: "Pagamentos toda semana" },
          { icon: Shield, text: "100% seguro e garantido" },
          { icon: DollarSign, text: "Receba de onde estiver" },
          { icon: CheckCircle2, text: "Todos os países" },
        ] : [
          { icon: Clock, text: "Pagos cada semana" },
          { icon: Shield, text: "100% seguro y garantizado" },
          { icon: DollarSign, text: "Recíbelo desde donde estés" },
          { icon: CheckCircle2, text: "Todos los países" },
        ],
        methodsH: lang === 'pt' ? "Métodos disponíveis" : "Métodos disponibles",
        faqH: lang === 'pt' ? "Perguntas frequentes sobre pagamentos" : "Preguntas frecuentes sobre pagos",
        ctaH3: lang === 'pt' ? "Pronta para começar a receber?" : "¿Lista para empezar a cobrar?",
        ctaSub: lang === 'pt' ? "Entre na agência hoje e começa a gerar renda semanal em dólares na comodidade da sua casa." : "Únete a la agencia hoy y empieza a generar ingresos semanales en dólares desde la comodidad de tu hogar.",
        ctaBtn: lang === 'pt' ? "Quero ser Streamer" : "Quiero ser Streamer",
        ctaContact: lang === 'pt' ? "Entrar em contato" : "Contactar",
      };
      return (
        <div className="min-h-screen bg-[#07070f] text-white pt-16">
          <section className="relative py-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-purple-600/6 blur-[70px]" />
            </div>
            <div className="relative max-w-4xl mx-auto px-5 text-center">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-full px-4 py-1.5 mb-5">
                <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                {T.h1a} <span className="gradient-text">{T.h1b}</span>
              </h1>
              <p className="text-white/50 max-w-xl mx-auto">{T.sub}</p>
            </div>
          </section>

          {/* Trust bar */}
          <div className="bg-[#0a0a16] border-y border-purple-500/8 py-4">
            <div className="max-w-4xl mx-auto px-5 flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {T.trustItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-purple-400" />
                  {item.text}
                </span>
              ))}
            </div>
          </div>

          {/* Payment methods grid */}
          <section className="py-20">
            <div className="max-w-4xl mx-auto px-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400/70 mb-6">{T.methodsH}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
                {methods.map((m, i) => (
                  <div key={i} className="group bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-5 hover:border-purple-500/30 hover:bg-[#0f0f22] transition-all">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-0.5"><m.Icon /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-white">{m.name}</h3>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${m.tagColor}`}>{m.tag}</span>
                        </div>
                        <p className="text-white/45 text-sm mb-2 leading-relaxed">{m.desc}</p>
                        <p className="text-white/25 text-xs">{m.nota}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ */}
              <div className="mb-14">
                <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400/70 mb-5">{T.faqH}</h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="bg-[#0d0d1e] border border-purple-500/10 rounded-xl p-5">
                      <p className="font-bold text-white text-sm mb-2">{faq.q}</p>
                      <p className="text-white/50 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-[#0d0d1e] border border-purple-500/15 rounded-2xl p-8 text-center">
                <DollarSign className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-2xl font-extrabold mb-2">{T.ctaH3}</h3>
                <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">{T.ctaSub}</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/ser-streamer"
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    {T.ctaBtn} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                    {T.ctaContact}
                  </a>
                </div>
              </div>
            </div>
          </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          cuánto gana un streamer · pagos Waha · pagos Howdy · pagos Layla · cómo cobrar en Waha · cómo cobrar en Howdy · cómo cobrar en Layla · retiro de dinero streaming · cuánto paga Waha · cuánto paga Howdy · cuánto paga Layla · salario streamer · ingresos streamer latina · ganar dólares streaming · pagos semanales streaming · método de pago Waha · método de pago Howdy · método de pago Layla · cuánto se gana siendo streamer · sueldo streamer · ganancias streaming · pago en dólares desde casa
        </p>
      </section>
        </div>
      );
    }
  