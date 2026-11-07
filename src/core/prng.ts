/**
 * PAX HISTORIA 3D • Deterministic PRNG (Mulberry32)
 * Guarantees 100% reproducible continents, topography, and historical seeds.
 */

export function createPRNG(seed: string | number) {
  let s = typeof seed === 'number' ? Math.floor(seed) : hashString(seed);

  function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
    int(min: number, max: number): number {
      return Math.floor(min + next() * (max - min + 1));
    },
    bool(probability = 0.5): boolean {
      return next() < probability;
    },
    pick<T>(array: readonly T[]): T {
      return array[Math.floor(next() * array.length)];
    },
    shuffle<T>(array: readonly T[]): T[] {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    },
  };
}

function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
