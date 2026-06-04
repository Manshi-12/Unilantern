import fs   from 'fs';
import path from 'path';
import { ExportRepository } from '../repositories/export.repository';
import { ExportScope }      from '../types/export.types';
import { getPool, sql }     from '../../../../database/db';

const repo       = new ExportRepository();
const EXPORT_DIR = process.env.EXPORT_DIR ?? './tmp/exports';

// Ensure the exports directory exists
fs.mkdirSync(EXPORT_DIR, { recursive: true });

// ── CSV column allowlists (aggregate only — no individual student rows) ────────
// Every scope produces only summary / distribution rows.

type CsvRow = Record<string, string | number>;

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the most-recent snapshot_date for a given school + table.
 * Falls back to the supplied `term` string when no row exists.
 */
async function latestSnapshotDate(
  table:     string,
  schoolId:  number,
): Promise<string> {
  const pool   = await getPool();
  const result = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ snapshot_date: Date }>(
      `SELECT TOP 1 snapshot_date
       FROM   [dbo].[${table}]
       WHERE  school_id = @school_id
       ORDER  BY snapshot_date DESC`,
    );
  const row = result.recordset[0];
  return row ? row.snapshot_date.toISOString().slice(0, 10) : 'Unknown';
}

// ── per-scope query functions ─────────────────────────────────────────────────

async function queryReadinessDistribution(
  schoolId:    number,
  gradeLevels: number[],
): Promise<CsvRow[]> {
  const pool        = await getPool();
  const snapshotDate = await latestSnapshotDate('school_readiness_snapshots', schoolId);

  // Pull the single latest snapshot for each grade level in one round-trip
  const result = await pool
    .request()
    .input('school_id',     sql.Int,  schoolId)
    .input('snapshot_date', sql.Date, snapshotDate)
    .query<{
      grade_level:              number;
      foundational_count:       number;
      developing_count:         number;
      competitive_count:        number;
      strongly_competitive_count: number;
      exceptional_count:        number;
      total_students:           number;
    }>(
      `SELECT grade_level,
              foundational_count,
              developing_count,
              competitive_count,
              strongly_competitive_count,
              exceptional_count,
              total_students
       FROM   [dbo].[school_readiness_snapshots]
       WHERE  school_id     = @school_id
         AND  snapshot_date = @snapshot_date`,
    );

  const byGrade = new Map(result.recordset.map((r) => [r.grade_level, r]));

  return gradeLevels.flatMap((grade) => {
    const r     = byGrade.get(grade);
    const total = r?.total_students ?? 0;

    const pct = (count: number) =>
      total > 0 ? Math.round((count / total) * 10000) / 100 : 0;

    return [
      {
        grade,
        readiness_band: 'Foundational',
        student_count:  r?.foundational_count        ?? 0,
        percentage:     pct(r?.foundational_count    ?? 0),
      },
      {
        grade,
        readiness_band: 'Developing',
        student_count:  r?.developing_count          ?? 0,
        percentage:     pct(r?.developing_count      ?? 0),
      },
      {
        grade,
        readiness_band: 'Competitive',
        student_count:  r?.competitive_count         ?? 0,
        percentage:     pct(r?.competitive_count     ?? 0),
      },
      {
        grade,
        readiness_band: 'Strongly Competitive',
        student_count:  r?.strongly_competitive_count ?? 0,
        percentage:     pct(r?.strongly_competitive_count ?? 0),
      },
      {
        grade,
        readiness_band: 'Exceptional',
        student_count:  r?.exceptional_count         ?? 0,
        percentage:     pct(r?.exceptional_count     ?? 0),
      },
    ];
  });
}

