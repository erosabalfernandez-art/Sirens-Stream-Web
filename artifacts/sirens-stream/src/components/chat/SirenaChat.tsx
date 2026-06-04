import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, User, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const WELCOME_MSG = "✨ ¡Bienvenida a Eclipse Angels Agency! Soy Ángela. ¿Tienes dudas sobre cómo ganar dinero desde casa? ¡Toca aquí para chatear!";

type Role = "user" | "assistant";
interface Msg { role: Role; content: string; }

// ── Text normalization & fuzzy matching ─────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[¿¡.,;:!?"""''()]/g, " ")                 // strip punctuation
    // informal → standard
    .replace(/\bxq\b/g, "porque")
    .replace(/\bpq\b/g, "porque")
    .replace(/\bq\b/g, "que")
    .replace(/\btb\b/g, "tambien")
    .replace(/\btmb\b/g, "tambien")
    .replace(/\btmbn\b/g, "tambien")
    .replace(/\bx\b/g, "por")
    .replace(/\bwa\b/g, "waha")
    .replace(/\bwpp\b/g, "whatsapp")
    .replace(/\bws\b/g, "whatsapp")
    .replace(/\bk\b/g, "que")
    .replace(/\bd\b/g, "de")
    .replace(/\bsn\b/g, "sin")
    .replace(/\bxfa\b/g, "por favor")
    .replace(/\bplis\b/g, "por favor")
    .replace(/\bpls\b/g, "por favor")
    .replace(/\bsi\b/g, "si")
    .replace(/\bnoo\b/g, "no")
    .replace(/\boke\b|\bok\b|\bokei\b/g, "si")
    // common typos Spanish
    .replace(/\bkiero\b|\bquiero\b/g, "quiero")
    .replace(/\bkomo\b|\bcomo\b/g, "como")
    .replace(/\bkes\b|\bke es\b/g, "que es")
    .replace(/\besta\b/g, "esta")
    .replace(/\bkuanto\b/g, "cuanto")
    .replace(/\bganar\b|\bgana\b|\bganando\b|\bganancia\b|\bganancias\b/g, "ganar")
    .replace(/\bdinro\b|\bdienro\b|\bdienero\b/g, "dinero")
    .replace(/\bpagro\b|\bpagro\b/g, "pago")
    .replace(/\bsegurida\b|\bseguridda\b/g, "seguridad")
    .replace(/\bregistar\b|\bregistarme\b/g, "registrar")
    .replace(/\bunirm\b|\bunirme\b|\bunirse\b|\bunifrme\b/g, "unirme")
    .replace(/\bempezar\b|\bempesar\b|\bempezando\b/g, "empezar")
    .replace(/\bduda\b|\bdudas\b|\bpregunta\b|\bpreguntas\b/g, "pregunta")
    .replace(/\bvideo\b|\bvideollam\b|\bvideollamad\b/g, "videollamada")
    .replace(/\bsala\b|\bsalas\b/g, "sala audio")
    .replace(/\bmensjae\b|\bmensaje\b|\bmensjes\b|\bmsj\b/g, "mensaje")
    .replace(/\bplatafroma\b|\bplatafoma\b/g, "plataforma")
    .replace(/\bapliacion\b|\baplicaion\b|\baplicion\b/g, "aplicacion")
    .replace(/\bwahaa\b|\bwahha\b|\bwaha\b/g, "waha")
    .replace(/\blaylla\b|\blayya\b|\blayla\b/g, "layla")
    .replace(/\bliyo\b/g, "liyo")
    .replace(/\bnivi\b/g, "nivi")
    .replace(/\bretirar\b|\bretira\b|\bretiro\b|\bretiros\b/g, "retiro")
    .replace(/\bmetodo\b|\bmetodos\b|\bmetodo de pago\b/g, "pago")
    .replace(/\bwhatsap\b|\bwatsap\b|\bwhatssap\b|\bwtsap\b/g, "whatsapp")
    .replace(/\binstgram\b|\binstagram\b|\binsta\b/g, "instagram")
    .replace(/\btikttok\b|\btiktk\b|\btiktok\b|\btt\b/g, "tiktok")
    .replace(/\brequesito\b|\brequisitos\b|\brequizito\b/g, "requisito")
    .replace(/\bedad\b|\bedades\b/g, "edad")
    .replace(/\bpeligro\b|\bestafa\b|\bscam\b|\bfraud\b|\btimo\b/g, "estafa")
    .replace(/\bconfianza\b|\bconfiable\b|\bfiable\b|\bseria\b/g, "seguridad")
    .replace(/\bcontacto\b|\bcontactar\b/g, "contacto")
    .replace(/\bcorreo\b|\bmail\b|\bemail\b/g, "email")
    .replace(/\binversion\b|\binvertir\b|\binvirtiendo\b/g, "inversion")
    .replace(/\bexperiencia\b|\bexperto\b|\bexperta\b/g, "experiencia")
    .replace(/\bcel\b|\bcelular\b|\btelefono\b|\bmovil\b/g, "celular")
    .replace(/\bhora\b|\bhoras\b/g, "hora")
    .replace(/\bdisponibilidad\b|\bdisponible\b|\bdispo\b/g, "disponibilidad")
    .replace(/\bsueldo\b|\bsalario\b|\bingresos\b|\bingreso\b/g, "dinero")
    .replace(/\bpaso a paso\b|\bcomo empiezo\b|\bcomo entro\b|\bcomo me registro\b|\bcomo inscribirse\b|\bque hago\b/g, "empezar")
    .replace(/\s+/g, " ").trim();
}

