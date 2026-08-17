// lib/sources/yandex.ts
// NOTE: Yandex's *inner* result markup uses generated/hashed class names that
// change often (unlike the stable outer `serp-item` container), so title
// extraction deliberately doesn't hardcode an inner class name. Re-check
// against a live response if Yandex's layout shifts.
import { MultiSourceResult } from "./types";

const USER_AGENT = "Mozilla/5.0 (Linux; Android 10)";
const TIMEOUT_MS = 6000;
const MAX_RESULTS = 5;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

export async function searchYandex(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;

  const response = await fetch(requestUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Yandex request failed with status ${response.status}`);
  }

  const html = await response.text();
  const results: MultiSourceResult[] = [];

  // Each organic result sits inside <li class="serp-item">...</li>.
  const blocks = html.match(/<li class="serp-item"[\s\S]*?<\/li>/g) || [];

  for (const block of blocks) {
    if (results.length >= MAX_RESULTS) break;

    // First http(s) link in the block is treated as the title link.
    const linkMatch = block.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    const url = linkMatch[1];
    const title = stripTags(linkMatch[2]);
    if (!title || !url) continue;

    // Longest plain-text chunk after the title link is treated as the snippet.
    const afterTitle = block.slice((linkMatch.index ?? 0) + linkMatch[0].length);
    const textChunks = stripTags(afterTitle)
      .split(/\s{2,}|\n/)
      .map((c) => c.trim())
      .filter((c) => c.length > 20);
    const snippet = textChunks.sort((a, b) => b.length - a.length)[0] || "";

    results.push({ title, snippet, url, source: "yandex" });
  }

  return results;
}
