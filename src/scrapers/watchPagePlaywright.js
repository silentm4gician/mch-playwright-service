import { chromium } from "playwright";
import cleanRedirectUrl from "../utils/cleanUrl.js";
import { findValidIframe } from "../utils/findValidIframe.js";

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

  try {
    console.log("🌐 Navegando a página:", url);
    await page.goto(url, { timeout: 20000 });

    // Extract iframes first
    if (url.includes("monoschino2.com/ver/")) {
      console.log("🔍 Buscando iframes disponibles...");
      const altIframes = await findValidIframe(page);

      if (altIframes) {
        iframeSrc = altIframes.iframe;
        serverName = altIframes.serverName;
        allIframes = altIframes.all;
        console.log(`✅ Encontrado iframe de ${serverName}:`, iframeSrc);
      } else {
        // Fallback to direct iframe extraction if tabsArray method fails
        try {
          iframeSrc = await page.$eval(
            ".iframe-container iframe",
            (el) => el.src
          );
          console.log("🔍 Iframe extraído directamente:", iframeSrc);
        } catch (e) {
          console.error("⚠️ No se pudo extraer iframe directo:", e.message);
        }
      }

      // Process redirect URLs
      if (iframeSrc && iframeSrc.includes("redirect.php?id=")) {
        const redirectMatch = iframeSrc.match(/redirect\.php\?id=(.+)/);
        if (redirectMatch && redirectMatch[1]) {
          const redirectUrl = decodeURIComponent(redirectMatch[1]);
          console.log("🔄 URL redireccionada:", redirectUrl);
          iframeRaw = iframeSrc;
          iframeClean = redirectUrl;
          iframeSrc = redirectUrl; // Use the redirected URL for navigation
        }
      } else if (iframeSrc) {
        iframeRaw = iframeSrc;
        iframeClean = cleanRedirectUrl(iframeSrc);
      }

      // If we have a valid iframe, process it
      if (iframeSrc) {
        urlFetch = url; // Keep original URL for reference

        // Create a new page for the iframe source
        console.log("🔗 Navegando al iframe:", iframeSrc);
        const iframePage = await context.newPage();

        // Set up interceptors for video URLs
        iframePage.on("response", (response) => {
          const responseUrl = response.url();
          if (
            (responseUrl.includes(".mp4") || responseUrl.includes(".m3u8")) &&
            !videoSrc
          ) {
            console.log(
              "⚡ Intercepted video URL in iframe response:",
              responseUrl
            );
            videoSrc = responseUrl;
          }
        });

        await iframePage.goto(iframeSrc, {
          timeout: 30000,
          waitUntil: "networkidle",
        });

        console.log("🎥 Buscando elemento de video...");

        // Try to click play button if available
        try {
          await iframePage.click(
            ".jwplayer, .jw-display-icon-container, .play-button",
            { timeout: 3000 }
          );
          await iframePage.waitForTimeout(2000);
        } catch (e) {
          console.log(
            "ℹ️ No se encontró botón de play o no fue necesario clickear"
          );
        }

        // If we didn't intercept the video URL, try to extract it from the DOM
        if (!videoSrc) {
          videoSrc = await iframePage.evaluate(() => {
            // Check for video element
            const video = document.querySelector("video");
            if (video?.src) return video.src;

            // Check for source element inside video
            const source = video?.querySelector("source");
            if (source?.src) return source.src;

            // Check for JWPlayer
            if (window.jwplayer) {
              try {
                const player = jwplayer();
                if (player && player.getPlaylist && player.getPlaylist()[0]) {
                  return player.getPlaylist()[0].file;
                }
              } catch (e) {}
            }

            // Check for video URLs in scripts
            const scripts = document.querySelectorAll("script");
            for (const script of scripts) {
              const content = script.textContent || "";
              let match = content.match(
                /["'](https?:\/\/[^"']+\.mp4[^"']*)["']/
              );
              if (!match) {
                match = content.match(
                  /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/
                );
              }
              if (match) return match[1];
            }

            return null;
          });

          if (videoSrc) {
            console.log("✅ Video encontrado en DOM/scripts:", videoSrc);
          }
        }

        await iframePage.close();
      }
    }

    return {
      videoUrl: videoSrc,
      iframe: {
        raw: iframeRaw || null,
        clean: iframeClean || null,
        server: serverName || null,
        alternatives: allIframes || [],
      },
      urlFetch: urlFetch || url,
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
        server: serverName || null,
        alternatives: allIframes || [],
      },
      urlFetch: urlFetch || url,
    };
  } finally {
    await browser.close();
  }
}
