import { sql, getPool } from "../../../db/client.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import { STUDENT_ACADEMICS_TABLE } from "../../../db/schema/student-academics.js";
import { STUDENT_ESSAYS_TABLE } from "../../../db/schema/student-essays.js";
import { HONORS_AWARDS_TABLE } from "../../../db/schema/honors-awards.js";
import { EXTRACURRICULAR_ACTIVITIES_TABLE } from "../../../db/schema/extracurricular-activities.js";
import { COMMUNITY_SERVICE_ENTRIES_TABLE } from "../../../db/schema/community-service-entries.js";
import { STUDENT_SCORES_TABLE } from "../../../db/schema/student-scores.js";
import { STUDENT_SCORE_HISTORY_TABLE } from "../../../db/schema/student-score-history.js";
import { calcAcademicsScores, type AcademicsScores } from "../academics/academics.scorer.js";
import { calcAwardsScores } from "../awards/awards.scorer.js";
import { calcEssayScores } from "../essay/essay.scorer.js";
import { calcExtracurricularScores } from "../extracurriculars/extracurriculars.scorer.js";
import { calcServiceScores } from "../service/service.scorer.js";
import type { AcademicsRecord } from "../academics/academics.types.js";
import type { AwardRecord } from "../awards/awards.types.js";
import type { EssayRecord } from "../essay/essay.types.js";
import type { ExtracurricularRecord } from "../extracurriculars/extracurriculars.types.js";
import type { ServiceEntryRecord } from "../service/service.types.js";

type ReadinessBand =
  | "foundational"
  | "developing"
  | "competitive"
  | "strongly_competitive"
  | "exceptional";

type ProfileRow = {
  student_id: number;
  grade: number | null;
  profile_complete: boolean;
};

