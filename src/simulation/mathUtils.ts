/**
 * Shared math utilities for the simulation engine.
 */

/**
 * Box-Muller transform: returns a normally-distributed random number
 * with the given mean and standard deviation.
 */
export const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};
