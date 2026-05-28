import type {
  Request,
  Response,
  NextFunction,
}
from "express";

import {
  advisorAuthService,
}
from "./advisor-auth.service.js";

import {
  UnauthorizedError,
}
from "../../../shared/errors/app-error.js";

import {
  RegisterAdvisorSchema,
  LoginAdvisorSchema,
  ChangePasswordSchema,
}
from "./advisor-auth.schema.js";


export const advisorAuthController = {

  // =====================================
  // API 1 — Validate Invite Token
  // =====================================

  validateInviteToken: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const token =
        Array.isArray(req.params.token)
          ? req.params.token[0]
          : req.params.token;

      const result =
        await advisorAuthService
          .validateInviteToken(token);

      return res.status(200).json({
        data: result,
      });

    } catch (err) {

      next(err);
    }
  },

  // =====================================
  // API 2 — Register Advisor
  // =====================================

  registerAdvisor: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        RegisterAdvisorSchema
          .parse(req.body);

      const result =
        await advisorAuthService
          .registerAdvisor(parsed);

      return res.status(201).json({
        data: result,
      });

    } catch (err) {

      next(err);
    }
  },

  // =====================================
  // API 3 — Login Advisor
  // =====================================

  loginAdvisor: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        LoginAdvisorSchema
          .parse(req.body);

      const ip =
        req.ip || null;

      const userAgent =
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"]
          : null;

      const {
        data,
        accessToken,
        refreshToken,
      } =
        await advisorAuthService
          .loginAdvisor(
            parsed,
            ip,
            userAgent,
          );


      return res.status(200).json({
        data,
        accessToken,
        refreshToken,
      });

    } catch (err) {

      next(err);
    }
  },

  // =====================================
  // API 4 — Logout Advisor
  // =====================================

  logoutAdvisor: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

     const refreshToken =
  req.body.refresh_token;

      await advisorAuthService
        .logoutAdvisor(
          refreshToken || "",
        );


      return res.status(200).json({
        data: {
          message:
            "Logged out successfully",
        },
      });

    } catch (err) {

      next(err);
    }
  },

  // =====================================
  // API 5 — Refresh Token
  // =====================================

  refreshToken: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

     const refreshToken =
  req.body.refresh_token;

      if (!refreshToken) {

        throw new UnauthorizedError(
          "No refresh token provided",
        );
      }

      const {
        data,
        newAccessToken,
        newRefreshToken,
      } =
        await advisorAuthService
          .refreshToken(
            refreshToken,
          );
      return res.status(200).json({
  data,
  accessToken: newAccessToken,
  refreshToken: newRefreshToken,
});

    } catch (err) {

      next(err);
    }
  },

  // =====================================
  // API 6 — Change Password
  // =====================================

  changePassword: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        ChangePasswordSchema
          .parse(req.body);

      const advisorId =
      res.locals.advisorId;

      const result =
        await advisorAuthService
          .changePassword(
            advisorId,
            parsed,
          );

      return res.status(200).json({
        data: result,
      });

    } catch (err) {

      next(err);
    }
  },
};