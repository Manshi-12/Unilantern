import { z }
from "zod";

// =====================================
// REGISTER
// =====================================

export const RegisterAdvisorSchema =
  z.object({

    token:
      z.string()
        .min(
          1,
          "Token is required",
        ),

      email:
      z.string()
      .email(
        "Invalid email format",
        ),

    full_name:
      z.string()
        .min(
          2,
          "Full name must be at least 2 characters",
        ),

    contact_no:
      z.string()
        .optional(),

    password:
      z.string()
        .min(
          8,
          "Password must be at least 8 characters",
        ),

    confirm_password:
      z.string()
        .min(
          8,
          "Confirm password must be at least 8 characters",
        ),
  })

  .refine(
    (data) =>
      data.password ===
      data.confirm_password,

    {
      message:
        "Passwords do not match",

      path:
        ["confirm_password"],
    },
  );

// =====================================
// LOGIN
// =====================================

export const LoginAdvisorSchema =
  z.object({

    email:
      z.string()
        .email(
          "Invalid email format",
        ),

    password:
      z.string()
        .min(
          1,
          "Password is required",
        ),
  });

// =====================================
// CHANGE PASSWORD
// =====================================

export const ChangePasswordSchema =
  z.object({

    current_password:
      z.string()
        .min(
          1,
          "Current password is required",
        ),

    new_password:
      z.string()
        .min(
          8,
          "New password must be at least 8 characters",
        ),

    confirm_password:
      z.string()
        .min(
          8,
          "Confirm password must be at least 8 characters",
        ),
  })

  .refine(
    (data) =>
      data.new_password ===
      data.confirm_password,

    {
      message:
        "Passwords do not match",

      path:
        ["confirm_password"],
    },
  )

  .refine(
    (data) =>
      data.current_password !==
      data.new_password,

    {
      message:
        "New password must be different from current password",

      path:
        ["new_password"],
    },
  );

// =====================================
// TYPES
// =====================================

export type RegisterAdvisorInput =
  z.infer<
    typeof RegisterAdvisorSchema
  >;

export type LoginAdvisorInput =
  z.infer<
    typeof LoginAdvisorSchema
  >;

export type ChangePasswordInput =
  z.infer<
    typeof ChangePasswordSchema
  >;