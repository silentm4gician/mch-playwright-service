import express from "express";
import { getWatchVideo } from "../services/watchService.js";

const router = express.Router();

router.get("/watch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const videoSrc = await getWatchVideo(url);
    if (!videoSrc)
      return res.status(404).json({ error: "Video no encontrado" });

    res.json({ video: videoSrc }); // Devuelve el .mp4 o .m3u8
  } catch (error) {
    console.error("Scraper error:", error);
    res.status(500).json({ error: "Error al scrapear el video" });
  }
});

export default router;
