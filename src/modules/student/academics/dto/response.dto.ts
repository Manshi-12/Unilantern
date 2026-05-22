import type { CourseRigor, TestStatus } from "./request.dto.js";

export interface AcademicsResponseDto {
  has_data: boolean;
  academics_id: string | null;
  unweighted_gpa: number | null;
  course_rigor: CourseRigor | null;
  test_status: TestStatus;
  sat_score: number | null;
  act_score: number | null;
  updated_at: string | null;
  score_recalc_queued?: boolean;
}
