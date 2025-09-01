// apps/api/src/modules/auth/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '@/modules/users/user.model';
import { RefreshToken } from './auth.model';
import { env } from '@/config/env';
import { createError } from '@/middleware/error';
import { logger } from '@/config/logger';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user: Omit<IUser, 'password'>;
  tokens: TokenPair;
}

export class AuthService {
  static async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<LoginResult> {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      throw createError('User already exists with this email or username', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = new User({
      ...userData,
      password: hashedPassword,
    });

    await user.save();

    // Generate tokens
    const tokens = await this.generateTokenPair(user._id.toString());

    // Return user without password
    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;

    return {
      user: userWithoutPassword as Omit<IUser, 'password'>,
      tokens,
    };
  }

  static async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResult> {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokenPair(
      user._id.toString(),
      deviceInfo,
      ipAddress
    );

    // Return user without password
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    return {
      user: userWithoutPassword as Omit<IUser, 'password'>,
      tokens,
    };
  }

  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;

      // Find token in database
      const storedToken = await RefreshToken.findOne({
        token: refreshToken,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!storedToken) {
        throw createError('Invalid refresh token', 403);
      }

      // Verify user still exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw createError('User not found', 403);
      }

      // Revoke old token
      storedToken.isRevoked = true;
      await storedToken.save();

      // Generate new token pair
      return await this.generateTokenPair(user._id.toString());
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 403);
      }
      throw error;
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    await RefreshToken.updateOne(
      { token: refreshToken },
      { isRevoked: true }
    );
  }

  static async logoutAllDevices(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw createError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    // Revoke all refresh tokens (force re-login on all devices)
    await this.logoutAllDevices(userId);
  }

  private static async generateTokenPair(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    // Generate access token
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshTokenPayload = crypto.randomBytes(32).toString('hex');
    const refreshToken = jwt.sign(
      { userId, tokenId: refreshTokenPayload, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      token: refreshToken,
      userId,
      expiresAt,
      deviceInfo,
      ipAddress,
    });

    // Clean up old tokens periodically (1% chance)
    if (Math.random() < 0.01) {
      await RefreshToken.cleanupExpired();
    }

    return { accessToken, refreshToken };
  }

  static async getUserSessions(userId: string) {
    return await RefreshToken.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
    .select('deviceInfo ipAddress createdAt')
    .sort({ createdAt: -1 });
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await RefreshToken.updateOne(
      { _id: sessionId, userId },
      { isRevoked: true }
    );
  }
}