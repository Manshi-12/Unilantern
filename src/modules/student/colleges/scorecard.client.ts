// ── College Scorecard API Client ─────────────────────────────────────────────
// Fetches college data from the US Department of Education College Scorecard API.
// Docs: https://collegescorecard.ed.gov/data/documentation/
// Uses native fetch (Node 18+) — no axios dependency.
// Rate limit: ~100 req/min with API key (enforced by caller).
// We intentionally limit to 5 results per request to avoid quota burn in dev.

import { extractDomain, buildLogoUrl } from "./college-logo.util.js";

const SCORECARD_BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

/** Fields we request from the Scorecard API — keeps response payload small. */
const SCORECARD_FIELDS = [
  "id",
  "school.name",
  "school.school_url",
  "school.state",
  "school.ownership",                      // 1=public, 2=private-nonprofit, 3=private-forprofit
  "school.region_id",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.test_requirements",    // 1=required, 3=not-required
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
].join(",");

/** Shape of a single result from the Scorecard API (after field filtering). */
interface ScorecardSchool {
  "id": number;
  "school.name": string;
  "school.school_url": string | null;
  "school.state": string | null;
  "school.ownership": number | null;
  "school.region_id": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.admissions.test_requirements": number | null;
  "latest.admissions.sat_scores.25th_percentile.critical_reading": number | null;
  "latest.admissions.sat_scores.75th_percentile.critical_reading": number | null;
  "latest.admissions.act_scores.25th_percentile.cumulative": number | null;
  "latest.admissions.act_scores.75th_percentile.cumulative": number | null;
}

/** Clean, transformed college object ready for DB insertion. */
export interface TransformedCollege {
  name: string;
  website: string | null;
  logo: string | null;
  state: string | null;
  is_public: boolean | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  sat_25th: number | null;
  sat_75th: number | null;
  act_25th: number | null;
  act_75th: number | null;
}

/**
 * Fetches a small batch of colleges from the College Scorecard API.
 *
 * @param apiKey  - data.gov API key (required)
 * @param query   - optional school name search string
 * @param perPage - number of results (default 5, max 20)
 * @returns Transformed college array
 */
export async function fetchCollegesFromScorecard(
  apiKey: string,
  query?: string,
  perPage = 5,
): Promise<TransformedCollege[]> {
  const safePerPage = Math.min(Math.max(perPage, 1), 20);

  const url = new URL(SCORECARD_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("fields", SCORECARD_FIELDS);
  url.searchParams.set("per_page", String(safePerPage));
  url.searchParams.set("sort", "latest.admissions.admission_rate.overall:asc");

  if (query && query.trim().length > 0) {
    url.searchParams.set("school.name", query.trim());
  }

  // AbortController for 10s hard timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });

    // 429 = rate-limited by data.gov
    if (response.status === 429) {
      console.error("[ScorecardAPI] Rate-limited by data.gov. Back off and retry later.");
      throw new Error("SCORECARD_RATE_LIMITED");
    }

    // 403 = bad API key
    if (response.status === 403) {
      console.error("[ScorecardAPI] Invalid API key.");
      throw new Error("SCORECARD_AUTH_FAILED");
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[ScorecardAPI] HTTP ${response.status}: ${body.slice(0, 200)}`);
      throw new Error(`SCORECARD_HTTP_${response.status}`);
    }

    const data = (await response.json()) as { results?: ScorecardSchool[] };
    const results = data?.results ?? [];
    return results.map(transformScorecardResult);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("[ScorecardAPI] Request timed out after 10s.");
      throw new Error("SCORECARD_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Internal transform ──────────────────────────────────────────────────────

function transformScorecardResult(school: ScorecardSchool): TransformedCollege {
  const rawUrl = school["school.school_url"] ?? null;
  const domain = rawUrl ? extractDomain(rawUrl) : null;
  const admissionRate = school["latest.admissions.admission_rate.overall"];
  const ownership = school["school.ownership"];

  // test_requirements: 1 = required, 3 = neither required nor recommended
  const testReq = school["latest.admissions.test_requirements"];

  return {
    name: school["school.name"],
    website: rawUrl ? cleanUrl(rawUrl) : null,
    logo: domain ? buildLogoUrl(domain) : null,
    state: school["school.state"] ?? null,
    is_public: ownership != null ? ownership === 1 : null,
    acceptance_rate: admissionRate != null
      ? Math.round(admissionRate * 10000) / 100  // 0.1234 → 12.34
      : null,
    is_test_optional: testReq === 3,
    sat_25th: school["latest.admissions.sat_scores.25th_percentile.critical_reading"] ?? null,
    sat_75th: school["latest.admissions.sat_scores.75th_percentile.critical_reading"] ?? null,
    act_25th: school["latest.admissions.act_scores.25th_percentile.cumulative"] ?? null,
    act_75th: school["latest.admissions.act_scores.75th_percentile.cumulative"] ?? null,
  };
}

/**
 * Cleans a raw URL from the API (may lack protocol, have trailing slashes, etc).
 */
function cleanUrl(raw: string): string {
  let url = raw.trim();
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Remove trailing slash
  return url.replace(/\/+$/, "");
}
