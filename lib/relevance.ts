// lib/relevance.ts
// Relevance scoring for search results — mandatory filter so an off-topic
// result (wrong Wikipedia article, unrelated repo, etc.) never reaches the
// user or the AI Overview.
//
// Score = title field score (max 0.5) + snippet field score (max 0.3)
//       + source trust bonus (max 0.2), for a 0-1 total. Below
// RELEVANCE_THRESHOLD, a result is discarded outright.
//
// Each field score is the BETTER of keyword-match-ratio and cosine
// similarity, not one technique per field. Reason: Indonesian Wikipedia
// titles for English CS/ML terms are often pure translations ("Jaringan
// saraf tiruan" for "neural network") with zero literal word overlap against
// an English-language query — keyword matching alone would score a genuinely
// relevant title at 0. Taking the max of both signals means a snippet (or,
// less often, a title) that literally repeats the query's terms scores well
// via keyword matching, while translated/paraphrased content can still pick
// up a partial score via cosine similarity if there's ANY shared vocabulary
// (e.g. a shared English loanword mentioned in the snippet).
import { MultiSourceResult, SourceName } from "./sources/types";

export const RELEVANCE_THRESHOLD = 0.3;

export interface ScoredResult extends MultiSourceResult {
  relevanceScore: number;
}

// Curated APIs (Wikipedia, GitHub) are structured and moderated; scraped
// search engines (Bing, Yandex) mirror whatever the open web ranks, including
// off-topic pages. Reddit kept here for when it's added back to the source list.
const SOURCE_TRUST: Record<SourceName, number> = {
  wikipedia: 0.2,
  github: 0.2,
  bing: 0.1,
  yandex: 0.1,
  reddit: 0.05,
};

const STOPWORDS = new Set([
  // Indonesian
  "apa", "itu", "adalah", "yang", "dan", "di", "ke", "dari", "untuk", "dengan",
  "ini", "akan", "sudah", "belum", "bagaimana", "kenapa", "siapa", "saya",
  "kamu", "cara", "tidak", "juga", "atau", "pada", "dalam", "oleh",
  // English
  "what", "is", "are", "the", "a", "an", "of", "in", "to", "for", "how", "why",
  "who", "does", "do", "this", "that", "on", "and", "or", "with",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function termFrequencyVector(words: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const word of words) {
    vector.set(word, (vector.get(word) || 0) + 1);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  for (const [term, freqA] of a) {
    const freqB = b.get(term);
    if (freqB) dotProduct += freqA * freqB;
  }

  const magnitude = (v: Map<string, number>) =>
    Math.sqrt([...v.values()].reduce((sum, freq) => sum + freq * freq, 0));

  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

function keywordMatchRatio(queryWords: string[], targetWords: string[]): number {
  if (queryWords.length === 0) return 0;
  const targetSet = new Set(targetWords);
  const matched = queryWords.filter((w) => targetSet.has(w)).length;
  return matched / queryWords.length;
}

function fieldScore(queryWords: string[], targetText: string): number {
  const targetWords = tokenize(targetText);
  const keywordScore = keywordMatchRatio(queryWords, targetWords);
  const cosineScore = cosineSimilarity(termFrequencyVector(queryWords), termFrequencyVector(targetWords));
  return Math.max(keywordScore, cosineScore);
}

export function scoreRelevance(query: string, result: MultiSourceResult): number {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return 0;

  const titleScore = 0.5 * fieldScore(queryWords, result.title);
  const snippetScore = 0.3 * fieldScore(queryWords, result.snippet);
  const trustScore = SOURCE_TRUST[result.source] ?? 0;

  const total = titleScore + snippetScore + trustScore;
  return Math.round(Math.min(total, 1) * 100) / 100;
}

export function filterAndRankByRelevance(
  query: string,
  results: MultiSourceResult[],
  threshold: number = RELEVANCE_THRESHOLD
): ScoredResult[] {
  return results
    .map((result) => ({ ...result, relevanceScore: scoreRelevance(query, result) }))
    .filter((result) => result.relevanceScore >= threshold)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
