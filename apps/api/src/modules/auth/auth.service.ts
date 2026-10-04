// apps/api/src/modules/auth/auth.service.ts
import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { env } from '@/config/env';
import { createError } from '@/middleware/error';
import { User, type IUser } from '@/modules/users/user.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { comparePassword, hashPassword } from '@/utils/passwords';

import { RefreshToken } from './auth.model';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type PublicUser = Omit<ReturnType<IUser['toObject']>, 'password'>;

export interface LoginResult {
  user: PublicUser;
  tokens: TokenPair;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const toPublicUser = (user: IUser): PublicUser => {
  const { password: _password, ...rest } = user.toObject({ virtuals: true });
  return rest as PublicUser;
};

export class AuthService {
  static async register(input: RegisterInput): Promise<LoginResult> {
    const existingUser = await User.findOne({
      $or: [{ email: input.email.toLowerCase() }, { username: input.username }],
    });
    if (existingUser) {
      throw createError('User already exists with this email or username', 409);
    }

    const user = await User.create({ ...input, password: await hashPassword(input.password) });
    const tokens = await this.generateTokenPair(user._id.toString());
    return { user: toPublicUser(user), tokens };
  }

  static async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResult> {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
    if (!user || !(await comparePassword(password, user.password))) {
      throw createError('Invalid credentials', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.generateTokenPair(user._id.toString(), deviceInfo, ipAddress);
    return { user: toPublicUser(user), tokens };
  }

  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).userId;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 403);
      }
      throw error;
    }

    // Rotation: atomically revoke the presented token so a replayed token fails.
    const storedToken = await RefreshToken.findOneAndUpdate(
      { token: refreshToken, isRevoked: false, expiresAt: { $gt: new Date() } },
      { isRevoked: true },
      { new: true }
    );
    if (!storedToken) {
      throw createError('Invalid refresh token', 403);
    }

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      throw createError('User not found', 403);
    }

    return this.generateTokenPair(user._id.toString(), storedToken.deviceInfo, storedToken.ipAddress);
  }

  static async logout(refreshToken: string): Promise<void> {
    await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true });
  }

  static async logoutAllDevices(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw createError('User not found', 404);
    }
    if (!(await comparePassword(currentPassword, user.password))) {
      throw createError('Current password is incorrect', 400);
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    await this.logoutAllDevices(userId);
  }

  static async getUserSessions(userId: string) {
    return RefreshToken.find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } })
      .select('deviceInfo ipAddress createdAt')
      .sort({ createdAt: -1 });
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await RefreshToken.updateOne({ _id: sessionId, userId }, { isRevoked: true });
    if (result.matchedCount === 0) {
      throw createError('Session not found', 404);
    }
  }

  private static async generateTokenPair(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId, crypto.randomBytes(32).toString('hex'));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

    await RefreshToken.create({ token: refreshToken, userId, expiresAt, deviceInfo, ipAddress });

    // Opportunistic cleanup; the TTL index is the real guarantee.
    if (Math.random() < 0.01) {
      await RefreshToken.cleanupExpired();
    }

    return { accessToken, refreshToken };
  }
}