async function queryEngagementMetrics(
  schoolId:    number,
  term:        string,
  gradeLevels: number[],
): Promise<CsvRow[]> {
  const pool        = await getPool();
  const snapshotDate = await latestSnapshotDate('school_engagement_snapshots', schoolId);

  const result = await pool
    .request()
    .input('school_id',     sql.Int,  schoolId)
    .input('snapshot_date', sql.Date, snapshotDate)
    .query<{
      grade_level:             number;
      dau:                     number;
      wau:                     number;
      mau:                     number;
      low_engagement_count:    number;
      flagged_needs_attention: number;
    }>(
      `SELECT grade_level,
              dau,
              wau,
              mau,
              low_engagement_count,
              flagged_needs_attention
       FROM   [dbo].[school_engagement_snapshots]
       WHERE  school_id     = @school_id
         AND  snapshot_date = @snapshot_date`,
    );

  const byGrade = new Map(result.recordset.map((r) => [r.grade_level, r]));

  return gradeLevels.map((grade) => {
    const r = byGrade.get(grade);
    return {
      grade,
      term,
      active_students:        r?.mau                    ?? 0,
      avg_logins_per_student: r?.wau                    ?? 0,   // WAU used as weekly-login proxy
      avg_sections_completed: 0,                                 // not tracked in snapshot schema
      pct_completed_profile:  r ? (
        r.mau > 0
          ? Math.round(((r.mau - r.low_engagement_count) / r.mau) * 10000) / 100
          : 0
      ) : 0,
    };
  });
}

async function queryImprovementTrends(
  schoolId:    number,
  term:        string,
  gradeLevels: number[],
): Promise<CsvRow[]> {
  const pool        = await getPool();
  const snapshotDate = await latestSnapshotDate('school_trajectory_snapshots', schoolId);

  const result = await pool
    .request()
    .input('school_id',     sql.Int,  schoolId)
    .input('snapshot_date', sql.Date, snapshotDate)
    .query<{
      grade_level:             number;
      improving_count:         number;
      flat_count:              number;
      declining_count:         number;
      late_acceleration_count: number;
      total_students:          number;
    }>(
      `SELECT grade_level,
              improving_count,
              flat_count,
              declining_count,
              late_acceleration_count,
              total_students
       FROM   [dbo].[school_trajectory_snapshots]
       WHERE  school_id     = @school_id
         AND  snapshot_date = @snapshot_date`,
    );

  const byGrade = new Map(result.recordset.map((r) => [r.grade_level, r]));

  return gradeLevels.map((grade) => {
    const r     = byGrade.get(grade);
    const total = r?.total_students ?? 0;
    const pct   = (n: number) =>
      total > 0 ? Math.round((n / total) * 10000) / 100 : 0;

    return {
      grade,
      term,
      pct_improved_readiness_band: pct(r?.improving_count  ?? 0),
      pct_unchanged:               pct(r?.flat_count        ?? 0),
      pct_declined:                pct(r?.declining_count   ?? 0),
      avg_band_change_numeric:     0,  // would require prior-period join; reserved
    };
  });
}

async function queryCollegeIntent(schoolId: number): Promise<CsvRow[]> {
  const pool = await getPool();

  // ── college intent (top saved colleges) ──────────────────────────────────
  const intentResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ college_id: number; save_count: number }>(
      `SELECT TOP 3
              college_id,
              save_count
       FROM   [dbo].[school_college_intent_snapshots]
       WHERE  school_id     = @school_id
         AND  snapshot_date = (
               SELECT MAX(snapshot_date)
               FROM   [dbo].[school_college_intent_snapshots]
               WHERE  school_id = @school_id
             )
       ORDER  BY save_count DESC`,
    );

  // ── geo intent ────────────────────────────────────────────────────────────
  const geoResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ in_state_count: number; out_of_state_count: number; pct_in_state: number }>(
      `SELECT TOP 1
              in_state_count,
              out_of_state_count,
              pct_in_state
       FROM   [dbo].[school_geo_intent]
       WHERE  school_id = @school_id
       ORDER  BY snapshot_date DESC`,
    );

  const geo         = geoResult.recordset[0];
  const totalGeo    = (geo?.in_state_count ?? 0) + (geo?.out_of_state_count ?? 0);
  const pctInState  = geo?.pct_in_state ?? 0;
  const pctOutState = totalGeo > 0
    ? Math.round(((geo?.out_of_state_count ?? 0) / totalGeo) * 10000) / 100
    : 0;

  // ── pct saving above readiness — from college intent snapshot ─────────────
  const reachResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ pct_saving_above_readiness: number }>(
      `SELECT TOP 1
              pct_saving_above_readiness
       FROM   [dbo].[school_college_intent_snapshots]
       WHERE  school_id = @school_id
       ORDER  BY snapshot_date DESC`,
    );
  const pctReach = reachResult.recordset[0]?.pct_saving_above_readiness ?? 0;

  const colleges = intentResult.recordset;

  return [
    {
      metric:        'top_saved_college_1',
      value:         colleges[0]?.college_id ?? '',
      student_count: colleges[0]?.save_count ?? 0,
    },
    {
      metric:        'top_saved_college_2',
      value:         colleges[1]?.college_id ?? '',
      student_count: colleges[1]?.save_count ?? 0,
    },
    {
      metric:        'top_saved_college_3',
      value:         colleges[2]?.college_id ?? '',
      student_count: colleges[2]?.save_count ?? 0,
    },
    {
      metric:        'pct_saving_reach_schools',
      value:         pctReach,
      student_count: 0,
    },
    {
      metric:        'pct_in_state_intent',
      value:         pctInState,
      student_count: geo?.in_state_count ?? 0,
    },
    {
      metric:        'pct_out_of_state_intent',
      value:         pctOutState,
      student_count: geo?.out_of_state_count ?? 0,
    },
  ];
}

