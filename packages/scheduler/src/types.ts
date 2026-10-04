// packages/scheduler/src/types.ts

export type SchedulableStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

/**
 * The minimal, storage-agnostic view of a task the planning engine needs.
 * The API maps its Mongoose documents onto this shape; the research
 * benchmarks generate it synthetically.
 */
export interface SchedulableTask {
  id: string;
  title?: string;
  /** Ordinal priority weight, 1 (low) … 4 (urgent). */
  priorityWeight: number;
  /** Job size in hours. Missing estimates fall back to a configurable default. */
  estimatedHours?: number | null;
  dueDate?: Date | null;
  createdAt: Date;
  /** First transition into in_progress, when known. */
  startedAt?: Date | null;
  completedAt?: Date | null;
  status: SchedulableStatus;
  /** Ids of tasks that must be completed before this one may start. */
  dependencies?: string[];
}

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const isTerminal = (status: SchedulableStatus): boolean =>
  status === 'completed' || status === 'cancelled';

export const hoursBetween = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / MS_PER_HOUR;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
