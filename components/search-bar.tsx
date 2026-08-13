// components/search-bar.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

const MAX_QUERY_LENGTH = 300; // mirrors lib/sanitize.ts

export default function SearchBar({ onSearch, isLoading, initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  // BUG FIX: `initialQuery` was only ever read once, via useState's initializer,
  // so clicking a related-query chip would run the new search but leave the
  // input showing the *old* text. Sync local state whenever the parent hands
  // us a new query.
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari informasi atau ajukan pertanyaan..."
          disabled={isLoading}
          maxLength={MAX_QUERY_LENGTH}
          className="w-full bg-slate-900 border border-slate-800 rounded-full py-3.5 pl-5 pr-28 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-1.5 py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
