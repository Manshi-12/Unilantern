import type { ExtracurricularRecord } from "./extracurriculars.types.js";

// Proposal §4.6: 10 diminishing weights for depth (activities 1–10)
const DEPTH_WEIGHTS = [1.00, 0.85, 0.70, 0.55, 0.45, 0.35, 0.28, 0.22, 0.18, 0.15];
const EC_RAW_MAX = 10;
const EC_CONTRIB_MAX = 25;

// Proposal §4.5: Normalized values for activity sub-components
const YEARS_NORMS: Record<ExtracurricularRecord["years_involved"], number> = {
  less_than_1: 0.25,
  "1": 0.50,
  "2": 0.75,
  "3": 0.90,
  "4_plus": 1.00,
};

const INVOLVEMENT_NORMS: Record<ExtracurricularRecord["involvement_level"], number> = {
  explored: 0.25,
  consistent: 0.60,
  key_contributor: 0.85,
  leader_founder: 1.00,
};

const IMPACT_NORMS: Record<ExtracurricularRecord["impact_level"], number> = {
  participation_only: 0.20,
  contributed: 0.55,
  measurable: 0.80,
  created_scaled: 1.00,
};

const HOURS_NORMS: Record<ExtracurricularRecord["hours_per_week"], number> = {
  under_2: 0.20,
  "2_to_5": 0.45,
  "6_to_10": 0.70,
  "11_to_20": 0.90,
  "20_plus": 1.00,
};

export interface ExtracurricularScores {
  ec_norm: number;
  ec_contrib: number;
  ec_early_strength_bonus: number;
  ec_band: ReadinessBand;
  has_founder_ec: boolean;
  has_independent_impact: boolean;
}

type ReadinessBand =
  | "foundational"
  | "developing"
  | "competitive"
  | "strongly_competitive"
  | "exceptional";

export function calcExtracurricularScores(
  activities: ExtracurricularRecord[],
  grade: number | null,
): ExtracurricularScores {
  if (activities.length === 0) {
    return {
      ec_norm: 0,
      ec_contrib: 0,
      ec_early_strength_bonus: 0,
      ec_band: "foundational",
      has_founder_ec: false,
      has_independent_impact: false,
    };
  }

  const hasFounderEc = activities.some((activity) => activity.involvement_level === "leader_founder");
  const hasIndependentImpact = activities.some(hasRealWorldImpact);
  const strongestImpactCap = Math.max(...activities.map(calcImpactGuardrailCap));

  const depthRaw = activities
    .map(calcActivityRaw)
    .sort((a, b) => b - a)
    .slice(0, DEPTH_WEIGHTS.length)
    .reduce((sum, raw, index) => sum + raw * DEPTH_WEIGHTS[index], 0);

  const leadershipBonus = calcGradeLeadershipBonus(activities, grade);
  const rawNorm = Math.min((depthRaw + leadershipBonus) / EC_RAW_MAX, 1);
  const guardedNorm = Math.min(rawNorm, strongestImpactCap);
  const earlyStrengthBonus = calcEarlyStrengthBonus(guardedNorm, grade, hasFounderEc, hasIndependentImpact);
  const ec_norm = Math.min(guardedNorm + earlyStrengthBonus, 1);
  const ec_contrib = ec_norm * EC_CONTRIB_MAX;

  return {
    ec_norm,
    ec_contrib,
    ec_early_strength_bonus: earlyStrengthBonus,
    ec_band: bandForNorm(ec_norm),
    has_founder_ec: hasFounderEc,
    has_independent_impact: hasIndependentImpact,
  };
}

function calcActivityRaw(activity: ExtracurricularRecord): number {
  // Proposal §4.5: Weighted formula with explicit sub-component norms
  const yearsNorm = YEARS_NORMS[activity.years_involved];
  const involvementNorm = INVOLVEMENT_NORMS[activity.involvement_level];
  const hoursNorm = HOURS_NORMS[activity.hours_per_week];
  const impactNorm = IMPACT_NORMS[activity.impact_level];

  // Base activity score: 0.30 × years + 0.30 × involvement + 0.20 × hours + 0.20 × impact
  let activityScore = 
    0.30 * yearsNorm + 
    0.30 * involvementNorm + 
    0.20 * hoursNorm + 
    0.20 * impactNorm;

  // Signal bonus: each toggle adds 0.02, capped at 0.15
  const signalBonus = [
    activity.selective_acceptance_toggle,
    activity.external_org_toggle,
    activity.travel_or_residency_toggle,
    activity.competition_top_10_pct_toggle,
    activity.finalist_or_winner_toggle,
    activity.publication_or_presented_toggle,
    activity.policy_or_partnership_toggle,
    activity.structured_deliverable_toggle,
    activity.language_or_skill_cert_toggle,
    activity.formal_selection_toggle,
    activity.documented_real_world_output,
  ].filter(Boolean).length * 0.02;

  // Real-world metrics bonus: each scaled to max 0.35, capped overall at 0.15
  const metricBonus = Math.min(
    scaledMetric(activity.people_impacted, 500) +
    scaledMetric(activity.funds_raised, 5000) +
    scaledMetric(activity.users_acquired, 1000) +
    scaledMetric(activity.hours_delivered, 200),
    0.15
  );

  return Math.min(activityScore + Math.min(signalBonus, 0.15) + metricBonus, 1);
}

function calcImpactGuardrailCap(activity: ExtracurricularRecord): number {
  if (activity.impact_level === "created_scaled" || hasRealWorldImpact(activity)) return 1;
  if (activity.impact_level === "measurable") return 0.85;
  if (activity.impact_level === "contributed" || activity.documented_real_world_output) return 0.75;
  return 0.45;
}

function hasRealWorldImpact(activity: ExtracurricularRecord): boolean {
  return (
    activity.people_impacted > 0 ||
    activity.funds_raised > 0 ||
    activity.users_acquired > 0 ||
    activity.hours_delivered > 0 ||
    activity.policy_or_partnership_toggle ||
    activity.publication_or_presented_toggle ||
    activity.structured_deliverable_toggle ||
    activity.documented_real_world_output
  );
}

function calcGradeLeadershipBonus(
  activities: ExtracurricularRecord[],
  grade: number | null,
): number {
  if (!grade) return 0;
  const leaders = activities.filter((activity) => activity.involvement_level === "leader_founder").length;
  if (leaders === 0) return 0;

  if (grade === 9) return Math.min(leaders * 0.35, 0.70);
  if (grade === 10) return Math.min(leaders * 0.30, 0.60);
  if (grade === 11) return Math.min(leaders * 0.20, 0.40);
  return Math.min(leaders * 0.15, 0.30);
}

function calcEarlyStrengthBonus(
  norm: number,
  grade: number | null,
  hasFounderEc: boolean,
  hasIndependentImpact: boolean,
): number {
  if (grade !== 9 || norm < 0.65) return 0;
  if (hasFounderEc && hasIndependentImpact) return 0.06;
  if (hasFounderEc || hasIndependentImpact) return 0.03;
  return 0;
}

function scaledMetric(value: number, strongValue: number): number {
  if (value <= 0) return 0;
  return Math.min(value / strongValue, 1) * 0.35;
}

function bandForNorm(norm: number): ReadinessBand {
  if (norm >= 0.90) return "exceptional";
  if (norm >= 0.75) return "strongly_competitive";
  if (norm >= 0.60) return "competitive";
  if (norm >= 0.35) return "developing";
  return "foundational";
}
