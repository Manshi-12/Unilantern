import type { ServiceEntryRecord } from "./service.types.js";

const HOURS_NORM: Record<ServiceEntryRecord["total_hours_range"], number> = {
  under_50: 0.40,
  "50_100": 0.65,
  "100_200": 0.85,
  "200_plus": 1.00,
};

const ACTION_BONUS: Record<ServiceEntryRecord["action_type"], number> = {
  direct_service: 0.60,
  fundraising: 0.70,
  teaching: 0.80,
  organizing: 0.85,
  independent: 1.00
};

export interface ServiceScores {
  service_norm: number;
  service_contrib: number;
  service_band: ReadinessBand;
}

type ReadinessBand =
  | "foundational"
  | "developing"
  | "competitive"
  | "strongly_competitive"
  | "exceptional";

export function calcServiceScores(entries: ServiceEntryRecord[]): ServiceScores {
  if (entries.length === 0) {
    return { service_norm: 0, service_contrib: 0, service_band: "foundational" };
  }

  // Proposal §7: Compute action_norm for each entry
  const actionNorms = entries.map((e) => 
    HOURS_NORM[e.total_hours_range] + ACTION_BONUS[e.action_type]
  );
  
  // Sort by action norm descending, take top 2 (or fewer if less than 2 entries)
  const topActionNorms = actionNorms
    .sort((a, b) => b - a)
    .slice(0, Math.min(2, entries.length));
  
  // Average of top 2 (or just the single entry if only 1 exists)
  const actionNormFinal = topActionNorms.length > 0 
    ? topActionNorms.reduce((a, b) => a + b, 0) / topActionNorms.length
    : 0;
  
  // Hours norm: average of all entries
  const hoursNormAvg = entries.length > 0
    ? entries.reduce((sum, e) => sum + HOURS_NORM[e.total_hours_range], 0) / entries.length
    : 0;
  
  // Proposal formula: service_norm_raw = 0.65 * hours_norm + 0.35 * action_norm_final
  const serviceNormRaw = 0.65 * hoursNormAvg + 0.35 * actionNormFinal;
  const service_norm = Math.min(serviceNormRaw, 1);

  return {
    service_norm,
    service_contrib: service_norm * 5,
    service_band: bandForNorm(service_norm),
  };
}

function bandForNorm(norm: number): ReadinessBand {
  if (norm >= 0.90) return "exceptional";
  if (norm >= 0.75) return "strongly_competitive";
  if (norm >= 0.60) return "competitive";
  if (norm >= 0.45) return "developing";
  return "foundational";
}
