import { DashboardRepository } from '../repositories/dashboard_repository';
import { ApiError } from '../../../../shared/errors/ApiError';

const repo = new DashboardRepository();

// ─── 2.1 Section A: Overview ──────────────────────────────────────────────────

export const getOverview = async (school_id: number) => {
  const snapshot = await repo.getOverviewSnapshot(school_id);
  if (!snapshot) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No overview snapshot found for this school.');

  return {
    active_students_count:  snapshot.active_students_count,
    competitive_plus_pct:   Number(Number(snapshot.competitive_plus_pct).toFixed(1)),
    improved_last_term_pct: Number(Number(snapshot.improved_last_term_pct).toFixed(1)),
    avg_colleges_saved:     0,
    total_schools_linked:   snapshot.total_schools_linked,
    snapshot_generated_at:  snapshot.snapshot_generated_at,
    cache_hit:              false,
    data_as_of:             snapshot.data_as_of,
  };
};

// ─── 2.2 Section B: College Intent ───────────────────────────────────────────

export const getCollegeIntent = async (school_id: number) => {
  const [colleges, geo, bands] = await Promise.all([
    repo.getCollegeIntentSnapshots(school_id),
    repo.getGeoIntent(school_id),
    repo.getBandDistribution(school_id),
  ]);

  const total = (bands.foundational ?? 0) + (bands.developing ?? 0) +
    (bands.competitive ?? 0) + (bands.strongly_competitive ?? 0) + (bands.exceptional ?? 0);

  const pct = (n: number) => total > 0 ? Number((n / total * 100).toFixed(1)) : 0;

  return {
    top_saved_colleges: colleges.map(c => ({
      college_id:      c.college_id,
      save_count:      c.save_count,
      pct_of_students: Number(c.pct_competitive_or_higher?.toFixed(1) ?? 0),
    })),
    band_distribution: {
      foundational:         { count: bands.foundational ?? 0,         pct: pct(bands.foundational ?? 0) },
      developing:           { count: bands.developing ?? 0,           pct: pct(bands.developing ?? 0) },
      competitive:          { count: bands.competitive ?? 0,          pct: pct(bands.competitive ?? 0) },
      strongly_competitive: { count: bands.strongly_competitive ?? 0, pct: pct(bands.strongly_competitive ?? 0) },
      exceptional:          { count: bands.exceptional ?? 0,          pct: pct(bands.exceptional ?? 0) },
    },
    above_readiness_pct:      Number((colleges[0]?.pct_saving_above_readiness ?? 0).toFixed(1)),
    in_state_intent_pct:      Number((geo?.pct_in_state ?? 0).toFixed(1)),
    out_of_state_intent_pct:  Number((100 - (geo?.pct_in_state ?? 0)).toFixed(1)),
    snapshot_generated_at:    colleges[0]?.snapshot_date ?? null,
    data_as_of:               colleges[0]?.snapshot_date ?? null,
  };
};

// ─── 2.3 Section C: Gap Analysis ─────────────────────────────────────────────

export const getGapAnalysis = async (school_id: number) => {
  const colleges = await repo.getTopCollegesGapAnalysis(school_id);
  if (!colleges.length) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No gap analysis data found.');

  return {
    top_colleges: colleges.map(c => ({
      college_id:         c.college_id,
      competitive_plus_pct: Number(c.pct_competitive_or_higher.toFixed(1)),
      primary_limiter:    c.primary_limiting_category,
      trend_direction:    c.trend_direction,
      student_count:      c.save_count,
    })),
    snapshot_generated_at: colleges[0].snapshot_date,
  };
};

// ─── 2.4 Section D: Equity & Access ──────────────────────────────────────────

export const getEquityAccess = async (school_id: number) => {
  const [readiness, engagement] = await Promise.all([
    repo.getReadinessByGrade(school_id),
    repo.getEngagementByGrade(school_id),
  ]);

  if (!readiness.length) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No equity data found.');

  const gradeKey = (g: number) => `grade_${g}`;

  const band_by_grade: Record<string, any> = {};
  for (const r of readiness) {
    band_by_grade[gradeKey(r.grade_level)] = {
      band_counts: {
        foundational:         r.foundational_count,
        developing:           r.developing_count,
        competitive:          r.competitive_count,
        strongly_competitive: r.strongly_competitive_count,
        exceptional:          r.exceptional_count,
      },
      total_students: r.total_students,
    };
  }

  const engagement_by_cohort = engagement.map(e => ({
    grade_level:             e.grade_level,
    low_engagement_count:    e.low_engagement_count,
    flagged_needs_attention: e.flagged_needs_attention,
  }));

  const improvement_trends = readiness.map(r => ({
    grade_level:     r.grade_level,
    pct_improved:    Number(r.pct_improved.toFixed(1)),
  }));

  return {
    band_by_grade,
    engagement_by_cohort,
    improvement_trends,
    snapshot_generated_at: readiness[0] ? new Date().toISOString() : null,
    data_as_of:            readiness[0] ? new Date().toISOString() : null,
  };
};

// ─── 2.5 Section F: Trajectory ───────────────────────────────────────────────

