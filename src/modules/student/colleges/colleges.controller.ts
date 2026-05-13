// ── College Module Controller ────────────────────────────────────────────────

import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  saveCollegeSchema,
  updateSavedCollegeSchema,
  searchCollegesSchema,
} from "./colleges.schema.js";
import type { CollegesService } from "./colleges.service.js";

export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  // ── 9.1 GET /colleges/search ────────────────────────────────────────────────
  search = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const params = searchCollegesSchema.parse(req.query);
      const result = await this.collegesService.search(params);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── 9.2 GET /colleges/:college_id ───────────────────────────────────────────
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const collegeId = Number(req.params.college_id);
      const result = await this.collegesService.getById(collegeId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── 9.3 GET /students/me/colleges/saved ─────────────────────────────────────
  listSaved = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.collegesService.listSaved(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── 9.4 POST /students/me/colleges/saved ────────────────────────────────────
  saveCollege = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const dto = saveCollegeSchema.parse(req.body);
      const result = await this.collegesService.saveCollege(studentId, dto);
      sendSuccess(res, result, HttpStatus.CREATED);
    } catch (err) {
      next(err);
    }
  };

  // ── 9.5 PATCH /students/me/colleges/saved/:saved_id ─────────────────────────
  updateSaved = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const savedId = Number(req.params.saved_id);
      const dto = updateSavedCollegeSchema.parse(req.body);
      const result = await this.collegesService.updateSaved(studentId, savedId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── 9.6 DELETE /students/me/colleges/saved/:saved_id ────────────────────────
  unsaveCollege = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const savedId = Number(req.params.saved_id);
      await this.collegesService.unsaveCollege(studentId, savedId);
      sendSuccess(res, { deleted: true }, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── Fetch from external College Scorecard API ───────────────────────────────
  fetchFromScorecard = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const apiKey = process.env.SCORECARD_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          success: false,
          error: { code: "CONFIG_ERROR", message: "SCORECARD_API_KEY not configured" },
        });
        return;
      }

      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const count = typeof req.query.count === "string" ? Math.min(Number(req.query.count) || 5, 20) : 5;

      const result = await this.collegesService.fetchAndStoreFromScorecard(apiKey, query, count);
      sendSuccess(res, { colleges: result, total: result.length }, HttpStatus.OK, {
        source: "college_scorecard_api",
      });
    } catch (err) {
      next(err);
    }
  };
}
