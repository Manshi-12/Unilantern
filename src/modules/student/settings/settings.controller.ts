import type { Request, Response, NextFunction } from "express";
import { SettingsService } from "./settings.service.js";
import { submitFeedbackSchema, deleteAccountSchema } from "./settings.schema.js";

export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user;
      const validated = submitFeedbackSchema.parse(req.body);
      
      const metadata = {
        platform: req.headers["x-platform"] as string,
        app_version: req.headers["x-app-version"] as string,
        device_type: req.headers["user-agent"] as string, // Simple device type capture
      };

      const result = await this.settingsService.submitFeedback(
        user.student_id,
        user.school_id,
        user.role,
        validated,
        metadata
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      deleteAccountSchema.parse(req.body);
      
      const result = await this.settingsService.deleteAccount(studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
