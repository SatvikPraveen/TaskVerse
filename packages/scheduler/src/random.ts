// packages/scheduler/src/random.ts

/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * Every stochastic routine in this package takes a seed so that forecasts
 * and benchmark runs are reproducible bit-for-bit across machines, which is
 * a prerequisite for citing their output.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: n => Math.floor(next() * n),
    pick: items => {
      if (items.length === 0) throw new RangeError('Cannot pick from an empty array');
      return items[Math.floor(next() * items.length)];
    },
  };
};

/** Fold an arbitrary string into a 32-bit seed (FNV-1a). */
export const seedFromString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
