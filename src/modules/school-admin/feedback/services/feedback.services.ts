import { FeedbackRepository }    from '../repositories/feedback.repository';
import { AuthRepository }        from '../../../auth/school-admin/repositories/auth.repository';
import { CreateFeedbackDto }     from '../dto/create-feedback.dto';
import { CreateFeedbackResult }  from '../interfaces/feedback.interface';

const repo     = new FeedbackRepository();
const authRepo = new AuthRepository();

// ─── #58 POST /v1/school-admin/feedback ───────────────────────────────────────

export const submitFeedback = async (
  admin_id:   number,
  school_id:  number,
  body:       CreateFeedbackDto,
  meta: {
    page_name:   string | null;
    app_version: string | null;
    device_type: string | null;
  },
): Promise<CreateFeedbackResult> => {

  const { feedback_id } = await repo.insertFeedback({
    admin_id,
    school_id,
    type:          body.type,
    message:       body.message,
    allow_contact: body.allow_contact,
    page_name:     meta.page_name,
    app_version:   meta.app_version,
    device_type:   meta.device_type,
  });

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'FEEDBACK_SUBMITTED',
    target_resource: 'feedback',
    metadata:        { feedback_id, type: body.type },
  });

  return { feedback_id, submitted: true };
};




