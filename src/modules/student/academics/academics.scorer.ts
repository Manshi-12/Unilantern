/**
 * Pure academic scoring functions.
 * Source: 01_ACADEMIC_MODULE.md §3.1–3.4
 * NEVER expose any output from this module in external API responses.
 */

import type { CourseRigor } from "./dto/request.dto.js";

// §3.1 — GPA Normalization
const GPA_MIN = 2.5;
const GPA_MAX = 4.0;

function calcGpaNorm(gpa: number): number {
  return Math.max(0, Math.min(1, (gpa - GPA_MIN) / (GPA_MAX - GPA_MIN)));
}

// §3.2 — Course Rigor
const RIGOR_NORM_RAW: Record<CourseRigor, number> = {
  standard:        0.25,
  some_advanced:   0.50,
  heavy_advanced:  0.75,
  most_rigorous:   1.00,
};

const RIGOR_CAP_BY_GRADE: Record<number, number> = {
  9:  0.75,
  10: 0.85,
  11: 1.00,
  12: 1.00,
};

function calcRigorNorm(courseRigor: CourseRigor, grade: number): number {
  const raw = RIGOR_NORM_RAW[courseRigor] ?? 0;
  const cap = RIGOR_CAP_BY_GRADE[grade] ?? 1.00;
  return Math.min(raw, cap);
}

// §3.3 — SAT/ACT nonlinear norm mapping
function satToNorm(sat: number): number {
  if (sat < 1000) return 0.40;
  if (sat < 1100) return 0.55;
  if (sat < 1250) return 0.70;
  if (sat < 1400) return 0.85;
  return 1.00;
}

function actToNorm(act: number): number {
  if (act < 20) return 0.40;
  if (act < 22) return 0.55;
  if (act < 26) return 0.70;
  if (act < 31) return 0.85;
  return 1.00;
}

// §3.3 — Grade fairness defaults when no test submitted
const MISSING_TEST_NORM_BY_GRADE: Record<number, number> = {
  9:  0.60,
  10: 0.55,
  11: 0.50,
  12: 0.45,
};

function calcTestNorm(
  satScore: number | null,
  actScore: number | null,
  grade: number,
): number {
  if (satScore !== null) return satToNorm(satScore);
  if (actScore !== null) return actToNorm(actScore);
  // No test score provided — use grade-based fairness default
  return MISSING_TEST_NORM_BY_GRADE[grade] ?? 0.50;
}

// §3.4 — Viability gate threshold
const VIABILITY_GATE_NORM = 0.55;
const ACADEMICS_FULL_CAP  = 50;
const ACADEMICS_GATE_CAP  = 40;

export interface AcademicsScores {
  gpa_norm:             number;
  rigor_norm:           number;
  test_norm:            number;
  test_present:         boolean;
  gpa_contrib:          number;
  rigor_contrib:        number;
  test_contrib:         number;
  academics_contrib:    number;
  academics_cap_applied: boolean;
}

/**
 * Calculate all academic sub-scores for a student.
 * All inputs must be non-null — caller must guard before invoking.
 */
export function calcAcademicsScores(
  unweightedGpa: number,
  courseRigor:   CourseRigor,
  satScore:      number | null,
  actScore:      number | null,
  grade:         number,
): AcademicsScores {
  const gpa_norm   = calcGpaNorm(unweightedGpa);
  const rigor_norm = calcRigorNorm(courseRigor, grade);

  const test_present = satScore !== null || actScore !== null;
  const test_norm    = calcTestNorm(satScore, actScore, grade);

  const gpa_contrib   = 28 * gpa_norm;
  const rigor_contrib = 12 * rigor_norm;
  const test_contrib  = 10 * test_norm;

  // §3.4 — viability gate fires when a test IS present but the score is weak
  const academics_cap_applied = test_present && test_norm <= VIABILITY_GATE_NORM;
  const cap = academics_cap_applied ? ACADEMICS_GATE_CAP : ACADEMICS_FULL_CAP;

  const academics_contrib = Math.min(
    gpa_contrib + rigor_contrib + test_contrib,
    cap,
  );

  return {
    gpa_norm,
    rigor_norm,
    test_norm,
    test_present,
    gpa_contrib,
    rigor_contrib,
    test_contrib,
    academics_contrib,
    academics_cap_applied,
  };
}
