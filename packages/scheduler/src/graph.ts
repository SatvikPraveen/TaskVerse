// packages/scheduler/src/graph.ts
import type { SchedulableTask } from './types';

/**
 * Directed dependency graph. An edge A → B means "A must finish before B
 * starts", i.e. B lists A in its `dependencies`.
 */
export interface DependencyGraph {
  nodes: Map<string, SchedulableTask>;
  /** task id → ids of tasks it is blocked by (its prerequisites). */
  prerequisites: Map<string, Set<string>>;
  /** task id → ids of tasks that depend on it. */
  dependents: Map<string, Set<string>>;
  /** Dependency ids referenced but absent from the input; they are ignored. */
  missing: Set<string>;
}

export const buildGraph = (tasks: readonly SchedulableTask[]): DependencyGraph => {
  const nodes = new Map<string, SchedulableTask>();
  const prerequisites = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const missing = new Set<string>();

  for (const task of tasks) {
    nodes.set(task.id, task);
    prerequisites.set(task.id, new Set());
    dependents.set(task.id, new Set());
  }

  for (const task of tasks) {
    for (const depId of task.dependencies ?? []) {
      if (depId === task.id) continue; // self-loops are meaningless; drop them
      if (!nodes.has(depId)) {
        missing.add(depId);
        continue;
      }
      prerequisites.get(task.id)!.add(depId);
      dependents.get(depId)!.add(task.id);
    }
  }

  return { nodes, prerequisites, dependents, missing };
};

export interface TopologicalResult {
  /** Prerequisites always precede their dependents. Empty when a cycle exists. */
  order: string[];
  /** The ids forming a cycle, when one exists, in traversal order. */
  cycle: string[] | null;
}

/**
 * Kahn's algorithm with a deterministic tie-break (insertion order), so that
 * equal inputs always yield equal output regardless of Map iteration quirks.
 */
export const topologicalOrder = (graph: DependencyGraph): TopologicalResult => {
  const indegree = new Map<string, number>();
  for (const [id, prereqs] of graph.prerequisites) indegree.set(id, prereqs.size);

  const queue: string[] = [];
  for (const [id, degree] of indegree) if (degree === 0) queue.push(id);

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dependent of graph.dependents.get(id) ?? []) {
      const remaining = indegree.get(dependent)! - 1;
      indegree.set(dependent, remaining);
      if (remaining === 0) queue.push(dependent);
    }
  }

  if (order.length === graph.nodes.size) return { order, cycle: null };
  return { order: [], cycle: findCycle(graph) };
};

/** Iterative DFS with three-colour marking; returns the first cycle found. */
export const findCycle = (graph: DependencyGraph): string[] | null => {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  const parent = new Map<string, string | null>();
  for (const id of graph.nodes.keys()) colour.set(id, WHITE);

  for (const root of graph.nodes.keys()) {
    if (colour.get(root) !== WHITE) continue;
    const stack: Array<{ id: string; iter: Iterator<string> }> = [];
    colour.set(root, GREY);
    parent.set(root, null);
    stack.push({ id: root, iter: (graph.dependents.get(root) ?? new Set()).values() });

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const next = frame.iter.next();
      if (next.done) {
        colour.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const child = next.value;
      const childColour = colour.get(child);
      if (childColour === GREY) {
        // Reconstruct the cycle: child … frame.id → child.
        const cycle = [child];
        let cursor: string | null = frame.id;
        while (cursor !== null && cursor !== child) {
          cycle.push(cursor);
          cursor = parent.get(cursor) ?? null;
        }
        return cycle.reverse();
      }
      if (childColour === WHITE) {
        colour.set(child, GREY);
        parent.set(child, frame.id);
        stack.push({ id: child, iter: (graph.dependents.get(child) ?? new Set()).values() });
      }
    }
  }
  return null;
};

/**
 * Would adding "taskId depends on newDependencyId" create a cycle?
 * True iff newDependencyId is taskId itself or is reachable from taskId by
 * following dependents (i.e. newDependencyId transitively depends on taskId).
 */
export const wouldCreateCycle = (
  graph: DependencyGraph,
  taskId: string,
  newDependencyId: string
): boolean => {
  if (taskId === newDependencyId) return true;
  const seen = new Set<string>([taskId]);
  const stack = [taskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const dependent of graph.dependents.get(current) ?? []) {
      if (dependent === newDependencyId) return true;
      if (!seen.has(dependent)) {
        seen.add(dependent);
        stack.push(dependent);
      }
    }
  }
  return false;
};

/** Number of tasks that transitively depend on `id` (its downstream fan-out). */
export const transitiveDependentCount = (graph: DependencyGraph, id: string): number => {
  const seen = new Set<string>();
  const stack = [...(graph.dependents.get(id) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of graph.dependents.get(current) ?? []) stack.push(next);
  }
  return seen.size;
};

/**
 * Tasks whose prerequisites are all in a terminal state and that are not
 * themselves finished: the set a scheduler may legally start right now.
 */
export const readyTasks = (graph: DependencyGraph): SchedulableTask[] => {
  const ready: SchedulableTask[] = [];
  for (const [id, task] of graph.nodes) {
    if (task.status === 'completed' || task.status === 'cancelled') continue;
    const prereqs = graph.prerequisites.get(id) ?? new Set();
    let blocked = false;
    for (const depId of prereqs) {
      const dep = graph.nodes.get(depId)!;
      if (dep.status !== 'completed' && dep.status !== 'cancelled') {
        blocked = true;
        break;
      }
    }
    if (!blocked) ready.push(task);
  }
  return ready;
};