async function queryTrajectory(
  schoolId:    number,
  term:        string,
  gradeLevels: number[],
): Promise<CsvRow[]> {
  const pool        = await getPool();
  const snapshotDate = await latestSnapshotDate('school_trajectory_snapshots', schoolId);

  // Also pull readiness snapshot for on-track / needs-attention counts
  const result = await pool
    .request()
    .input('school_id',     sql.Int,  schoolId)
    .input('snapshot_date', sql.Date, snapshotDate)
    .query<{
      grade_level:              number;
      improving_count:          number;
      flat_count:               number;
      declining_count:          number;
      total_students:           number;
      // readiness join columns
      competitive_count:        number | null;
      strongly_competitive_count: number | null;
      exceptional_count:        number | null;
      foundational_count:       number | null;
      developing_count:         number | null;
      primary_limiting_category:string | null;
    }>(
      `SELECT t.grade_level,
              t.improving_count,
              t.flat_count,
              t.declining_count,
              t.total_students,
              r.competitive_count,
              r.strongly_competitive_count,
              r.exceptional_count,
              r.foundational_count,
              r.developing_count,
              ci.primary_limiting_category
       FROM   [dbo].[school_trajectory_snapshots] t
       LEFT   JOIN [dbo].[school_readiness_snapshots] r
              ON  r.school_id     = t.school_id
              AND r.snapshot_date = t.snapshot_date
              AND r.grade_level   = t.grade_level
       LEFT   JOIN [dbo].[school_college_intent_snapshots] ci
              ON  ci.school_id     = t.school_id
              AND ci.snapshot_date = t.snapshot_date
       WHERE  t.school_id     = @school_id
         AND  t.snapshot_date = @snapshot_date`,
    );

  const byGrade = new Map(result.recordset.map((r) => [r.grade_level, r]));

  return gradeLevels.map((grade) => {
    const r     = byGrade.get(grade);
    const total = r?.total_students ?? 0;

    // "on track" = competitive or higher
    const onTrack =
      (r?.competitive_count          ?? 0) +
      (r?.strongly_competitive_count ?? 0) +
      (r?.exceptional_count          ?? 0);

    // "needs attention" = foundational or developing
    const needsAttn =
      (r?.foundational_count ?? 0) +
      (r?.developing_count   ?? 0);

    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 10000) / 100 : 0;

    // Derive a band label from distribution
    const avgBand = (): string => {
      if (!r || total === 0) return 'N/A';
      const ratioOnTrack = onTrack / total;
      if (ratioOnTrack >= 0.66) return 'Competitive';
      if (ratioOnTrack >= 0.33) return 'Developing';
      return 'Foundational';
    };

    return {
      grade,
      term,
      avg_readiness_score_band:  avgBand(),
      pct_on_track:              pct(onTrack),
      pct_needs_attention:       pct(needsAttn),
      primary_limiting_category: r?.primary_limiting_category ?? '',
    };
  });
}

