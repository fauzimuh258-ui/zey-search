// lib/sources/wikipedia.ts
// FIX: production logs show this failing with HTTP 429 even under very light
// traffic. The fetch had no User-Agent header — Wikimedia's API etiquette
// policy specifically throttles/blocks requests without a descriptive UA
// (policy-based, not just volume-based, so it can trigger on very few
// requests). Added a compliant UA below — swap the contact URL for a real
// domain/email you control. A single short retry on 429 is also added since
// this is the last-resort fallback: if it fails, the user gets zero results.
import { MultiSourceResult } from "./types";

const TIMEOUT_MS = 6000;
const MAX_RESULTS = 10;

// See https://meta.wikimedia.org/wiki/User-Agent_policy — replace the contact
// URL with something real so Wikimedia can reach you if there's ever an issue.
const USER_AGENT = "ZeySearchBot/1.0 (https://zey-search.vercel.app)";

interface WikipediaSearchResponse {
  query?: {
    search: Array<{
      title: string;
      snippet: string; // contains HTML highlight spans, stripped below
    }>;
  };
}

async function fetchWikipedia(requestUrl: string): Promise<Response> {
  return fetch(requestUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function searchWikipedia(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${MAX_RESULTS}&srsearch=${encodeURIComponent(query)}`;

  let response = await fetchWikipedia(requestUrl);

  // One short retry specifically for 429 — cheap insurance on the one path
  // that has nothing left to fall back to if it fails.
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    response = await fetchWikipedia(requestUrl);
  }

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
