export type CourseRigor =
  | "standard"
  | "some_advanced"
  | "heavy_advanced"
  | "most_rigorous";

export type TestStatus = "no_test" | "sat" | "act";

export interface UpdateAcademicsRequestDto {
  unweighted_gpa?: number | null;
  course_rigor?: CourseRigor | null;
  test_status?: TestStatus;
  sat_score?: number | null;
  act_score?: number | null;
}