async function querySeniorRisk(schoolId: number): Promise<CsvRow[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{
      total_seniors:              number;
      pct_below_competitive:      number;
      pct_missing_match_or_safety: number;
      pct_missing_essay:          number;
    }>(
      `SELECT TOP 1
              total_seniors,
              pct_below_competitive,
              pct_missing_match_or_safety,
              pct_missing_essay
       FROM   [dbo].[school_senior_risk_snapshots]
       WHERE  school_id = @school_id
       ORDER  BY snapshot_date DESC`,
    );

  const r           = result.recordset[0];
  const totalSeniors = r?.total_seniors ?? 0;

  const studentCount = (pct: number) =>
    totalSeniors > 0 ? Math.round((pct / 100) * totalSeniors) : 0;

  return [
    {
      risk_category:  'No college saved',
      student_count:  studentCount(r?.pct_missing_match_or_safety ?? 0),
      pct_of_seniors: r?.pct_missing_match_or_safety ?? 0,
    },
    {
      risk_category:  'All schools reach',
      student_count:  studentCount(r?.pct_below_competitive ?? 0),
      pct_of_seniors: r?.pct_below_competitive ?? 0,
    },
    {
      risk_category:  'Incomplete profile',
      student_count:  studentCount(r?.pct_missing_essay ?? 0),
      pct_of_seniors: r?.pct_missing_essay ?? 0,
    },
    {
      // low_engagement pulled from engagement snapshot for seniors (grade 12)
      risk_category:  'Low engagement last 30 days',
      student_count:  await (async () => {
        const engResult = await pool
          .request()
          .input('school_id', sql.Int, schoolId)
          .query<{ low_engagement_count: number }>(
            `SELECT TOP 1 low_engagement_count
             FROM   [dbo].[school_engagement_snapshots]
             WHERE  school_id   = @school_id
               AND  grade_level = 12
             ORDER  BY snapshot_date DESC`,
          );
        return engResult.recordset[0]?.low_engagement_count ?? 0;
      })(),
      pct_of_seniors: totalSeniors > 0
        ? Math.round(
            (((await (async () => {
              const er = await pool
                .request()
                .input('school_id', sql.Int, schoolId)
                .query<{ low_engagement_count: number }>(
                  `SELECT TOP 1 low_engagement_count
                   FROM   [dbo].[school_engagement_snapshots]
                   WHERE  school_id   = @school_id
                     AND  grade_level = 12
                   ORDER  BY snapshot_date DESC`,
                );
              return er.recordset[0]?.low_engagement_count ?? 0;
            })()) / totalSeniors) * 10000),
          ) / 100
        : 0,
    },
  ];
}

async function queryCounselingCapacity(schoolId: number): Promise<CsvRow[]> {
  const pool = await getPool();

  // Total students across all grades from latest readiness snapshot
  const studentsResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ total_students: number }>(
      `SELECT SUM(total_students) AS total_students
       FROM   [dbo].[school_readiness_snapshots]
       WHERE  school_id     = @school_id
         AND  snapshot_date = (
               SELECT MAX(snapshot_date)
               FROM   [dbo].[school_readiness_snapshots]
               WHERE  school_id = @school_id
             )`,
    );

  // Active advisors count (school_admins with role 'advisor' or 'counselor')
  const advisorResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ advisor_count: number }>(
      `SELECT COUNT(*) AS advisor_count
       FROM   [dbo].[school_admins]
       WHERE  school_id = @school_id
         AND  is_active = 1`,
    );

  // Flagged needs-attention across all grades from latest engagement snapshot
  const flaggedResult = await pool
    .request()
    .input('school_id', sql.Int, schoolId)
    .query<{ flagged_total: number; mau_total: number; prev_flagged_total: number }>(
      `WITH ranked AS (
         SELECT grade_level,
                flagged_needs_attention,
                mau,
                snapshot_date,
                ROW_NUMBER() OVER (PARTITION BY grade_level ORDER BY snapshot_date DESC) AS rn
         FROM   [dbo].[school_engagement_snapshots]
         WHERE  school_id = @school_id
       )
       SELECT
         SUM(CASE WHEN rn = 1 THEN flagged_needs_attention ELSE 0 END) AS flagged_total,
         SUM(CASE WHEN rn = 1 THEN mau                    ELSE 0 END) AS mau_total,
         SUM(CASE WHEN rn = 2 THEN flagged_needs_attention ELSE 0 END) AS prev_flagged_total
       FROM ranked
       WHERE rn IN (1, 2)`,
    );

  const totalStudents  = studentsResult.recordset[0]?.total_students  ?? 0;
  const advisorCount   = advisorResult.recordset[0]?.advisor_count    ?? 0;
  const flaggedTotal   = flaggedResult.recordset[0]?.flagged_total     ?? 0;
  const mauTotal       = flaggedResult.recordset[0]?.mau_total         ?? 0;
  const prevFlagged    = flaggedResult.recordset[0]?.prev_flagged_total ?? 0;

  const ratio          = advisorCount > 0
    ? Math.round((totalStudents / advisorCount) * 10) / 10
    : 0;

  const pctFlagged     = mauTotal > 0
    ? Math.round((flaggedTotal / mauTotal) * 10000) / 100
    : 0;

  const changeFlagged  = flaggedTotal - prevFlagged;

  return [
    { metric: 'advisor_to_student_ratio',   value: ratio       },
    { metric: 'pct_flagged_needs_attention', value: pctFlagged  },
    { metric: 'change_in_flagged_30_days',   value: changeFlagged },
  ];
}

