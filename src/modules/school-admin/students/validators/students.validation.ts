import { body, param } from 'express-validator';

export const createRosterUploadValidator = [
  body('file_name')
    .notEmpty().withMessage('file_name is required')
    .isString().withMessage('file_name must be a string'),
];

export const createInviteLinkValidator = [
  body('max_uses')
    .notEmpty().withMessage('max_uses is required')
    .isInt({ min: 1 }).withMessage('max_uses must be a positive integer'),
  body('expires_at')
    .notEmpty().withMessage('expires_at is required')
    .isISO8601().withMessage('expires_at must be a valid ISO8601 date'),
];

export const inviteIdParamValidator = [
  param('inviteId')
    .notEmpty().withMessage('inviteId is required')
    .isInt({ min: 1 }).withMessage('inviteId must be a positive integer'),
];

export const createTransferValidator = [
  body('student_id')
    .notEmpty().withMessage('student_id is required')
    .isInt({ min: 1 }).withMessage('student_id must be a positive integer'),
  body('to_school_id')
    .notEmpty().withMessage('to_school_id is required')
    .isInt({ min: 1 }).withMessage('to_school_id must be a positive integer'),
  body('transfer_reason')
    .optional()
    .isString().withMessage('transfer_reason must be a string'),
];

export const transferIdParamValidator = [
  param('transferId')
    .notEmpty().withMessage('transferId is required')
    .isInt({ min: 1 }).withMessage('transferId must be a positive integer'),
];

export const uploadIdParamValidator = [
  param('uploadId')
    .notEmpty().withMessage('uploadId is required')
    .isInt({ min: 1 }).withMessage('uploadId must be a positive integer'),
];




