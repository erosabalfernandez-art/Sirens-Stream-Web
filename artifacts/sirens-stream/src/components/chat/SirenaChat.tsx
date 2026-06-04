import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, User, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const WA_URL = "https://wa.me/5595984381686?text=Hola%2C%20me%20interesa%20saber%20m%C3%A1s%20sobre%20Eclipse%20Angels%20Agency%20%F0%9F%92%99";

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

const LINK_KEYWORDS = ["descarg", "bajar", "instalar", "play store", "app store", "google play", "apk", "link", "enlace", "download", "tienda", "donde bajo", "como bajo", "como descargo", "donde descargo", "obtener", "conseguir"];
const TELEGRAM_KEYWORDS = ["telegram", "t.me", "canal", "group", "grupo", "comunidad", "chat de telegram"];
const SOCIAL_KEYWORDS = ["instagram", "tiktok", "facebook", "redes", "redes sociales", "ig", "fb", "tt", "perfil", "perfiles", "social", "siguen", "siguenos", "encontrarte", "encontrarlos", "redes de", "donde estan", "donde los encuentro", "encontrar en", "como les sigo"];

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
📸 Instagram: https://www.instagram.com/eclipse_angels.agency
🎵 TikTok: https://www.tiktok.com/@eclipse_angels1
📘 Facebook: https://facebook.com/eclipseangelsagency
📧 Email: eclipse_angels@outlook.com

⏰ Atención: lunes a domingo, 9 AM a 11 PM
¡Te respondemos lo antes posible! 😊`,

    `¡Con gusto te paso el contacto! 📲

La forma más rápida es por WhatsApp: https://wa.me/5595984381686

También nos encuentras en:
📸 Instagram: https://www.instagram.com/eclipse_angels.agency
🎵 TikTok: https://www.tiktok.com/@eclipse_angels1
📘 Facebook: https://facebook.com/eclipseangelsagency
📧 Email: eclipse_angels@outlook.com

Estamos disponibles todos los días de 9 AM a 11 PM ✅`,
  ],

  links: [
    `📲 Links de descarga de todas las apps:

*WAHA — Android:*
https://play.google.com/store/apps/details?id=com.phx.waha

*LIYO (Waha en iPhone/iOS):*
https://apps.apple.com/us/app/liyo-emotions-find-echo/id6746777859

*LAYLA — Android:*
https://play.google.com/store/apps/details?id=com.heytango.layla

*NIVI (Layla en iPhone/iOS):*
https://apps.apple.com/us/app/nivi/id6502905584

📢 Canales de Telegram por app:
• Waha/Liyo → https://t.me/ingresos_waha
• Layla/Nivi → https://t.me/ingresos_layla

¿Necesitas ayuda con la instalación? ¡Escríbenos! 😊`,
  ],

  linksWaha: [
    `📲 Descarga WAHA / LIYO aquí:

*Android (Waha):*
https://play.google.com/store/apps/details?id=com.phx.waha

*iPhone / iOS (Liyo):*
https://apps.apple.com/us/app/liyo-emotions-find-echo/id6746777859

📢 Canal de Telegram de Waha:
https://t.me/ingresos_waha

¿Necesitas ayuda con el registro o el código de agencia? Dime y te explico paso a paso 😊`,

    `¡Aquí tienes! 🔗

Waha en Android → https://play.google.com/store/apps/details?id=com.phx.waha
Liyo (Waha en iOS) → https://apps.apple.com/us/app/liyo-emotions-find-echo/id6746777859

Canal Telegram Waha → https://t.me/ingresos_waha

Una vez instalada, te explico cómo registrarte con el código de agencia para poder monetizar. ¿Tienes Android o iPhone? 😊`,
  ],

  linksLayla: [
    `📲 Descarga LAYLA / NIVI aquí:

*Android (Layla):*
https://play.google.com/store/apps/details?id=com.heytango.layla

*iPhone / iOS (Nivi):*
https://apps.apple.com/us/app/nivi/id6502905584

📢 Canal de Telegram de Layla:
https://t.me/ingresos_layla

🔑 Recuerda registrarte con el código de agencia: *G-84Y3AG7HL* (sin esto no puedes monetizar)

¿Tienes alguna duda con la instalación? 😊`,

    `¡Claro! Aquí tienes los links de Layla: 🔗