export const getTrajectory = async (school_id: number) => {
  const [byGrade, byTerm] = await Promise.all([
    repo.getTrajectoryByGrade(school_id),
    repo.getTrajectoryByTerm(school_id),
  ]);

  if (!byGrade.length) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No trajectory data found.');

  const trajectory_by_grade: Record<string, any> = {};
  let totalImproving = 0, totalStudents = 0;

  for (const r of byGrade) {
    const total = r.total_students || 1;
    trajectory_by_grade[`grade_${r.grade_level}`] = {
      improving_pct: Number((r.improving_count / total * 100).toFixed(1)),
      flat_pct:      Number((r.flat_count / total * 100).toFixed(1)),
      declining_pct: Number((r.declining_count / total * 100).toFixed(1)),
      total_students: r.total_students,
    };
    totalImproving += r.improving_count;
    totalStudents  += r.total_students;
  }

  const trajectory_by_term = byTerm.map(t => ({
    term:          t.snapshot_date,
    improving_pct: Number((t.improving_count / (t.total_students || 1) * 100).toFixed(1)),
    flat_pct:      Number((t.flat_count      / (t.total_students || 1) * 100).toFixed(1)),
    declining_pct: Number((t.declining_count / (t.total_students || 1) * 100).toFixed(1)),
  }));

  return {
    trajectory_by_grade,
    trajectory_by_term,
    school_wide_improving_pct: Number((totalImproving / (totalStudents || 1) * 100).toFixed(1)),
    snapshot_generated_at:     byGrade[0].snapshot_date,
  };
};

// ─── 2.6 Section G: Engagement ───────────────────────────────────────────────

export const getEngagement = async (school_id: number) => {
  const rows = await repo.getEngagementSnapshots(school_id);
  if (!rows.length) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No engagement data found.');

  const totalStudents  = rows.reduce((s, r) => s + (r.dau + r.wau + r.mau), 0) || 1;
  const totalSessions  = rows.reduce((s, r) => s + r.wau, 0);
  const highCount      = rows.reduce((s, r) => s + r.mau, 0);
  const lowCount       = rows.reduce((s, r) => s + r.low_engagement_count, 0);
  const medCount       = totalStudents - highCount - lowCount;

  return {
    engagement_tiers: {
      high_engagement:   { student_count: highCount, avg_band_label: 'Competitive' },
      medium_engagement: { student_count: medCount,  avg_band_label: 'Developing' },
      low_engagement:    { student_count: lowCount,  avg_band_label: 'Foundational' },
    },
    engagement_vs_readiness: rows.map(r => ({
      grade_level:      r.grade_level,
      low_engagement:   r.low_engagement_count,
      needs_attention:  r.flagged_needs_attention,
    })),
    avg_sessions_per_week: Number((totalSessions / rows.length).toFixed(1)),
    disclaimer: 'Correlation does not imply causation — engagement reflects platform usage only.',
    snapshot_generated_at: rows[0].snapshot_date,
  };
};

// ─── 2.7 Section H: Senior Risk ──────────────────────────────────────────────

export const getSeniorRisk = async (school_id: number) => {
  const snapshot = await repo.getSeniorRiskSnapshot(school_id);
  if (!snapshot) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No senior risk data found.');

  const total = snapshot.total_seniors || 1;
  const highRiskCount = Math.round(
    total * (snapshot.pct_below_competitive / 100) * (snapshot.pct_missing_essay / 100)
  );

  return {
    grade_12_total:          snapshot.total_seniors,
    below_competitive_pct:   Number(snapshot.pct_below_competitive.toFixed(1)),
    no_colleges_saved_pct:   Number(snapshot.pct_missing_match_or_safety.toFixed(1)),
    essay_not_started_pct:   Number(snapshot.pct_missing_essay.toFixed(1)),
    essay_not_finalized_pct: Number(snapshot.pct_missing_essay.toFixed(1)),
    high_risk_count:         highRiskCount,
    snapshot_generated_at:   snapshot.snapshot_date,
  };
};

// ─── 2.8 Section I: Counseling Capacity ──────────────────────────────────────

export const getCounselingCapacity = async (school_id: number) => {
  const data = await repo.getCounselingCapacity(school_id);

  const advisors  = data.active_advisors_count || 1;
  const students  = data.total_active_students || 0;
  const ratio     = `1:${Math.round(students / advisors)}`;
  const needsPct  = students > 0
    ? Number((data.needs_attention_count / students * 100).toFixed(1))
    : 0;

  return {
    active_advisors_count:   data.active_advisors_count,
    total_active_students:   data.total_active_students,
    advisor_to_student_ratio: ratio,
    needs_attention_pct:     needsPct,
    advisors_with_export:    data.advisors_with_export,
    snapshot_generated_at:   new Date().toISOString(),
  };
};

// ─── 2.9 Section J: Readiness Drivers ────────────────────────────────────────

export const getReadinessDrivers = async (school_id: number) => {
  const rows = await repo.getReadinessDrivers(school_id);
  if (!rows.length) throw ApiError.notFound('SNAPSHOT_NOT_FOUND', 'No readiness driver data found.');

  const sorted = [...rows].sort((a, b) => b.improving_count - a.improving_count);
  const bottlenecks = [...rows].sort((a, b) => b.declining_count - a.declining_count);

  const limiters = rows
    .map(r => r.primary_limiting_category)
    .filter(Boolean) as string[];

  const limiterFreq: Record<string, number> = {};
  for (const l of limiters) limiterFreq[l] = (limiterFreq[l] || 0) + 1;
  const topLimiter = Object.entries(limiterFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    top_improving_categories:  sorted.slice(0, 3).map(r => `Grade ${r.grade_level} Trajectory`),
    persistent_bottlenecks:    bottlenecks.slice(0, 3).map(r => r.primary_limiting_category ?? 'Unknown'),
    bottleneck_descriptions:   bottlenecks.slice(0, 3).map(r =>
      `Grade ${r.grade_level} students show a declining readiness trend with ${r.declining_count} students affected.`
    ),
    school_wide_limiter:       topLimiter,
    snapshot_generated_at:     rows[0].snapshot_date,
  };
};




