// lib/sources/index.ts
import { searchBing } from "./bing";
import { searchYandex } from "./yandex";
import { searchGitHub } from "./github";
import { searchReddit } from "./reddit";
import { searchWikipedia } from "./wikipedia";
import { MultiSourceResult, SourceName } from "./types";

const MAX_TOTAL_RESULTS = 7;

// --- Design note -------------------------------------------------------
// The spec asks for two things that are in tension read literally:
//   1. "Fetch dari 4 sumber PARALEL" — fetch all 4 sources in parallel.
//   2. A linear fallback chain: Yandex down → Bing → Reddit → GitHub →
//      Wikipedia (terakhir).
// A parallel fetch of all 4 doesn't need a *sequential* retry chain for
// individual failures — merging whatever succeeded already degrades
// gracefully on its own. So here:
//   - All 4 primary sources run in parallel via Promise.allSettled.
//   - The chain's order (Yandex, Bing, Reddit, GitHub) is used as PRIORITY
//     when interleaving results, not as a sequential retry.
//   - Wikipedia sits outside the parallel batch and is only called if every
//     single primary source fails or returns zero results — matching
//     "Semua down → Wikipedia (terakhir)" literally.
// -------------------------------------------------------------------------
const PRIMARY_SOURCES: { name: SourceName; fetcher: (q: string) => Promise<MultiSourceResult[]> }[] = [
  { name: "yandex", fetcher: searchYandex },
  { name: "bing", fetcher: searchBing },
  { name: "reddit", fetcher: searchReddit },
  { name: "github", fetcher: searchGitHub },
];

// Round-robins across sources (1 from Yandex, 1 from Bing, 1 from Reddit, 1
// from GitHub, back to Yandex, ...) instead of concatenating source-by-source,
// so a source that returns more results doesn't crowd out the others in the
// final top-7.
function interleave(buckets: MultiSourceResult[][]): MultiSourceResult[] {
  const merged: MultiSourceResult[] = [];
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));

  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (bucket[i]) merged.push(bucket[i]);
    }
  }

  return merged;
}

// Addition: dedupe by URL — Bing and Yandex in particular often surface the
// same top pages for a given query, and a literal duplicate wastes one of
// the seven available slots.
function dedupeByUrl(results: MultiSourceResult[]): MultiSourceResult[] {
  const seen = new Set<string>();
  const deduped: MultiSourceResult[] = [];

  for (const result of results) {
    const key = result.url.replace(/\/+$/, "").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  return deduped;
}

export async function multiSourceSearch(query: string): Promise<MultiSourceResult[]> {
  const settled = await Promise.allSettled(PRIMARY_SOURCES.map((s) => s.fetcher(query)));

  const buckets: MultiSourceResult[][] = settled.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.error(`[multiSourceSearch] ${PRIMARY_SOURCES[i].name} failed:`, result.reason);
    return [];
  });

  const merged = dedupeByUrl(interleave(buckets));

  if (merged.length > 0) {
    return merged.slice(0, MAX_TOTAL_RESULTS);
  }

  // All 4 primary sources failed or returned nothing — last-resort fallback.
  try {
    const wikipediaResults = await searchWikipedia(query);
    return wikipediaResults.slice(0, MAX_TOTAL_RESULTS);
  } catch (error) {
    console.error("[multiSourceSearch] Wikipedia fallback also failed:", error);
    return [];
  }
}

export type { MultiSourceResult, SourceName } from "./types";

// --- Example usage in a route handler -----------------------------------
// import { multiSourceSearch } from "@/lib/sources";
//
// export async function POST(req: NextRequest) {
//   const { query } = await req.json();
//   const results = await multiSourceSearch(query);
//   return NextResponse.json({ results });
// }
// -------------------------------------------------------------------------
