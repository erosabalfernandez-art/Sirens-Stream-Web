import { Router } from "express";

const router = Router();

router.get("/stats", (_req, res) => {
  res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.json({
    streamersRepresented: 500,
    totalFollowers: "250K",
    averageGrowthRate: "340%",
    successStories: 47,
    yearsActive: 3,
    platforms: ["Waha", "Layla"],
  });
});

export default router;
