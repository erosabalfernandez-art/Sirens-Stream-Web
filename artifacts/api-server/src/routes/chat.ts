import { Router } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";

const router = Router();

router.post("/chat", async (req, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { message } = parsed.data;
  const lowerMsg = message.toLowerCase();

  let reply =
    "¡Hola! Soy Ángela, la asistente de Eclipse Angels Agency ✨ ¿En qué puedo ayudarte? Puedo contarte sobre nuestras apps (Waha y Layla), cómo unirte a la agencia, métodos de pago, o responder cualquier duda.";

  if (lowerMsg.includes("layla")) {
    reply =
      "Layla es una app de mensajes en donde interactúas con usuarios de todo el mundo. Funciona solo por mensajes (sin videollamada), la meta mínima de retiro es $10 USD y las ganancias son acumulables. En Android se llama Layla y en iOS se llama Nivi. ¿Te gustaría saber más detalles?";
  } else if (lowerMsg.includes("waha")) {
    reply =
      "Waha es una app de mensajería, salas de audio y videollamadas opcionales. El pago es semanal, la meta mínima es $2 y necesitas al menos 4 horas diarias de disponibilidad. En iOS se llama Liyo. ¿Quieres saber cuánto puedes ganar?";
  } else if (lowerMsg.includes("app") || lowerMsg.includes("plataforma")) {
    reply =
      "En Eclipse Angels Agency trabajamos con dos apps principales: 💜 Layla (solo mensajes, ganancias acumulables, retiro mínimo $10) y 🔴 Waha (mensajes, salas de audio y videollamadas opcionales, retiro semanal mínimo $2). ¡Visita la sección de Apps para ver todos los detalles!";
  } else if (lowerMsg.includes("requisito") || lowerMsg.includes("unir") || lowerMsg.includes("aplicar") || lowerMsg.includes("entrar")) {
    reply =
      "Para unirte solo necesitas: ✓ Ser mayor de 18 años ✓ Un smartphone con buena cámara ✓ Conexión WiFi estable ✓ Disponibilidad de 4-5 horas diarias ✓ ¡Actitud positiva! No necesitas experiencia previa, nosotros te capacitamos gratis.";
  } else if (lowerMsg.includes("gan") || lowerMsg.includes("dinero") || lowerMsg.includes("pag") || lowerMsg.includes("sueldo")) {
    reply =
      "💵 Las ganancias dependen de tu dedicación: $10–$50 USD por día en promedio, $100–$500 USD semanales con constancia, y hasta $2000 USD mensuales. Los pagos son semanales vía Binance, Zelle, PayPal y más métodos. ¡Y sin inversión inicial!";
  } else if (lowerMsg.includes("segur") || lowerMsg.includes("privac") || lowerMsg.includes("discre")) {
    reply =
      "🔒 Tu seguridad es nuestra prioridad. Trabajamos con apps de prestigio internacional. No necesitas exponer tus redes sociales ni compartir datos personales. Todo el trabajo es dentro de las plataformas de manera privada y controlada.";
  } else if (lowerMsg.includes("contact") || lowerMsg.includes("whatsapp") || lowerMsg.includes("ayuda")) {
    reply =
      "Puedes contactarnos por WhatsApp, Instagram o Telegram. Nuestro equipo responde en menos de 24 horas, de lunes a domingo de 9 AM a 11 PM. ¡Visita la sección de Contacto para encontrar todos los enlaces!";
  } else if (lowerMsg.includes("agencia") || lowerMsg.includes("manager") || lowerMsg.includes("lider")) {
    reply =
      "💼 ¡También puedes crear tu propia agencia con nosotros! Como manager, reclutarás y guiarás a tu propio equipo de streamers. Recibirás capacitación completa, acceso a nuestras apps y comisiones semanales. Visita la sección 'Crear Agencia' para más info.";
  }

  res.json({ reply });
});

export default router;
