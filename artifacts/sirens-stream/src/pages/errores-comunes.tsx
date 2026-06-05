import { Link } from "wouter";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ArrowRight, XCircle, Clock, DollarSign, Heart, Zap, MessageCircle, Shield, TrendingUp, Star } from "lucide-react";

const errores = [
  {
    n: "01",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    accentBg: "bg-red-500/15",
    title: "Pensar que es un juego o pasatiempo",
    desc: "El error más común y más costoso. Muchas chicas entran pensando que esto es \"algo para pasar el rato\" y se sorprenden cuando no ven resultados. Las plataformas tienen algoritmos que miden tu actividad: si no eres constante, te penalizan rebajando tu visibilidad.",
    consecuencia: "Tu perfil pierde posicionamiento y los usuarios dejan de encontrarte.",
    solucion: "Trátalo como lo que es: un trabajo real. Tiene horario, tiene metas y tiene resultados proporcionales a tu esfuerzo.",
    tips: ["Crea un horario fijo de trabajo diario", "Ponle alarma como si fuera un empleo", "Anota tus metas semanales y revísalas"],
  },
  {
    n: "02",
    icon: DollarSign,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    accentBg: "bg-amber-500/15",
    title: "Creer que el dinero no es real o que no llegará",
    desc: "La desconfianza mata la motivación antes de que el dinero llegue. Muchas nuevas se rinden en la primera semana porque \"aún no han cobrado\" sin entender que los pagos son semanales y que la primera semana es de aprendizaje y posicionamiento de perfil.",
    consecuencia: "Abandonan justo cuando el perfil empieza a crecer y los primeros pagos estaban por llegar.",
    solucion: "Confía en el proceso. Los pagos son reales, en USD, y llegan cada semana. Las chicas con más de un mes llevan ya varios cobros acumulados.",
    tips: ["Espera mínimo 2 semanas antes de evaluar resultados", "Pregunta a tu tutora cuándo esperar tu primer pago", "Guarda capturas de tus ganancias diarias para ver el progreso"],
  },
  {
    n: "03",
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    accentBg: "bg-blue-500/15",
    title: "No dedicarle tiempo suficiente",
    desc: "Las plataformas premian el tiempo en línea. No es lo mismo estar 1 hora de vez en cuando que estar 4-5 horas de forma constante. Los algoritmos miden tu actividad diaria y recompensan a las que cumplen metas de tiempo con mayor visibilidad y bonos.",
    consecuencia: "Bajas ganancias, menos visibilidad en la plataforma y acceso limitado a bonos de tiempo.",
    solucion: "Comprométete con al menos 4 horas diarias. No tienen que ser seguidas — puedes dividirlas en bloques de mañana y noche.",
    tips: ["Mínimo 4 horas diarias para cumplir metas", "Puedes dividirlo: 2h mañana + 2h noche", "Los fines de semana hay más usuarios activos — aprovéchalos", "La app mide minutos en línea — no te desconectes sin terminar tu meta"],
  },
  {
    n: "04",
    icon: XCircle,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    accentBg: "bg-pink-500/15",
    title: "No ponerle empeño ni actitud positiva",
    desc: "La energía que proyectas en los mensajes y en las interacciones se nota. Los usuarios pagan más y regresan más seguido cuando sienten que la streamer está genuinamente interesada en la conversación. Una chica apagada, respondiendo con monosílabos, gana mucho menos que una que interactúa con entusiasmo.",
    consecuencia: "Usuarios que no regresan, baja tasa de retención y pocos regalos/diamantes.",
    solucion: "Aunque estés cansada, mantén energía positiva durante tus horas de trabajo. Es parte del trabajo, igual que sonreír en un empleo de atención al cliente.",
    tips: ["Responde con oraciones completas, no con \"sí\", \"no\", \"ok\"", "Haz preguntas a los usuarios para mantener la conversación viva", "Usa emojis para hacer el chat más cálido y personal", "Personaliza cada conversación — los usuarios VIP notan la diferencia"],
  },
  {
    n: "05",
    icon: MessageCircle,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    accentBg: "bg-purple-500/15",
    title: "Tratar mal a los usuarios o ser grosera",
    desc: "Este error parece obvio pero ocurre más de lo que imaginas, especialmente cuando una usuaria recibe mensajes incómodos o inapropiados. La reacción instintiva puede ser responder de mala manera — pero en las plataformas esto tiene consecuencias directas en tu puntaje y visibilidad.",
    consecuencia: "Reportes de usuarios, baja puntuación del perfil, suspensión temporal o permanente de la cuenta.",
    solucion: "Si un usuario se pasa de la raya, ignóralo o cierra la conversación de forma educada. Nunca seas grosera ni lo insultes. Informa a tu tutora si algo te molesta.",
    tips: ["Ante usuarios incómodos: ignora o cierra sin respuesta hostil", "Nunca compartas datos personales por más que insistan", "Usa la función de bloqueo/reporte cuando sea necesario", "Tu tutora puede orientarte sobre cómo manejar situaciones difíciles"],
  },
  {
    n: "06",
    icon: Shield,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    accentBg: "bg-green-500/15",
    title: "No completar el perfil correctamente",
    desc: "Un perfil incompleto o mal configurado es invisible. Muchas chicas se registran sin poner foto real, sin descripción, sin audio de voz, y se preguntan por qué nadie las contacta. La plataforma utiliza tu perfil para mostrarte a usuarios — un perfil vacío simplemente no aparece.",
    consecuencia: "Cero o muy poca actividad de usuarios, pocas ganancias en las primeras semanas.",
    solucion: "Dedica la primera sesión completa a configurar tu perfil al 100%: foto real de calidad, descripción atractiva, audio de voz, álbum con fotos variadas.",
    tips: ["Foto de perfil: real, alta calidad, buena iluminación", "Para Layla: selecciona FEMENINO desde el inicio — no se puede cambiar", "Agrega el código de agencia antes de empezar (Layla: G-84Y3AG7HL)", "Para Howdy: sube cover + 3 fotos de álbum antes de hacer submit", "Descripción clara y amigable que invite a conversar"],
  },
  {
    n: "07",
    icon: TrendingUp,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    accentBg: "bg-cyan-500/15",
    title: "No aprovechar los bonos y metas diarias",
    desc: "Las plataformas tienen sistemas de bonos que multiplican tus ganancias si cumples ciertas metas. Muchas chicas los ignoran porque no los conocen bien o porque se conforman con las ganancias base. Los bonos pueden representar hasta el 30-50% de los ingresos totales de una semana.",
    consecuencia: "Ganancias significativamente menores a las que podrías obtener con el mismo tiempo de trabajo.",
    solucion: "Aprende las metas de tu app y planifica tu sesión para cumplirlas. En Waha: tiempo en línea, saludos y tasa de respuesta son claves. En Howdy: acumula 180 min online + 150 min en llamadas para el bono diario de $10 USD.",
    tips: ["En Waha: mantén +200 minutos/día para bono de tiempo", "Saluda a +150 usuarios por día para activar bono de saludos", "Mantén tasa de respuesta +30% en chat", "En Layla: meta diaria sugerida = 155,000 monedas = $10 USD", "En Howdy: 180 min online + 150 min en llamadas = bono diario $10 USD"],
  },
  {
    n: "08",
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    accentBg: "bg-rose-500/15",
    title: "No pedir ayuda cuando se tienen dudas",
    desc: "Algunas chicas prefieren quedarse atascadas con un problema antes de preguntar, por pena o por no querer molestar. Este es un error que cuesta dinero real: horas perdidas, cuentas mal configuradas o malentendidos sobre cómo funciona un bono pueden evitarse con una sola pregunta a la tutora.",
    consecuencia: "Errores que se acumulan, frustración, y en casos extremos, cuentas suspendidas por configuración incorrecta.",
    solucion: "Tu tutora está para eso — pregunta todo lo que necesites, cuando lo necesites. No existe pregunta tonta cuando hay dinero de por medio.",
    tips: ["Guarda el contacto de tu tutora en WhatsApp desde el primer día", "Si tienes dudas técnicas, manda captura de pantalla — es más fácil ayudarte", "Únete al grupo de apoyo de la agencia para ver consejos de otras chicas", "Revisa las guías de instalación en la sección Apps antes de empezar"],
  },
];

