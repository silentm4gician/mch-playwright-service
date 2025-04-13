// src/utils/findValidIframe.js
export async function findValidIframe(page) {
  try {
    const results = await page.evaluate(() => {
      // First try to find a script containing tabsArray
      const scripts = [...document.querySelectorAll("script")];
      const tabsScript = scripts.find(
        (s) => s.textContent && s.textContent.includes("tabsArray")
      );

      if (!tabsScript) return null;

      // Extract all iframe sources from tabsArray
      const text = tabsScript.textContent;
      const regex = /tabsArray\['(\d+)'\]\s*=\s*"(.*?)";/g;
      const matches = [...text.matchAll(regex)];

      const iframes = [];

      for (const match of matches) {
        const [, id, rawHtml] = match;
        // Extract src from iframe HTML
        const srcMatch = rawHtml.match(/src=['"]([^'"]+)['"]/);
        if (srcMatch) {
          iframes.push({
            id: id,
            src: srcMatch[1],
            raw: rawHtml,
          });
        }
      }

      return iframes;
    });

    if (!results || results.length === 0) {
      console.warn("⚠️ No se encontraron iframes alternativos en tabsArray");
      return null;
    }

    // Prioridad de servidores
    const priority = [
      // { name: "Iron", keyword: "re.ironhentai.com" },
      { name: "Mega", keyword: "mega.nz" },
      {name: "Femb", keyword: "fembed.com" }
      // { name: "YourUpload", keyword: "yourupload.com" },
      // { name: "Okru", keyword: "ok.ru" },
      // { name: "MailRu", keyword: "mail.ru" },
      // { name: "HQQ", keyword: "hqq.tv" },
    ];

    // Find the best match based on priority
    for (const { name, keyword } of priority) {
      const match = results.find((iframe) => iframe.src.includes(keyword));
      if (match) {
        return {
          iframe: match.src,
          serverName: name,
          all: results.map((r) => r.src),
        };
      }
    }

    // If no priority match, return the first one
    if (results.length > 0) {
      return {
        iframe: results[0].src,
        serverName: "Unknown",
        all: results.map((r) => r.src),
      };
    }

    return null;
  } catch (e) {
    console.error("❌ Error al buscar iframes alternativos:", e.message);
    return null;
  }
}
