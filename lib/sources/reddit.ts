// lib/sources/reddit.ts
// NOTE: Reddit's .json endpoints rate-limit aggressively, especially from
// datacenter/cloud IPs (which is what Vercel serverless functions look like).
// A descriptive User-Agent matters more here than on most APIs.
import { MultiSourceResult } from "./types";

// Not specified in the request — reusing the "ZeySearchBot" identity given for
// GitHub, since Reddit specifically wants a descriptive, consistent UA.
const USER_AGENT = "ZeySearchBot/1.0";
const TIMEOUT_MS = 6000;
const MAX_RESULTS = 5;

interface RedditChild {
  data: {
    title: string;
    selftext: string;
    permalink: string;
    subreddit_name_prefixed?: string;
  };
}

interface RedditSearchResponse {
  data: {
    children: RedditChild[];
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export async function searchReddit(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`;

  const response = await fetch(requestUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Reddit request failed with status ${response.status}`);
  }

  const data: RedditSearchResponse = await response.json();
  const children = data?.data?.children || [];

  return children.slice(0, MAX_RESULTS).map(({ data: post }) => ({
    title: post.title,
    snippet: post.selftext ? truncate(post.selftext, 200) : post.subreddit_name_prefixed || "Reddit discussion",
    url: `https://www.reddit.com${post.permalink}`,
    source: "reddit" as const,
  }));
}
