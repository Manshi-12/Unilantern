import { Router } from 'express';
import multer from 'multer';
import { verifyJWT } from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard } from '../../../../middlewares/roleGuard.middleware';
import { SchoolScope } from '../../../../middlewares/schoolScope.middleware';
import { studentsRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import {
  createRosterUpload,
  listRosterUploads,
  getRosterUpload,
  getRosterUploadErrors,
  createInviteLink,
  listInviteLinks,
  revokeInviteLink,
  createTransfer,
  listTransfers,
  approveTransfer,
  rejectTransfer,
} from '../controllers/students.controller';
import {
  createInviteLinkValidator,
  inviteIdParamValidator,
  createTransferValidator,
  transferIdParamValidator,
  uploadIdParamValidator,
} from '../validators/students.validation';

const router = Router();

// multer — memory storage, CSV only, 10MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(verifyJWT, RoleGuard('school_admin'), SchoolScope, studentsRateLimiter);

// Roster uploads
router.post('/roster/upload', upload.single('file'), createRosterUpload);  // ← multer added, validator removed
router.get('/roster/uploads', listRosterUploads);
router.get('/roster/uploads/:uploadId', uploadIdParamValidator, getRosterUpload);
router.get('/roster/uploads/:uploadId/errors', uploadIdParamValidator, getRosterUploadErrors);

// Invite links
router.post('/invite-links', createInviteLinkValidator, createInviteLink);
router.get('/invite-links', listInviteLinks);
router.delete('/invite-links/:inviteId', inviteIdParamValidator, revokeInviteLink);

// Transfers
router.post('/transfers', createTransferValidator, createTransfer);
router.get('/transfers', listTransfers);
router.put('/transfers/:transferId/approve', transferIdParamValidator, approveTransfer);
router.put('/transfers/:transferId/reject', transferIdParamValidator, rejectTransfer);

export default router;