Layla en Android → https://play.google.com/store/apps/details?id=com.heytango.layla
Nivi (Layla en iOS) → https://apps.apple.com/us/app/nivi/id6502905584

Canal Telegram Layla → https://t.me/ingresos_layla

🔑 Código de agencia obligatorio: *G-84Y3AG7HL*
Sin ese código no podrás monetizar, así que no te olvides al registrarte. ¿Necesitas más ayuda? 😊`,
  ],

  telegram: [
    `📢 Canales de Telegram por app:

• Waha / Liyo → https://t.me/ingresos_waha
• Layla / Nivi → https://t.me/ingresos_layla

En estos canales encontrarás consejos, novedades y soporte de nuestra comunidad. ¡Únete! 😊`,

    `¡Aquí están nuestros canales de Telegram! 📱

Waha → https://t.me/ingresos_waha
Layla → https://t.me/ingresos_layla

¿Hay algo más que quieras saber? 🌟`,
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

  const isWaha = fuzzyHas(t, ["waha", "liyo", "diamante"]);
  const isLayla = fuzzyHas(t, ["layla", "nivi", "acumulable"]);
  const isLinkIntent = fuzzyHas(t, LINK_KEYWORDS);
  const isTelegramIntent = fuzzyHas(t, TELEGRAM_KEYWORDS);
  const isSocialIntent = fuzzyHas(t, SOCIAL_KEYWORDS);

  // ── 1. Saludo ───────────────────────────────────────────────
  if (/^(hola|buenas|buenos|hey|hi|ola|saludos|buen dia|que tal|como estas|que hay|buenas tardes|buenas noches|buenos dias|wenas|wena|ola ola)\b/.test(t)
    || (t.length < 20 && /hola|hey|wenas|buenas/.test(t))) {
    return pick(R.greeting);
  }

  // ── 2. Telegram (antes que cualquier app) ──────────────────
  if (isTelegramIntent) {
    if (isWaha && !isLayla) return pick(R.linksWaha);
    if (isLayla && !isWaha) return pick(R.linksLayla);
    return pick(R.telegram);
  }

  // ── 3. Descargas / links de app específica ─────────────────
  if (isLinkIntent && isWaha && !isLayla) return pick(R.linksWaha);
  if (isLinkIntent && isLayla && !isWaha) return pick(R.linksLayla);
  if (isLinkIntent) return pick(R.links);

  // ── 4. Redes sociales / contacto ───────────────────────────
  if (isSocialIntent || fuzzyHas(t, ["contacto", "whatsapp", "telefono", "donde los encuentro", "como los contacto", "email", "correo", "donde te encuentro", "como te contacto", "como les escribo", "como les hablo"])) {
    return pick(R.contacto);
  }

  // ── 5. Sí / afirmaciones sueltas ───────────────────────────
  if (/^(si|ok|dale|claro|obvio|porfa|por favor|ayuda|ayudame|dimelo|cuentame|quisiera|quisiera saber|me gustaria|quiero saber|dime|cuent|info)\b/.test(t)) {
    return pick(R.positivo);
  }

  // ── 6. Comparación Waha vs Layla ───────────────────────────
  if (fuzzyHas(t, ["cual mejor", "diferencia", "waha layla", "layla waha", "cual recomienda", "que app", "cual app", "cual plataforma", "cual elijo", "cual me conviene", "mejor opcion", "cual elegir", "recomiendas"])) {
    return pick(R.comparacion);
  }

  // ── 7. App específica ──────────────────────────────────────
  if (isWaha && !isLayla) return pick(R.waha);
  if (isLayla && !isWaha) return pick(R.layla);
  if (isWaha && isLayla) return pick(R.comparacion);

  // ── 8. Apps en general ─────────────────────────────────────
  if (fuzzyHas(t, ["app", "aplicacion", "plataforma", "plataformas", "que usan", "que apps", "con que trabajan", "que plataformas"])) {
    return `Trabajamos con dos plataformas principales:\n\n📱 *Waha* (iOS: Liyo) — mensajes, salas de audio y videollamadas opcionales. Meta mín. $2.50 USD. Pago semanal.\n\n📱 *Layla* (iOS: Nivi) — mensajes, salas de audio, llamadas y videollamadas opcionales. Meta mín. $10 USD. Retiro acumulable.\n\n¿Quieres que te cuente más de alguna? 😊`;
  }

  // ── 9. Ganancias / dinero ──────────────────────────────────
  if (fuzzyHas(t, ["ganar", "dinero", "cuanto", "sueldo", "salario", "ingreso", "cobrar", "beneficio", "plata", "billete", "cuanto se gana", "cuanto pagan", "vale la pena", "cuanto puedo", "gana uno", "pagan bien", "se gana bien"])) {
    return pick(R.ganancias);
  }

  // ── 10. Pagos / retiros ────────────────────────────────────
  if (fuzzyHas(t, ["pago", "retiro", "binance", "pix", "banco", "transferencia", "cobro", "cuando pagan", "forma de pago", "metodo", "monedero", "como me pagan", "cuando cobro", "cuando retiro"])) {
    return pick(R.pagos);
  }

  // ── 11. Requisitos ─────────────────────────────────────────
  if (fuzzyHas(t, ["requisito", "necesito", "edad", "mayor", "condicion", "que necesita", "que se pide", "que se necesita", "cuales son los requisitos", "que hace falta", "que piden", "que requieren"])) {
    return pick(R.requisitos);
  }

  // ── 12. Cómo unirse / empezar ──────────────────────────────
  if (fuzzyHas(t, ["unir", "empezar", "comenzar", "inscribir", "registrar", "como entro", "quiero entrar", "quiero unirme", "quiero empezar", "donde me registro", "como me uno", "inicio", "como empiezo", "como empezar", "proceso", "pasos", "quiero trabajar", "quiero ganar", "como puedo empezar", "que hago para entrar"])) {
    return pick(R.unirse);
  }

  // ── 13. Seguridad / privacidad / estafa ────────────────────
  if (fuzzyHas(t, ["segur", "privacidad", "cara", "foto", "datos", "confid", "peligro", "estafa", "scam", "legal", "legitim", "confianza", "mentira", "verdad", "funcionan", "es real", "es verdad", "es confiable", "es seguro", "me pueden ver", "saben quien soy"])) {
    return pick(R.seguridad);
  }

  // ── 14. Hombres ────────────────────────────────────────────
  if (fuzzyHas(t, ["hombre", "chico", "masculino", "hombres", "reclutador", "referir", "chicos", "puedo si soy hombre", "acepta hombres"])) {
    return pick(R.hombres);
  }

  // ── 15. Agencia / quiénes son ──────────────────────────────
  if (fuzzyHas(t, ["agencia", "eclipse", "angels", "que es", "de que trata", "empresa", "quienes son", "quienes somos", "de que se trata", "informacion", "cuéntame de", "cuentame de", "de que va", "que hacen"])) {
    return pick(R.agencia);
  }

  // ── 16. Horario / disponibilidad ───────────────────────────
  if (fuzzyHas(t, ["hora", "disponibilidad", "horario", "cuantas horas", "tiempo", "dedicar", "cuanto tiempo", "que horario", "horas al dia", "cuando conecto"])) {
    return `⏰ Sobre el horario:

