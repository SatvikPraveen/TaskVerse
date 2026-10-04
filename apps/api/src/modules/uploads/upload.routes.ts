// apps/api/src/modules/uploads/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';

import { authenticateToken } from '@/middleware/auth';
import { createError } from '@/middleware/error';
import { uploadRateLimitMiddleware } from '@/middleware/rateLimit';

import { UploadController } from './upload.controller';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(createError(`File type ${file.mimetype} not allowed`, 400));
  },
});

const router = Router();

router.use(authenticateToken);

router.post('/presign', uploadRateLimitMiddleware, UploadController.getPresignedUrl);
router.post('/direct', uploadRateLimitMiddleware, upload.array('files'), UploadController.directUpload);
router.post('/avatar', uploadRateLimitMiddleware, upload.single('avatar'), UploadController.uploadAvatar);
router.post('/tasks/:taskId/attachments', UploadController.attachFileToTask);
router.delete('/tasks/:taskId/attachments/:attachmentId', UploadController.removeAttachmentFromTask);
router.delete('/:fileKey(*)', UploadController.deleteFile);

export default router;
