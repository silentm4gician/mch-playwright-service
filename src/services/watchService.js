import { scrapeWatchPageWithPlaywright } from "../scrapers/watchPagePlaywright.js";

export async function getWatchIframe(url) {
  return await scrapeWatchPageWithPlaywright(url);
}
