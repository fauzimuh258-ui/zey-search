"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-mono text-sm text-emerald-400 font-bold">
            Z
          </div>
          <span className="font-bold text-white tracking-wider text-base">ZEY SEARCH</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            AI Search Online
          </span>
        </div>
      </div>
    </header>
  );
}
