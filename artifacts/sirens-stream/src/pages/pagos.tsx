import { Link } from "wouter";
import { CheckCircle2, ArrowRight, DollarSign, Clock } from "lucide-react";

const methods = [
  { emoji: "🔶", name: "Binance", desc: "Transferencia internacional en criptomonedas (USDT, BTC y más). Disponible para todos los países.", tag: "Cripto", color: "bg-amber-500/12 border-amber-500/20 text-amber-400" },
  { emoji: "⚡", name: "Zelle", desc: "Transferencia bancaria digital para cuentas de Estados Unidos. Inmediata y sin comisiones.", tag: "Bancario", color: "bg-blue-500/12 border-blue-500/20 text-blue-400" },
  { emoji: "🇧🇷", name: "Pix", desc: "Sistema de pagos instantáneos de Brasil. Disponible para todas las cuentas bancarias brasileñas.", tag: "Brasil", color: "bg-green-500/12 border-green-500/20 text-green-400" },
  { emoji: "💵", name: "Efectivo – Cuba", desc: "Pago en efectivo CUP en algunas provincias de Cuba. Coordínalo con tu tutora.", tag: "Efectivo", color: "bg-yellow-500/12 border-yellow-500/20 text-yellow-400" },
  { emoji: "🏦", name: "Transferencia – Cuba", desc: "Transferencias a tarjetas: Clásica, Tropical, Metropolitana, BPA y Bandec.", tag: "Cuba", color: "bg-blue-500/12 border-blue-500/20 text-blue-400" },
  { emoji: "📱", name: "Pago Móvil – Venezuela", desc: "Pagos directos al número de teléfono registrado en Venezuela.", tag: "Venezuela", color: "bg-red-500/12 border-red-500/20 text-red-400" },
  { emoji: "🌐", name: "PayPal", desc: "Transferencias internacionales seguras vía PayPal. Disponible en la mayoría de países.", tag: "Internacional", color: "bg-blue-500/12 border-blue-500/20 text-blue-400" },
];

const howItWorks = [
  { icon: Clock, title: "Cierre de semana", desc: "Cada semana se hace un corte de tus ganancias acumuladas." },
  { icon: DollarSign, title: "Cálculo automático", desc: "Se calcula tu total en dólares según el método de la plataforma." },
  { icon: CheckCircle2, title: "Transferencia", desc: "Recibes tu pago en el método elegido en máximo 24-48h." },
];

export default function Pagos() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">
      {/* Header */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-blue-600/7 blur-[80px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Métodos de Pago</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Tus ganancias, <span className="gradient-text">donde prefieras</span></h1>
          <p className="text-white/50 max-w-xl mx-auto">Pagamos cada semana de forma puntual a través de múltiples métodos internacionales. Elige el que más te convenga según tu país.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-10">
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-3 gap-4 mb-10">
            {howItWorks.map((s, i) => (
              <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 text-center">
                <s.icon className="w-6 h-6 text-blue-400 mx-auto mb-3" />
                <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                <p className="text-white/40 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methods */}
      <section className="pb-16">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-xl font-bold text-center mb-6">Métodos disponibles</h2>
          <div className="space-y-3">
            {methods.map((m, i) => (
              <div key={i} className="bg-[#0d0d1e] border border-blue-500/8 rounded-2xl p-5 flex items-center gap-4 card-hover">
                <div className="w-13 h-13 rounded-2xl bg-[#0a0a14] border border-blue-500/10 flex items-center justify-center text-2xl shrink-0 w-14 h-14">
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold">{m.name}</h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${m.color}`}>{m.tag}</span>
                  </div>
                  <p className="text-white/45 text-sm">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-lg mb-2">¿Tu método no está en la lista?</h3>
            <p className="text-white/50 text-sm mb-5">Contáctanos y buscamos juntos la mejor forma de hacerte llegar tus ganancias, sin importar tu ubicación.</p>
            <Link href="/contacto"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
              Consultar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
