import { Router } from "express";

const router = Router();

const tutorials = [
  { id: 1, title: "Cómo configurar tu primer stream en Twitch", description: "Aprende paso a paso cómo configurar OBS, ajustar la calidad de video y empezar a transmitir en Twitch desde cero.", category: "setup", duration: "45 min", level: "beginner", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80", videoUrl: null, tags: ["OBS", "Twitch", "configuración", "principiantes"] },
  { id: 2, title: "Estrategias de monetización para streamers", description: "Descubre las mejores estrategias para monetizar tu canal: suscripciones, donaciones, patrocinios y merchandise.", category: "monetization", duration: "60 min", level: "intermediate", imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80", videoUrl: null, tags: ["monetización", "patrocinios", "ingresos"] },
  { id: 3, title: "Cómo hacer crecer tu comunidad en YouTube", description: "Técnicas avanzadas para aumentar tu audiencia en YouTube Gaming y convertir viewers en fans leales.", category: "growth", duration: "75 min", level: "advanced", imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80", videoUrl: null, tags: ["YouTube", "comunidad", "crecimiento"] },
  { id: 4, title: "Configuración técnica avanzada de audio", description: "Optimiza la calidad de tu audio con configuraciones profesionales de micrófono, filtros y ecualizadores.", category: "technical", duration: "30 min", level: "intermediate", imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80", videoUrl: null, tags: ["audio", "micrófono", "calidad"] },
  { id: 5, title: "Construye tu marca personal como streamer", description: "Crea una identidad visual única y coherente que te diferencie en el competitivo mundo del streaming.", category: "branding", duration: "90 min", level: "beginner", imageUrl: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80", videoUrl: null, tags: ["marca", "identidad", "diseño"] },
  { id: 6, title: "TikTok Live: Cómo maximizar tus ingresos", description: "Todo lo que necesitas saber para triunfar en TikTok Live y aprovechar al máximo las funciones de monetización.", category: "monetization", duration: "50 min", level: "intermediate", imageUrl: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80", videoUrl: null, tags: ["TikTok", "Live", "monetización"] },
];

router.get("/tutorials", (_req, res) => {
  res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.json(tutorials);
});

router.get("/tutorials/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const tutorial = tutorials.find((t) => t.id === id);
  if (!tutorial) {
    res.status(404).json({ error: "Tutorial not found" });
    return;
  }
  res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.json(tutorial);
});

export default router;