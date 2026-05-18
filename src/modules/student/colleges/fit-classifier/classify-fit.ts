// ── 8-Step Academic Fit Classifier ───────────────────────────────────────────
// Implements the deterministic Safety/Match/Reach classification algorithm
// from 04_COLLEGE_FIT_MODULE.md.
//
// EXECUTION RULES:
//   • Steps are strictly sequential
//   • Later steps may DOWNGRADE but NEVER upgrade
//   • This is NOT an admission probability model
//   • Labels are intentionally conservative

import type { CollegeRecord, FitClassification } from "../colleges.types.js";

// ── Buffers (prevent artificial classification cliffs) ────────────────────────
const BUFFER_GPA = 0.05;
const BUFFER_SAT = 20;
const BUFFER_ACT = 1;

type RangeStatus = "above_range" | "within_range" | "below_range";

export interface StudentFitInputs {
  gpa: number | null;
  test_status: "sat" | "act" | "no_test";
  sat_score: number | null;
  act_score: number | null;
  course_rigor: "standard" | "some_advanced" | "heavy_advanced" | "most_rigorous" | null;
  state: string | null;
  readiness_band: string | null;
  intended_major_selectivity: "standard" | "competitive" | "highly_competitive" | null;
  /** Saved-college flag: true = treat as in-state for Step 6; false = treat as out-of-state; null = use profile state vs college only */
  in_state_for_application?: boolean | null;
}

// ── Core FIT_MATRIX: GPA (rows) × Test Score (cols) → Fit ────────────────────
const FIT_MATRIX: Record<RangeStatus, Record<RangeStatus, FitClassification>> = {
  below_range: {
    below_range: "reach",
    within_range: "reach",
    above_range: "reach",
  },
  within_range: {
    below_range: "reach",
    within_range: "match",
    above_range: "match",
  },
  above_range: {
    below_range: "match",
    within_range: "match",
    above_range: "safety",
  },
};

/**
 * Classifies a student's academic fit with a college.
 * Returns 'safety' | 'match' | 'reach'.
 *
 * If student GPA is null, returns null (cannot classify without GPA).
 */
export function classifyAcademicFit(
  student: StudentFitInputs,
  college: CollegeRecord,
): FitClassification | null {
  // Cannot classify without GPA
  if (student.gpa == null) return null;

  // Step 0: Absolute Selectivity Override
  if (college.acceptance_rate != null && college.acceptance_rate < 10) {
    return "reach"; // Sub-10% admit rate → always reach, STOP
  }

  // Step 1: Range classification
  const gpaStatus = classifyGPA(student.gpa, college);
  const testSubmitted = student.test_status !== "no_test";
  let testStatus: RangeStatus = "within_range"; // default neutral

  if (testSubmitted) {
    testStatus =
      student.test_status === "sat"
        ? classifySAT(student.sat_score, college)
        : classifyACT(student.act_score, college);
  }

  // Step 4: Test-optional check (may override matrix entirely)
  const testOptResult = step4_testOptional(college, testSubmitted, gpaStatus);

  // Step 2: Core matrix
  let fit: FitClassification = testOptResult ?? FIT_MATRIX[gpaStatus][testStatus];

  // Step 3: Selectivity overrides
  fit = step3_selectivityOverrides(fit, college, gpaStatus);

  // Step 5: Major selectivity
  fit = step5_majorSelectivity(fit, student.intended_major_selectivity);

  // Step 6: In-state / out-of-state
  fit = step6_inStateAdjustment(fit, college, student.state, student.in_state_for_application);

  // Step 7: Course rigor guardrail
  fit = step7_courseRigorGuardrail(fit, gpaStatus, student.course_rigor);

  // Step 8: Readiness guardrail
  fit = step8_readinessGuardrail(fit, student.readiness_band);

  return fit;
}

// ── Step helpers ──────────────────────────────────────────────────────────────

function classifyGPA(gpa: number, college: CollegeRecord): RangeStatus {
  const p25 = college.gpa_25th;
  const p75 = college.gpa_75th;
  if (p25 == null || p75 == null) return "within_range"; // no data → neutral
  if (gpa >= p75 - BUFFER_GPA) return "above_range";
  if (gpa >= p25 - BUFFER_GPA) return "within_range";
  return "below_range";
}

