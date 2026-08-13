// components/results-list.tsx
"use client";

import { SearchResultItem, AISummary, DetectedLanguage } from "@/types";

interface ResultsListProps {
  summary: AISummary;
  results: SearchResultItem[];
  query: string;
  cached?: boolean;
  detectedLanguage?: DetectedLanguage;
}

export default function ResultsList({ summary, results, query, cached, detectedLanguage }: ResultsListProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 mt-6">
      {/* AI Overview Box */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <h2 className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Zey AI Overview
            </h2>
          </div>

          {/* Cache + detected-language badges */}
          <div className="flex items-center gap-2">
            {detectedLanguage && detectedLanguage.code !== "unknown" && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full">
                {detectedLanguage.name}
              </span>
            )}
            {cached && (
              <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
                Dari cache
              </span>
            )}
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          {summary.direct_answer}
        </p>

        {summary.key_highlights && summary.key_highlights.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <h3 className="text-xs font-medium text-slate-400">Poin Kunci:</h3>
            <ul className="space-y-1.5 pl-4 list-disc text-xs sm:text-sm text-slate-300">
              {summary.key_highlights.map((highlight, index) => (
                <li key={index} className="leading-snug">{highlight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Web Search Results */}
      <div className="space-y-4">
        {/* BUG FIX: `query` was accepted as a prop but never rendered anywhere —
            harmless, but dead weight, and a missed cue for where the related-query
            chips (below) just took the user. Surfacing it here now. */}
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
          Hasil Pencarian Web ({results.length})
          {query && <span className="normal-case font-normal text-slate-500"> — untuk "{query}"</span>}
        </h3>

        {results.length === 0 ? (
          <p className="text-xs text-slate-500 italic pl-1">Tidak ada rujukan web langsung.</p>
        ) : (
          <div className="space-y-3">
            {results.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all group"
              >
                <div className="flex items-center gap-2 text-xs text-emerald-400/80 mb-1">
                  <span className="font-mono bg-emerald-950/50 px-1.5 py-0.5 rounded text-[10px]">
                    [{item.id}]
                  </span>
                  <span className="truncate max-w-md text-slate-400 group-hover:text-emerald-400 transition-colors">
                    {item.url}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
