// Tiny math helpers — hand-rolled instead of pulling in a tween lib.

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Inverse lerp: where does v sit between a and b, as 0..1. */
export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : clamp((v - a) / (b - a), 0, 1);

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** 1D overlap test on a single axis (used for lane-slot collision on z). */
export const overlaps1D = (
  aCenter: number,
  aHalf: number,
  bCenter: number,
  bHalf: number,
): boolean => Math.abs(aCenter - bCenter) < aHalf + bHalf;

/** Deterministic seedable PRNG (mulberry32) — reproducible runs for testing. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randRange = (rng: () => number, lo: number, hi: number): number =>
  lo + rng() * (hi - lo);

export const randInt = (rng: () => number, lo: number, hi: number): number =>
  Math.floor(randRange(rng, lo, hi + 1));
