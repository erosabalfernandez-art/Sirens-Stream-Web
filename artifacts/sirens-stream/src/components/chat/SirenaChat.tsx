import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, User, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const WELCOME_MSG = "✨ ¡Bienvenida a Eclipse Angels Agency! Soy Ángela. ¿Tienes dudas sobre cómo ganar dinero desde casa? ¡Toca aquí para chatear!";

type Role = "user" | "assistant";
interface Msg { role: Role; content: string; }

// ── Knowledge base ─────────────────────────────────────────
const KB = {
  greeting: [
    "¡Hola! Soy Ángela ✨, tu asistente de Eclipse Angels Agency. Estoy aquí para resolver todas tus dudas sobre cómo ganar dinero desde casa con nuestras apps. ¿En qué te puedo ayudar? 😊",
    "¡Buenas! ¿Cómo estás? 😊 Soy Ángela, la asistente de Eclipse Angels Agency. ¿Te interesa saber cómo ganar dólares desde tu celular? Pregúntame lo que quieras.",
    "¡Hola! Me alegra que estés aquí 🌟 Soy Ángela. Puedo explicarte todo sobre nuestras apps, ganancias, pagos y cómo unirte. ¿Por dónde empezamos?",
  ],
  waha: `📱 *WAHA* (en iOS se llama Liyo)

Es nuestra plataforma más completa. Puedes ganar por mensajes, salas de audio, videollamadas match y videollamadas privadas. ¡Las videollamadas son 100% opcionales!

💰 Ganancias:
• Mensajes con VIP: 70 diamantes
• Videollamada match VIP: 350 diamantes
• Videollamada privada: 700 diamantes/min
• Regalos: 100% para ti

💳 Pagos:
• Meta mínima: 10,000 diamantes = $2.50 USD
• Pago SEMANAL (no acumulable)

⏰ Tiempo requerido: +4 horas diarias
📲 Disponible en Android (Waha) y iOS (Liyo)`,

  layla: `📱 *LAYLA* (en iOS se llama Nivi)

Plataforma con mensajes, salas de audio, llamadas de voz y videollamadas — todo opcional. Su gran ventaja: el retiro es ACUMULABLE, sin presión semanal.

💰 Ganancias:
• Mensajes privados: 90 monedas c/u
• Llamadas de voz: 1,350 monedas/min
• Videollamada premium: 2,700 monedas/min
• 15,500 monedas = $1 USD

💳 Pagos:
• Meta mínima: $10 USD (se acumula sin fecha límite)
• Pago SEMANAL cuando alcances la meta

⏰ Tiempo requerido: +4 horas diarias
📲 Android: Layla | iOS: Nivi
🔑 Código de agencia: G-84Y3AG7HL (obligatorio para monetizar)`,

  ganancias: `💰 Ganancias reales en Eclipse Angels Agency:

• $10–$50 USD por día en promedio
• $100–$500 USD por semana con constancia
• $1,000–$2,000 USD al mes con dedicación total

¡Y todo desde tu celular, sin inversión ni experiencia previa! 🚀

Los factores que más influyen:
✅ Constancia (más horas = más ganancias)
✅ Tasa de respuesta rápida
✅ Cumplir las metas de bonos
✅ Interactuar activamente con usuarios VIP`,

  pagos: `💳 Métodos de pago disponibles:

• *Binance* (USDT/BTC) — todos los países, inmediato
• *Pix* — solo Brasil, instantáneo sin comisiones
• *Efectivo en Cuba* — con coordinación previa
• *Transferencia bancaria Cuba* — MLC o CUP

📅 Frecuencia: cada semana (martes)
💵 Mínimos: Waha $2.50 USD | Layla $10 USD
✅ Todos los pagos son en dólares USD garantizados`,

  requisitos: `✅ Requisitos para unirte:

• Ser mujer mayor de 18 años
• Tener smartphone con buena cámara
• Conexión WiFi estable o datos
• Disponibilidad de +4 horas al día
• Actitud positiva y compromiso
• ¡Sin experiencia previa! Capacitamos gratis desde cero 🎓

El proceso es muy sencillo:
1️⃣ Nos contactas por WhatsApp o Instagram
2️⃣ Entrevista rápida sin compromiso
3️⃣ Tu tutora te guía paso a paso
4️⃣ ¡Primer pago en tu primera semana!`,

  unirse: `🚀 ¡Unirte es muy fácil!

1️⃣ Escríbenos por WhatsApp o Instagram
2️⃣ Breve entrevista express (sin compromiso)
3️⃣ Tu tutora personal te ayuda con la instalación
4️⃣ Empiezas a ganar desde el primer día

📲 WhatsApp: https://wa.me/5595984381686
📸 Instagram: @eclipse_angels.agency

¡Sin inversión, sin experiencia previa necesaria! ✨`,

  seguridad: `🔒 Tu privacidad es lo primero:

• No es obligatorio mostrar tu cara o datos reales
• Puedes usar nombre artístico y foto diferente
• No hay que vincular redes sociales personales
• Plataformas verificadas internacionalmente
• Nunca te pedimos dinero para empezar
• Tu información personal es 100% confidencial

Es un trabajo legítimo de mensajería y entretenimiento social — nada de contenido explícito.`,

  hombres: `👨 ¡Los hombres también pueden participar!

*Opción 1 — Reclutador:*
Refiere chicas a la agencia y gana comisión por cada una que se una y empiece a generar. Sin límite de ingresos ni horario fijo.

*Opción 2 — Apps:*
Puedes registrarte en algunas apps de la red y generar ingresos propios.

Mismo soporte y capacitación que las chicas. 💪
WhatsApp: https://wa.me/5595984381686`,

  contacto: `📞 Contáctanos directamente:

💬 WhatsApp: https://wa.me/5595984381686
📸 Instagram: @eclipse_angels.agency
🎵 TikTok: @eclipse_angels1
📘 Facebook: eclipse_angels.agency
📧 Email: eclipse_angels@outlook.com

⏰ Atención: lunes a domingo, 9 AM a 11 PM
¡Te respondemos lo antes posible! 😊`,

  comparacion: `🤔 ¿Waha o Layla? Aquí te ayudo a elegir:

*Elige WAHA si:*
✅ No te molesta hacer videollamadas opcionales
✅ Quieres múltiples formas de ganar (chat, audio, video)
✅ Prefieres cobrar cada semana automáticamente
✅ Buscas más dinamismo y variedad

*Elige LAYLA si:*
✅ Prefieres mensajes y salas de audio principalmente
✅ Las videollamadas te parecen opcionales y está bien
✅ Prefieres acumular ganancias sin presión semanal
✅ Quieres empezar con algo más tranquilo

*¿Aún no decides?* Cuéntame un poco más: ¿tienes preferencia por videollamadas o prefieres solo mensajes/audio? ¿Te importa cobrar semanalmente o prefieres acumular? 😊`,

  agencia: `🏢 Eclipse Angels Agency

Somos una agencia especializada en streamers y chat hostess. Conectamos mujeres (mayores de 18 años) con plataformas internacionales verificadas para ganar dinero en dólares desde el celular.

✨ Lo que nos diferencia:
• Soporte 24/7 personalizado
• Tutoras para guiarte paso a paso
• $0 inversión para empezar
• Pagos garantizados cada semana
• Operamos en todos los países
• Comunidad de chicas que se apoyan

¿Quieres saber más sobre algún aspecto en particular? 😊`,

  default_positivo: [
    "¡Claro, con gusto te ayudo! 😊 Puedo contarte sobre Waha, Layla, ganancias, pagos, cómo unirte o cualquier duda que tengas. ¿Qué te interesa saber?",
    "¡Buena pregunta! Estoy aquí para ayudarte con todo lo relacionado a Eclipse Angels Agency. ¿Me das más detalles sobre lo que necesitas saber?",
    "¡Hola! Cuéntame más sobre lo que quieres saber. Puedo explicarte sobre nuestras apps, cuánto se gana, cómo se paga, o cómo unirte al equipo. 🌟",
    "¡Con mucho gusto te cuento! Tengo toda la información sobre nuestras plataformas, ganancias y proceso de ingreso. ¿Qué te gustaría saber primero?",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getResponse(text: string): string {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Saludos
  if (/^(hola|buenas|buenos|hey|hi|ola|saludos|buen dia|buen dia|que tal|como estas|q tal)\b/.test(t)) {
    return pickRandom(KB.greeting);
  }

  // Waha
  if (/waha|liyo|diamante/.test(t)) return KB.waha;

  // Layla / Nivi
  if (/layla|nivi|moneda|acumulable/.test(t)) return KB.layla;

  // Comparación
  if (/cual (es |)mejor|que (app|plataforma)|diferencia|waha o layla|layla o waha|recomienda|cual me|que me|cual elijo|como elijo/.test(t)) {
    return KB.comparacion;
  }

  // Ganancias
  if (/gana|cuanto|dinero|plata|sueldo|salario|ingreso|beneficio|cobr/.test(t)) {
    return KB.ganancias;
  }

  // Pagos / retiros
  if (/pago|paga|retiro|cobro|binance|pix|banco|transferencia|metodo|cuando me pagan|forma de pago/.test(t)) {
    return KB.pagos;
  }

  // Requisitos
  if (/requisito|necesito|edad|mayor|necesita|que se necesita|condicion/.test(t)) {
    return KB.requisitos;
  }

  // Unirse / cómo empezar
  if (/unir|empezar|comenzar|inscribir|registrar|como entro|como me uno|quiero entrar|quiero unirme|inicio|empiezo|como empiezo/.test(t)) {
    return KB.unirse;
  }

  // Seguridad / privacidad
  if (/segur|privacidad|real|cara|foto|datos|confid|peligro|estafa|scam|legal|legitim/.test(t)) {
    return KB.seguridad;
  }

  // Hombres
  if (/hombre|chico|masculino|hombres|reclutador|referir/.test(t)) {
    return KB.hombres;
  }

  // Contacto
  if (/contacto|whatsapp|instagram|tiktok|facebook|email|correo|telefono|redes/.test(t)) {
    return KB.contacto;
  }

  // Sobre la agencia
  if (/agencia|eclipse|angels|que es|de que trata|empresa|quienes son/.test(t)) {
    return KB.agencia;
  }

  // Apps en general
  if (/app|aplicacion|plataforma|nivi/.test(t)) {
    return `Trabajamos con dos plataformas principales:\n\n📱 *Waha* (iOS: Liyo) — mensajes, salas de audio y videollamadas opcionales. Meta mín. $2.50 USD. Pago semanal.\n\n📱 *Layla* (iOS: Nivi) — mensajes, salas de audio, llamadas de voz y videollamadas opcionales. Meta mín. $10 USD. Retiro acumulable.\n\n¿Quieres que te cuente más de alguna en específico? 😊`;
  }

  // Respuesta genérica amigable
  return pickRandom(KB.default_positivo);
}

// ── Component ───────────────────────────────────────────────
export function SirenaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "¡Hola! Soy Ángela ✨, tu asistente en Eclipse Angels Agency. Estoy aquí para resolver todas tus dudas sobre cómo trabajar con nosotros, las apps disponibles, pagos y mucho más. ¿En qué te puedo ayudar?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = setTimeout(() => setShowBubble(true), 1000);
    const hide = setTimeout(() => setShowBubble(false), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const openChat = useCallback(() => { setShowBubble(false); setIsOpen(true); }, []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback((msg: string) => {
    if (!msg.trim() || isTyping) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setIsTyping(true);
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const reply = getResponse(msg);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setIsTyping(false);
    }, delay);
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  // Contextual quick replies — change based on last AI message topic
  const getContextualReplies = (): string[] => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAssistant) return ["¿Qué app me recomiendas?", "¿Cuánto puedo ganar?", "¿Cómo me uno?", "¿Es seguro?"];
    const t = lastAssistant.content.toLowerCase();
    if (t.includes("waha") && t.includes("layla") && t.includes("diamante")) {
      // Comparación mostrada
      return ["Cuéntame más de Waha", "Cuéntame más de Layla", "¿Cuánto se gana?", "Quiero unirme"];
    }
    if (t.includes("waha") || t.includes("diamante") || t.includes("liyo")) {
      return ["¿Cuánto puedo ganar en Waha?", "¿Cómo me registro en Waha?", "¿Y Layla cómo es?", "Métodos de pago"];
    }
    if (t.includes("layla") || t.includes("nivi") || t.includes("moneda")) {
      return ["¿Cuánto se gana en Layla?", "¿Cómo me registro en Layla?", "¿Y Waha cómo es?", "Métodos de pago"];
    }
    if (t.includes("10–$50") || t.includes("ganar") || t.includes("ganancias")) {
      return ["¿Cuándo me pagan?", "¿Cómo me uno?", "¿Qué app es mejor?", "¿Es seguro?"];
    }
    if (t.includes("binance") || t.includes("pago") || t.includes("retiro")) {
      return ["¿Cuánto se gana?", "¿Cómo me uno?", "Info sobre Waha", "Info sobre Layla"];
    }
    if (t.includes("requisito") || t.includes("mayor de 18") || t.includes("smartphone")) {
      return ["¿Cómo me registro?", "¿Cuánto ganaré?", "¿Es seguro?", "Hablar con alguien"];
    }
    if (t.includes("whatsapp") || t.includes("inscrib") || t.includes("empez")) {
      return ["Contactar por WhatsApp", "Info sobre Waha", "Info sobre Layla", "¿Cuánto se gana?"];
    }
    if (t.includes("privacidad") || t.includes("cara") || t.includes("segur")) {
      return ["¿Cómo me uno?", "¿Cuánto se gana?", "Info sobre Waha", "Info sobre Layla"];
    }
    if (t.includes("hombre") || t.includes("reclutador")) {
      return ["Contactar por WhatsApp", "¿Cuánto se gana reclutando?", "¿Cómo me registro?"];
    }
    // Default after greeting or generic
    return ["Info sobre Waha", "Info sobre Layla", "¿Cuánto puedo ganar?", "¿Cómo me uno?", "¿Es seguro?"];
  };

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
      {/* Welcome bubble */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.button
            key="bubble"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={openChat}
            className="mb-3 max-w-[250px] text-left bg-[#0a0a16] border border-blue-500/30 rounded-2xl rounded-br-sm px-4 py-3 shadow-xl text-[13px] text-white/85 leading-relaxed cursor-pointer hover:border-blue-400/50 transition-colors"
          >
            {WELCOME_MSG}
            <span className="block mt-1.5 text-[11px] text-blue-400 font-semibold">Toca para chatear →</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatwindow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-3 bg-[#0a0a16] border border-blue-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 350, height: 520 }}
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white leading-none">Ángela — Eclipse Angels IA</p>
                  <p className="text-[11px] text-blue-100/80 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> En línea ahora
                  </p>
                </div>
              </div>
              <button onClick={closeChat} className="text-white/70 hover:text-white p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user" ? "bg-blue-600/30" : "bg-blue-500/20 border border-blue-500/30"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5 text-blue-300" />
                      : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-[#111125] border border-blue-500/15 text-white/80 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="bg-[#111125] border border-blue-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Contextual quick replies — always visible, never while typing */}
            {!isTyping && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {getContextualReplies().map((q) => (
                  <button key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-blue-500/10 bg-[#080812] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-[#111125] border border-blue-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
                  disabled={isTyping}
                />
                <button type="submit" disabled={!input.trim() || isTyping}
                  className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-500 transition-all shrink-0">
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => isOpen ? closeChat() : openChat()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.45)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all text-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : (
          <>
            <MessageCircle className="w-5 h-5" />
            <span>Habla con Ángela</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
