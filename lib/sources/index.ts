// lib/sources/index.ts
import { searchBing } from "./bing";
import { searchYandex } from "./yandex";
import { searchGitHub } from "./github";
import { searchWikipedia } from "./wikipedia";
import { MultiSourceResult, SourceName } from "./types";
import { filterAndRankByRelevance, ScoredResult } from "../relevance";

const MAX_TOTAL_RESULTS = 7;
const MAX_AI_OVERVIEW_SOURCES = 3;

// CHANGE: Reddit dropped from the primary source list — the new spec only
// lists Bing, Yandex, GitHub, and Wikipedia-as-fallback.
// lib/sources/reddit.ts is untouched if it needs to come back later.
const PRIMARY_SOURCES: { name: SourceName; fetcher: (q: string) => Promise<MultiSourceResult[]> }[] = [
  { name: "bing", fetcher: searchBing },
  { name: "yandex", fetcher: searchYandex },
  { name: "github", fetcher: searchGitHub },
];

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

async function fetchPrimarySources(query: string): Promise<MultiSourceResult[]> {
  const settled = await Promise.allSettled(PRIMARY_SOURCES.map((s) => s.fetcher(query)));

  const merged: MultiSourceResult[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    } else {
      // If this shows up consistently for bing/yandex in production, that's
      // almost certainly why results were 100% Wikipedia — Bing/Yandex tend to
      // block or rate-limit requests from datacenter IPs like Vercel's.
      console.error(`[multiSourceSearch] ${PRIMARY_SOURCES[i].name} failed:`, result.reason);
    }
  });

  return dedupeByUrl(merged);
}

export interface MultiSourceSearchResult {
  results: ScoredResult[]; // up to 7, all at/above RELEVANCE_THRESHOLD
  overviewSources: ScoredResult[]; // top 3 of `results`, for the AI Overview
  usedFallback: boolean; // true if Wikipedia had to cover for the primary sources
}

// CHANGE: the previous fallback trigger was "all primary sources returned
// zero results". That's not sufficient — a source can return results that
// are simply irrelevant (the reported bug: Wikipedia surfacing "QGIS" for
// "neural network"). The trigger is now "nothing survives the relevance
// filter", and Wikipedia's own output goes through that same filter before
// it's trusted either — so the fallback can't reintroduce the exact problem
// it exists to solve.
export async function multiSourceSearch(query: string): Promise<MultiSourceSearchResult> {
  const primaryRaw = await fetchPrimarySources(query);
  const primaryRanked = filterAndRankByRelevance(query, primaryRaw);

  if (primaryRanked.length > 0) {
    return {
      results: primaryRanked.slice(0, MAX_TOTAL_RESULTS),
      overviewSources: primaryRanked.slice(0, MAX_AI_OVERVIEW_SOURCES),
      usedFallback: false,
    };
  }

  try {
    const wikipediaRaw = await searchWikipedia(query);
    const wikipediaRanked = filterAndRankByRelevance(query, wikipediaRaw);
    return {
      results: wikipediaRanked.slice(0, MAX_TOTAL_RESULTS),
      overviewSources: wikipediaRanked.slice(0, MAX_AI_OVERVIEW_SOURCES),
      usedFallback: true,
    };
  } catch (error) {
    console.error("[multiSourceSearch] Wikipedia fallback also failed:", error);
    return { results: [], overviewSources: [], usedFallback: true };
  }
}

export type { MultiSourceResult, SourceName } from "./types";
export type { ScoredResult } from "../relevance";
