import type { CourseRigor } from "./dto/request.dto.js";

export interface AcademicsRecord {
  academics_id: number;
  student_id: number;
  unweighted_gpa: number | null;
  course_rigor: CourseRigor | null;
  sat_score: number | null;
  act_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertAcademicsData {
  student_id: number;
  unweighted_gpa: number | null;
  course_rigor: string | null;
  sat_score: number | null;
  act_score: number | null;
}
