// ── College Logo Utility ─────────────────────────────────────────────────────
// Extracts a clean domain from a raw school URL and builds a Clearbit logo URL.
// Handles edge cases: missing protocol, trailing slashes, paths, query params.

const FALLBACK_LOGO = "https://logo.clearbit.com/college.edu";

/**
 * Extracts the root domain from a raw URL string.
 *
 * Examples:
 *   "www.stanford.edu"           → "stanford.edu"
 *   "https://mit.edu/"           → "mit.edu"
 *   "http://www.harvard.edu/abc" → "harvard.edu"
 *   ""                           → null
 *   null                         → null
 *
 * @returns clean domain string or null if input is unusable
 */
export function extractDomain(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || rawUrl.trim().length === 0) return null;

  let cleaned = rawUrl.trim();

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  // Remove path, query, hash
  cleaned = cleaned.split("/")[0]!;
  cleaned = cleaned.split("?")[0]!;
  cleaned = cleaned.split("#")[0]!;

  // Remove www. prefix
  cleaned = cleaned.replace(/^www\./i, "");

  // Remove port number
  cleaned = cleaned.replace(/:\d+$/, "");

  // Basic domain validation: must contain at least one dot
  if (!cleaned.includes(".") || cleaned.length < 3) return null;

  return cleaned.toLowerCase();
}

/**
 * Builds a Clearbit logo URL from a domain.
 * Returns a fallback logo URL if domain is null/invalid.
 */
export function buildLogoUrl(domain: string | null): string {
  if (!domain) return FALLBACK_LOGO;
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}`;
}
