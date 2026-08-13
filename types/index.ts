// types/index.ts
export interface SearchResultItem {
  id: number;
  title: string;
  url: string;
  snippet: string;
}

export interface AISummary {
  direct_answer: string;
  key_highlights: string[];
}

export type DateFilter = "d" | "w" | "m" | "y" | "all";
export type SearchType = "all" | "news" | "discussions";

export interface SearchFilters {
  dateFilter: DateFilter;
  type: SearchType;
}

export interface DetectedLanguage {
  code: string;
  name: string;
  confidence: number;
}

export interface SearchResponse {
  status: string;
  query: string;
  detectedLanguage: DetectedLanguage;
  aiSummary: AISummary;
  relatedQueries: string[];
  searchResults: SearchResultItem[];
  filters: SearchFilters;
  cached: boolean;
  timestamp: string;
}