export class ScoringOrchestrator {
  async recalculateStudent(studentId: number): Promise<void> {
    const [profile, academics, essay, awards, extracurriculars, serviceEntries, previous] =
      await Promise.all([
        this.getProfile(studentId),
        this.getAcademics(studentId),
        this.getEssay(studentId),
        this.getAwards(studentId),
        this.getExtracurriculars(studentId),
        this.getServiceEntries(studentId),
        this.getPreviousScore(studentId),
      ]);

    if (!profile) return;

    const grade = profile.grade;
    const academicsScores = this.scoreAcademics(academics, grade);
    const ecScores = calcExtracurricularScores(extracurriculars, grade);
    const essayScores = calcEssayScores(essay?.essay_status ?? "not_started", grade ?? 11);
    const awardsScores = calcAwardsScores(
      awards.map((award) => ({ award_level: award.award_level, frequency: award.frequency })),
    );
    const serviceScores = calcServiceScores(serviceEntries);

    const totalScore =
      academicsScores.academics_contrib +
      ecScores.ec_contrib +
      essayScores.essay_contrib +
      awardsScores.awards_contrib +
      serviceScores.service_contrib;

    const academicsBand = bandForRatio(academicsScores.academics_contrib / 50);
    const essayBand = bandForRatio(essayScores.essay_contrib / 15);
    const awardsBand = bandForRatio(awardsScores.awards_contrib / 5);
    let readinessBand = bandForScore(totalScore);
    const limiter = pickPrimaryLimiter([
      ["academics", academicsScores.academics_contrib / 50],
      ["extracurriculars", ecScores.ec_contrib / 25],
      ["essay", essayScores.essay_contrib / 15],
      ["awards", awardsScores.awards_contrib / 5],
      ["service", serviceScores.service_contrib / 5],
    ]);
    const trendDirection = getTrendDirection(previous?.total_score ?? null, totalScore);
    
    // Apply exceptional gate: require ALL categories >= Strongly Competitive + at least one standout
    const hasReviewedEssay = essay?.essay_status ? ["revised", "submitted", "accepted"].includes(essay.essay_status) : false;
    const hasStandoutAwards = awardsScores.awards_norm >= 0.70;
    const hasStandoutAcademics = academicsScores.academics_contrib >= 40;
    const hasStandoutEc = ecScores.ec_norm >= 0.75;
    
    const exceptionalGateMet =
      totalScore >= 90 &&
      (academicsBand === "strongly_competitive" || academicsBand === "exceptional") &&
      (ecScores.ec_band === "strongly_competitive" || ecScores.ec_band === "exceptional") &&
      (essayBand === "strongly_competitive" || essayBand === "exceptional") &&
      hasReviewedEssay &&
      (hasStandoutAwards || hasStandoutAcademics || hasStandoutEc);
    
    // Apply floor rules: downgrade if constraints aren't met
    let finalBand = readinessBand;
    let foundational_floor_applied = false;
    let developing_floor_applied = false;
    
    if (applyFoundationalFloor([academicsBand, ecScores.ec_band, essayBand, awardsBand, serviceScores.service_band])) {
      finalBand = "developing";
      foundational_floor_applied = true;
    } else if (applyDevelopingFloor([academicsBand, ecScores.ec_band, essayBand, awardsBand, serviceScores.service_band])) {
      if (finalBand === "strongly_competitive" || finalBand === "exceptional") {
        finalBand = "competitive";
      }
      developing_floor_applied = true;
    }
    
    // Override exceptional to strongly_competitive if gate not met
    if (finalBand === "exceptional" && !exceptionalGateMet) {
      finalBand = "strongly_competitive";
    }

    await this.upsertScores(studentId, {
      ...academicsScores,
      ...ecScores,
      ...essayScores,
      ...awardsScores,
      ...serviceScores,
      total_score: totalScore,
      readiness_band: finalBand,
      on_track_status: getOnTrackStatus(grade, finalBand),
      academics_band: academicsBand,
      essay_band: essayBand,
      awards_band: awardsBand,
      primary_limiter: limiter,
      exceptional_gate_met: exceptionalGateMet,
      foundational_floor_applied,
      developing_floor_applied,
      has_standout_awards: awardsScores.awards_norm >= 0.70,
      has_academic_strength: academicsScores.academics_contrib >= 40,
    });

    if (grade !== null) {
      await this.insertHistory(studentId, grade, {
        total_score: totalScore,
        readiness_band: finalBand,
        academics_band: academicsBand,
        ec_band: ecScores.ec_band,
        essay_band: essayBand,
        awards_band: awardsBand,
        service_band: serviceScores.service_band,
        primary_limiter: limiter,
        trend_direction: trendDirection,
      });
    }
  }

  private scoreAcademics(record: AcademicsRecord | null, grade: number | null): AcademicsScores {
    if (!record || grade === null || record.unweighted_gpa === null || record.course_rigor === null) {
      return {
        gpa_norm: 0,
        rigor_norm: 0,
        test_norm: 0,
        test_present: false,
        gpa_contrib: 0,
        rigor_contrib: 0,
        test_contrib: 0,
        academics_contrib: 0,
        academics_cap_applied: false,
      };
    }

    return calcAcademicsScores(
      record.unweighted_gpa,
      record.course_rigor,
      record.sat_score,
      record.act_score,
      grade,
    );
  }