No hay horario fijo — tú decides cuándo conectarte. Lo ideal es estar al menos 4 horas al día para alcanzar las metas de las plataformas.

Muchas chicas trabajan en sus ratos libres: mañana, tarde o noche. Tú organizas tu tiempo como mejor te quede. 😊

¿Tienes alguna otra duda?`;
  }

  // ── 17. Inversión / gratis ─────────────────────────────────
  if (fuzzyHas(t, ["inversion", "pagar", "cuesta", "gratis", "cobran", "hay que pagar", "cuanto cuesta unirse", "es gratis", "hay costo", "cuanto vale", "tienen costo"])) {
    return `✅ No hay ninguna inversión para empezar.

Registrarte con nosotros, la capacitación y el soporte son completamente GRATIS. Nunca te vamos a pedir dinero. 

Si alguien te dice que tienes que pagar para unirte, no somos nosotros. 😊

¿Quieres saber cómo es el proceso para empezar?`;
  }

  // ── 18. Fallback ───────────────────────────────────────────
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
              <div className="flex items-center gap-2 mb-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-[#111125] border border-blue-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
                  disabled={isTyping} />
                <button type="submit" disabled={!input.trim() || isTyping}
                  className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-500 transition-all shrink-0">
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-[12px] font-semibold hover:bg-green-600/35 hover:border-green-400/50 transition-all">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Hablar con una agente por WhatsApp
              </a>
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
