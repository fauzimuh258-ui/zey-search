// lib/cache.ts
// In-memory TTL cache for search responses. Lives only as long as a single warm
// serverless instance — resets on cold starts, not shared across concurrent
// instances. Fine for cutting duplicate DuckDuckGo/AI-gateway calls on a
// low-traffic MVP; swap the internals for Vercel KV / Upstash Redis later
// without touching the public get/set API below.
import { SearchResponse } from "@/types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 500;

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private evictOldestIfFull(): void {
    if (this.store.size < MAX_CACHE_ENTRIES) return;
    const oldestKey = this.store.keys().next().value;
    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
    }
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.evictExpired();
    this.evictOldestIfFull();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  size(): number {
    return this.store.size;
  }
}

export const searchCache = new TTLCache<SearchResponse>();

export function buildCacheKey(parts: Record<string, string | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}
