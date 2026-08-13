// lib/language-detect.ts
// Lightweight, dependency-free language detection based on stopword frequency.
// Good enough to pick a DuckDuckGo region and tell the AI which language to
// reply in — not a linguistically rigorous classifier. Swap in a package like
// `franc` later if broader/more accurate coverage is needed.

interface LanguageProfile {
  code: string;
  name: string;
  stopwords: string[];
}

const LANGUAGE_PROFILES: LanguageProfile[] = [
  {
    code: "id",
    name: "Indonesian",
    stopwords: ["yang", "dan", "di", "ke", "dari", "untuk", "dengan", "adalah", "ini", "itu", "tidak", "apa", "bagaimana", "kenapa", "siapa", "saya", "kamu", "akan", "sudah", "belum", "cara"],
  },
  {
    code: "en",
    name: "English",
    stopwords: ["the", "and", "is", "of", "to", "in", "for", "with", "what", "how", "why", "who", "are", "was", "does", "do", "this", "that", "on", "an"],
  },
  {
    code: "es",
    name: "Spanish",
    stopwords: ["el", "la", "de", "que", "y", "en", "es", "para", "con", "por", "como", "qué", "quién", "cómo", "los", "las"],
  },
  {
    code: "fr",
    name: "French",
    stopwords: ["le", "la", "de", "et", "est", "pour", "avec", "que", "comment", "pourquoi", "qui", "les", "des", "un", "une"],
  },
  {
    code: "ar",
    name: "Arabic",
    stopwords: ["من", "في", "على", "الى", "ما", "هل", "كيف", "لماذا", "هذا", "هذه"],
  },
  {
    code: "ms",
    name: "Malay",
    stopwords: ["yang", "dan", "di", "untuk", "dengan", "adalah", "tidak", "apa", "bagaimana", "kenapa", "siapa", "saya", "awak"],
  },
];

export interface LanguageDetectionResult {
  code: string;
  name: string;
  confidence: number;
}

export function detectLanguage(text: string): LanguageDetectionResult {
  const normalized = text.toLowerCase();
  const words = normalized.match(/[\p{L}\p{M}]+/gu) || [];

  if (words.length === 0) {
    return { code: "unknown", name: "Unknown", confidence: 0 };
  }

  const wordSet = new Set(words);
  let best: LanguageDetectionResult = { code: "unknown", name: "Unknown", confidence: 0 };

  for (const profile of LANGUAGE_PROFILES) {
    const hits = profile.stopwords.filter((sw) => wordSet.has(sw)).length;
    const confidence = hits / Math.max(words.length, 1);

    if (hits > 0 && confidence > best.confidence) {
      best = { code: profile.code, name: profile.name, confidence: Math.min(confidence * 2, 1) };
    }
  }

  // Fallback: default to English if no stopword overlap was found at all.
  if (best.code === "unknown") {
    return { code: "en", name: "English", confidence: 0.3 };
  }

  return best;
}

// Maps a detected language code to a DuckDuckGo region param (`kl=`).
export function languageToDuckDuckGoRegion(code: string): string {
  const map: Record<string, string> = {
    id: "id-id",
    en: "us-en",
    es: "es-es",
    fr: "fr-fr",
    ar: "ar-sa",
    ms: "my-en",
  };
  return map[code] || "wt-wt"; // wt-wt = no region / global
}