function classifySAT(score: number | null, college: CollegeRecord): RangeStatus {
  if (score == null) return "within_range";
  const p25 = college.sat_25th;
  const p75 = college.sat_75th;
  if (p25 == null || p75 == null) return "within_range";
  if (score >= p75 - BUFFER_SAT) return "above_range";
  if (score >= p25 - BUFFER_SAT) return "within_range";
  return "below_range";
}

function classifyACT(score: number | null, college: CollegeRecord): RangeStatus {
  if (score == null) return "within_range";
  const p25 = college.act_25th;
  const p75 = college.act_75th;
  if (p25 == null || p75 == null) return "within_range";
  if (score >= p75 - BUFFER_ACT) return "above_range";
  if (score >= p25 - BUFFER_ACT) return "within_range";
  return "below_range";
}

function step3_selectivityOverrides(
  fit: FitClassification,
  college: CollegeRecord,
  gpaStatus: RangeStatus,
): FitClassification {
  const ar = college.acceptance_rate;
  if (ar == null) return fit;

  // Highly selective (10-15%): no safety allowed
  if (ar >= 10 && ar <= 15) {
    if (fit === "safety") return "match";
  }

  // Very high acceptance (>85%): force safety if GPA meets minimum
  if (ar > 85) {
    if (gpaStatus !== "below_range") return "safety";
    return "match";
  }

  return fit;
}

function step4_testOptional(
  college: CollegeRecord,
  testSubmitted: boolean,
  gpaStatus: RangeStatus,
): FitClassification | null {
  if (college.is_test_optional && !testSubmitted) {
    if (gpaStatus === "below_range") return "reach";
    if (gpaStatus === "within_range") return "match";
    if (gpaStatus === "above_range") return "safety";
  }
  return null;
}

function step5_majorSelectivity(
  fit: FitClassification,
  selectivity: string | null | undefined,
): FitClassification {
  if (!selectivity || selectivity === "standard") return fit;

  if (selectivity === "competitive") {
    return downgradeFit(fit);
  }

  if (selectivity === "highly_competitive") {
    const downgraded = downgradeFit(fit);
    return downgraded === "safety" ? "match" : downgraded;
  }

  return fit;
}

function step6_inStateAdjustment(
  fit: FitClassification,
  college: CollegeRecord,
  studentState: string | null,
  inStateForApplication: boolean | null | undefined,
): FitClassification {
  let shouldDowngrade: boolean;

  if (inStateForApplication === true) {
    shouldDowngrade = false;
  } else if (inStateForApplication === false) {
    shouldDowngrade = Boolean(
      college.is_public &&
        college.state &&
        college.acceptance_rate != null &&
        college.acceptance_rate < 40,
    );
  } else {
    shouldDowngrade = Boolean(
      college.is_public &&
        studentState &&
        college.state &&
        studentState.toLowerCase() !== college.state.toLowerCase() &&
        college.acceptance_rate != null &&
        college.acceptance_rate < 40,
    );
  }

  if (shouldDowngrade) {
    return downgradeFit(fit);
  }
  return fit;
}

function step7_courseRigorGuardrail(
  fit: FitClassification,
  gpaStatus: RangeStatus,
  studentRigor: string | null,
): FitClassification {
  // If rigor is standard and GPA is within/above range → cap at match
  if (
    (gpaStatus === "within_range" || gpaStatus === "above_range") &&
    studentRigor === "standard"
  ) {
    if (fit === "safety") return "match";
  }
  return fit;
}

function step8_readinessGuardrail(
  fit: FitClassification,
  readinessBand: string | null,
): FitClassification {
  if (readinessBand === "foundational") {
    if (fit === "safety" || fit === "match") return "reach";
  }
  if (readinessBand === "developing") {
    if (fit === "safety") return "match";
  }
  return fit;
}

function downgradeFit(fit: FitClassification): FitClassification {
  if (fit === "safety") return "match";
  if (fit === "match") return "reach";
  return "reach";
}
