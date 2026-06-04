import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, Shield, Users, TrendingUp, Globe, ArrowRight } from "lucide-react";

const stats = [
  { icon: Users, val: "+500", label: "Streamers activas" },
  { icon: TrendingUp, val: "+3 años", label: "De experiencia" },
  { icon: Globe, val: "+20", label: "Países representados" },
  { icon: Shield, val: "100%", label: "Seguridad garantizada" },
];

const faqs = [
  {
    q: "¿Qué es Sirens Stream?",
    a: <>
      <p className="mb-3"><strong className="text-blue-400">Sirens Stream</strong> es una agencia especializada en el reclutamiento y capacitación de mujeres para trabajar como streamers y chat hostesses en plataformas internacionales de videochat y mensajería.</p>
      <p className="mb-3">Con más de <strong className="text-white">3 años de experiencia</strong> y una comunidad de <strong className="text-white">más de 500 streamers</strong> activas en distintos países, somos referencia en el sector del streaming online en habla hispana.</p>
      <p className="mb-3"><strong className="text-blue-400">Nuestra misión:</strong> que cada mujer que se una pueda generar ingresos reales y estables en dólares desde casa, sin inversión inicial, con capacitación gratuita y el acompañamiento constante de nuestro equipo.</p>
      <p className="text-white/40 italic">Con dedicación, nuestras streamers logran desde $2 hasta más de $100 semanales, y las más constantes superan los $1,000 al mes.</p>
    </>,
  },
  {
    q: "¿Qué es una chica Streamer o Chat Hostess?",
    a: <>
      <p className="mb-3">Una streamer o chat hostess es una persona que interactúa en tiempo real con usuarios de todo el mundo a través de apps de videochat y mensajería. Su trabajo consiste en:</p>
      <ul className="space-y-2 mb-3">
        {["Mantener conversaciones amigables y entretenidas con los usuarios","Acompañar, motivar y crear conexiones genuinas","Entretener mediante chats, salas de audio o videollamadas opcionales","Aplicar estrategias de interacción para maximizar sus ganancias"].map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-white/60">
            <span className="text-blue-400 mt-1">→</span>{item}
          </li>
        ))}
      </ul>
      <p className="text-white/40 text-sm">No es necesario tener experiencia. Nosotros te enseñamos todo desde cero.</p>
    </>,
  },
  {
    q: "¿De qué trata el trabajo exactamente?",
    a: <>
      <p className="mb-3">El trabajo consiste en conectarte a las apps disponibles (Waha y Layla) y chatear con usuarios masculinos de distintos países aplicando estrategias de comunicación que te enseñamos.</p>
      <p className="mb-3">Las actividades principales son:</p>
      <ul className="space-y-2 mb-3">
        {["Enviar y responder mensajes de manera personalizada y estratégica","Participar en salas de audio (disponible en Waha)","Realizar videollamadas de forma opcional","Mantener conversaciones entretenidas que fidelicen a los usuarios"].map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-white/60">
            <span className="text-blue-400 mt-1">→</span>{item}
          </li>
        ))}
      </ul>
      <p className="text-white/45 text-sm bg-blue-500/8 border border-blue-500/15 rounded-xl px-4 py-3">
        El contenido del trabajo es el de acompañamiento y entretenimiento. No se requiere mostrar nada que no quieras. Tú tienes el control total en todo momento.
      </p>
    </>,
  },
  {
    q: "¿Cuáles son los requisitos para unirme?",
    a: <ul className="space-y-3">
      {[
        ["Ser mujer mayor de 18 años","Indispensable. Trabajamos únicamente con adultas."],
        ["Smartphone con buena cámara","Android o iOS, de gama media-alta para mejor rendimiento."],
        ["Conexión WiFi o datos móviles estables","Es fundamental para trabajar sin interrupciones."],
        ["Disponibilidad de 4–5 horas diarias (mínimo)","Para lograr resultados consistentes recomendamos este tiempo."],
        ["Actitud positiva, compromiso y responsabilidad","Lo más importante. El éxito depende de tu constancia."],
        ["Sin experiencia previa","Te capacitamos completamente desde cero."],
      ].map(([req, detail], i) => (
        <li key={i} className="flex items-start gap-3 bg-[#0a0a14] border border-blue-500/8 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-white/85">{req}</p>
            <p className="text-white/40 text-xs mt-0.5">{detail}</p>
          </div>
        </li>
      ))}
    </ul>,
  },
  {
    q: "¿Los hombres pueden trabajar en la agencia?",
    a: <>
      <p className="mb-3 text-white/60">Las apps que manejamos actualmente (Waha y Layla) están diseñadas para que mujeres interactúen con usuarios masculinos. Por eso, en este momento <strong className="text-white">solo trabajamos con mujeres</strong>.</p>
      <p className="text-white/60">Si eres hombre y te interesa el mundo del streaming, puedes explorar la opción de <Link href="/crear-agencia" className="text-blue-400 hover:underline">crear tu propia agencia</Link> como manager y liderar un equipo de streamers.</p>
    </>,
  },
  {
    q: "¿Sin experiencia puedo empezar?",
    a: <>
      <p className="mb-3 text-white/60">¡Absolutamente sí! No necesitas ningún tipo de experiencia previa en streaming, redes sociales ni tecnología.</p>
      <p className="mb-3 text-white/60">Cuando te unes a Sirens Stream recibes:</p>
      <ul className="space-y-2">
        {["Capacitación completa paso a paso","Guías de instalación de las apps","Estrategias de interacción para maximizar ganancias","Tutoras que te acompañan durante todo el proceso","Grupo de apoyo con otras streamers de la agencia"].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-white/60 text-sm">
            <span className="text-blue-400">✓</span>{item}
          </li>
        ))}
      </ul>
    </>,
  },
  {
    q: "Normas de seguridad y privacidad",
    a: <>
      <p className="mb-3 text-white/60">Tu seguridad y privacidad son nuestra máxima prioridad. Trabajamos con plataformas verificadas internacionalmente y tenemos un protocolo claro de seguridad:</p>
      <ul className="space-y-2">
        {[
          "Nunca compartas tu nombre real, dirección, teléfono ni redes personales con usuarios",
          "No realices transferencias de dinero a usuarios bajo ningún concepto",
          "Si un usuario te hace sentir incómoda, puedes bloquearlo sin ningún problema",
          "Trabaja siempre desde un lugar privado y seguro",
          "Ante cualquier situación extraña, repórtala inmediatamente a tu tutora",
          "Sirens Stream nunca te pedirá contenido íntimo o explícito",
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />{item}
          </li>
        ))}
      </ul>
    </>,
  },
  {
    q: "¿Cómo puedo unirme a la agencia?",
    a: <>
      <p className="mb-4 text-white/60">El proceso es muy sencillo y rápido. Solo sigue estos pasos:</p>
      <div className="space-y-3 mb-5">
        {[
          ["Contáctanos", "Escríbenos por WhatsApp o Instagram contándonos que te interesa."],
          ["Entrevista inicial", "Una de nuestras coordinadoras te explicará todo el proceso."],
          ["Instalación y registro", "Te guiamos en la instalación de las apps y el proceso de registro."],
          ["Capacitación gratuita", "Aprenderás las estrategias básicas para empezar a ganar."],
          ["¡Empiezas a trabajar!", "Con el soporte constante de tu tutora asignada."],
        ].map(([title, desc], i) => (
          <div key={i} className="flex items-start gap-4 bg-[#0a0a14] border border-blue-500/8 rounded-xl px-4 py-3">
            <span className="text-blue-500/50 font-extrabold text-lg shrink-0">{String(i+1).padStart(2,"0")}</span>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-white/40 text-xs mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/contacto"
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
        Contactar Ahora <ArrowRight className="w-4 h-4" />
      </Link>
    </>,
  },
  {
    q: "Grupos y comunicación interna de la agencia",
    a: <p className="text-white/60">Al unirte tendrás acceso a nuestros grupos oficiales de WhatsApp y Telegram donde compartimos novedades, estrategias, bonos, actualizaciones de las apps y mucho más. El equipo está siempre disponible para responder dudas y motivar al grupo.</p>,
  },
];

export default function Nosotros() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#07070f] text-white pt-16">
      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-blue-600/7 blur-[80px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Sobre Nosotros</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">La agencia que <span className="gradient-text">transforma tu tiempo</span> en ingresos</h1>
          <p className="text-white/50 max-w-2xl mx-auto">Más de 3 años ayudando a mujeres a alcanzar independencia económica desde casa. Conoce nuestra historia, valores y resuelve todas tus dudas.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-10">
        <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#0d0d1e] border border-blue-500/10 rounded-2xl p-5 text-center">
              <s.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-extrabold text-2xl">{s.val}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openIdx === i;
              return (
                <div key={i} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? "border-blue-500/30" : "border-blue-500/8"}`}>
                  <button className="w-full flex items-center justify-between p-5 text-left hover:bg-white/2 transition-colors"
                    onClick={() => setOpenIdx(isOpen ? null : i)}>
                    <span className="font-semibold text-sm pr-4 text-white/90">{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-blue-500/10 px-5 pb-5 pt-4 text-sm leading-relaxed bg-[#0a0a14]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
