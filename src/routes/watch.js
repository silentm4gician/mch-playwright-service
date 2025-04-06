// src/routes/watch.js
import express from "express";
import { getWatchIframe } from "../services/watchService.js";

const router = express.Router();

router.get("/watch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const iframe = await getWatchIframe(url);
    if (!iframe) return res.status(404).json({ error: "Iframe no encontrado" });

    res.json({ iframe });
  } catch (error) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: "Error al scrapear monoschino2.com" });
  }
});

export default router;
