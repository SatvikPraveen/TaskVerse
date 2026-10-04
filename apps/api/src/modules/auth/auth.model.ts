// apps/api/src/modules/auth/auth.model.ts
import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenModel extends Model<IRefreshToken> {
  cleanupExpired(): Promise<{ deletedCount?: number }>;
}

const refreshTokenSchema = new Schema<IRefreshToken, RefreshTokenModel>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // TTL index: MongoDB removes the document once expiresAt has passed.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    isRevoked: { type: Boolean, default: false },
    deviceInfo: { type: String, maxlength: 500 },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1, createdAt: -1 });

refreshTokenSchema.statics.cleanupExpired = function cleanupExpired() {
  return this.deleteMany({ $or: [{ expiresAt: { $lt: new Date() } }, { isRevoked: true }] });
};

export const RefreshToken = mongoose.model<IRefreshToken, RefreshTokenModel>(
  'RefreshToken',
  refreshTokenSchema
);
