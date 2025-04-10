import { chromium } from "playwright";
import cleanRedirectUrl from "../utils/cleanUrl.js";

export async function scrapeWatchPageWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // 🔧 Definilo acá para que esté accesible en el catch
  let iframeSrc = null;
  let videoSrc = null;

  // 🔁 Extraer iframe desde monoschino2.com/ver/... dentro de Playwright
  if (url.includes("monoschino2.com/ver/")) {
    console.log("🌐 Navegando a página monoschino:", url);
    await page.goto(url, { timeout: 20000 });

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
      throw e;
    }
  }

  try {
    console.log("🌐 Navegando a la página final:", url);
    await page.goto(url, { timeout: 30000, waitUntil: "networkidle" });

    // Monitor network requests
    page.on("response", (response) => {
      const url = response.url();
      if ((url.includes(".mp4") || url.includes(".m3u8")) && !videoSrc) {
        console.log("⚡ Intercepted video URL in response:", url);
        videoSrc = url;
      }
    });

    console.log("🕒 Esperando iframe generado por JS...");
    const iframeElement = await page.waitForSelector("iframe", {
      timeout: 20000,
    });
    iframeSrc = await iframeElement.getAttribute("src");
    const iframeRaw = iframeSrc;
    const iframeClean = cleanRedirectUrl(iframeSrc);

    if (!iframeSrc) throw new Error("⚠️ No se pudo obtener el src del iframe.");
    console.log("🔗 Redirigiendo al iframe embed:", iframeClean);

    const iframePage = await context.newPage();
    iframePage.on("response", (response) => {
      const url = response.url();
      if ((url.includes(".mp4") || url.includes(".m3u8")) && !videoSrc) {
        console.log("⚡ Intercepted video URL in iframe response:", url);
        videoSrc = url;
      }
    });

    await iframePage.goto(iframeSrc, {
      timeout: 30000,
      waitUntil: "networkidle",
    });

    console.log("🎥 Esperando <video> o <source>...");
    await iframePage.waitForSelector("video, video > source", {
      timeout: 20000,
    });

    try {
      await iframePage.click(
        ".jwplayer, .jw-display-icon-container, .play-button",
        { timeout: 3000 }
      );
      await iframePage.waitForTimeout(2000);
    } catch (e) {}

    if (videoSrc) {
      console.log("✅ Video encontrado en requests de red:", videoSrc);
      return {
        videoUrl: videoSrc,
        iframe: {
          raw: iframeRaw,
          clean: iframeClean,
        },
      };
    }

    videoSrc = await iframePage.evaluate(() => {
      const video = document.querySelector("video");
      if (video?.src) return video.src;
      const source = video?.querySelector("source");
      if (source?.src) return source.src;

      if (window.jwplayer) {
        try {
          const player = jwplayer();
          if (player && player.getPlaylist && player.getPlaylist()[0]) {
            return player.getPlaylist()[0].file;
          }
        } catch (e) {}
      }

      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const content = script.textContent || "";
        let match = content.match(/["'](https?:\/\/[^"']+\.mp4[^"']*)["']/);
        if (!match) {
          match = content.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        }
        if (match) return match[1];
      }

      return null;
    });

    if (!videoSrc) throw new Error("❌ No se encontró el video src.");
    console.log("✅ Video encontrado:", videoSrc);

    return {
      videoUrl: videoSrc,
      iframe: {
        raw: iframeRaw,
        clean: iframeClean,
      },
    };
  } catch (error) {
    console.error("❌ Error scraping video con Playwright:", error);
    try {
      await page.screenshot({ path: "error-screenshot.png" });
    } catch (screenshotError) {}

    // 🔁 Asegurate de devolver el iframe incluso en errores
    return {
      videoUrl: null,
      iframe: {
        raw: iframeRaw,
        clean: iframeClean,
      },
    };
  } finally {
    await browser.close();
  }
}
