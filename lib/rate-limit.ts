// lib/rate-limit.ts
// Shared IP-based rate limiter — extracted so /api/search (and any future
// route) reuses one limiter instead of each duplicating it. Same in-memory
// caveat as lib/cache.ts: resets on cold starts, not shared across
// concurrent instances.
interface RateLimitEntry {
  count: number;
  reset: number;
}

const store = new Map<string, RateLimitEntry>();

function cleanup(now: number): void {
  for (const [ip, entry] of store) {
    if (now > entry.reset) {
      store.delete(ip);
    }
  }
}

export function applyRateLimit(
  ip: string,
  { windowMs = 60_000, maxRequests = 15 }: { windowMs?: number; maxRequests?: number } = {}
): boolean {
  const now = Date.now();
  if (store.size > 1000) {
    cleanup(now);
  }

  const current = store.get(ip);
  if (!current || now > current.reset) {
    store.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count += 1;
  return true;
}

// x-forwarded-for can be a comma-separated chain ("client, proxy1, proxy2") —
// only the first entry is the real client.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
