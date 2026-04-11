/**
 * mathUtils.ts
 * Shared math utilities for the SafariCharge simulation engine.
 *
 * Fix #2: gaussianRandom was duplicated inline in page.tsx.
 * page.tsx should import from here instead.
 */

/**
 * Gaussian random number (Box-Muller transform).
 * Returns a sample from N(mean, std).
 */
export const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};

/**
 * Clamp a value between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Linear interpolation between a and b at factor t.
 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
