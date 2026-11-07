/**
 * PAX HISTORIA 3D • Multi-Octave 2D & 3D Fractal Noise Engine
 * Supports standard fBm and ridged multifractal noise for realistic continents and mountain chains.
 */

import { createPRNG } from './prng';

export interface NoiseGenerator {
  (x: number, y: number): number;
  noise3D(x: number, y: number, z: number): number;
  fractal(x: number, y: number, octaves?: number, persistence?: number, lacunarity?: number): number;
  ridged(x: number, y: number, octaves?: number, persistence?: number, lacunarity?: number): number;
  fractal3D(x: number, y: number, z: number, octaves?: number, persistence?: number, lacunarity?: number): number;
}

const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

export function createNoise2D(seed: string | number = 42): NoiseGenerator {
  const prng = createPRNG(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  for (let i = 255; i > 0; i--) {
    const j = prng.int(0, i);
    const temp = p[i];
    p[i] = p[j];
    p[j] = temp;
  }

  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  function dot2(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  function dot3(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const g00 = GRAD3[permMod12[X + perm[Y]]];
    const g10 = GRAD3[permMod12[X + 1 + perm[Y]]];
    const g01 = GRAD3[permMod12[X + perm[Y + 1]]];
    const g11 = GRAD3[permMod12[X + 1 + perm[Y + 1]]];

    const n00 = dot2(g00, xf, yf);
    const n10 = dot2(g10, xf - 1, yf);
    const n01 = dot2(g01, xf, yf - 1);
    const n11 = dot2(g11, xf - 1, yf - 1);

    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  }

  function noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;

    const g000 = GRAD3[permMod12[AA]];
    const g100 = GRAD3[permMod12[BA]];
    const g010 = GRAD3[permMod12[AB]];
    const g110 = GRAD3[permMod12[BB]];
    const g001 = GRAD3[permMod12[AA + 1]];
    const g101 = GRAD3[permMod12[BA + 1]];
    const g011 = GRAD3[permMod12[AB + 1]];
    const g111 = GRAD3[permMod12[BB + 1]];

    const n000 = dot3(g000, xf, yf, zf);
    const n100 = dot3(g100, xf - 1, yf, zf);
    const n010 = dot3(g010, xf, yf - 1, zf);
    const n110 = dot3(g110, xf - 1, yf - 1, zf);
    const n001 = dot3(g001, xf, yf, zf - 1);
    const n101 = dot3(g101, xf - 1, yf, zf - 1);
    const n011 = dot3(g011, xf, yf - 1, zf - 1);
    const n111 = dot3(g111, xf - 1, yf - 1, zf - 1);

    const nx00 = lerp(n000, n100, u);
    const nx10 = lerp(n010, n110, u);
    const nx01 = lerp(n001, n101, u);
    const nx11 = lerp(n011, n111, u);

    const nxy0 = lerp(nx00, nx10, v);
    const nxy1 = lerp(nx01, nx11, v);

    return lerp(nxy0, nxy1, w);
  }

  noise2D.noise3D = noise3D;

  noise2D.fractal = function fractal(
    x: number,
    y: number,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.0
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  };

  noise2D.ridged = function ridged(
    x: number,
    y: number,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.1
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1.0 - Math.abs(noise2D(x * frequency, y * frequency));
      total += n * n * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (total / maxValue) * 2.0 - 1.0;
  };

  noise2D.fractal3D = function fractal3D(
    x: number,
    y: number,
    z: number,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.0
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  };

  return noise2D;
}
