// apps/api/src/modules/activity/activity.model.ts
import mongoose, { type Document, Schema } from 'mongoose';

export type ActivityEntityType = 'task' | 'category';

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  /** Dotted event name, e.g. task.status_changed. */
  event: string;
  entityType: ActivityEntityType;
  entityId: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  /** Users whose feed this entry appears in. */
  audience: mongoose.Types.ObjectId[];
  /** One-line human readable description. */
  summary: string;
  /** Changed field names, when applicable. */
  changes: string[];
  /** Small, event-specific details (old/new status, comment id, …). */
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    event: { type: String, required: true, index: true },
    entityType: { type: String, enum: ['task', 'category'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    audience: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    summary: { type: String, required: true, maxlength: 500 },
    changes: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ audience: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
