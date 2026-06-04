import { z } from 'zod';

const FEEDBACK_TYPES = ['bug', 'feature', 'general', 'complaint'] as const;

export const createFeedbackSchema = z.object({
  type:          z.enum(FEEDBACK_TYPES, {
                   error: `type must be one of: ${FEEDBACK_TYPES.join(', ')}`,
                 }),
  message:       z.string().min(1, 'message is required').max(5000, 'message must be under 5000 characters'),
  allow_contact: z.boolean({ error: 'allow_contact is required' }),
});

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;




