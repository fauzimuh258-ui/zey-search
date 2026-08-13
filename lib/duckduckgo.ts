// lib/duckduckgo.ts
import { SearchResultItem, DateFilter, SearchType } from "@/types";

export interface SearchOptions {
  dateFilter?: DateFilter;
  type?: SearchType;
  region?: string; // e.g. "id-id", "us-en"
}

// NOTE: html.duckduckgo.com has no official "vertical search" (news/discussions)
// param the way a paid search API would. `type` is approximated with query
// modifiers below — good enough to bias results, not a hard guarantee.
function buildEffectiveQuery(query: string, type: SearchType = "all"): string {
  switch (type) {
    case "news":
      return `${query} news`;
    case "discussions":
      return `${query} site:reddit.com OR site:quora.com`;
    default:
      return query;
  }
}

export async function searchDuckDuckGo(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResultItem[]> {
  try {
    const { dateFilter = "all", type = "all", region } = options;
    const effectiveQuery = buildEffectiveQuery(query, type);

    const params = new URLSearchParams({ q: effectiveQuery });
    if (dateFilter !== "all") {
      params.set("df", dateFilter); // d/w/m/y date range
    }
    if (region) {
      params.set("kl", region);
    }

    const response = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
      // BUG FIX: original had no timeout — a slow/hanging DDG response could
      // hold the function open until the platform's own hard timeout.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status ${response.status}`);
    }

    const html = await response.text();
    const results: SearchResultItem[] = [];

    const resultRegex = /<a class="result__url" href="([^"]+)".*?>[\s\S]*?<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/g;

    const titles: string[] = [];
    let titleMatch;
    while ((titleMatch = titleRegex.exec(html)) !== null) {
      const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      if (cleanTitle) titles.push(cleanTitle);
    }

    let match;
    let index = 0;
    while ((match = resultRegex.exec(html)) !== null && index < 7) {
      let rawUrl = match[1];
      const snippet = match[2].replace(/<[^>]+>/g, "").trim();

      if (rawUrl.includes("uddg=")) {
        const urlParams = new URLSearchParams(rawUrl.split("?")[1]);
        rawUrl = urlParams.get("uddg") || rawUrl;
      }

      results.push({
        id: index + 1,
        title: titles[index] || "Search Result",
        url: rawUrl,
        snippet: snippet || "No snippet available",
      });

      index++;
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo Search Error:", error);
    return [];
  }
}
