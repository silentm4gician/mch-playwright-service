import { chromium } from "playwright";
import cleanRedirectUrl from "../utils/cleanUrl.js";
import { findValidIframe } from "../utils/findValidIframe.js";

// 🧠 Función auxiliar para detectar URLs de video
async function findVideoInPage(page) {
  let videoUrl = null;

  page.on("response", (response) => {
    const url = response.url();
    if ((url.includes(".mp4") || url.includes(".m3u8")) && !videoUrl) {
      console.log("⚡ Intercepted video in response:", url);
      videoUrl = url;
    }
  });

  const checkDOM = async (frame) => {
    return frame.evaluate(() => {
      const video = document.querySelector("video");
      if (video?.src) return video.src;

      const source = video?.querySelector("source");
      if (source?.src) return source.src;

      if (window.jwplayer) {
        try {
          const player = jwplayer();
          const file = player?.getPlaylist?.()[0]?.file;
          if (file) return file;
        } catch (e) {}
      }

      const scripts = Array.from(document.querySelectorAll("script"));
      for (const script of scripts) {
        const content = script.textContent || "";
        const mp4Match = content.match(/https?:\/\/[^"' ]+\.mp4[^"' ]*/);
        const m3u8Match = content.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);
        if (mp4Match) return mp4Match[0];
        if (m3u8Match) return m3u8Match[0];
      }

      return null;
    });
  };

  const allFrames = page.frames();
  for (const frame of allFrames) {
    const domVideo = await checkDOM(frame);
    if (domVideo) {
      console.log("🎯 Video encontrado en DOM de frame:", domVideo);
      return domVideo;
    }
  }

  await page.waitForTimeout(3000);
  return videoUrl;
}

// 🎬 Scraper principal
export async function scrapeWatchPageWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let iframeSrc = null;
  let iframeRaw = null;
  let iframeClean = null;
  let videoSrc = null;
  let urlFetch = null;

  let serverName = null;
  let allIframes = [];

  if (url.includes("monoschino2.com/ver/")) {
    console.log("🌐 Navegando a página monoschino:", url);
    await page.goto(url, { timeout: 20000 });

    const altIframes = await findValidIframe(page);
    if (altIframes) {
      iframeSrc = altIframes.iframe;
      serverName = altIframes.serverName;
      allIframes = altIframes.all;
      console.log(`✅ Encontrado iframe de ${serverName}:`, iframeSrc);
    }

    try {
      iframeSrc = await page.$eval(".iframe-container iframe", (el) => el.src);
      console.log("🔍 Iframe extraído desde Monoschino:", iframeSrc);

      if (iframeSrc.includes("redirect.php?id=")) {
        const redirectMatch = iframeSrc.match(/redirect\.php\?id=(.+)/);
        if (redirectMatch && redirectMatch[1]) {
          url = decodeURIComponent(redirectMatch[1]);
          console.log("🔄 URL redireccionada limpiada:", url);
        }
      }
    } catch (e) {
      console.error(
        "⚠️ No se pudo extraer iframe desde Monoschino:",
        e.message
      );
    }
  }

  try {
    urlFetch = url;

    if (!urlFetch.includes("ironhentai.com")) {
      return {
        videoUrl: allIframes.find((url) => url.includes("mega.nz")) || null,
        serverName: "Mega",
        allIframes: allIframes,
      };
    }

    console.log("🌐 Navegando a la página final:", urlFetch);
    await page.goto(urlFetch, {
      timeout: 50000,
      waitUntil: "domcontentloaded",
    });

    const iframeElement = await page.waitForSelector("iframe", {
      timeout: 20000,
    });
    iframeSrc = await iframeElement.getAttribute("src");
    iframeRaw = iframeSrc;
    iframeClean = cleanRedirectUrl(iframeSrc);

    if (!iframeSrc) throw new Error("⚠️ No se pudo obtener el src del iframe.");
    console.log("🔗 Redirigiendo al iframe embed:", iframeClean);

    const iframePage = await context.newPage();
    await iframePage.goto(iframeSrc, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });

    console.log("🎥 Buscando video en todos los frames y scripts...");
    videoSrc = await findVideoInPage(iframePage);

    if (!videoSrc) throw new Error("❌ No se encontró el video src.");
    console.log("✅ Video encontrado:", videoSrc);

    return {
      videoUrl: videoSrc,
      iframe: {
        raw: iframeRaw,
        clean: iframeClean,
      },
      urlFetch: urlFetch,
      serverName: serverName,
      allIframes: allIframes,
    };
  } catch (error) {
    console.error("❌ Error scraping video con Playwright:", error.message);
    try {
      await page.screenshot({ path: "error-screenshot.png" });
    } catch {}

    return {
      videoUrl: videoSrc || null,
      iframe: {
        raw: iframeRaw || null,
        clean: iframeClean || null,
      },
      urlFetch: urlFetch || null,
      serverName: serverName || null,
      allIframes: allIframes || null,
    };
  } finally {
    await browser.close();
  }
}