const reglas = [
  { icon: Zap, text: "Constancia diaria por encima de todo" },
  { icon: Star, text: "Perfil 100% completo desde el día 1" },
  { icon: MessageCircle, text: "Conversaciones personalizadas y con energía" },
  { icon: TrendingUp, text: "Metas y bonos siempre en mente" },
  { icon: Shield, text: "Trato siempre respetuoso y profesional" },
  { icon: Heart, text: "Pedir ayuda cuando la necesitas" },
];

export default function ErroresComunes() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[700px] h-[400px] rounded-full bg-red-600/6 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-purple-600/6 blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-full px-4 py-1.5 mb-5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-300 text-xs font-semibold uppercase tracking-wider">Guía para nuevas streamers</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-[1.1]">
            Los <span className="text-red-400">8 Errores</span> más<br />
            comunes al empezar
          </h1>
          <p className="text-white/55 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
            Conocerlos antes de empezar es la diferencia entre ganar desde la primera semana o abandonar frustrada. Lee esto una vez antes de descargar tu app.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/apps"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              Ver Apps disponibles <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/ser-streamer"
              className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors">
              Cómo unirme
            </Link>
          </div>
        </div>
      </section>

      {/* Intro box */}
      <div className="max-w-4xl mx-auto px-5 mb-16">
        <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-6 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Star className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-white mb-1">¿Por qué es importante leer esto?</p>
            <p className="text-white/55 text-sm leading-relaxed">
              La mayoría de las chicas que no logran resultados no lo hacen por falta de oportunidad — lo hacen por alguno de estos errores. Identificarlos a tiempo puede ahorrarte semanas de frustración y cientos de dólares perdidos.
            </p>
          </div>
        </div>
      </div>

      {/* Errors list */}
      <section className="max-w-4xl mx-auto px-5 pb-20 space-y-6">
        {errores.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`bg-[#0d0d1e] border ${e.bg.split(' ')[1]} rounded-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b border-white/5 flex items-start gap-4`}>
              <div className={`w-11 h-11 rounded-xl ${e.accentBg} flex items-center justify-center shrink-0`}>
                <e.icon className={`w-5 h-5 ${e.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs font-black uppercase tracking-widest ${e.color} opacity-60`}>Error {e.n}</span>
                </div>
                <h2 className="text-lg font-extrabold text-white leading-tight">{e.title}</h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-white/60 text-sm leading-relaxed">{e.desc}</p>

              {/* Consecuencia */}
              <div className="flex gap-3 items-start bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300/80 leading-relaxed">
                  <span className="font-bold text-red-300">Consecuencia: </span>{e.consecuencia}
                </p>
              </div>

              {/* Solución */}
              <div className="flex gap-3 items-start bg-green-500/8 border border-green-500/15 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-300/80 leading-relaxed">
                  <span className="font-bold text-green-300">Solución: </span>{e.solucion}
                </p>
              </div>

              {/* Tips */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-2">Tips prácticos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {e.tips.map((tip, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-white/50">
                      <span className={`${e.color} mt-0.5 shrink-0`}>›</span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Golden rules */}
      <section className="bg-[#0a0a16] border-y border-purple-500/10 py-16">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400/70">Resumen</span>
            <h2 className="text-3xl font-extrabold mt-2">Las 6 reglas de oro de una streamer exitosa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reglas.map((r, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#0d0d1e] border border-purple-500/12 rounded-xl px-4 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                  <r.icon className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-sm text-white/70 font-medium">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 max-w-xl mx-auto px-5 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-5" />
        <h2 className="text-3xl font-extrabold mb-3">¿Lista para empezar bien desde el día 1?</h2>
        <p className="text-white/50 text-sm mb-7 leading-relaxed">
          Ahora que conoces los errores a evitar, el siguiente paso es unirte a la agencia. Tu tutora te guía en cada paso para que no cometas ninguno de estos errores.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)]">
            Quiero unirme ahora <ArrowRight className="w-4 h-4" />
          </a>
          <Link href="/apps"
            className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
            Ver Apps
          </Link>
        </div>
      </section>

    </div>
  );
}
