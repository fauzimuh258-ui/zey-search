// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { multiSourceSearch, ScoredResult } from "@/lib/sources";
import { ZEY_SEARCH_PROMPT } from "@/lib/system-prompt";
import { sanitizeQuery } from "@/lib/sanitize";
import { applyRateLimit, getClientIp } from "@/lib/rate-limit";

interface AIOverview {
  direct_answer: string;
  key_highlights: string[];
}

function buildAIContext(sources: ScoredResult[]): string {
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] Source: ${s.source} | Title: ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
    )
    .join("\n\n");
}

// Requirement: "Hanya rangkum hasil yang SUDAH difilter relevan, maksimum 3
// sumber teratas" — `sources` here is always `overviewSources` from
// multiSourceSearch(), which is already relevance-filtered and capped at 3
// before it ever reaches this function.
async function getAIOverview(query: string, sources: ScoredResult[]): Promise<AIOverview | null> {
  if (sources.length === 0) return null;

  const gatewayUrl = process.env.ZEY_AI_GATEWAY_URL || "https://zey-ai.vercel.app/api/chat";

  try {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ZEY_AI_API_KEY && { Authorization: `Bearer ${process.env.ZEY_AI_API_KEY}` }),
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: ZEY_SEARCH_PROMPT },
          {
            role: "user",
            content: `Query: "${query}"\n\nRaw Search Context (sudah difilter relevansinya, skor >= 0.3):\n${buildAIContext(sources)}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const rawData = await response.json();
    const content = rawData.choices?.[0]?.message?.content ?? rawData.content ?? rawData;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    return parsed?.summary ?? null;
  } catch (error) {
    console.error("AI Overview Error:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    if (!applyRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Coba lagi dalam 1 menit." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const sanitized = sanitizeQuery(body?.query);
    if (sanitized.rejected) {
      return NextResponse.json({ error: sanitized.reason || "Query tidak valid." }, { status: 400 });
    }

    const query = sanitized.clean;
    const { results, overviewSources, usedFallback } = await multiSourceSearch(query);
    const aiOverview = await getAIOverview(query, overviewSources);

    return NextResponse.json({
      status: "success",
      query,
      results,
      aiOverview,
      usedFallback,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
  }
