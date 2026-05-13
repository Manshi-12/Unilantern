import { z } from "zod";

const awardLevelEnum = z.enum(["school", "district", "state", "national"]);
const frequencyEnum = z.enum(["one_time", "multiple_years", "annual_since"]);

const annualSinceGradeField = z
  .number()
  .int()
  .min(9, "annual_since_grade must be between 9 and 12")
  .max(12, "annual_since_grade must be between 9 and 12")
  .nullable()
  .optional();

export const createAwardSchema = z
  .object({
    award_name: z
      .string()
      .trim()
      .min(1, "award_name is required")
      .max(350, "award_name must be 350 characters or fewer"),

    award_level: awardLevelEnum,

    frequency: frequencyEnum,

    annual_since_grade: annualSinceGradeField,

    display_order: z.number().int().min(0).optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "annual_since" && data.annual_since_grade == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annual_since_grade"],
        message: "annual_since_grade is required when frequency is 'annual_since'",
      });
    }
  });

export const updateAwardSchema = z
  .object({
    award_name: z
      .string()
      .trim()
      .min(1)
      .max(350)
      .optional(),

    award_level: awardLevelEnum.optional(),

    frequency: frequencyEnum.optional(),

    annual_since_grade: annualSinceGradeField,

    display_order: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "annual_since" && data.annual_since_grade == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annual_since_grade"],
        message: "annual_since_grade is required when frequency is 'annual_since'",
      });
    }
  });

export type CreateAwardSchema = z.infer<typeof createAwardSchema>;
export type UpdateAwardSchema = z.infer<typeof updateAwardSchema>;
