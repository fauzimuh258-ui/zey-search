// lib/sources/bing.ts
// NOTE: scraping Bing's HTML is inherently fragile — markup can change without
// notice, and Bing may serve CAPTCHAs or throttle requests from datacenter IPs
// (which is what Vercel's serverless functions look like to them). Treat this
// as a best-effort source — the orchestrator in `./index.ts` already handles
// this source failing outright.
import { MultiSourceResult } from "./types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const TIMEOUT_MS = 6000;
const MAX_RESULTS = 5;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

export async function searchBing(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  const response = await fetch(requestUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Bing request failed with status ${response.status}`);
  }

  const html = await response.text();
  const results: MultiSourceResult[] = [];

  // Each organic result sits inside <li class="b_algo">...</li>.
  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];

  for (const block of blocks) {
    if (results.length >= MAX_RESULTS) break;

    const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    const url = linkMatch[1];
    const title = stripTags(linkMatch[2]);
    if (!title || !url) continue;

    const snippetMatch =
      block.match(/<div class="b_caption">[\s\S]*?<p>([\s\S]*?)<\/p>/) || block.match(/<p>([\s\S]*?)<\/p>/);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";

    results.push({ title, snippet, url, source: "bing" });
  }

  return results;
}