// Levenshtein distance (for very short words)
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fuzzyHas(text: string, keywords: string[]): boolean {
  const words = text.split(" ");
  return keywords.some(kw => {
    if (text.includes(kw)) return true;
    // partial: word starts with keyword (handles truncated words)
    if (words.some(w => w.startsWith(kw.slice(0, Math.max(4, kw.length - 1))))) return true;
    // levenshtein for short words
    if (kw.length >= 4) return words.some(w => Math.abs(w.length - kw.length) <= 2 && lev(w, kw) <= 2);
    return false;
  });
}

// ── Knowledge base with multiple variants ──────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const R = {
  greeting: [
    "¡Hola! Soy Ángela ✨, tu asistente en Eclipse Angels Agency. Estoy aquí para contarte todo sobre cómo ganar dólares desde tu celular. ¿Por dónde quieres empezar? 😊",
    "¡Buenas! Me alegra que estés aquí 🌟 Soy Ángela. Puedo explicarte sobre nuestras apps, cuánto se gana, cómo se paga y cómo unirte. ¿Qué te interesa saber?",
    "¡Hola, bienvenida! 💙 Soy Ángela, la asistente de Eclipse Angels Agency. ¿Tienes dudas sobre cómo trabajar con nosotros? ¡Pregúntame lo que quieras!",
    "¡Hey, qué bueno verte por aquí! ✨ Soy Ángela. Estoy lista para contarte todo sobre nuestra agencia y cómo puedes empezar a ganar desde casa. ¿Qué quieres saber?",
  ],

  waha: [
    `📱 *WAHA* (en iOS se llama Liyo)

Plataforma completa con mensajes, salas de audio, videollamadas match y videollamadas privadas. ¡Las videollamadas son 100% opcionales!

💰 Ganancias:
• Mensajes con VIP: 70 diamantes
• Videollamada match VIP: 350 diamantes
• Videollamada privada: 700 diamantes/min
• Regalos: 100% para ti

💳 Pagos:
• Meta mínima: 10,000 diamantes = $2.50 USD
• Pago SEMANAL (martes)

⏰ Se recomiendan +4 horas diarias
📲 Android: Waha | iOS: Liyo`,

    `📱 *WAHA / LIYO* — te cuento todo:

Es de las más completas que manejamos. Puedes ganar de varias formas: mensajes, audios grupales, videollamadas match y privadas — pero ¡nada es obligatorio!

💰 Lo que ganas:
• Chat VIP: 70 💎 por mensaje
• Videollamada match VIP: 350 💎
• Videollamada privada: 700 💎/min
• + todos los regalos que recibas son 100% tuyos

💳 Retiro semanal cada martes, desde los $2.50 USD (10,000 diamantes)
⏰ Recomendado: +4 horas al día para maximizar ganancias`,
  ],

  layla: [
    `📱 *LAYLA* (en iOS se llama Nivi)

Mensajes, salas de audio, llamadas de voz y videollamadas — todo opcional. Su gran ventaja: retiro ACUMULABLE sin presión semanal.

💰 Ganancias:
• Mensajes privados: 90 monedas c/u
• Llamadas de voz: 1,350 monedas/min
• Videollamada premium: 2,700 monedas/min
• 15,500 monedas = $1 USD

💳 Meta mínima: $10 USD (se acumula sin fecha límite)
⏰ Se recomiendan +4 horas diarias
📲 Android: Layla | iOS: Nivi
🔑 Código de agencia: G-84Y3AG7HL (obligatorio para monetizar)`,

    `📱 *LAYLA / NIVI* — aquí te explico:

Lo mejor de Layla es que tú decides cuándo cobrar — las ganancias se acumulan hasta que quieras retirar (mínimo $10 USD). Nada de presión semanal.

💰 Formas de ganar:
• Mensajes: 90 monedas cada uno
• Llamadas de voz: 1,350 monedas/min
• Videollamada: 2,700 monedas/min
• Todo es opcional — haces lo que se te antoje

📲 En Android se llama Layla, en iPhone Nivi
🔑 Código de agencia: G-84Y3AG7HL (sin esto no puedes monetizar)
💳 Retiras cuando alcances $10 USD acumulados`,
  ],

  ganancias: [
    `💰 Ganancias reales con Eclipse Angels:

• $10–$50 USD por día en promedio
• $100–$500 USD por semana con constancia
• $1,000–$2,000 USD al mes con dedicación total

¡Y todo desde tu celular, sin inversión! 🚀

Los factores que más influyen:
✅ Tiempo conectada (más horas = más ganancias)
✅ Responder rápido a los usuarios
✅ Cumplir las metas de bonos de la plataforma
✅ Interactuar con usuarios VIP`,

    `💵 ¿Cuánto puedes ganar? Te soy honesta:

Las chicas que más ganan son las que le dedican tiempo. En promedio:
• Comenzando: $10–$30 USD/día
• Con experiencia: $50–$100 USD/día
• Top earners: $1,500–$2,000 USD/mes

No es un mágico "trabaja 1 hora y hazte rica" — es un trabajo real desde casa que paga bien si le metes constancia. 💪

Sin inversión, sin experiencia previa, con capacitación incluida.`,

    `🌟 Las ganancias dependen de ti, pero te doy números reales:

Chicas nuevas → $10–$30 USD/día
Chicas con 1–2 meses → $30–$80 USD/día
Chicas dedicadas → $100+/día

Lo que importa más:
• Estar activa varias horas al día
• Interactuar bien con los usuarios
• Aprovechar los bonos de las plataformas

¿Quieres saber cómo empezar? 😊`,
  ],

  pagos: [
    `💳 Métodos de pago:

• *Binance* (USDT/BTC) — disponible en todos los países
• *Pix* — solo Brasil, instantáneo sin comisiones
• *Efectivo en Cuba* — con coordinación previa
• *Transferencia bancaria* — MLC o CUP

📅 Pago cada semana (martes)
💵 Mínimos: Waha $2.50 USD | Layla $10 USD
✅ Siempre en dólares USD garantizados`,

    `💸 Los pagos son semanales, cada martes. Así funciona:

• Waha: cobras desde los $2.50 USD (10,000 diamantes) cada semana
• Layla: acumulas hasta que quieras, desde $10 USD mínimo

Métodos disponibles:
→ Binance (USDT o BTC) — en cualquier país
→ Pix — si estás en Brasil
→ Efectivo / Transferencia — si estás en Cuba

Todo en dólares. Pagos garantizados. Sin sorpresas. ✅`,
  ],

  requisitos: [
    `✅ Los requisitos son súper sencillos:

• Ser mujer mayor de 18 años
• Tener smartphone con buena cámara
• Conexión WiFi estable o datos
• Disponibilidad de +4 horas al día
• Actitud positiva y compromiso
• ¡Sin experiencia previa! Capacitamos gratis 🎓

El proceso:
1️⃣ Nos contactas (WhatsApp o Instagram)
2️⃣ Entrevista express sin compromiso
3️⃣ Tu tutora te guía paso a paso
4️⃣ ¡Primer pago en tu primera semana!`,

    `📋 Para unirte solo necesitas:

• +18 años ✅
• Smartphone con cámara decente ✅
• Internet estable ✅
• Tiempo: al menos 4 horas al día ✅
• Ganas de trabajar (lo más importante) ✅

¡Eso es todo! No necesitas experiencia, no necesitas invertir nada, no necesitas ser influencer ni tener seguidores. Empiezas desde cero y tu tutora te ayuda en todo. 😊`,
  ],

  unirse: [
    `🚀 ¡Unirte es muy sencillo!

1️⃣ Escríbenos por WhatsApp o Instagram
2️⃣ Entrevista express (15 min, sin compromiso)
3️⃣ Tu tutora personal te ayuda con la instalación
4️⃣ Empiezas a ganar desde el primer día

📲 WhatsApp: https://wa.me/5595984381686
📸 Instagram: @eclipse_angels.agency

Sin inversión, sin experiencia, sin complicaciones ✨`,

    `💫 El proceso para empezar es rápido:

→ Contáctanos por WhatsApp o Instagram
→ Te hacemos unas pregunticas rápidas (sin compromiso)
→ Si todo va bien, tu tutora te explica todo
→ Instalas la app, te registras con nuestro código y ¡ya!

📲 WhatsApp: https://wa.me/5595984381686
📸 Instagram: @eclipse_angels.agency

La primera semana ya puedes tener tu primer pago. 💵`,
  ],

  seguridad: [
    `🔒 Tu privacidad es lo primero:

• No es obligatorio mostrar tu cara real
• Puedes usar nombre artístico y foto diferente
• No necesitas vincular tus redes personales
• Plataformas verificadas internacionalmente
• Nunca te pedimos dinero para empezar
• Toda tu info es 100% confidencial

Es trabajo legítimo de mensajería y entretenimiento — nada de contenido explícito ni comprometedor. Muchas chicas trabajan completamente anónimas. 😊`,

    `✅ Entiendo la preocupación — es normal preguntarlo:

No es ninguna estafa. Llevamos tiempo en esto y tenemos decenas de chicas ganando semana tras semana. Las plataformas (Waha, Layla) son internacionales y verificadas.

Lo importante:
• Nunca te pedimos que pagues algo para entrar
• Puedes trabajar sin mostrar cara ni datos reales
• Los pagos son semanales y en dólares reales
• Si no te convence, en cualquier momento paras

¿Quieres hablar con alguien del equipo para más confianza? 😊`,
  ],

  hombres: [
    `👨 ¡Los hombres también pueden sumarse!

*Opción 1 — Reclutador:*
Refiere chicas a la agencia y gana comisión por cada una que empiece a generar. Sin límite de ingresos ni horario fijo.

*Opción 2 — Apps:*
Puedes registrarte en algunas plataformas de nuestra red y generar ingresos propios.

Mismo soporte y capacitación que las chicas. 💪
📲 WhatsApp: https://wa.me/5595984381686`,
  ],

  contacto: [
    `📞 Contacto directo:

💬 WhatsApp: https://wa.me/5595984381686
📸 Instagram: @eclipse_angels.agency
🎵 TikTok: @eclipse_angels1
📘 Facebook: eclipse_angels.agency
📧 Email: eclipse_angels@outlook.com

⏰ Atención: lunes a domingo, 9 AM a 11 PM
¡Te respondemos lo antes posible! 😊`,

    `¡Con gusto te paso el contacto! 📲

La forma más rápida es por WhatsApp: https://wa.me/5595984381686

También nos encuentras en:
📸 Instagram: @eclipse_angels.agency
🎵 TikTok: @eclipse_angels1
📧 Email: eclipse_angels@outlook.com

Estamos disponibles todos los días de 9 AM a 11 PM ✅`,
  ],

  comparacion: [
    `🤔 ¿Waha o Layla? Te ayudo a decidir:

*Elige WAHA si:*
✅ Quieres múltiples formas de ganar (chat, audio, video)
✅ No te molesta hacer videollamadas opcionales
✅ Prefieres cobrar automáticamente cada semana
✅ Buscas más dinamismo

*Elige LAYLA si:*
✅ Prefieres mensajes y salas de audio principalmente
✅ Quieres acumular ganancias sin presión semanal
✅ Prefieres algo más tranquilo para empezar

¿Me cuentas un poco más sobre ti? ¿Cuántas horas al día tienes? ¿Prefieres chatear o también te interesan los audios/video? Así te recomiendo mejor 😊`,

    `Buena pregunta 😊 Las dos plataformas son excelentes, pero cada una es diferente:

Waha → más variedad (mensajes, audio, video), cobro semanal fijo, muy activa
Layla → más tranquila (mensajes + audio), cobro acumulable sin fecha límite

Si eres nueva: Layla puede ser más tranquila para arrancar.
Si quieres maximizar desde el día 1: Waha tiene más opciones de ganar.

¿Cuál suena más a lo que buscas tú? 🙂`,
  ],

  agencia: [
    `🏢 Eclipse Angels Agency

Somos una agencia especializada en streamers y chat hostess. Conectamos mujeres (+18) con plataformas internacionales verificadas para ganar en dólares desde el celular.

✨ Lo que nos diferencia:
• Soporte personalizado 24/7
• Tutoras para guiarte paso a paso
• $0 para empezar — sin inversión
• Pagos garantizados cada semana
• Operamos en todos los países
• Comunidad de chicas que se apoyan

¿Quieres saber algo en particular? 😊`,

    `🌟 Somos Eclipse Angels Agency

Llevamos tiempo ayudando a mujeres a generar ingresos reales desde su celular, sin experiencia previa ni inversión. Trabajamos con plataformas internacionales verificadas (Waha y Layla).

Cada chica tiene una tutora personal que la acompaña en todo el proceso. No estás sola.

¿Te interesa saber cómo empezar? 😊`,
  ],

  noEntiendo: [
    "Hmm, no estoy segura de entender bien tu pregunta 😊 ¿Me puedes dar más detalle? Puedo contarte sobre las apps, cuánto se gana, cómo se paga, requisitos, seguridad o cómo unirte.",
    "¡Cuéntame más! Puedo ayudarte con dudas sobre Waha, Layla, ganancias, pagos, cómo unirte o cualquier cosa relacionada con la agencia. ¿Qué necesitas saber? 😊",
    "No entendí del todo, pero aquí estoy para ayudarte 🌟 Puedes preguntarme sobre las apps que manejamos, cuánto se gana, los métodos de pago o cómo empezar. ¿Por dónde empezamos?",
    "Mmm, a ver si te entiendo bien 😅 ¿Estás preguntando sobre cómo ganar dinero con nosotros, sobre alguna app en específico, o algo diferente? ¡No te preocupes, con gusto te ayudo!",
  ],

  positivo: [
    "¡Claro que sí! 😊 ¿Qué más quieres saber? Puedo contarte sobre Waha, Layla, ganancias, pagos, cómo unirte o cualquier otra duda.",
    "¡Con gusto! Estoy aquí para lo que necesites. ¿Tienes alguna duda específica sobre nuestras apps o el proceso para unirte? 🌟",
    "¡Por supuesto! Cuéntame qué necesitas saber y te explico todo. Desde cómo funcionan las plataformas hasta cómo cobrar 💙",
  ],
};

