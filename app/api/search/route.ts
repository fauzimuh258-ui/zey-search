// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchDuckDuckGo } from "@/lib/duckduckgo";
import { ZEY_SEARCH_PROMPT } from "@/lib/system-prompt";
import { sanitizeQuery } from "@/lib/sanitize";
import { detectLanguage, languageToDuckDuckGoRegion } from "@/lib/language-detect";
import { searchCache, buildCacheKey } from "@/lib/cache";
import { DateFilter, SearchType, SearchResultItem, SearchResponse, AISummary } from "@/types";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

// BUG FIX: entries were never deleted in the original, only overwritten once a
// window expired — IPs that stop requesting would sit in memory for the life of
// the instance. Sweep expired entries once the map gets large instead of
// letting it grow unbounded.
function cleanupRateLimitMap(now: number): void {
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.reset) {
      rateLimitMap.delete(ip);
    }
  }
}

function applyRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size > 1000) {
    cleanupRateLimitMap(now);
  }

  const current = rateLimitMap.get(ip);
  if (!current || now > current.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  return true;
}

// BUG FIX: x-forwarded-for can be a comma-separated chain
// ("client, proxy1, proxy2") — only the first entry is the real client.
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

// ---------------------------------------------------------------------------
// AI gateway
// ---------------------------------------------------------------------------
interface ZeySearchAIResponse {
  summary?: AISummary;
  related_queries?: string[];
  sources_used?: number[];
  confidence_score?: number;
}

const VALID_DATE_FILTERS: DateFilter[] = ["d", "w", "m", "y", "all"];
const VALID_TYPES: SearchType[] = ["all", "news", "discussions"];
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes, per requirement

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    if (!applyRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Coba lagi dalam 1 menit." },
        { status: 429 }
      );
    }

    // BUG FIX: the original called `await req.json()` with no error handling —
    // a malformed body would throw and fall through to a generic 500 instead of
    // a proper 400. Parse defensively and let sanitizeQuery reject a missing/
    // invalid query with a clear reason.
    const body = await req.json().catch(() => null);

    // 1. Query sanitization (anti XSS/SQL)
    const sanitized = sanitizeQuery(body?.query);
    if (sanitized.rejected) {
      return NextResponse.json({ error: sanitized.reason || "Query tidak valid." }, { status: 400 });
    }
    const query = sanitized.clean;

    const dateFilter: DateFilter = VALID_DATE_FILTERS.includes(body?.dateFilter) ? body.dateFilter : "all";
    const type: SearchType = VALID_TYPES.includes(body?.type) ? body.type : "all";

    // 2. Multi-language detection
    const detectedLanguage = detectLanguage(query);
    const region = languageToDuckDuckGoRegion(detectedLanguage.code);

    // 3. Cache check (5 minutes)
    const cacheKey = buildCacheKey({ q: query.toLowerCase(), dateFilter, type });
    const cachedEntry = searchCache.get(cacheKey);
    if (cachedEntry) {
      return NextResponse.json({ ...cachedEntry, cached: true });
    }

    // 4. Web search via DuckDuckGo (date/type/region filters applied)
    const searchResults: SearchResultItem[] = await searchDuckDuckGo(query, {
      dateFilter,
      type,
      region,
    });

    if (searchResults.length === 0) {
      const emptyResponse: SearchResponse = {
        status: "success",
        query,
        detectedLanguage,
        aiSummary: {
          direct_answer: "Tidak dapat menemukan hasil pencarian relevan di web.",
          key_highlights: [],
        },
        relatedQueries: [],
        searchResults: [],
        filters: { dateFilter, type },
        cached: false,
        timestamp: new Date().toISOString(),
      };
      // Deliberately not cached — an empty result is more likely a transient
      // DDG hiccup than a stable answer worth serving stale for 5 minutes.
      return NextResponse.json(emptyResponse);
    }

    const searchContext = searchResults
      .map((r) => `[${r.id}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
      .join("\n\n");

    const gatewayUrl = process.env.ZEY_AI_GATEWAY_URL || "https://zey-ai.vercel.app/api/chat";

    let aiParsedData: ZeySearchAIResponse | null = null;

    try {
      const aiResponse = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.ZEY_AI_API_KEY && {
            Authorization: `Bearer ${process.env.ZEY_AI_API_KEY}`,
          }),
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: ZEY_SEARCH_PROMPT },
            {
              role: "user",
              content: `Query: "${query}"\nBahasa terdeteksi: ${detectedLanguage.name} (${detectedLanguage.code})\n\nRaw Search Context:\n${searchContext}`,
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        // BUG FIX: no timeout in the original — a hanging gateway call could
        // hold the function open until Vercel's own hard timeout kicks in.
        signal: AbortSignal.timeout(15000),
      });

      if (aiResponse.ok) {
        const rawAiData = await aiResponse.json();
        const content = rawAiData.choices?.[0]?.message?.content ?? rawAiData.content ?? rawAiData;
        aiParsedData = typeof content === "string" ? JSON.parse(content) : content;
      }
    } catch (aiError) {
      console.error("AI Gateway Error:", aiError);
      // Falls through to the snippet-based fallback below — a slow/broken AI
      // gateway should degrade search quality, not break the request.
    }

    const responsePayload: SearchResponse = {
      status: "success",
      query,
      detectedLanguage,
      aiSummary: aiParsedData?.summary || {
        direct_answer: searchResults[0]?.snippet || "Hasil pencarian ditemukan.",
        key_highlights: searchResults.slice(0, 3).map((s) => s.title),
      },
      // Related queries suggestion — generated by the same AI call (see
      // `related_queries` in ZEY_SEARCH_PROMPT's output schema), so no extra
      // network round-trip is needed just for suggestions.
      relatedQueries: Array.isArray(aiParsedData?.related_queries)
        ? aiParsedData.related_queries.slice(0, 5)
        : [],
      searchResults,
      filters: { dateFilter, type },
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // 5. Store in cache (5 minutes)
    searchCache.set(cacheKey, responsePayload, CACHE_TTL_MS);

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
