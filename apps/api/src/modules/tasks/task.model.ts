// apps/api/src/modules/tasks/task.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ISubtask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
}

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  content: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  _id?: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  subtasks: ISubtask[];
  comments: IComment[];
  attachments: IAttachment[];
  isArchived: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const subtaskSchema = new Schema<ISubtask>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const commentSchema = new Schema<IComment>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

const attachmentSchema = new Schema<IAttachment>({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const taskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000,
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
    default: 'todo',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    index: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  dueDate: {
    type: Date,
    index: true,
  },
  startDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  estimatedHours: {
    type: Number,
    min: 0,
  },
  actualHours: {
    type: Number,
    min: 0,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  subtasks: [subtaskSchema],
  comments: [commentSchema],
  attachments: [attachmentSchema],
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  position: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ category: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdBy: 1, isArchived: 1, position: 1 });
taskSchema.index({ tags: 1 });

// Text index for search
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for completion percentage based on subtasks
taskSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  const completed = this.subtasks.filter(s => s.isCompleted).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Pre-save middleware to set completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed' && this.completedAt) {
      this.completedAt = undefined;
    }
  }
  next();
});

// Ensure virtual fields are serialized
taskSchema.set('toJSON', { virtuals: true });

export const Task = mongoose.model<ITask>('Task', taskSchema);