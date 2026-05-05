import type { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../../shared/response/http-status.js";
import { sendSuccess } from "../../shared/response/success.js";
import { serviceCreateSchema, serviceUpdateSchema } from "./service.schema.js";
import type { ServiceService } from "./service.service.js";

export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  listService = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      sendSuccess(res, await this.serviceService.list(user.student_id), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  createService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const dto = serviceCreateSchema.parse(req.body);
      sendSuccess(res, await this.serviceService.create(user.student_id, dto), HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  };

  updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const serviceId = Number(req.params.service_id);
      const dto = serviceUpdateSchema.parse(req.body);
      sendSuccess(res, await this.serviceService.update(user.student_id, serviceId, dto), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.user as { student_id: number };
      const serviceId = Number(req.params.service_id);
      sendSuccess(res, await this.serviceService.delete(user.student_id, serviceId), HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}
