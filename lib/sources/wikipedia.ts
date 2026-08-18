// lib/sources/wikipedia.ts
// CHANGE: switched from en.wikipedia.org to id.wikipedia.org — the reported
// results ("Jaringan saraf tiruan", "Pembelajaran terbimbing", etc.) are
// clearly from Indonesian Wikipedia, so that's what the live app actually
// needs. MAX_RESULTS also raised 5 → 10: when this fallback fires, Wikipedia
// is the *only* source in the pool, and needs enough raw candidates to still
// have up to 7 survive the relevance filter in lib/relevance.ts.
import { MultiSourceResult } from "./types";

const TIMEOUT_MS = 6000;
const MAX_RESULTS = 10;

interface WikipediaSearchResponse {
  query?: {
    search: Array<{
      title: string;
      snippet: string; // contains HTML highlight spans, stripped below
    }>;
  };
}

export async function searchWikipedia(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${MAX_RESULTS}&srsearch=${encodeURIComponent(query)}`;

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
    url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    source: "wikipedia" as const,
  }));
}
