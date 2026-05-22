import type { ServiceEntryRecord } from "./service.types.js";

const HOURS_NORM: Record<ServiceEntryRecord["total_hours_range"], number> = {
  under_50: 0.25,
  "50_100": 0.50,
  "100_200": 0.75,
  "200_plus": 1.00,
};

const ACTION_BONUS: Record<ServiceEntryRecord["action_type"], number> = {
  direct_service: 0.00,
  fundraising: 0.05,
  teaching: 0.08,
  organizing: 0.10,
  independent: 0.12,
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

  const bestNorm = Math.max(...entries.map(calcEntryNorm));
  const breadthBonus = Math.min((entries.length - 1) * 0.05, 0.10);
  const service_norm = Math.min(bestNorm + breadthBonus, 1);

  return {
    service_norm,
    service_contrib: service_norm * 10,
    service_band: bandForNorm(service_norm),
  };
}

function calcEntryNorm(entry: ServiceEntryRecord): number {
  const leadershipBonus = entry.is_leadership ? 0.12 : 0;
  const durationBonus = entry.duration_months == null
    ? 0
    : Math.min(entry.duration_months / 24, 1) * 0.08;

  return Math.min(
    HOURS_NORM[entry.total_hours_range] +
      ACTION_BONUS[entry.action_type] +
      leadershipBonus +
      durationBonus,
    1,
  );
}

function bandForNorm(norm: number): ReadinessBand {
  if (norm >= 0.90) return "exceptional";
  if (norm >= 0.75) return "strongly_competitive";
  if (norm >= 0.60) return "competitive";
  if (norm >= 0.35) return "developing";
  return "foundational";
}