  private async getProfile(studentId: number): Promise<ProfileRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<ProfileRow>(
        `SELECT TOP 1 student_id, grade, profile_complete
           FROM ${STUDENT_PROFILES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  private async getAcademics(studentId: number): Promise<AcademicsRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<AcademicsRecord>(
        `SELECT TOP 1 *
           FROM ${STUDENT_ACADEMICS_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  private async getEssay(studentId: number): Promise<EssayRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<EssayRecord>(
        `SELECT TOP 1 *
           FROM ${STUDENT_ESSAYS_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  private async getAwards(studentId: number): Promise<AwardRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<AwardRecord>(
        `SELECT *
           FROM ${HONORS_AWARDS_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset;
  }

  private async getExtracurriculars(studentId: number): Promise<ExtracurricularRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<ExtracurricularRecord>(
        `SELECT *
           FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset;
  }

  private async getServiceEntries(studentId: number): Promise<ServiceEntryRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<ServiceEntryRecord>(
        `SELECT *
           FROM ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset.map((row) => ({ ...row, is_leadership: Boolean(row.is_leadership) }));
  }

  private async getPreviousScore(studentId: number): Promise<{ total_score: number | null } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ total_score: number | null }>(
        `SELECT TOP 1 total_score
           FROM ${STUDENT_SCORES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  private async upsertScores(
    studentId: number,
    data: AcademicsScores & {
      ec_norm: number;
      ec_contrib: number;
      ec_early_strength_bonus: number;
      ec_band: ReadinessBand;
      has_founder_ec: boolean;
      has_independent_impact: boolean;
      essay_norm: number;
      essay_contrib: number;
      awards_raw: number;
      awards_norm: number;
      awards_contrib: number;
      service_norm: number;
      service_contrib: number;
      service_band: ReadinessBand;
      total_score: number;
      readiness_band: ReadinessBand;
      on_track_status: string | null;
      academics_band: ReadinessBand;
      essay_band: ReadinessBand;
      awards_band: ReadinessBand;
      primary_limiter: string;
      exceptional_gate_met: boolean;
      foundational_floor_applied: boolean;
      developing_floor_applied: boolean;
      has_standout_awards: boolean;
      has_academic_strength: boolean;
    },
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("gpa_norm", sql.Decimal(7, 4), data.gpa_norm)
      .input("rigor_norm", sql.Decimal(7, 4), data.rigor_norm)
      .input("test_norm", sql.Decimal(7, 4), data.test_norm)
      .input("test_present", sql.Bit, data.test_present ? 1 : 0)
      .input("gpa_contrib", sql.Decimal(6, 2), data.gpa_contrib)
      .input("rigor_contrib", sql.Decimal(6, 2), data.rigor_contrib)
      .input("test_contrib", sql.Decimal(6, 2), data.test_contrib)
      .input("academics_contrib", sql.Decimal(6, 2), data.academics_contrib)
      .input("academics_cap_applied", sql.Bit, data.academics_cap_applied ? 1 : 0)
      .input("ec_norm", sql.Decimal(7, 4), data.ec_norm)
      .input("ec_contrib", sql.Decimal(6, 2), data.ec_contrib)
      .input("ec_early_strength_bonus", sql.Decimal(7, 4), data.ec_early_strength_bonus)
      .input("essay_norm", sql.Decimal(7, 4), data.essay_norm)
      .input("essay_contrib", sql.Decimal(6, 2), data.essay_contrib)
      .input("awards_raw", sql.Decimal(8, 2), data.awards_raw)
      .input("awards_norm", sql.Decimal(7, 4), data.awards_norm)
      .input("awards_contrib", sql.Decimal(6, 2), data.awards_contrib)
      .input("service_norm", sql.Decimal(7, 4), data.service_norm)
      .input("service_contrib", sql.Decimal(6, 2), data.service_contrib)
      .input("total_score", sql.Decimal(6, 2), data.total_score)
      .input("readiness_band", sql.VarChar(25), data.readiness_band)
      .input("on_track_status", sql.VarChar(20), data.on_track_status)
      .input("academics_band", sql.VarChar(25), data.academics_band)
      .input("ec_band", sql.VarChar(25), data.ec_band)
      .input("essay_band", sql.VarChar(25), data.essay_band)
      .input("awards_band", sql.VarChar(25), data.awards_band)
      .input("service_band", sql.VarChar(25), data.service_band)
      .input("exceptional_gate_met", sql.Bit, data.exceptional_gate_met ? 1 : 0)
      .input("foundational_floor_applied", sql.Bit, data.foundational_floor_applied ? 1 : 0)
      .input("developing_floor_applied", sql.Bit, data.developing_floor_applied ? 1 : 0)
      .input("primary_limiter", sql.VarChar(60), data.primary_limiter)
      .input("has_standout_awards", sql.Bit, data.has_standout_awards ? 1 : 0)
      .input("has_founder_ec", sql.Bit, data.has_founder_ec ? 1 : 0)
      .input("has_academic_strength", sql.Bit, data.has_academic_strength ? 1 : 0)
      .input("has_independent_impact", sql.Bit, data.has_independent_impact ? 1 : 0)
      .query(
        `MERGE ${STUDENT_SCORES_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             gpa_norm = @gpa_norm,
             rigor_norm = @rigor_norm,
             test_norm = @test_norm,
             test_present = @test_present,
             gpa_contrib = @gpa_contrib,
             rigor_contrib = @rigor_contrib,
             test_contrib = @test_contrib,
             academics_contrib = @academics_contrib,
             academics_cap_applied = @academics_cap_applied,
             ec_norm = @ec_norm,
             ec_contrib = @ec_contrib,
             ec_early_strength_bonus = @ec_early_strength_bonus,
             essay_norm = @essay_norm,
             essay_contrib = @essay_contrib,
             awards_raw = @awards_raw,
             awards_norm = @awards_norm,
             awards_contrib = @awards_contrib,
             service_norm = @service_norm,
             service_contrib = @service_contrib,
             total_score = @total_score,
             readiness_band = @readiness_band,
             on_track_status = @on_track_status,
             academics_band = @academics_band,
             ec_band = @ec_band,
             essay_band = @essay_band,
             awards_band = @awards_band,
             service_band = @service_band,
             exceptional_gate_met = @exceptional_gate_met,
             foundational_floor_applied = @foundational_floor_applied,
             developing_floor_applied = @developing_floor_applied,
             primary_limiter = @primary_limiter,
             has_standout_awards = @has_standout_awards,
             has_founder_ec = @has_founder_ec,
             has_academic_strength = @has_academic_strength,
             has_independent_impact = @has_independent_impact,
             calculated_at = SYSDATETIMEOFFSET(),
             updated_at = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (
             student_id, gpa_norm, rigor_norm, test_norm, test_present,
             gpa_contrib, rigor_contrib, test_contrib, academics_contrib, academics_cap_applied,
             ec_norm, ec_contrib, ec_early_strength_bonus, essay_norm, essay_contrib,
             awards_raw, awards_norm, awards_contrib, service_norm, service_contrib,
             total_score, readiness_band, on_track_status, academics_band, ec_band,
             essay_band, awards_band, service_band, exceptional_gate_met,
             foundational_floor_applied, developing_floor_applied, primary_limiter,
             has_standout_awards, has_founder_ec, has_academic_strength, has_independent_impact
           )
           VALUES (
             @student_id, @gpa_norm, @rigor_norm, @test_norm, @test_present,
             @gpa_contrib, @rigor_contrib, @test_contrib, @academics_contrib, @academics_cap_applied,
             @ec_norm, @ec_contrib, @ec_early_strength_bonus, @essay_norm, @essay_contrib,
             @awards_raw, @awards_norm, @awards_contrib, @service_norm, @service_contrib,
             @total_score, @readiness_band, @on_track_status, @academics_band, @ec_band,
             @essay_band, @awards_band, @service_band, @exceptional_gate_met,
             @foundational_floor_applied, @developing_floor_applied, @primary_limiter,
             @has_standout_awards, @has_founder_ec, @has_academic_strength, @has_independent_impact
           );`,
      );
  }

  private async insertHistory(
    studentId: number,
    grade: number,
    data: {
      total_score: number;
      readiness_band: ReadinessBand;
      academics_band: ReadinessBand;
      ec_band: ReadinessBand;
      essay_band: ReadinessBand;
      awards_band: ReadinessBand;
      service_band: ReadinessBand;
      primary_limiter: string;
      trend_direction: "improving" | "declining" | "stable";
    },
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("snapshot_term", sql.VarChar(30), snapshotTerm(new Date()))
      .input("grade_at_snapshot", sql.SmallInt, grade)
      .input("total_score", sql.Decimal(6, 2), data.total_score)
      .input("readiness_band", sql.VarChar(25), data.readiness_band)
      .input("academics_band", sql.VarChar(25), data.academics_band)
      .input("ec_band", sql.VarChar(25), data.ec_band)
      .input("essay_band", sql.VarChar(25), data.essay_band)
      .input("awards_band", sql.VarChar(25), data.awards_band)
      .input("service_band", sql.VarChar(25), data.service_band)
      .input("primary_limiter", sql.VarChar(60), data.primary_limiter)
      .input("trend_direction", sql.VarChar(10), data.trend_direction)
      .query(
        `INSERT INTO ${STUDENT_SCORE_HISTORY_TABLE}
          (student_id, snapshot_term, grade_at_snapshot, total_score, readiness_band,
           academics_band, ec_band, essay_band, awards_band, service_band,
           primary_limiter, trend_direction)
         VALUES
          (@student_id, @snapshot_term, @grade_at_snapshot, @total_score, @readiness_band,
           @academics_band, @ec_band, @essay_band, @awards_band, @service_band,
           @primary_limiter, @trend_direction);`,
      );
  }
}

export function queueScoreRecalculation(studentId: number, source: string): boolean {
  setImmediate(() => {
    new ScoringOrchestrator().recalculateStudent(studentId).catch((err) => {
      console.error(`[ScoringOrchestrator] recalculation failed for student ${studentId} (${source}):`, err);
    });
  });
  return true;
}

function bandForRatio(ratio: number): ReadinessBand {
  if (ratio >= 0.90) return "exceptional";
  if (ratio >= 0.75) return "strongly_competitive";
  if (ratio >= 0.60) return "competitive";
  if (ratio >= 0.45) return "developing";
  return "foundational";
}

function bandForScore(score: number): ReadinessBand {
  if (score >= 90) return "exceptional";
  if (score >= 75) return "strongly_competitive";
  if (score >= 60) return "competitive";
  if (score >= 45) return "developing";
  return "foundational";
}

function applyFoundationalFloor(bands: ReadinessBand[]): boolean {
  // If ANY category is foundational, cap overall at developing
  return bands.some((b) => b === "foundational");
}

function applyDevelopingFloor(bands: ReadinessBand[]): boolean {
  // If TWO OR MORE categories are developing or below, cap overall at competitive
  const lowCount = bands.filter((b) => b === "foundational" || b === "developing").length;
  return lowCount >= 2;
}

function pickPrimaryLimiter(categories: Array<[string, number]>): string {
  return categories.reduce((lowest, current) => current[1] < lowest[1] ? current : lowest)[0];
}

function getTrendDirection(
  previous: number | null,
  current: number,
): "improving" | "declining" | "stable" {
  if (previous === null) return "stable";
  if (current - previous >= 1) return "improving";
  if (previous - current >= 1) return "declining";
  return "stable";
}

function getOnTrackStatus(grade: number | null, band: ReadinessBand): string | null {
  if (grade === null) return null;
  if (grade === 9) return band === "foundational" ? null : band === "developing" ? "on_track" : "ahead";
  if (grade === 10) return band === "competitive" ? "on_track" : higherThan(band, "competitive") ? "ahead" : null;
  if (grade === 11) return band === "competitive" ? "on_track" : higherThan(band, "competitive") ? "ahead" : null;
  if (grade === 12) return higherThan(band, "competitive") ? "on_track" : null;
  return null;
}

function higherThan(actual: ReadinessBand, threshold: ReadinessBand): boolean {
  const order: ReadinessBand[] = [
    "foundational",
    "developing",
    "competitive",
    "strongly_competitive",
    "exceptional",
  ];
  return order.indexOf(actual) > order.indexOf(threshold);
}

function snapshotTerm(date: Date): string {
  const month = date.getUTCMonth() + 1;
  const term = month <= 5 ? "spring" : month <= 8 ? "summer" : "fall";
  return `${term}_${date.getUTCFullYear()}`;
}
