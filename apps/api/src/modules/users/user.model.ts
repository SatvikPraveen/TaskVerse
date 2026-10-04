// apps/api/src/modules/users/user.model.ts
import mongoose, { type Document, Schema } from 'mongoose';

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    taskAssignments: boolean;
  };
  defaultView: 'list' | 'kanban' | 'calendar';
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  timezone: string;
  preferences: IUserPreferences;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** Virtual */
  fullName: string;
  /** Virtual */
  displayName: string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, select: false },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    avatar: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\//.test(v),
        message: 'Avatar must be a valid URL',
      },
    },
    bio: { type: String, trim: true, maxlength: 500 },
    timezone: { type: String, default: 'UTC' },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        taskReminders: { type: Boolean, default: true },
        taskAssignments: { type: Boolean, default: true },
      },
      defaultView: { type: String, enum: ['list', 'kanban', 'calendar'], default: 'list' },
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.index({ createdAt: -1 });

userSchema.virtual('fullName').get(function fullName(this: IUser) {
  if (this.firstName && this.lastName) return `${this.firstName} ${this.lastName}`;
  return this.firstName || this.lastName || this.username;
});

userSchema.virtual('displayName').get(function displayName(this: IUser) {
  return this.fullName;
});

export const User = mongoose.model<IUser>('User', userSchema);
