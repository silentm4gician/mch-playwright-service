import { chromium } from "playwright";

export async function scrapeWatchPageWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: 20000 });
    // Nuevo selector más confiable
    await page.waitForSelector(".iframe-container iframe", { timeout: 15000 });

    const iframeSrc = await page.$eval(
      ".iframe-container iframe",
      (el) => el.src
    );
    return iframeSrc;
  } catch (error) {
    console.error("Error scraping watch page with Playwright:", error);
    return null;
  } finally {
    await browser.close();
  }
}
