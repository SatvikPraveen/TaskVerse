// apps/api/src/modules/uploads/upload.controller.ts
import type { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { Task } from '@/modules/tasks/task.model';
import { User } from '@/modules/users/user.model';

import { s3Client } from './s3.client';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const presignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE),
});

const attachFileSchema = z.object({
  fileKey: z.string().min(1),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().min(1).max(MAX_FILE_SIZE),
  url: z.string().url(),
});

export class UploadController {
  static getPresignedUrl = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const { filename, contentType } = presignedUrlSchema.parse(req.body);

    const fileKey = s3Client.generateFileKey(userId, filename);
    const { uploadUrl, publicUrl } = await s3Client.getPresignedUploadUrl(fileKey, contentType, 3600);

    res.json({ success: true, data: { uploadUrl, publicUrl, fileKey, expiresIn: 3600 } });
  });

  static directUpload = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) throw createError('No files provided', 400);

    const uploadedFiles = await Promise.all(
      files.map(async file => {
        const fileKey = s3Client.generateFileKey(userId, file.originalname);
        const url = await s3Client.uploadFile(fileKey, file.buffer, file.mimetype, {
          userId,
          originalName: file.originalname,
        });
        return {
          filename: fileKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url,
        };
      })
    );

    res
      .status(201)
      .json({ success: true, message: 'Files uploaded successfully', data: { files: uploadedFiles } });
  });

  static uploadAvatar = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const file = req.file;
    if (!file) throw createError('No avatar file provided', 400);
    if (!file.mimetype.startsWith('image/')) throw createError('Avatar must be an image file', 400);

    const fileKey = s3Client.generateFileKey(userId, file.originalname, 'avatars');
    const avatarUrl = await s3Client.uploadFile(fileKey, file.buffer, file.mimetype, {
      userId,
      type: 'avatar',
    });

    const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
    if (!user) throw createError('User not found', 404);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl, user: { id: user._id, username: user.username, avatar: user.avatar } },
    });
  });

  static deleteFile = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const { fileKey } = z.object({ fileKey: z.string().min(1) }).parse(req.params);

    // Keys are namespaced as <prefix>/<userId>/<name>; enforce ownership structurally.
    const [, owner] = fileKey.split('/');
    if (owner !== userId) throw createError('Access denied', 403);

    await s3Client.deleteFile(fileKey);
    await Task.updateMany(
      { 'attachments.filename': fileKey },
      { $pull: { attachments: { filename: fileKey } } }
    );

    res.json({ success: true, message: 'File deleted successfully' });
  });

  static attachFileToTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    const input = attachFileSchema.parse(req.body);

    const task = await Task.findOne({
      _id: taskId,
      $or: [{ createdBy: userId }, { assignedTo: userId }],
    });
    if (!task) throw createError('Task not found or access denied', 404);

    task.attachments.push({
      filename: input.fileKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      url: input.url,
      uploadedBy: new mongoose.Types.ObjectId(userId),
      uploadedAt: new Date(),
    });
    await task.save();

    const attachment = task.attachments[task.attachments.length - 1];
    res
      .status(201)
      .json({ success: true, message: 'File attached to task successfully', data: { attachment } });
  });

  static removeAttachmentFromTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const { taskId, attachmentId } = z
      .object({ taskId: objectId, attachmentId: objectId })
      .parse(req.params);

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        'attachments._id': attachmentId,
        $or: [{ createdBy: userId }, { assignedTo: userId }],
      },
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true }
    );
    if (!task) throw createError('Task or attachment not found', 404);

    res.json({ success: true, message: 'Attachment removed from task successfully' });
  });
}
