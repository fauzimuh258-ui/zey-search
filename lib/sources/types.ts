// lib/sources/types.ts
export type SourceName = "yandex" | "bing" | "reddit" | "github" | "wikipedia";

export interface MultiSourceResult {
  title: string;
  snippet: string;
  url: string;
  source: SourceName;
}
