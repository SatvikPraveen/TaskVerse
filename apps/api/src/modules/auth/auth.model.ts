// apps/api/src/modules/auth/auth.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
  deviceInfo?: string;
  ipAddress?: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  deviceInfo: {
    type: String,
    maxlength: 500,
  },
  ipAddress: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
refreshTokenSchema.index({ userId: 1, createdAt: -1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Clean up expired tokens periodically
refreshTokenSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true }
    ]
  });
};

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);