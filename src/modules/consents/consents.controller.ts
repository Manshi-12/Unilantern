import type { Request, Response, NextFunction } from "express";
import { ConsentsService } from "./consents.service.js";
import { grantConsentSchema, revokeConsentSchema, updateCollegeDataSharingSchema } from "./consents.schema.js";
import { ConsentType } from "./consents.types.js";

export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  getAllConsents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      const result = await this.consentsService.getAllConsents(studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  grantConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      const consentType = req.params.consent_type as ConsentType;
      
      // Validate consent type if it was passed in params instead of body
      // The spec 12.2 says POST /students/me/consents/:consent_type/grant
      const result = await this.consentsService.grantConsent(studentId, consentType);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  revokeConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      const consentType = req.params.consent_type as ConsentType;
      
      const result = await this.consentsService.revokeConsent(studentId, consentType);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCollegeDataSharing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      const result = await this.consentsService.getCollegeDataSharing(studentId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateCollegeDataSharing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = res.locals.user.student_id;
      const validated = updateCollegeDataSharingSchema.parse(req.body);
      
      const result = await this.consentsService.updateCollegeDataSharing(studentId, validated.enabled);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
