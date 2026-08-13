// lib/sanitize.ts
// Query sanitization: strips XSS vectors and neutralizes SQL-injection *shapes*.
// There's no SQL database in this app yet, so instead of blacklisting individual
// keywords (SELECT/UPDATE/DELETE are common English words too — that would break
// real queries like "how to update npm"), we only strip patterns that actually
// look like injection payloads.

const MAX_QUERY_LENGTH = 300;

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/gi;
const JS_PROTOCOL_PATTERN = /javascript:/gi;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=\s*["'][^"']*["']/gi;

// SQL-injection-shaped patterns (not plain keywords) — defense-in-depth in case
// a query builder is added later.
const SQL_INJECTION_SHAPES: RegExp[] = [
  /('|")\s*(OR|AND)\s*('|")?\s*\d+\s*=\s*\d+/gi, // ' OR '1'='1
  /;\s*(DROP|DELETE|TRUNCATE)\s+TABLE\b/gi, // ; DROP TABLE users
  /\bUNION(\s+ALL)?\s+SELECT\b/gi, // UNION SELECT ...
  /--\s*$/g, // trailing SQL comment
  /\/\*[\s\S]*?\*\//g, // /* ... */ comment block
];

export interface SanitizeResult {
  clean: string;
  wasModified: boolean;
  rejected: boolean;
  reason?: string;
}

export function sanitizeQuery(raw: unknown): SanitizeResult {
  if (typeof raw !== "string") {
    return { clean: "", wasModified: false, rejected: true, reason: "Query must be a string." };
  }

  const original = raw;
  let clean = raw.normalize("NFKC").replace(CONTROL_CHAR_PATTERN, "").trim();

  if (clean.length === 0) {
    return { clean: "", wasModified: false, rejected: true, reason: "Query cannot be empty." };
  }

  if (clean.length > MAX_QUERY_LENGTH) {
    clean = clean.slice(0, MAX_QUERY_LENGTH).trim();
  }

  clean = clean
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(JS_PROTOCOL_PATTERN, "")
    .replace(HTML_TAG_PATTERN, "");

  for (const pattern of SQL_INJECTION_SHAPES) {
    clean = clean.replace(pattern, "");
  }

  clean = clean.replace(/\s+/g, " ").trim();

  if (clean.length === 0) {
    return { clean: "", wasModified: true, rejected: true, reason: "Query contains a disallowed pattern." };
  }

  return {
    clean,
    wasModified: clean !== original,
    rejected: false,
  };
}

// For the rare case raw text needs to be inlined into raw HTML (e.g. a custom
// meta tag). React already escapes everything it renders by default.
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
