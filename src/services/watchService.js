import { scrapeWatchPageWithPlaywright } from "../scrapers/watchPagePlaywright.js";

export async function getWatchVideo(url) {
  return await scrapeWatchPageWithPlaywright(url);
}
