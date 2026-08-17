// lib/sources/wikipedia.ts
// Addition: referenced in the requested fallback chain ("Semua down →
// Wikipedia") but no endpoint/UA was specified, and the current Wikipedia-only
// implementation wasn't shared in this conversation — so this is a new,
// minimal wrapper around Wikipedia's official search API. No scraping, no
// auth needed, which is exactly why it's a solid last resort.
import { MultiSourceResult } from "./types";

const TIMEOUT_MS = 6000;
const MAX_RESULTS = 5;

interface WikipediaSearchResponse {
  query?: {
    search: Array<{
      title: string;
      snippet: string; // contains HTML highlight spans, stripped below
    }>;
  };
}

export async function searchWikipedia(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${MAX_RESULTS}&srsearch=${encodeURIComponent(query)}`;

  const response = await fetch(requestUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Wikipedia request failed with status ${response.status}`);
  }

  const data: WikipediaSearchResponse = await response.json();
  const items = data.query?.search || [];

  return items.map((item) => ({
    title: item.title,
    snippet: item.snippet.replace(/<[^>]+>/g, ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    source: "wikipedia" as const,
  }));
}
