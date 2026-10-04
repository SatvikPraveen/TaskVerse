// apps/api/src/modules/tasks/task.model.ts
import mongoose, { type Document, Schema } from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Ordinal weight used for sorting and for the scheduling heuristics. */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export interface ISubtask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface IStatusTransition {
  from: TaskStatus | null;
  to: TaskStatus;
  at: Date;
  by: mongoose.Types.ObjectId;
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  priorityWeight: number;
  category?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  /** Tasks that must be completed before this one can start. */
  dependencies: mongoose.Types.ObjectId[];
  dueDate?: Date;
  startDate?: Date;
  /** First transition into in_progress; drives cycle-time analytics. */
  startedAt?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  subtasks: ISubtask[];
  comments: IComment[];
  attachments: IAttachment[];
  statusHistory: IStatusTransition[];
  isArchived: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  /** Virtual */
  completionPercentage: number;
  /** Virtual */
  isOverdue: boolean;
}

const subtaskSchema = new Schema<ISubtask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const attachmentSchema = new Schema<IAttachment>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const statusTransitionSchema = new Schema<IStatusTransition>(
  {
    from: { type: String, enum: [...TASK_STATUSES, null], default: null },
    to: { type: String, enum: TASK_STATUSES, required: true },
    at: { type: Date, required: true, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium', index: true },
    priorityWeight: { type: Number, default: PRIORITY_WEIGHT.medium, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    dueDate: { type: Date, index: true },
    startDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, min: 0 },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    subtasks: [subtaskSchema],
    comments: [commentSchema],
    attachments: [attachmentSchema],
    statusHistory: { type: [statusTransitionSchema], default: [] },
    isArchived: { type: Boolean, default: false, index: true },
    position: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ category: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdBy: 1, isArchived: 1, position: 1 });
taskSchema.index({ dependencies: 1 });
taskSchema.index({ completedAt: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

taskSchema.virtual('completionPercentage').get(function completionPercentage(this: ITask) {
  // Populated references carry a projection, so arrays may be absent.
  const subtasks = this.subtasks ?? [];
  if (subtasks.length === 0) return this.status === 'completed' ? 100 : 0;
  const completed = subtasks.filter(s => s.isCompleted).length;
  return Math.round((completed / subtasks.length) * 100);
});

taskSchema.virtual('isOverdue').get(function isOverdue(this: ITask) {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') return false;
  return new Date() > this.dueDate;
});

taskSchema.pre('validate', function syncDerivedFields(this: ITask, next) {
  this.priorityWeight = PRIORITY_WEIGHT[this.priority];
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'completed' && !this.completedAt) this.completedAt = now;
    if (this.status !== 'completed' && this.completedAt) this.completedAt = undefined;
    if (this.status === 'in_progress' && !this.startedAt) this.startedAt = now;
    // A task completed straight from todo still "started" when it completed.
    if (this.status === 'completed' && !this.startedAt) this.startedAt = this.completedAt;
  }
  next();
});

export const Task = mongoose.model<ITask>('Task', taskSchema);
