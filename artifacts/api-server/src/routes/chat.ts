import { Router } from "express";

const router = Router();

const SYSTEM_PROMPT = `Eres Ángela, la asistente virtual de Eclipse Angels Agency. Eres amigable, entusiasta, honesta y muy informada. Respondes SIEMPRE en español.

SOBRE ECLIPSE ANGELS AGENCY:
Eclipse Angels Agency conecta mujeres (+18) con plataformas internacionales de videochat y mensajería para ganar dólares desde el celular, sin inversión y sin experiencia previa.

APP 1 — WAHA (iOS: Liyo): mensajes, salas de audio, videollamadas (opcionales). Pago semanal. 10,000 diamantes = $2.50 USD.
APP 2 — LAYLA (iOS: Nivi): mensajes, salas de audio, llamadas de voz, videollamadas (opcionales). Retiro acumulable desde $10 USD. Código agencia: G-84Y3AG7HL.
APP 3 — HOWDY (solo Android): videollamadas, live, mensajes. Usuarios de Asia/Europa/Norteamérica. 100,000 puntos = $10 USD. Código agencia: R3DKXB5.

GANANCIAS: $10–$50/día, $100–$500/semana, $1,000–$2,000/mes con dedicación.
PAGOS: Binance, Pix (Brasil), efectivo o transferencia bancaria (Cuba). Todos en dólares USD.
CONTACTO: WhatsApp https://wa.me/5595984381686 | Instagram @eclipse_angels1

INSTRUCCIONES: Responde en español, tono amigable, máximo 5 oraciones salvo que pidan detalle. NUNCA inventes datos.`;

router.post("/chat", async (req, res) => {
  const body = req.body as { message?: string; history?: Array<{ role: string; content: string }> };

  if (!body?.message || typeof body.message !== "string") {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const { message, history = [] } = body;

  const conversationMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: conversationMessages, max_tokens: 400, temperature: 0.7 }),
    });

    if (!response.ok) {
      const err = await response.text();
      req.log?.error({ status: response.status, err }, "Groq API error");
      res.status(502).json({ error: "AI service error, try again" });
      return;
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const reply = data.choices?.[0]?.message?.content ?? "Lo siento, no pude procesar tu mensaje. Intenta de nuevo.";
    res.json({ reply });
  } catch (err) {
    req.log?.error({ err }, "Groq fetch failed");
    res.status(502).json({ error: "AI service unavailable, try again" });
  }
});

export default router;