// ── Intent detection ────────────────────────────────────────
function getResponse(rawText: string): string {
  const t = normalize(rawText);

  // Saludo
  if (/^(hola|buenas|buenos|hey|hi|ola|saludos|buen dia|que tal|como estas|que hay|buenas tardes|buenas noches|buenos dias|wenas|wena|ola ola)\b/.test(t)
    || (t.length < 20 && /hola|hey|wenas|buenas/.test(t))) {
    return pick(R.greeting);
  }

  // Sí / afirmaciones sueltas
  if (/^(si|ok|dale|claro|obvio|porfa|por favor|ayuda|ayudame|dimelo|cuentame|quisiera|quisiera saber|me gustaria|quiero saber|dime|cuent|info)\b/.test(t)) {
    return pick(R.positivo);
  }

  // Comparación Waha vs Layla
  if (fuzzyHas(t, ["cual mejor", "diferencia", "waha layla", "layla waha", "cual recomienda", "que app", "cual app", "cual plataforma", "cual elijo", "cual me conviene", "mejor opcion", "cuál elegir", "recomiendas"])) {
    return pick(R.comparacion);
  }

  // Waha / Liyo
  if (fuzzyHas(t, ["waha", "liyo", "diamante"]) && !fuzzyHas(t, ["layla", "nivi"])) {
    return pick(R.waha);
  }

  // Layla / Nivi
  if (fuzzyHas(t, ["layla", "nivi", "acumulable"]) && !fuzzyHas(t, ["waha", "liyo"])) {
    return pick(R.layla);
  }

  // Ambas apps mencionadas sin comparar → comparación
  if (fuzzyHas(t, ["waha", "liyo"]) && fuzzyHas(t, ["layla", "nivi"])) {
    return pick(R.comparacion);
  }

  // Apps en general
  if (fuzzyHas(t, ["app", "aplicacion", "plataforma", "plataformas", "que usan", "que apps"])) {
    return `Trabajamos con dos plataformas principales:\n\n📱 *Waha* (iOS: Liyo) — mensajes, salas de audio y videollamadas opcionales. Meta mín. $2.50 USD. Pago semanal.\n\n📱 *Layla* (iOS: Nivi) — mensajes, salas de audio, llamadas y videollamadas opcionales. Meta mín. $10 USD. Retiro acumulable.\n\n¿Quieres que te cuente más de alguna? 😊`;
  }

  // Ganancias / dinero
  if (fuzzyHas(t, ["ganar", "dinero", "cuanto", "sueldo", "salario", "ingreso", "cobrar", "beneficio", "plata", "billete", "real", "cuanto se gana", "cuanto pagan", "vale la pena"])) {
    return pick(R.ganancias);
  }

  // Pagos / retiros
  if (fuzzyHas(t, ["pago", "retiro", "binance", "pix", "banco", "transferencia", "cobro", "cuando pagan", "forma de pago", "metodo", "monedero"])) {
    return pick(R.pagos);
  }

  // Requisitos / condiciones
  if (fuzzyHas(t, ["requisito", "necesito", "edad", "mayor", "condicion", "que necesita", "que se pide", "que se necesita", "cuales son los requisitos"])) {
    return pick(R.requisitos);
  }

  // Cómo unirse / empezar
  if (fuzzyHas(t, ["unir", "empezar", "comenzar", "inscribir", "registrar", "como entro", "quiero entrar", "quiero unirme", "quiero empezar", "donde me registro", "como me uno", "inicio", "como empiezo", "como empezar", "proceso", "pasos"])) {
    return pick(R.unirse);
  }

  // Seguridad / privacidad / estafa
  if (fuzzyHas(t, ["segur", "privacidad", "cara", "foto", "datos", "confid", "peligro", "estafa", "scam", "legal", "legitim", "confianza", "real", "mentira", "verdad", "funcionan"])) {
    return pick(R.seguridad);
  }

  // Hombres
  if (fuzzyHas(t, ["hombre", "chico", "masculino", "hombres", "reclutador", "referir", "chicos"])) {
    return pick(R.hombres);
  }

  // Contacto
  if (fuzzyHas(t, ["contacto", "whatsapp", "instagram", "tiktok", "facebook", "email", "correo", "redes", "telefono", "donde los encuentro", "como los contacto"])) {
    return pick(R.contacto);
  }

  // Agencia / quiénes son
  if (fuzzyHas(t, ["agencia", "eclipse", "angels", "que es", "de que trata", "empresa", "quienes son", "quienes somos", "de que se trata", "informacion"])) {
    return pick(R.agencia);
  }

  // Horario / disponibilidad
  if (fuzzyHas(t, ["hora", "disponibilidad", "horario", "cuantas horas", "tiempo", "dedicar"])) {
    return `⏰ Sobre el horario:

No hay horario fijo — tú decides cuándo conectarte. Lo ideal es estar al menos 4 horas al día para alcanzar las metas de las plataformas.

Muchas chicas trabajan en sus ratos libres: mañana, tarde o noche. Tú organizas tu tiempo como mejor te quede. 😊

¿Tienes alguna otra duda?`;
  }

  // Inversión / gratis
  if (fuzzyHas(t, ["inversion", "pagar", "cuesta", "gratis", "cobran", "hay que pagar", "cuanto cuesta unirse"])) {
    return `✅ No hay ninguna inversión para empezar.

Registrarte con nosotros, la capacitación y el soporte son completamente GRATIS. Nunca te vamos a pedir dinero. 

Si alguien te dice que tienes que pagar para unirte, no somos nosotros. 😊

¿Quieres saber cómo es el proceso para empezar?`;
  }

  // Fallback
  return pick(R.noEntiendo);
}

