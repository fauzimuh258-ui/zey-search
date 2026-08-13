// components/search-page.tsx
"use client";

import { useState } from "react";
import SearchBar from "./search-bar";
import SearchFilters from "./search-filters";
import ResultsList from "./results-list";
import RelatedQueries from "./related-queries";
import { SearchResponse, DateFilter, SearchType } from "@/types";

export default function SearchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [type, setType] = useState<SearchType>("all");

  const runSearch = async (
    query: string,
    filters: { dateFilter: DateFilter; type: SearchType } = { dateFilter, type }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, ...filters }),
      });

      // BUG FIX: `res.json()` was called unconditionally — an upstream 502/504
      // (e.g. a Vercel-level timeout) returns an HTML error page, not JSON,
      // which threw a cryptic "Unexpected token <" instead of a readable message.
      const data = await res.json().catch(() => null);

      if (!data) {
        throw new Error("Server mengembalikan respons yang tidak valid. Coba lagi.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan pencarian.");
      }

      setSearchData(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters: { dateFilter: DateFilter; type: SearchType }) => {
    setDateFilter(filters.dateFilter);
    setType(filters.type);
    // Pass `filters` explicitly instead of relying on the dateFilter/type state
    // just set above — state updates aren't synchronous, so reading that state
    // here would still see the pre-update values.
    if (searchData?.query) {
      runSearch(searchData.query, filters);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {!searchData && !loading && (
          <div className="text-center space-y-3 pt-12 sm:pt-20">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Zey Search Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Mesin pencari berbasis AI ringkas, cepat, akurat, dan transparan.
            </p>
          </div>
        )}

        <div>
          <SearchBar onSearch={(q) => runSearch(q)} isLoading={loading} initialQuery={searchData?.query || ""} />
          <SearchFilters dateFilter={dateFilter} type={type} onChange={handleFilterChange} disabled={loading} />
        </div>

        {error && (
          <div className="max-w-xl mx-auto p-3.5 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="max-w-xl mx-auto text-center space-y-3 py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
            <p className="text-xs text-slate-400">Mencari di web & menyusun ringkasan AI...</p>
          </div>
        )}

        {searchData && !loading && (
          <>
            <ResultsList
              summary={searchData.aiSummary}
              results={searchData.searchResults}
              query={searchData.query}
              cached={searchData.cached}
              detectedLanguage={searchData.detectedLanguage}
            />
            <RelatedQueries queries={searchData.relatedQueries} onSelect={(q) => runSearch(q)} />
          </>
        )}
      </div>
    </div>
  );
}
