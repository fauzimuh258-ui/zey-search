// lib/sources/github.ts
import { MultiSourceResult } from "./types";

const USER_AGENT = "ZeySearchBot";
const TIMEOUT_MS = 6000;
const MAX_RESULTS = 5;

interface GitHubRepoItem {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
}

interface GitHubSearchResponse {
  items: GitHubRepoItem[];
}

export async function searchGitHub(query: string): Promise<MultiSourceResult[]> {
  const requestUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc`;

  const response = await fetch(requestUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
      // Optional: GitHub's search endpoint is limited to 10 req/min
      // unauthenticated. Set GITHUB_TOKEN to raise that considerably.
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  const data: GitHubSearchResponse = await response.json();

  return (data.items || []).slice(0, MAX_RESULTS).map((item) => ({
    title: item.full_name,
    snippet: item.description || `${item.stargazers_count.toLocaleString()} stars on GitHub`,
    url: item.html_url,
    source: "github" as const,
  }));
}
