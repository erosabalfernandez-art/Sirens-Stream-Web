import { useState } from "react";
  import { Link } from "wouter";
  import { ChevronDown, ChevronUp, CheckCircle2, Smartphone, Clock, DollarSign, MessageCircle, ArrowRight, X, BookOpen, Copy, Check, Send } from "lucide-react";

  /* ── SVG Icons ── */
  const WahaIcon = () => (
    <img src="/images/waha-icon.png" alt="Waha" className="w-full h-full object-cover rounded-full ring-2 ring-[#ff4e6a]/40 shadow-[0_0_16px_rgba(255,78,106,0.4)]" />
  );

  const LaylaIcon = () => (
    <img src="/images/layla-icon.png" alt="Layla" className="w-full h-full object-cover rounded-full ring-2 ring-[#a855f7]/40 shadow-[0_0_16px_rgba(168,85,247,0.4)]" />
  );
  /* ── Data: WAHA ── */
  const WAHA_GANANCIAS = [
    { cat: "Mensajes", rows: [{ t: "Usuarios VIP", v: "70 diamantes" }, { t: "Usuarios Free", v: "5 puntos" }] },
    { cat: "Videollamadas Match", rows: [{ t: "Usuarios VIP", v: "350 diamantes" }, { t: "Usuarios Free", v: "120 puntos" }] },
    { cat: "Videollamadas Privadas", rows: [{ t: "Por minuto", v: "700 diamantes" }] },
    { cat: "Regalos", rows: [{ t: "Streamers reciben", v: "100% del valor" }] },
  ];
  const WAHA_PAGOS = [
    { c: "Meta mínima diamantes", v: "10,000 = $2.50 USD" },
    { c: "Meta mínima puntos", v: "10,000 = $1.80 USD" },
    { c: "Pago semanal", v: "Martes a Viernes (por agencia)" },
  ];
  const WAHA_SALARIO = [
    { m: "Tiempo en línea", r: "+200 minutos/día" },
    { m: "Saludos a usuarios", r: "+150 usuarios/día" },
    { m: "Tasa de respuesta", r: "+30% en chat" },
  ];
  const WAHA_BONOS = [
    { nombre: "Diamantes en Chat", items: [{ c: "10,000 diamantes", v: "+$0.50 USD" }, { c: "30,000 diamantes", v: "+$2.00 USD" }, { c: "100,000 diamantes", v: "+$10.00 USD" }] },
    { nombre: "Diamantes en Salas de Voz", items: [{ c: "2,000 diamantes", v: "+$0.30 USD" }, { c: "10,000 diamantes", v: "+$1.00 USD" }, { c: "30,000 diamantes", v: "+$3.00 USD" }, { c: "100,000 diamantes", v: "+$15.00 USD" }] },
  ];

  /* ── Data: LAYLA ── */
  const LAYLA_COINS = [
    { m: "15,500", u: "$1" }, { m: "155,000", u: "$10" }, { m: "465,000", u: "$30" },
    { m: "775,000", u: "$50" }, { m: "1,240,000", u: "$80" }, { m: "1,550,500", u: "$100" }, { m: "3,101,000", u: "$200" },
  ];
  const LAYLA_PRICES = [
    { c: "Ticket chat mensajes", v: "45" },
    { c: "SayHi", v: "14" },
    { c: "Enviar mensaje", v: "90" },
    { c: "Regalo normal", v: "100%" },
    { c: "Regalo suerte", v: "10%" },
    { c: "Llamada voz / min", v: "1,350" },
    { c: "Videollamada / min", v: "2,700" },
    { c: "Match voz / min", v: "270" },
    { c: "Video Match / min", v: "540" },
    { c: "Ticket Match/Llamada", v: "20%" },
  ];
  const LAYLA_FUNCIONES = [
    { f: "Llamadas de voz", rows: [{ k: "Ganancia por minuto", v: "1,350 monedas" }, { k: "Equivalente USD", v: "$0.087 / minuto" }] },
    { f: "Match de video", rows: [{ k: "Ganancia por minuto", v: "540 monedas" }, { k: "Videollamada premium", v: "2,700 / minuto" }] },
    { f: "Mensajería privada", rows: [{ k: "Por mensaje", v: "90 monedas" }, { k: "Ticket entrada chat", v: "45 monedas" }] },
    { f: "Regalos y recompensas", rows: [{ k: "Regalo normal", v: "100% del valor" }, { k: "Regalo de la suerte", v: "10% adicional" }] },
  ];
  const LAYLA_BONOS = [
    { k: "Bonos exclusivos", v: "Cupones y promociones" },
    { k: "Meta diaria sugerida", v: "155,000 monedas → $10 USD" },
  ];
  const LAYLA_GUIDE_STEPS = [
    { n: 1, t: "Descarga la App", d: "Selecciona el botón de descarga según tu dispositivo (Android o iOS)." },
    { n: 2, t: "Instala la Aplicación", d: "Instala la aplicación desde el enlace descargado." },
    { n: 3, t: "Selección de Género ⚠️", d: 'Selecciona "Femenino" como tu sexo. Esta elección es permanente y no se puede modificar.' },
    { n: 4, t: "Configuración Inicial", d: "Foto de perfil: imagen real, alta calidad (no IA). Nombre y etiquetas: ingresa nombre y etiquetas de interés." },
    { n: 5, t: "Código de Agencia 🔑", d: "Agrega el código para habilitar monetización. Sin este código NO se puede monetizar la app." },
    { n: 6, t: "Verificación de Identidad", d: "Completa la verificación para autenticar tu perfil. Usa tu foto real, alta calidad." },
    { n: 7, t: "Completa tu Perfil", d: "Álbum: imágenes reales variadas. Audio: voz clara y auténtica. Descripción: biografía completa." },
  ];

  /* ── Apps list ── */
  const apps = [
    {
      id: "waha", Icon: WahaIcon, name: "Waha",
      tagline: "Mensajería · Salas de Audio · Videollamadas (opcionales)",
      badge: "Retiro semanal",
      badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      borderOpen: "border-red-500/30",
      accentText: "text-red-300",
      desc: "Plataforma completa de interacción con usuarios de todo el mundo. Mensajes de texto, salas de audio grupales, videollamadas match y videollamadas privadas opcionales.",
      specs: [
        { l: "Android", v: "Waha" }, { l: "iOS", v: "Liyo" },
        { l: "Tiempo diario", v: "+4 Horas" }, { l: "Modo", v: "Mensajes, Salas Audio, Videollamadas, Zona Match" },
        { l: "Retiro mínimo", v: "Semanal (No acumulable)" }, { l: "Meta mínima", v: "$2.50 USD (10,000 diamantes)" },
      ],
      requisitos: ["Ser mayor de edad", "Contar con buen WiFi/datos", "Disponible 4–5 horas diarias"],
      guideImages: ["/images/waha-guide.png"],
      type: "waha",
      telegramUrl: "https://t.me/ingresos_waha",
    },
    {
      id: "layla", Icon: LaylaIcon, name: "Layla",
      tagline: "Mensajes + Videollamadas · Retiro Acumulable · Horario Flexible · Meta $10",
      badge: "Retiros acumulativos",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      borderOpen: "border-purple-500/30",
      accentText: "text-purple-300",
      desc: "Plataforma enfocada en mensajes, con horarios completamente flexibles. Sí acepta videollamadas, llamadas de voz y match — pero no son obligatorias. Su mayor ventaja es el retiro acumulable desde $10 USD.",
      specs: [
        { l: "Android", v: "Layla" }, { l: "iOS", v: "Nivi" },
        { l: "Tiempo diario", v: "Flexible (Pocas horas)" }, { l: "Modo", v: "Solo Mensajes (Sin videollamada)" },
        { l: "Retiro", v: "Acumulable" }, { l: "Meta mínima", v: "$10 USD" },
      ],
      requisitos: ["Mayor de edad", "WiFi / Datos estables", "4–5 horas diarias"],
      guideImages: ["/images/layla-guide.png", "/images/layla-agency-guide.png"],
      type: "layla",
      telegramUrl: "https://t.me/ingresos_layla",
    },
  ];


    /* ── Waha Step-by-Step Guide Modal ── */
    function WahaGuideModal({ onClose }: { onClose: () => void }) {
      const [imgExpanded, setImgExpanded] = useState(false);
      return (
        <>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d0d1e] rounded-t-3xl sm:rounded-2xl border border-white/8 shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#0d0d1e]/95 backdrop-blur-sm border-b border-white/8">
                <p className="text-white/60 text-sm font-semibold">Guia de instalacion — Waha</p>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Hero title */}
              <div className="px-5 pt-8 pb-6 text-center border-b border-white/5">
                <h1 className="text-5xl font-black text-blue-400 tracking-widest mb-2">WAHA</h1>
                <p className="text-white/50 font-bold text-xs uppercase tracking-widest">Guía de Instalación Paso a Paso</p>
              </div>
              {/* Steps */}
              <div className="px-5 py-6 space-y-3">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <p className="text-white/70 text-sm font-bold">Pasos para Instalar</p>
                </div>
                {/* Paso 1 — Download buttons */}
                <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4">
                  <p className="text-sm text-white/80 mb-3">
                    <span className="text-blue-400 font-black">Paso 1</span>{"  "}Selecciona el botón de descarga según tu dispositivo:
                  </p>
                  <div className="space-y-2.5">
                    <a href="https://play.google.com/store/apps/details?id=com.phx.waha" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#1a1a35] border border-blue-500/30 text-blue-300 font-bold py-3 rounded-xl text-sm hover:bg-blue-500/10 transition-colors underline underline-offset-2">
                      🤖 Descargar para Android
                    </a>
                    <a href="https://apps.apple.com/us/app/liyo-emotions-find-echo/id6746777859?l=es-MX" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#1a1a35] border border-blue-500/30 text-blue-300 font-bold py-3 rounded-xl text-sm hover:bg-blue-500/10 transition-colors underline underline-offset-2">
                      🍎 Descargar para iOS
                    </a>
                    <a href="#"
                        className="flex items-center justify-center gap-2 w-full bg-green-600/20 border border-green-500/30 text-green-300 font-bold py-3 rounded-xl text-sm hover:bg-green-600/30 transition-colors underline underline-offset-2">
                        💬 Enviar Captura + ID por WhatsApp
                      </a>
                  </div>
                </div>
                {/* Steps 2–5 */}
                {[
                  { n: 2, t: "Instala la aplicación desde el enlace descargado." },
                  { n: 3, t: 'Abre la app y selecciona "Entrar con Google".' },
                  { n: 4, t: "Elige una cuenta de correo Gmail para registrarte." },
                  { n: 5, t: "Crea tu perfil: agrega una foto de perfil y completa la información." },
                ].map(s => (
                  <div key={s.n} className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <span className="text-blue-400 font-black">Paso {s.n}</span>{"  "}{s.t}
                  </div>
                ))}
                {/* Paso 6 — Screenshot button */}
                <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80 leading-relaxed">
                  <span className="text-blue-400 font-black">Paso 6</span>{"  "}Haz una{" "}
                  <button onClick={() => setImgExpanded(true)}
                    className="inline-flex items-center gap-1.5 bg-purple-600/25 border border-purple-500/40 text-purple-300 font-bold px-3 py-1 rounded-full text-xs hover:bg-purple-600/40 transition-colors mx-1 align-middle">
                    🖼️ Captura de pantalla
                  </button>
                  {" "}completa de tu perfil, copia tu ID de usuario y envíalo todo por WhatsApp.
                </div>
                {/* Tip */}
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-4 flex gap-3 items-start">
                  <span className="text-blue-400 text-base shrink-0 mt-0.5">💡</span>
                  <p className="text-sm">
                    <span className="text-blue-400 font-bold">¿Dónde ver tu ID?</span>{" "}
                    <span className="text-white/55">Dentro de tu perfil, justo debajo de tu nombre o foto, aparecerá tu código único de usuario.</span>
                  </p>
                </div>
                {/* Thumbnail image */}
                <div className="pt-1">
                  <button onClick={() => setImgExpanded(true)} className="w-full rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/30 transition-colors block">
                    <img src="/images/waha-guide-captura.png" alt="Guía visual Waha" className="w-full object-cover" />
                  </button>
                  <p className="text-center text-white/35 text-xs mt-2">👆 Toca la imagen para ampliar</p>
                </div>
              </div>
            </div>
          </div>
          {/* Full-screen image overlay */}
          {imgExpanded && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
              onClick={() => setImgExpanded(false)}
            >
              <img
                src="/images/waha-guide-captura.png"
                alt="Guía visual ampliada"
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={() => setImgExpanded(false)}
                style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <p style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Toca fuera para cerrar</p>
            </div>
          )}
        </>
      );
    }


      /* ── Layla Guide Modal ── */
      function LaylaGuideModal({ onClose }: { onClose: () => void }) {
        const [imgExpanded, setImgExpanded] = useState<number | null>(null);
        return (
          <>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
              <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d0d1e] rounded-t-3xl sm:rounded-2xl border border-white/8 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#0d0d1e]/95 backdrop-blur-sm border-b border-white/8">
                  <p className="text-white/60 text-sm font-semibold">Guia de instalacion — Layla</p>
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                {/* Hero */}
                <div className="px-5 pt-8 pb-6 text-center border-b border-white/5">
                  <h1 className="text-5xl font-black text-purple-400 tracking-widest mb-2">LAYLA</h1>
                  <p className="text-white/50 font-bold text-xs uppercase tracking-widest">Guía de Instalación Paso a Paso</p>
                </div>
                {/* Steps */}
                <div className="px-5 py-6 space-y-3">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <p className="text-white/70 text-sm font-bold">Registro en LAYLA</p>
                  </div>
                  {/* Paso 1 */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <span className="text-purple-400 font-black">Paso 1</span>{"  "}Selecciona el botón de descarga según tu dispositivo (botones al final).
                  </div>
                  {/* Paso 2 */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <span className="text-purple-400 font-black">Paso 2</span>{"  "}Instala la aplicación desde el enlace descargado.
                  </div>
                  {/* Paso 3 — Género */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <p className="font-bold text-purple-300 mb-1.5"><span className="text-purple-400 font-black">Paso 3</span>{"  "}Selección de Género</p>
                    <p>Selecciona <strong className="text-white">"Femenino"</strong> como tu sexo.</p>
                    <div className="mt-2.5 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-amber-300">
                      ⚠️ Elección permanente, no modificable.
                    </div>
                  </div>
                  {/* Paso 4 — Config inicial */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <p className="font-bold text-purple-300 mb-2"><span className="text-purple-400 font-black">Paso 4</span>{"  "}Configuración Inicial</p>
                    <p><strong className="text-white">Foto de perfil:</strong> imagen real, alta calidad (no IA).</p>
                    <p className="mt-1"><strong className="text-white">Nombre y etiquetas:</strong> ingresa nombre y etiquetas.</p>
                  </div>
                  {/* Paso 5 — Código de Agencia */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <p className="font-bold text-purple-300 mb-2"><span className="text-purple-400 font-black">Paso 5</span>{"  "}Código de Agencia</p>
                    <p className="mb-3">Agrega el código para habilitar monetización:</p>
                    <CodeCopy code="G-84Y3AG7HL" />
                    <div className="mt-2.5 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-purple-300">
                      🔑 Obligatorio para monetización.
                    </div>
                  </div>
                  {/* Paso 6 */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <p className="font-bold text-purple-300 mb-1"><span className="text-purple-400 font-black">Paso 6</span>{"  "}Verificación de Identidad</p>
                    <p>Completa la verificación para autenticar tu perfil.</p>
                  </div>
                  {/* Paso 7 */}
                  <div className="bg-[#13132a] border border-white/8 rounded-2xl p-4 text-sm text-white/80">
                    <p className="font-bold text-purple-300 mb-2"><span className="text-purple-400 font-black">Paso 7</span>{"  "}Completa tu Perfil</p>
                    <p><strong className="text-white">Álbum:</strong> imágenes reales variadas.</p>
                    <p className="mt-1"><strong className="text-white">Audio:</strong> voz clara y auténtica.</p>
                    <p className="mt-1"><strong className="text-white">Descripción:</strong> biografía completa.</p>
                  </div>
                  {/* Guía agencia */}
                  <div className="bg-purple-500/8 border border-purple-500/20 rounded-2xl p-4 text-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-purple-400">🏆</span>
                      <span className="text-purple-300 font-bold">Guía Eclipse Angels Agency</span>
                    </div>
                    <div className="space-y-1.5 text-white/70">
                      <p><strong className="text-white/90">Paso 1:</strong> Accede a "Perfil".</p>
                      <p><strong className="text-white/90">Paso 2:</strong> Ingresa a sección "Agencia".</p>
                      <p><strong className="text-white/90">Paso 3:</strong> Verifica que aparezca nuestra agencia.</p>
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-300 my-2">
                        ✅ Registro exitoso
                      </div>
                      <p><strong className="text-white/90">Paso 4:</strong> Captura de pantalla mostrando la agencia.</p>
                      <p><strong className="text-white/90">Paso 5:</strong> Envía la captura al administrador.</p>
                    </div>
                  </div>
                  {/* Imágenes expandibles */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={() => setImgExpanded(0)} className="rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-colors block">
                      <img src="/images/layla-guide-visual1.png" alt="Visual 1" className="w-full object-cover" />
                      <p className="text-center text-white/40 text-xs py-2">🖼️ Visual 1</p>
                    </button>
                    <button onClick={() => setImgExpanded(1)} className="rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-colors block">
                      <img src="/images/layla-guide-visual2.png" alt="Visual 2" className="w-full object-cover" />
                      <p className="text-center text-white/40 text-xs py-2">🖼️ Visual 2</p>
                    </button>
                  </div>
                  <p className="text-center text-white/35 text-xs">👆 Toca imágenes para ampliar</p>
                  {/* Botones descarga + WhatsApp */}
                  <div className="space-y-2.5 pt-2">
                    <a href="#" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#1a1a35] border border-purple-500/30 text-purple-300 font-bold py-3 rounded-xl text-sm hover:bg-purple-500/10 transition-colors underline underline-offset-2">
                      🤖 Descargar Android
                    </a>
                    <a href="#" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#1a1a35] border border-purple-500/30 text-purple-300 font-bold py-3 rounded-xl text-sm hover:bg-purple-500/10 transition-colors underline underline-offset-2">
                      🍎 Descargar iOS
                    </a>
                    <a href="#"
                      className="flex items-center justify-center gap-2 w-full bg-green-600/20 border border-green-500/30 text-green-300 font-bold py-3 rounded-xl text-sm hover:bg-green-600/30 transition-colors underline underline-offset-2">
                      💬 Enviar Captura + ID por WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* Full-screen image overlay */}
            {imgExpanded !== null && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                onClick={() => setImgExpanded(null)}
              >
                <img
                  src={imgExpanded === 0 ? "/images/layla-guide-visual1.png" : "/images/layla-guide-visual2.png"}
                  alt="Guía visual ampliada"
                  style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}
                  onClick={e => e.stopPropagation()}
                />
                <button
                  onClick={() => setImgExpanded(null)}
                  style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <p style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Toca fuera para cerrar</p>
              </div>
            )}
          </>
        );
      }
  
    /* ── Image Guide Modal ── */
  function GuideModal({ images, onClose }: { images: string[]; onClose: () => void }) {
    const [idx, setIdx] = useState(0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
        <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={images[idx]} alt="Guía" className="rounded-2xl max-h-[78vh] w-auto object-contain shadow-2xl" />
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-blue-400" : "w-4 bg-white/30"}`} />
              ))}
            </div>
          )}
          <p className="text-white/35 text-xs">Toca fuera para cerrar · {idx + 1}/{images.length}</p>
        </div>
      </div>
    );
  }

  /* ── Agency Code Copy ── */
  function CodeCopy({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    return (
      <div className="bg-[#0d0d20] border border-purple-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-purple-300/60 text-xs mb-1">Código de Agencia (Obligatorio)</p>
          <p className="font-mono font-extrabold text-2xl text-purple-200 tracking-widest">{code}</p>
        </div>
        <button onClick={copy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copied ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"}`}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    );
  }

  /* ── Table helper ── */
  function InfoTable({ rows, accent = "text-blue-300" }: { rows: { l?: string; r?: string; k?: string; v?: string; c?: string }[]; accent?: string }) {
    return (
      <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
        {rows.map((row, i) => {
          const label = row.l ?? row.k ?? row.c ?? "";
          const value = row.r ?? row.v ?? "";
          return (
            <div key={i} className={`flex justify-between items-center px-4 py-2.5 text-sm ${i > 0 ? "border-t border-white/5" : ""} ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
              <span className="text-white/55">{label}</span>
              <span className={`font-bold ${accent}`}>{value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">{children}</h3>;
  }

  /* ── Main component ── */
  export default function Apps() {
    const [open, setOpen] = useState<string | null>(null);
    const [guideModal, setGuideModal] = useState<string[] | null>(null);
    const [wahaGuide, setWahaGuide] = useState(false);
    const [laylaGuide, setLaylaGuide] = useState(false);

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">
        {guideModal && <GuideModal images={guideModal} onClose={() => setGuideModal(null)} />}
        {wahaGuide && <WahaGuideModal onClose={() => setWahaGuide(false)} />}
      {laylaGuide && <LaylaGuideModal onClose={() => setLaylaGuide(false)} />}

        {/* Header */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-blue-600/6 blur-[80px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Plataformas disponibles</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Catálogo de <span className="gradient-text">Apps</span></h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Trabajamos únicamente con plataformas internacionales verificadas, seleccionadas para garantizar pagos seguros y el mayor potencial de ganancias.
            </p>
          </div>
        </section>

        {/* Apps accordion */}
        <section className="pb-20">
          <div className="max-w-3xl mx-auto px-5 space-y-4">
            {apps.map((app) => {
              const isOpen = open === app.id;
              return (
                <div key={app.id} className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? `${app.borderOpen} shadow-lg` : "border-blue-500/10"}`}>

                  {/* Header */}
                  <button className="w-full flex items-start gap-4 p-6 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setOpen(isOpen ? null : app.id)}>
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md">
                      <app.Icon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h2 className="font-extrabold text-xl">{app.name}</h2>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${app.badgeColor}`}>{app.badge}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white/45 text-sm">{app.tagline}</p>
                        {app.type === "waha" && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 whitespace-nowrap">
                            Meta mín. $2.50 USD
                          </span>
                        )}
                      </div>
                      <p className="text-white/25 text-xs mt-1.5 line-clamp-2">{app.desc}</p>
                    </div>
                    <div className="shrink-0 mt-1 text-white/30">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Content */}
                  {isOpen && (
                    <div className="border-t border-white/5 p-6 space-y-7">

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => app.type === "waha" ? setWahaGuide(true) : app.type === "layla" ? setLaylaGuide(true) : setGuideModal(app.guideImages)}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                              <BookOpen className="w-4 h-4" /> Guía de Instalación
                            </button>
                        <a href={app.telegramUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-[#2CA5E0]/15 border border-[#2CA5E0]/30 text-[#2CA5E0] font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#2CA5E0]/25 transition-colors">
                          <Send className="w-4 h-4" /> Canal de Telegram
                        </a>
                        <a href="https://wa.me/5595984381686?text=Hola%2C%20necesito%20ayuda%20con%20una%20app" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/6 border border-white/12 text-white/80 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                          <MessageCircle className="w-4 h-4" /> Contactar Tutora
                        </a>
                      </div>

                      {/* Description */}
                      <p className="text-white/55 text-sm leading-relaxed">{app.desc}</p>

                      {/* Specs */}
                      <div>
                        <SectionTitle>Información General</SectionTitle>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {app.specs.map((s, i) => (
                            <div key={i} className="bg-[#0a0a14] border border-white/5 rounded-xl px-4 py-3">
                              <p className="text-white/30 text-xs mb-1">{s.l}</p>
                              <p className="font-semibold text-sm text-white/85">{s.v}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requisitos */}
                      <div>
                        <SectionTitle>Requisitos Esenciales</SectionTitle>
                        <div className="flex flex-wrap gap-2">
                          {app.requisitos.map((r, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-full px-3 py-1.5 text-xs text-white/60">
                              <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />{r}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ══ WAHA DETAILS ══ */}
                      {app.type === "waha" && (<>
                        <div>
                          <SectionTitle>Ganancias por Actividad</SectionTitle>
                          <div className="space-y-3">
                            {WAHA_GANANCIAS.map((cat, ci) => (
                              <div key={ci} className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-white/3 border-b border-white/5">
                                  <span className="text-white/70 text-sm font-bold">{cat.cat}</span>
                                </div>
                                <InfoTable rows={cat.rows.map(r => ({ l: r.t, r: r.v }))} accent="text-red-300" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <SectionTitle>Metas y Pagos</SectionTitle>
                          <InfoTable rows={WAHA_PAGOS.map(r => ({ l: r.c, r: r.v }))} accent="text-red-300" />
                          <p className="mt-2 text-xs text-white/35 px-1">⚠️ Si el dispositivo ya tuvo cuenta WAHA, no aplica el salario base.</p>
                        </div>

                        <div>
                          <SectionTitle>Salario Base Inicial</SectionTitle>
                          <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 mb-3 text-sm text-white/60">
                            Disponible solo las <strong className="text-white/80">primeras 2 semanas</strong> — <span className="text-red-300 font-bold">$1 USD diario</span> por cumplir estas metas:
                          </div>
                          <InfoTable rows={WAHA_SALARIO.map(r => ({ l: r.m, r: r.r }))} accent="text-red-300" />
                        </div>

                        <div>
                          <SectionTitle>Bonos Diarios</SectionTitle>
                          <div className="space-y-3">
                            {WAHA_BONOS.map((bono, bi) => (
                              <div key={bi} className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-white/3 border-b border-white/5">
                                  <span className="text-white/70 text-sm font-bold">{bono.nombre}</span>
                                </div>
                                <InfoTable rows={bono.items.map(r => ({ l: r.c, r: r.v }))} accent="text-red-300" />
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-white/35 px-1">* Requisito adicional: 5 días con más de 200 minutos en línea.</p>
                        </div>

                      </>)}

                      {/* ══ LAYLA DETAILS ══ */}
                      {app.type === "layla" && (<>

                        {/* Agency code highlight */}
                        <CodeCopy code="G-84Y3AG7HL" />

                        <div>
                          <SectionTitle>Conversión · Monedas → USD</SectionTitle>
                          <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                              <span>Monedas</span><span className="text-right">USD</span>
                            </div>
                            {LAYLA_COINS.map((row, i) => (
                              <div key={i} className={`grid grid-cols-2 px-4 py-2.5 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                <span className="text-white/55">{row.m}</span>
                                <span className="text-right text-purple-300 font-bold">{row.u}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-semibold">
                            META MÍNIMA: 155,000 monedas = $10 USD
                          </div>
                        </div>

                        <div>
                          <SectionTitle>Precios por Actividad</SectionTitle>
                          <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                              <span>Concepto</span><span className="text-right">Monedas</span>
                            </div>
                            {LAYLA_PRICES.map((row, i) => (
                              <div key={i} className={`grid grid-cols-2 px-4 py-2.5 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                <span className="text-white/55">{row.c}</span>
                                <span className="text-right text-purple-300 font-bold">{row.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <SectionTitle>Funciones Principales</SectionTitle>
                          <div className="space-y-3">
                            {LAYLA_FUNCIONES.map((func, fi) => (
                              <div key={fi} className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-white/3 border-b border-white/5">
                                  <span className="text-white/70 text-sm font-bold">{func.f}</span>
                                </div>
                                <InfoTable rows={func.rows} accent="text-purple-300" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <SectionTitle>Tareas Diarias + Bonos</SectionTitle>
                          <InfoTable rows={LAYLA_BONOS} accent="text-purple-300" />
                          <div className="mt-3 bg-purple-500/8 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-200/70 leading-relaxed">
                            💡 <strong>Potencial de ingresos:</strong> 4h de llamadas de voz activas = 324,000 monedas (~$20 USD). Combinando match de video y mensajes, el rendimiento diario puede superar los <span className="text-purple-300 font-bold">$30–$50 USD</span>.
                          </div>
                        </div>

                        {/* Layla registration steps */}
                        <div>
                          <SectionTitle>Pasos para Registrarse en Layla</SectionTitle>
                          <div className="space-y-2">
                            {LAYLA_GUIDE_STEPS.map((s, i) => (
                              <div key={i} className="flex gap-3 bg-[#0a0a14] border border-white/5 rounded-xl px-4 py-3">
                                <span className="text-purple-400 font-extrabold text-sm shrink-0 w-6">0{s.n}</span>
                                <div className="flex-1">
                                  <p className="font-bold text-white text-sm">{s.t}</p>
                                  <p className="text-white/45 text-xs leading-relaxed mt-0.5">{s.d}</p>
                                  {s.n === 5 && <CodeCopy code="G-84Y3AG7HL" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>)}

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-w-3xl mx-auto px-5 mt-8 text-center">
            <p className="text-white/40 text-sm mb-4">¿No sabes qué app elegir? Nuestro equipo te orienta sin compromiso</p>
            <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20asesor%C3%ADa%20sobre%20qu%C3%A9%20app%20usar" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              Asesoría Gratuita <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    );
  }
  