export type CourseRigor =
  | "standard"
  | "some_advanced"
  | "heavy_advanced"
  | "most_rigorous";

export interface UpdateAcademicsRequestDto {
  unweighted_gpa?: number | null;
  course_rigor?: CourseRigor | null;
  sat_score?: number | null;
  act_score?: number | null;
}
