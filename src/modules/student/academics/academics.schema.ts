import { z } from "zod";

const courseRigorEnum = z.enum([
  "standard",
  "some_advanced",
  "heavy_advanced",
  "most_rigorous",
]);

const testStatusEnum = z.enum(["no_test", "sat", "act"]);

export const updateAcademicsSchema = z
  .object({
    unweighted_gpa: z
      .number()
      .min(0.0, "GPA_OUT_OF_RANGE: GPA must be between 0.00 and 4.00")
      .max(4.0, "GPA_OUT_OF_RANGE: GPA must be between 0.00 and 4.00")
      .nullable()
      .optional(),

    course_rigor: courseRigorEnum.nullable().optional(),

    test_status: testStatusEnum.optional(),

    sat_score: z
      .number()
      .int()
      .min(400, "SAT score must be between 400 and 1600")
      .max(1600, "SAT score must be between 400 and 1600")
      .nullable()
      .optional(),

    act_score: z
      .number()
      .int()
      .min(1, "ACT score must be between 1 and 36")
      .max(36, "ACT score must be between 1 and 36")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    // GPA must have at most 2 decimal places
    if (data.unweighted_gpa != null) {
      const scaled = data.unweighted_gpa * 100;
      if (Math.abs(scaled % 1) > 1e-9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unweighted_gpa"],
          message: "GPA must have at most 2 decimal places",
        });
      }
    }

    // Only one of sat_score or act_score may be provided — never both.
    if (data.sat_score != null && data.act_score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["act_score"],
        message: "Only one test score allowed: provide either sat_score or act_score, not both",
      });
    }

    if (data.test_status === "sat" && data.act_score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["act_score"],
        message: "ACT score cannot be provided when test_status is sat",
      });
    }

    if (data.test_status === "act" && data.sat_score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sat_score"],
        message: "SAT score cannot be provided when test_status is act",
      });
    }
  });

export type UpdateAcademicsSchema = z.infer<typeof updateAcademicsSchema>;