// ── main builder (now async + school_id–scoped) ───────────────────────────────

async function buildCsvContent(
  scope:    ExportScope,
  filters:  Record<string, unknown>,
  schoolId: number,
): Promise<CsvRow[]> {
  const term        = typeof filters.term === 'string' ? filters.term : 'Unknown Term';
  const gradeLevels = Array.isArray(filters.grade_levels)
    ? (filters.grade_levels as number[])
    : [9, 10, 11, 12];

  switch (scope) {
    case 'readiness_distribution':
      return queryReadinessDistribution(schoolId, gradeLevels);

    case 'engagement_metrics':
      return queryEngagementMetrics(schoolId, term, gradeLevels);

    case 'improvement_trends':
      return queryImprovementTrends(schoolId, term, gradeLevels);

    case 'college_intent':
      return queryCollegeIntent(schoolId);

    case 'trajectory':
      return queryTrajectory(schoolId, term, gradeLevels);

    case 'senior_risk':
      return querySeniorRisk(schoolId);

    case 'counseling_capacity':
      return queryCounselingCapacity(schoolId);

    default:
      return [];
  }
}

// ── CSV serialiser (unchanged) ─────────────────────────────────────────────────

function rowsToCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines   = rows.map((row) =>
    headers.map((h) => {
      const v = String(row[h] ?? '');
      return v.includes(',') || v.includes('\n') || v.includes('"')
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(','),
  );
  return [headers.join(','), ...lines].join('\n');
}

// ── job processor ─────────────────────────────────────────────────────────────

/**
 * processExportJob — runs inside setImmediate (after HTTP response is sent).
 *
 * school_id is required for multi-tenant query isolation.
 * In DEV: generates CSV in-process and writes to EXPORT_DIR.
 * In PROD: replace the body with a BullMQ job enqueue.
 */
export async function processExportJob(params: {
  export_id: string;
  scope:     ExportScope;
  filters:   Record<string, unknown>;
  school_id: number;
}): Promise<void> {
  const { export_id, scope, filters, school_id } = params;

  try {
    await repo.markProcessing(export_id);

    const rows       = await buildCsvContent(scope, filters, school_id);
    const csvContent = rowsToCsv(rows);
    const fileName   = `${export_id}.csv`;
    const filePath   = path.join(EXPORT_DIR, fileName);

    fs.writeFileSync(filePath, csvContent, 'utf8');

    const stats = fs.statSync(filePath);
    await repo.markCompleted({
      export_id,
      row_count:       rows.length,
      file_size_bytes: stats.size,
    });
  } catch (err: any) {
    await repo.markFailed(
      export_id,
      JSON.stringify({
        message: err?.message,
        stack: err?.stack,
      }),
    ).catch(() => {}); // never throw from background job
  }
}