// ── Contextual quick replies ────────────────────────────────
function getContextualReplies(messages: Msg[]): string[] {
  const last = [...messages].reverse().find(m => m.role === "assistant");
  if (!last) return ["Info sobre Waha", "Info sobre Layla", "¿Cuánto puedo ganar?", "¿Cómo me uno?", "¿Es seguro?"];
  const t = last.content.toLowerCase();

  if (t.includes("waha") && t.includes("layla") && (t.includes("elige") || t.includes("si quieres"))) {
    return ["Cuéntame de Waha", "Cuéntame de Layla", "¿Cuánto se gana?", "Quiero unirme"];
  }
  if (t.includes("waha") && !t.includes("layla")) {
    return ["¿Cuánto gano en Waha?", "¿Cómo me registro?", "¿Y Layla cómo es?", "Métodos de pago"];
  }
  if (t.includes("layla") && !t.includes("waha")) {
    return ["¿Cuánto gano en Layla?", "¿Cómo me registro?", "¿Y Waha cómo es?", "Métodos de pago"];
  }
  if (t.includes("ganar") || t.includes("usd/d") || t.includes("dia en promedio")) {
    return ["¿Cuándo me pagan?", "¿Cómo me uno?", "¿Qué app es mejor?", "¿Es seguro?"];
  }
  if (t.includes("binance") || t.includes("pago") || t.includes("martes")) {
    return ["¿Cuánto se gana?", "¿Cómo me uno?", "Info sobre Waha", "Info sobre Layla"];
  }
  if (t.includes("requisito") || t.includes("+18") || t.includes("mayor de 18")) {
    return ["¿Cómo me registro?", "¿Cuánto ganaré?", "¿Es seguro?", "Quiero contactarlos"];
  }
  if (t.includes("whatsapp") && (t.includes("proceso") || t.includes("empez"))) {
    return ["Ir al WhatsApp", "Info sobre Waha", "Info sobre Layla", "¿Cuánto se gana?"];
  }
  if (t.includes("privacidad") || t.includes("cara") || t.includes("estafa") || t.includes("confianza")) {
    return ["¿Cómo me uno?", "¿Cuánto se gana?", "Info sobre Waha", "Info sobre Layla"];
  }
  if (t.includes("hombre") || t.includes("reclutador")) {
    return ["Quiero contactarlos", "¿Cuánto se gana reclutando?", "Info sobre las apps"];
  }
  if (t.includes("horario") || t.includes("horas al d")) {
    return ["¿Cuánto se gana?", "¿Cómo me uno?", "Info sobre Waha", "Info sobre Layla"];
  }
  if (t.includes("inversion") || t.includes("gratis") || t.includes("pagar")) {
    return ["¿Cómo me uno?", "¿Cuánto se gana?", "¿Cuáles son los requisitos?", "Quiero contactarlos"];
  }
  // greeting or generic
  return ["Info sobre Waha", "Info sobre Layla", "¿Cuánto puedo ganar?", "¿Cómo me uno?", "¿Es seguro?"];
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
    const delay = 500 + Math.random() * 900;
    setTimeout(() => {
      const reply = getResponse(msg);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setIsTyping(false);
    }, delay);
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input.trim()); };

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
      {/* Welcome bubble */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.button key="bubble" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={openChat}
            className="mb-3 max-w-[250px] text-left bg-[#0a0a16] border border-blue-500/30 rounded-2xl rounded-br-sm px-4 py-3 shadow-xl text-[13px] text-white/85 leading-relaxed cursor-pointer hover:border-blue-400/50 transition-colors">
            {WELCOME_MSG}
            <span className="block mt-1.5 text-[11px] text-blue-400 font-semibold">Toca para chatear →</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div key="chatwindow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="mb-3 bg-[#0a0a16] border border-blue-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: 350, height: 520 }}>

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
              <button onClick={closeChat} className="text-white/70 hover:text-white p-1 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-blue-600/30" : "bg-blue-500/20 border border-blue-500/30"}`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 text-blue-300" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#111125] border border-blue-500/15 text-white/80 rounded-tl-sm"}`}>
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
                    {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Contextual quick replies */}
            {!isTyping && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {getContextualReplies(messages).map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-blue-500/10 bg-[#080812] shrink-0">
              <div className="flex items-center gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-[#111125] border border-blue-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
                  disabled={isTyping} />
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
      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={() => isOpen ? closeChat() : openChat()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.45)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all text-sm">
        {isOpen ? <X className="w-5 h-5" /> : (<><MessageCircle className="w-5 h-5" /><span>Habla con Ángela</span></>)}
      </motion.button>
    </div>
  );
}
