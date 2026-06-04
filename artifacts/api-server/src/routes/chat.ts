import { Router } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPT = `Eres Ángela, la asistente virtual de Eclipse Angels Agency. Tu trabajo es responder preguntas de chicas interesadas en unirse a la agencia o de personas que quieran saber más sobre nosotros.

SOBRE LA AGENCIA:
- Eclipse Angels Agency es una agencia de streamers y chat hostess
- Ayudamos a mujeres a ganar dinero en dólares desde casa, sin inversión ni experiencia previa
- También ofrecemos oportunidad para hombres como managers/reclutadores de su propio equipo

APPS CON LAS QUE TRABAJAMOS:
1. Layla (en iOS se llama Nivi):
   - Solo mensajes (sin videollamada obligatoria)
   - Ganancias acumulables sin fecha límite
   - Retiro mínimo: $10 USD
   - Plataforma internacional de gran prestigio

2. Waha (en iOS se llama Liyo):
   - Mensajes, salas de audio y videollamadas (opcionales)
   - Pago semanal
   - Retiro mínimo: $2.50 USD (10,000 diamantes)
   - Disponibilidad mínima: 4 horas diarias

GANANCIAS:
- $10–$50 USD por día en promedio
- $100–$500 USD semanales con constancia
- Hasta $2,000 USD mensuales con dedicación
- Sin inversión inicial

MÉTODOS DE PAGO:
- Binance, Zelle, PayPal, transferencia bancaria y más
- Pagos semanales

REQUISITOS PARA UNIRSE:
- Ser mayor de 18 años
- Tener un smartphone con buena cámara
- Conexión WiFi estable
- Disponibilidad de 4-5 horas diarias
- Actitud positiva y ganas de aprender
- No se necesita experiencia previa, la agencia capacita gratis

SEGURIDAD Y PRIVACIDAD:
- No es necesario exponer redes sociales personales
- No se comparten datos personales
- Todo el trabajo es dentro de las plataformas de forma privada
- Apps de prestigio internacional

OPORTUNIDAD PARA HOMBRES (MANAGER/RECLUTADOR):
- Pueden unirse como managers y crear su propio equipo
- Reclutan y guían a streamers
- Reciben capacitación completa
- Ganan comisiones semanales

CONTACTO:
- Email: eclipseangelsagency@gmail.com
- WhatsApp, Instagram y Telegram disponibles en la sección Contacto
- Atención de lunes a domingo, 9 AM a 11 PM

INSTRUCCIONES DE COMPORTAMIENTO:
- Responde siempre en español, de forma amigable, cercana y profesional
- Sé entusiasta pero honesta
- Si no sabes algo específico, invita a contactar directamente por WhatsApp o Instagram
- Respuestas concisas (máximo 3-4 oraciones) a menos que el usuario pida más detalle
- Usa emojis con moderación para dar calidez
- Nunca inventes datos que no estén en esta información`;

router.post("/chat", async (req, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const { message } = parsed.data;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ status: response.status, err }, "Groq API error");
      res.status(502).json({ error: "AI service error, try again" });
      return;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content ?? "Lo siento, no pude procesar tu mensaje. Intenta de nuevo.";

    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Groq fetch failed");
    res.status(502).json({ error: "AI service unavailable, try again" });
  }
});

export default router;
