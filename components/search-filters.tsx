// components/search-filters.tsx
"use client";

import { DateFilter, SearchType } from "@/types";

interface SearchFiltersProps {
  dateFilter: DateFilter;
  type: SearchType;
  onChange: (filters: { dateFilter: DateFilter; type: SearchType }) => void;
  disabled?: boolean;
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Kapan saja" },
  { value: "d", label: "24 jam terakhir" },
  { value: "w", label: "Minggu ini" },
  { value: "m", label: "Bulan ini" },
  { value: "y", label: "Tahun ini" },
];

const TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "news", label: "Berita" },
  { value: "discussions", label: "Diskusi" },
];

export default function SearchFilters({ dateFilter, type, onChange, disabled }: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
      <select
        value={dateFilter}
        disabled={disabled}
        onChange={(e) => onChange({ dateFilter: e.target.value as DateFilter, type })}
        aria-label="Filter tanggal"
        className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
      >
        {DATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={type}
        disabled={disabled}
        onChange={(e) => onChange({ dateFilter, type: e.target.value as SearchType })}
        aria-label="Filter tipe hasil"
        className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
