// packages/scheduler/src/criticalPath.ts
import { buildGraph, topologicalOrder, type DependencyGraph } from './graph';
import { isTerminal, type SchedulableTask } from './types';

export interface CpmNode {
  id: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  /** Total float: how long the task may slip without delaying the project. */
  slack: number;
  isCritical: boolean;
}

export interface CriticalPathResult {
  /** Project duration in hours assuming unlimited parallelism. */
  makespan: number;
  nodes: Map<string, CpmNode>;
  /** One longest zero-slack chain from a source to a sink, in execution order. */
  criticalPath: string[];
  cycle: string[] | null;
}

export interface CpmOptions {
  /** Used when a task has no estimate. Default 1 hour. */
  defaultDurationHours?: number;
  /** Treat completed/cancelled tasks as zero-duration (default true). */
  zeroDurationForTerminal?: boolean;
}

const durationOf = (task: SchedulableTask, options: Required<CpmOptions>): number => {
  if (options.zeroDurationForTerminal && isTerminal(task.status)) return 0;
  const hours = task.estimatedHours;
  return hours !== undefined && hours !== null && hours > 0 ? hours : options.defaultDurationHours;
};

/**
 * Critical Path Method (Kelley & Walker, 1959): forward pass for earliest
 * times, backward pass for latest times, slack = LS − ES. Runs in O(V + E).
 */
export const criticalPath = (
  tasks: readonly SchedulableTask[],
  options: CpmOptions = {}
): CriticalPathResult => {
  const opts: Required<CpmOptions> = {
    defaultDurationHours: options.defaultDurationHours ?? 1,
    zeroDurationForTerminal: options.zeroDurationForTerminal ?? true,
  };
  const graph: DependencyGraph = buildGraph(tasks);
  const { order, cycle } = topologicalOrder(graph);
  const nodes = new Map<string, CpmNode>();
  if (cycle) return { makespan: 0, nodes, criticalPath: [], cycle };

  for (const id of order) {
    const task = graph.nodes.get(id)!;
    const duration = durationOf(task, opts);
    let earliestStart = 0;
    for (const prereq of graph.prerequisites.get(id) ?? []) {
      earliestStart = Math.max(earliestStart, nodes.get(prereq)!.earliestFinish);
    }
    nodes.set(id, {
      id,
      duration,
      earliestStart,
      earliestFinish: earliestStart + duration,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      isCritical: false,
    });
  }

  let makespan = 0;
  for (const node of nodes.values()) makespan = Math.max(makespan, node.earliestFinish);

  for (let i = order.length - 1; i >= 0; i -= 1) {
    const node = nodes.get(order[i])!;
    const dependents = graph.dependents.get(node.id) ?? new Set();
    let latestFinish = makespan;
    for (const dep of dependents) latestFinish = Math.min(latestFinish, nodes.get(dep)!.latestStart);
    node.latestFinish = latestFinish;
    node.latestStart = latestFinish - node.duration;
    node.slack = node.latestStart - node.earliestStart;
    node.isCritical = Math.abs(node.slack) < 1e-9;
  }

  // Walk the critical chain from a critical source, always stepping to a
  // critical dependent whose ES equals our EF (deterministic by id order).
  const path: string[] = [];
  const criticalSources = order.filter(
    id => nodes.get(id)!.isCritical && (graph.prerequisites.get(id)?.size ?? 0) === 0
  );
  let cursor = criticalSources.find(id => nodes.get(id)!.duration > 0) ?? criticalSources[0];
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    path.push(cursor);
    const current = nodes.get(cursor)!;
    const next = [...(graph.dependents.get(cursor) ?? [])]
      .map(id => nodes.get(id)!)
      .filter(n => n.isCritical && Math.abs(n.earliestStart - current.earliestFinish) < 1e-9)
      .sort((a, b) => b.duration - a.duration || a.id.localeCompare(b.id))[0];
    cursor = next?.id;
  }

  return { makespan, nodes, criticalPath: path, cycle: null };
};
