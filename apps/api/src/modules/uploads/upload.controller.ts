// apps/api/src/modules/uploads/upload.controller.ts
import { Response } from 'express';
import { z } from 'zod';
import { s3Client } from './s3.client';
import { User } from '@/modules/users/user.model';
import { Task } from '@/modules/tasks/task.model';
import { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { logger } from '@/config/logger';

const presignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().min(1).max(10 * 1024 * 1024), // 10MB
});

const deleteFileSchema = z.object({
  fileKey: z.string().min(1),
});

export class UploadController {
  static getPresignedUrl = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { filename, contentType, fileSize } = presignedUrlSchema.parse(req.body);

    // Generate unique file key
    const fileKey = s3Client.generateFileKey(userId, filename);

    // Get presigned URL
    const { uploadUrl, publicUrl } = await s3Client.getPresignedUploadUrl(
      fileKey,
      contentType,
      3600 // 1 hour expiry
    );

    res.json({
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        fileKey,
        expiresIn: 3600,
      },
    });
  });

  static directUpload = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw createError('No files provided', 400);
    }

    const uploadPromises = files.map(async (file) => {
      const fileKey = s3Client.generateFileKey(userId, file.originalname);
      
      try {
        const publicUrl = await s3Client.uploadFile(
          fileKey,
          file.buffer,
          file.mimetype,
          {
            userId,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          }
        );

        return {
          filename: fileKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: publicUrl,
        };
      } catch (error) {
        logger.error(`Failed to upload file ${file.originalname}:`, error);
        throw createError(`Failed to upload file ${file.originalname}`, 500);
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: { files: uploadedFiles },
    });
  });

  static uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw createError('No avatar file provided', 400);
    }

    // Validate image file
    if (!file.mimetype.startsWith('image/')) {
      throw createError('Avatar must be an image file', 400);
    }

    // Generate avatar file key
    const fileKey = s3Client.generateFileKey(userId, file.originalname, 'avatars');

    try {
      // Upload to S3
      const avatarUrl = await s3Client.uploadFile(
        fileKey,
        file.buffer,
        file.mimetype,
        {
          userId,
          type: 'avatar',
          uploadedAt: new Date().toISOString(),
        }
      );

      // Update user avatar URL
      const user = await User.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl },
        { new: true }
      );

      if (!user) {
        throw createError('User not found', 404);
      }

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl,
          user: {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to upload avatar:', error);
      throw createError('Failed to upload avatar', 500);
    }
  });

  static deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { fileKey } = deleteFileSchema.parse(req.params);

    try {
      // Verify file belongs to user by checking the key pattern
      if (!fileKey.includes(userId)) {
        throw createError('Access denied', 403);
      }

      // Delete from S3
      await s3Client.deleteFile(fileKey);

      // TODO: Remove file references from tasks/attachments
      // This would involve updating Task documents that reference this file

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw createError('Failed to delete file', 500);
    }
  });

  static attachFileToTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: z.string() }).parse(req.params);
    const { fileKey, filename, originalName, mimeType, size, url } = z.object({
      fileKey: z.string(),
      filename: z.string(),
      originalName: z.string(),
      mimeType: z.string(),
      size: z.number(),
      url: z.string(),
    }).parse(req.body);

    // Verify user has access to the task
    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
    });

    if (!task) {
      throw createError('Task not found or access denied', 404);
    }

    // Add attachment to task
    const attachment = {
      filename: fileKey,
      originalName,
      mimeType,
      size,
      url,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    res.status(201).json({
      success: true,
      message: 'File attached to task successfully',
      data: { attachment },
    });
  });

  static removeAttachmentFromTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId, attachmentId } = z.object({
      taskId: z.string(),
      attachmentId: z.string(),
    }).parse(req.params);

    // Find and update task
    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ],
        'attachments._id': attachmentId,
      },
      {
        $pull: {
          attachments: { _id: attachmentId },
        },
      },
      { new: true }
    );

    if (!task) {
      throw createError('Task or attachment not found', 404);
    }

    res.json({
      success: true,
      message: 'Attachment removed from task successfully',
    });
  });
}