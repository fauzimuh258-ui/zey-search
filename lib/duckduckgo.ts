// lib/duckduckgo.ts
import { SearchResultItem, DateFilter, SearchType } from "@/types";

export interface SearchOptions {
  dateFilter?: DateFilter;
  type?: SearchType;
  region?: string;
}

function buildEffectiveQuery(query: string, type: SearchType = "all"): string {
  switch (type) {
    case "news":
      return `${query} berita`;
    case "discussions":
      return `${query} diskusi`;
    default:
      return query;
  }
}

export async function searchDuckDuckGo(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResultItem[]> {
  try {
    const { type = "all" } = options;
    const effectiveQuery = buildEffectiveQuery(query, type);

    // Wikipedia API (gratis, stabil, ga pernah block)
    const response = await fetch(
      `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(effectiveQuery)}&format=json&srlimit=7`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`Wikipedia request failed: ${response.status}`);
    }

    const data = await response.json();
    const searchResults = data?.query?.search || [];

    return searchResults.map((item: any, index: number) => ({
      id: index + 1,
      title: item.title,
      url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
      snippet: item.snippet.replace(/<\/?[^>]+>/g, "").trim(),
    }));
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
  }
