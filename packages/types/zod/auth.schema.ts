// File: packages/types/zod/auth.schema.ts
import { z } from 'zod';

import { IsoDateSchema, ObjectIdSchema } from './common.schema';

export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must not exceed 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore and dash');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const ThemeEnum = z.enum(['light', 'dark', 'system']);
export const DefaultViewEnum = z.enum(['list', 'kanban', 'calendar']);

export const UserPreferencesSchema = z.object({
  theme: ThemeEnum,
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    taskReminders: z.boolean(),
    taskAssignments: z.boolean(),
  }),
  defaultView: DefaultViewEnum,
});

/** A user as serialised by the API (password never included). */
export const UserSchema = z.object({
  _id: ObjectIdSchema,
  id: ObjectIdSchema.optional(),
  username: UsernameSchema,
  email: z.string().email(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string(),
  preferences: UserPreferencesSchema,
  isActive: z.boolean(),
  lastLoginAt: IsoDateSchema.optional(),
  fullName: z.string().optional(),
  displayName: z.string().optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

/** Minimal user projection embedded in tasks and comments. */
export const UserSummarySchema = z.object({
  _id: ObjectIdSchema,
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
});

export const RegisterSchema = z.object({
  username: UsernameSchema,
  email: z.string().email('Invalid email address'),
  password: PasswordSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
});

export const UpdatePreferencesSchema = z.object({
  theme: ThemeEnum.optional(),
  notifications: UserPreferencesSchema.shape.notifications.partial().optional(),
  defaultView: DefaultViewEnum.optional(),
});

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  tokens: TokenPairSchema,
});

export const SessionSchema = z.object({
  _id: ObjectIdSchema,
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  createdAt: IsoDateSchema,
});

export type Theme = z.infer<typeof ThemeEnum>;
export type DefaultView = z.infer<typeof DefaultViewEnum>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserSummary = z.infer<typeof UserSummarySchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
