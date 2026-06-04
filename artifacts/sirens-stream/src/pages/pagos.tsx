import { Link } from "wouter";
  import { CheckCircle2, ArrowRight, DollarSign, Clock, Shield } from "lucide-react";

  const methods = [
    {
      emoji: "🔶",
      name: "Binance",
      tag: "Cripto",
      tagColor: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      desc: "Transferencia internacional en criptomonedas (USDT, BTC y más). Disponible para todos los países.",
      nota: "Sin mínimo — comisión de red variable",
    },
    {
      emoji: "🟢",
      name: "Pix",
      tag: "Brasil",
      tagColor: "bg-green-500/15 text-green-300 border-green-500/25",
      desc: "Transferencia bancaria instantánea para streamers en Brasil. Rápido y sin comisiones.",
      nota: "Disponible solo en Brasil",
    },
    {
      emoji: "💵",
      name: "Zelle",
      tag: "USA",
      tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      desc: "Transferencia directa en dólares para cuentas bancarias en Estados Unidos.",
      nota: "Solo bancos USA — instantáneo",
    },
    {
      emoji: "💰",
      name: "Efectivo (Cuba)",
      tag: "Cuba",
      tagColor: "bg-red-500/15 text-red-300 border-red-500/25",
      desc: "Pago en efectivo coordinado a través de contacto local en Cuba.",
      nota: "Coordinación previa requerida",
    },
    {
      emoji: "🏦",
      name: "Transferencia Bancaria (Cuba)",
      tag: "Cuba",
      tagColor: "bg-red-500/15 text-red-300 border-red-500/25",
      desc: "Transferencia a cuenta bancaria en Cuba (MLC o CUP según disponibilidad).",
      nota: "Sujeto a disponibilidad de tasa",
    },
    {
      emoji: "📲",
      name: "Pago Móvil (Venezuela)",
      tag: "Venezuela",
      tagColor: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
      desc: "Pago móvil interbancario en Venezuela. Rápido y sin necesidad de cuenta bancaria adicional.",
      nota: "Solo Venezuela — requiere número VE",
    },
  ];

  const faqs = [
    { q: "¿Con qué frecuencia se paga?", a: "Los pagos se realizan semanalmente cada martes. Para Layla, la meta es acumulable a partir de $10 USD." },
    { q: "¿Hay un mínimo de retiro?", a: "Para Waha: $2 USD. Para Layla: $10 USD. Para las demás apps se informa en el proceso de registro." },
    { q: "¿Cuánto tarda en llegar el pago?", a: "Binance: inmediato. Zelle: 1-2 horas. Pix: inmediato. Transferencia Cuba: 1-3 días hábiles. Pago Móvil VE: inmediato." },
    { q: "¿Pagan en dólares reales?", a: "Sí. Todos nuestros pagos son en USD. La conversión a moneda local depende del método que elijas." },
  ];

  export default function Pagos() {
    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-blue-600/6 blur-[70px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Métodos de Pago</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Cobra en <span className="gradient-text">tu método favorito</span>
            </h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Pagamos cada semana de forma puntual. Elige el método que mejor se adapte a tu país y preferencia. Todos los pagos son en dólares estadounidenses (USD).
            </p>
          </div>
        </section>

        {/* Trust bar */}
        <div className="bg-[#0a0a16] border-y border-blue-500/8 py-4">
          <div className="max-w-4xl mx-auto px-5 flex flex-wrap justify-center gap-6 text-sm text-white/40">
            {[
              { icon: Clock, text: "Pagos cada semana" },
              { icon: Shield, text: "100% seguro y garantizado" },
              { icon: DollarSign, text: "Siempre en dólares (USD)" },
              { icon: CheckCircle2, text: "+20 países disponibles" },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-blue-400" />
                {item.text}
              </span>
            ))}
          </div>
        </div>

        {/* Payment methods grid */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-6">Métodos disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
              {methods.map((m, i) => (
                <div key={i} className="group bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 hover:border-blue-500/25 hover:bg-[#0f0f22] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl shrink-0 mt-0.5">{m.emoji}</div>
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
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-5">Preguntas frecuentes sobre pagos</h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-xl p-5">
                    <p className="font-bold text-white text-sm mb-2">{faq.q}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-[#0d0d1e] border border-blue-500/15 rounded-2xl p-8 text-center">
              <DollarSign className="w-10 h-10 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-extrabold mb-2">¿Lista para empezar a cobrar?</h3>
              <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">Únete a la agencia hoy y empieza a generar ingresos semanales en dólares desde la comodidad de tu hogar.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/ser-streamer"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  Quiero ser Streamer <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contacto"
                  className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  Contactar
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
  