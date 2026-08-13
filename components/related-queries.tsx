// components/related-queries.tsx
"use client";

interface RelatedQueriesProps {
  queries: string[];
  onSelect: (query: string) => void;
}

export default function RelatedQueries({ queries, onSelect }: RelatedQueriesProps) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 mb-2">
        Pencarian Terkait
      </h3>
      <div className="flex flex-wrap gap-2">
        {queries.map((q) => (
          // Keying on the query text itself, not array index — this list is
          // fully replaced on every search, so an index key could make React
          // reuse a chip's DOM node for a completely different query.
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs text-slate-300 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-full px-3.5 py-1.5 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
