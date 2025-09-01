// apps/api/src/modules/uploads/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { UploadController } from './upload.controller';
import { authenticateToken } from '@/middleware/auth';
import { uploadRateLimitMiddleware } from '@/middleware/rateLimit';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

// All upload routes require authentication
router.use(authenticateToken);

// Upload routes with rate limiting
router.post('/presign', uploadRateLimitMiddleware, UploadController.getPresignedUrl);
router.post('/direct', uploadRateLimitMiddleware, upload.array('files'), UploadController.directUpload);
router.post('/avatar', uploadRateLimitMiddleware, upload.single('avatar'), UploadController.uploadAvatar);
router.delete('/:fileKey', UploadController.deleteFile);

export default router;