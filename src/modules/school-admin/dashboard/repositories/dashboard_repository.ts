import { getPool, sql } from '../../../../database/db';
import {
  OverviewSnapshot, CollegeIntentSnapshot, GeoIntentSnapshot,
  GapAnalysisRow, ReadinessByGrade, EngagementByGrade,
  TrajectoryByGrade, EngagementSnapshot, SeniorRiskSnapshot,
  CounselingCapacity, ReadinessDriversSnapshot,
} from '../types/dashboard_types';

export class DashboardRepository {

  // ─── Section A: Overview ────────────────────────────────────────────────────

  async getOverviewSnapshot(school_id: number): Promise<OverviewSnapshot | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1
          r.school_id,
          SUM(r.total_students)   AS active_students_count,
          ROUND(
            100.0 * SUM(r.competitive_count + r.strongly_competitive_count + r.exceptional_count)
            / NULLIF(SUM(r.total_students), 0), 1
          )                       AS competitive_plus_pct,
          ROUND(AVG(r.pct_improved), 1) AS improved_last_term_pct,
          0                       AS avg_colleges_saved,
          0                       AS total_schools_linked,
          MAX(r.snapshot_date)    AS snapshot_generated_at,
          MAX(r.snapshot_date)    AS data_as_of
        FROM school_readiness_snapshots r
        WHERE r.school_id = @school_id
          AND r.snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_readiness_snapshots WHERE school_id = @school_id
          )
        GROUP BY r.school_id
      `);
    return result.recordset[0] ?? null;
  }

  // ─── Section B: College Intent ──────────────────────────────────────────────

  async getCollegeIntentSnapshots(school_id: number): Promise<CollegeIntentSnapshot[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 10
          college_id, save_count, pct_competitive_or_higher,
          primary_limiting_category, trend_direction,
          pct_saving_above_readiness, snapshot_date
        FROM school_college_intent_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_college_intent_snapshots WHERE school_id = @school_id
          )
        ORDER BY save_count DESC
      `);
    return result.recordset;
  }

  async getGeoIntent(school_id: number): Promise<GeoIntentSnapshot | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1 in_state_count, out_of_state_count, pct_in_state, snapshot_date
        FROM school_geo_intent
        WHERE school_id = @school_id
        ORDER BY snapshot_date DESC
      `);
    return result.recordset[0] ?? null;
  }

  async getBandDistribution(school_id: number): Promise<{
    foundational: number; developing: number; competitive: number;
    strongly_competitive: number; exceptional: number;
  }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          SUM(foundational_count)         AS foundational,
          SUM(developing_count)           AS developing,
          SUM(competitive_count)          AS competitive,
          SUM(strongly_competitive_count) AS strongly_competitive,
          SUM(exceptional_count)          AS exceptional
        FROM school_readiness_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_readiness_snapshots WHERE school_id = @school_id
          )
      `);
    return result.recordset[0];
  }

  // ─── Section C: Gap Analysis ────────────────────────────────────────────────

  async getTopCollegesGapAnalysis(school_id: number): Promise<GapAnalysisRow[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 5
          college_id, save_count, pct_competitive_or_higher,
          primary_limiting_category, trend_direction, snapshot_date
        FROM school_college_intent_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_college_intent_snapshots WHERE school_id = @school_id
          )
        ORDER BY save_count DESC
      `);
    return result.recordset;
  }

  // ─── Section D: Equity & Access ─────────────────────────────────────────────

  async getReadinessByGrade(school_id: number): Promise<ReadinessByGrade[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          grade_level, foundational_count, developing_count,
          competitive_count, strongly_competitive_count,
          exceptional_count, total_students, pct_improved
        FROM school_readiness_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_readiness_snapshots WHERE school_id = @school_id
          )
        ORDER BY grade_level
      `);
    return result.recordset;
  }

  async getEngagementByGrade(school_id: number): Promise<EngagementByGrade[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          grade_level, low_engagement_count,
          flagged_needs_attention, dau, wau, mau
        FROM school_engagement_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_engagement_snapshots WHERE school_id = @school_id
          )
        ORDER BY grade_level
      `);
    return result.recordset;
  }

  // ─── Section F: Trajectory ──────────────────────────────────────────────────

  async getTrajectoryByGrade(school_id: number): Promise<TrajectoryByGrade[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          grade_level, improving_count, flat_count,
          declining_count, total_students, snapshot_date
        FROM school_trajectory_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_trajectory_snapshots WHERE school_id = @school_id
          )
        ORDER BY grade_level
      `);
    return result.recordset;
  }

  async getTrajectoryByTerm(school_id: number): Promise<TrajectoryByGrade[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          snapshot_date, SUM(improving_count) AS improving_count,
          SUM(flat_count) AS flat_count,
          SUM(declining_count) AS declining_count,
          SUM(total_students) AS total_students,
          NULL AS grade_level
        FROM school_trajectory_snapshots
        WHERE school_id = @school_id
        GROUP BY snapshot_date
        ORDER BY snapshot_date DESC
      `);
    return result.recordset;
  }

  // ─── Section G: Engagement ──────────────────────────────────────────────────

  async getEngagementSnapshots(school_id: number): Promise<EngagementSnapshot[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          grade_level, dau, wau, mau,
          low_engagement_count, flagged_needs_attention, snapshot_date
        FROM school_engagement_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_engagement_snapshots WHERE school_id = @school_id
          )
        ORDER BY grade_level
      `);
    return result.recordset;
  }

  // ─── Section H: Senior Risk ─────────────────────────────────────────────────

  async getSeniorRiskSnapshot(school_id: number): Promise<SeniorRiskSnapshot | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1
          total_seniors, pct_below_competitive,
          pct_missing_match_or_safety, pct_missing_essay, snapshot_date
        FROM school_senior_risk_snapshots
        WHERE school_id = @school_id
        ORDER BY snapshot_date DESC
      `);
    return result.recordset[0] ?? null;
  }

  // ─── Section I: Counseling Capacity ─────────────────────────────────────────

  async getCounselingCapacity(school_id: number): Promise<CounselingCapacity> {
    const pool = await getPool();

    const advisorResult = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          COUNT(*)                              AS active_advisors_count,
          SUM(CASE WHEN can_export = 1 THEN 1 ELSE 0 END) AS advisors_with_export
        FROM advisor_access
        WHERE school_id = @school_id AND status = 'active'
      `);

    const engagementResult = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          SUM(mau) AS total_active_students,
          SUM(flagged_needs_attention)     AS needs_attention_count
        FROM school_engagement_snapshots
        WHERE school_id = @school_id
          AND snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_engagement_snapshots WHERE school_id = @school_id
          )
      `);
      console.log(engagementResult.recordset[0]);
    return {
      ...advisorResult.recordset[0],
      ...engagementResult.recordset[0],
    };
  }

  // ─── Section J: Readiness Drivers ───────────────────────────────────────────

  async getReadinessDrivers(school_id: number): Promise<ReadinessDriversSnapshot[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          t.grade_level, t.improving_count, t.flat_count,
          t.declining_count, t.total_students, t.snapshot_date,
          (
            SELECT TOP 1 primary_limiting_category
            FROM school_college_intent_snapshots
            WHERE school_id = @school_id
              AND snapshot_date = (
                SELECT MAX(snapshot_date) FROM school_college_intent_snapshots WHERE school_id = @school_id
              )
            GROUP BY primary_limiting_category
            ORDER BY COUNT(*) DESC
          ) AS primary_limiting_category
        FROM school_trajectory_snapshots t
        WHERE t.school_id = @school_id
          AND t.snapshot_date = (
            SELECT MAX(snapshot_date) FROM school_trajectory_snapshots WHERE school_id = @school_id
          )
        ORDER BY t.improving_count DESC
      `);
    return result.recordset;
  }
}




