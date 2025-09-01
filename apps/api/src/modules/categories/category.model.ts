// apps/api/src/modules/categories/category.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdBy: mongoose.Types.ObjectId;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  color: {
    type: String,
    required: true,
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    default: '#6366f1',
  },
  icon: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound index for user's categories
categorySchema.index({ createdBy: 1, name: 1 }, { unique: true });
categorySchema.index({ createdBy: 1, sortOrder: 1 });
categorySchema.index({ createdBy: 1, isActive: 1 });

// Virtual for task count
categorySchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);