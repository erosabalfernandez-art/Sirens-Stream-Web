import { Link } from "wouter";
import { Users, TrendingUp, DollarSign, CheckCircle2, ArrowRight, Star, Zap, Globe } from "lucide-react";

const ofertas = [
  { icon: Zap, title: "Capacitación Completa", desc: "Te enseñamos todo lo que necesitas saber para gestionar un equipo de streamers exitosas." },
  { icon: Globe, title: "Acceso a Nuestras Apps", desc: "Tendrás acceso a Waha y Layla con las mejores condiciones para tu equipo." },
  { icon: Users, title: "Soporte Permanente", desc: "Nuestro equipo está disponible para ayudarte a resolver cualquier duda o situación." },
  { icon: DollarSign, title: "Comisiones Semanales", desc: "Ganas un porcentaje de las ganancias de cada streamer activa en tu equipo." },
  { icon: TrendingUp, title: "Bonos por Rendimiento", desc: "Bonos adicionales cuando tu equipo cumple metas de productividad establecidas." },
  { icon: Star, title: "Materiales Exclusivos", desc: "Acceso a recursos, guías, estrategias y materiales de trabajo actualizados." },
];

const buscamos = [
  "Ganas de aprender y crecer profesionalmente",
  "Habilidades de comunicación y liderazgo",
  "Responsabilidad, compromiso y seriedad",
  "Disponibilidad para gestionar y motivar a un equipo",
  "Capacidad de resolución de problemas",
  "Actitud proactiva y orientada a resultados",
];

const steps = [
  { n: "01", title: "Contáctanos", desc: "Escríbenos por WhatsApp o Instagram indicando que te interesa crear tu agencia." },
  { n: "02", title: "Evaluación Inicial", desc: "Una coordinadora te entrevistará para conocer tu perfil y objetivos." },
  { n: "03", title: "Capacitación de Manager", desc: "Recibes formación completa sobre gestión de equipos, apps y estrategias." },
  { n: "04", title: "Recluta tu Equipo", desc: "Empiezas a incorporar streamers a tu agencia con nuestro apoyo." },
  { n: "05", title: "Genera Ingresos", desc: "Cobras comisiones semanales basadas en el rendimiento de tu equipo." },
];

export default function CrearAgencia() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/7 blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-6">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Oportunidad de liderazgo</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5">
            ¡Conviértete en<br />
            <span className="gradient-text">Líder de Agencia!</span>
          </h1>
          <p className="text-white/55 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Forma tu propia agencia de streamers, lidera un equipo de mujeres talentosas y genera ingresos semanales a través de las comisiones de tu equipo. Trabajamos contigo para garantizar tu éxito.
          </p>

          {/* Key numbers */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-10">
            {[["$0", "Inversión inicial"], ["100%", "Trabajo remoto"], ["Semanal", "Frecuencia de pago"]].map(([v, l], i) => (
              <div key={i} className="bg-[#0d0d1e] border border-blue-500/12 rounded-2xl p-4">
                <p className="text-blue-400 font-extrabold text-xl">{v}</p>
                <p className="text-white/40 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>

          <Link href="/contacto"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)]">
            Quiero ser Manager <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* What does a manager do */}
      <section className="py-14 bg-[#0a0a16]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">¿Qué hace un Manager de Agencia?</h2>
              <p className="text-white/55 mb-5 leading-relaxed">
                Un manager o líder de agencia es la persona responsable de <strong className="text-white">reclutar, capacitar, motivar y acompañar</strong> a su equipo de streamers para que alcancen sus metas y generen los mejores resultados.
              </p>
              <p className="text-white/55 mb-6 leading-relaxed">
                Como manager, serás el puente entre la agencia y tu equipo. Trabajarás de forma remota, gestionando desde tu celular o computador, sin necesidad de estar en un lugar físico.
              </p>
              <div className="space-y-3">
                {["Reclutar nuevas streamers para tu equipo","Capacitar y guiar a cada integrante en su trabajo","Motivar y hacer seguimiento del rendimiento del equipo","Resolver dudas y gestionar el bienestar del equipo","Reportar resultados y coordinar con la agencia principal"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />{item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: DollarSign, title: "Ingresos pasivos escalables", desc: "Cuanto más crezca tu equipo y mejor rindan, más ganas. Tus ingresos crecen con tu agencia." },
                { icon: Users, title: "Lidera tu propio equipo", desc: "Sé el referente para un grupo de mujeres que quieren cambiar su situación económica." },
                { icon: Globe, title: "100% remoto", desc: "Trabaja desde cualquier lugar del mundo. Solo necesitas internet y tu teléfono." },
              ].map((item, i) => (
                <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                    <p className="text-white/45 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What we offer + what we look for */}
      <section className="py-14 bg-[#07070f]">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-blue-400" /> ¿Qué te Ofrecemos?
            </h2>
            <div className="space-y-4">
              {ofertas.map((o, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#0d0d1e] border border-blue-500/8 rounded-2xl px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <o.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-0.5">{o.title}</h3>
                    <p className="text-white/45 text-sm">{o.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-blue-400" /> ¿Qué Buscamos en Ti?
            </h2>
            <div className="space-y-3 mb-8">
              {buscamos.map((b, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0d0d1e] border border-blue-500/8 rounded-xl px-4 py-3.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-white/65 text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-14 bg-[#0a0a16]">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-center mb-10">¿Cómo funciona el proceso?</h2>
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-5 bg-[#0d0d1e] border border-blue-500/8 rounded-2xl p-5">
                <span className="text-blue-500/40 font-extrabold text-3xl shrink-0">{s.n}</span>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-white/45 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#07070f]">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div className="bg-gradient-to-br from-blue-600/15 to-blue-800/8 border border-blue-500/25 rounded-3xl p-10">
            <h2 className="text-3xl font-extrabold mb-3">¿Listo para liderar tu agencia?</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">Da el primer paso hacia la independencia económica y el liderazgo digital. Nuestro equipo te guiará en todo el proceso.</p>
            <Link href="/contacto"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)]">
              Comenzar Ahora <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
