// File: packages/types/zod/planning.types.ts
//
// Response shapes of the planning and analytics endpoints. These are plain
// interfaces (the endpoints are read-only; nothing to validate on input).
import type { TaskStatus } from './task.schema';

export const POLICY_NAMES = ['fifo', 'priority', 'spt', 'edf', 'wsjf', 'eisenhower'] as const;
export type PolicyName = (typeof POLICY_NAMES)[number];

export interface PolicyDescriptor {
  name: PolicyName;
  label: string;
  summary: string;
  reference: string;
}

export interface Recommendation {
  rank: number;
  taskId: string;
  title?: string;
  status: TaskStatus;
  priorityWeight: number;
  dueDate: string | null;
  estimatedHours: number | null;
  score: number | null;
  rationale: string;
  components: Record<string, number | string>;
  isBlocked: boolean;
  unblocks: number;
}

export interface RecommendationsResponse {
  policy: PolicyName;
  generatedAt: string;
  totals: { open: number; ready: number; blocked: number };
  recommendations: Recommendation[];
}

export interface CriticalPathNode {
  taskId: string;
  title?: string;
  durationHours: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slackHours: number;
  isCritical: boolean;
}

export interface CriticalPathResponse {
  makespanHours: number;
  criticalPath: Array<{ taskId: string; title?: string }>;
  cycle: Array<{ taskId: string; title?: string }> | null;
  nodes: CriticalPathNode[];
}

export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';

export interface EisenhowerItem {
  taskId: string;
  title?: string;
  dueDate: string | null;
  priorityWeight: number;
}

export interface EisenhowerResponse {
  generatedAt: string;
  quadrants: Record<EisenhowerQuadrant, EisenhowerItem[]>;
}

export interface ForecastPercentiles {
  p50: number;
  p70: number;
  p85: number;
  p95: number;
}

export interface ForecastResponse {
  generatedAt: string;
  remainingItems: number;
  lookback: { from: string; to: string; bucket: 'day' | 'week'; periods: number };
  throughput: { samples: number[]; mean: number };
  forecast: {
    trials: number;
    seed: number;
    periods: ForecastPercentiles;
    dates: { p50: string; p70: string; p85: string; p95: string };
    meanPeriods: number;
    histogram: Array<{ periods: number; count: number }>;
    truncatedShare: number;
  } | null;
  note?: string;
}

export interface SimulationMetrics {
  makespan: number;
  meanFlowTime: number;
  totalTardiness: number;
  meanTardiness: number;
  weightedTardiness: number;
  maxLateness: number;
  lateTasks: number;
  onTimeRate: number;
  scheduledTasks: number;
}

export interface SimulationRun extends PolicyDescriptor {
  policy: PolicyName;
  metrics: SimulationMetrics;
  unscheduled: string[];
}

export interface SimulateResponse {
  generatedAt: string;
  workers: number;
  pendingTasks: number;
  recommendedPolicy: PolicyName | null;
  runs: SimulationRun[];
}

export interface DistributionSummary {
  n: number;
  mean: number;
  stddev: number;
  min: number;
  p50: number;
  p85: number;
  p95: number;
  max: number;
}

export interface FlowSummaryResponse {
  window: { from: string; to: string; days: number };
  wip: number;
  completed: number;
  throughputPerDay: number;
  cycleTimeHours: DistributionSummary;
  leadTimeHours: DistributionSummary;
  littlesLawLeadTimeDays: number | null;
  onTimeRate: number | null;
}

export interface ThroughputPoint {
  period: string;
  created: number;
  completed: number;
}

export interface SeriesResponse<T> {
  from: string;
  to: string;
  bucket: 'day' | 'week';
  series: T[];
}

export interface CumulativeFlowPoint {
  period: string;
  todo: number;
  in_progress: number;
  completed: number;
}

export interface AgingItem {
  id: string;
  title?: string;
  status: TaskStatus;
  ageHours: number;
  inProgressHours: number | null;
}

export interface AgingResponse {
  generatedAt: string;
  items: AgingItem[];
}
