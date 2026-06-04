import { Request, Response }    from 'express';
import { asyncHandler }         from '../../../../shared/utils/asyncHandler';
import { ApiResponse }          from '../../../../shared/responses/ApiResponse';
import { CreateFeedbackDto }    from '../dto/create-feedback.dto';
import * as FeedbackService     from '../services/feedback.services';

// ─── #58 POST /v1/school-admin/feedback ───────────────────────────────────────

export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  const admin_id  = (req as any).jwtPayload.adminId   as number;
  const school_id = (req as any).jwtPayload.school_id as number;
  const body      = req.body as CreateFeedbackDto;

  // Auto-capture from request — never trust client for these
  const meta = {
    page_name:   (req.headers['x-page-name']   as string) ?? null,
    app_version: (req.headers['x-app-version'] as string) ?? null,
    device_type: (req.headers['x-device-type'] as string) ?? null,
  };

  ApiResponse.success(
    res,
    await FeedbackService.submitFeedback(admin_id, school_id, body, meta),
    201,
  );
});




