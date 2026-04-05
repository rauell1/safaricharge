/**
 * SafariCharge DC:AC Ratio Optimizer
 *
 * Analyzes and optimizes the DC (solar array) to AC (inverter) ratio.
 * Industry best practice: 1.2:1 to 1.3:1 for maximum energy capture.
 *
 * Key insight: Slightly oversizing solar relative to inverter captures
 * more energy during shoulder hours with minimal clipping losses.
 */

export interface DCACAnalysis {
  /** Current DC:AC ratio */
  ratio: number;

  /** Solar array capacity in kW */
  solarCapacity_kW: number;

  /** Inverter capacity in kW */
  inverterCapacity_kW: number;

  /** Annual clipping loss in kWh (estimated) */
  annualClippingLoss_kWh: number;

  /** Clipping loss as percentage of total production */
  clippingLoss_pct: number;

  /** Status assessment */
  status: 'optimal' | 'acceptable' | 'too_low' | 'too_high';

  /** Color code for UI: green, yellow, red */
  colorCode: 'green' | 'yellow' | 'red';

  /** Human-readable message */
  message: string;

  /** Specific recommendations */
  recommendations: string[];

  /** Optimal inverter size for current solar array */
  optimalInverter_kW: number;

  /** Optimal solar size for current inverter */
  optimalSolar_kW: number;
}

/**
 * Analyze DC:AC ratio and provide recommendations
 *
 * @param solarCapacity_kW - Solar array capacity in kW
 * @param inverterCapacity_kW - Inverter capacity in kW
 * @param annualSolarProduction_kWh - Optional: annual solar production for clipping calculation
 * @param peakSunHours - Optional: peak sun hours for estimation
 */
export function analyzeDCACRatio(
  solarCapacity_kW: number,
  inverterCapacity_kW: number,
  annualSolarProduction_kWh?: number,
  peakSunHours: number = 5.5
): DCACAnalysis {
  const ratio = solarCapacity_kW / inverterCapacity_kW;

  // Industry optimal range
  const OPTIMAL_MIN = 1.20;
  const OPTIMAL_MAX = 1.30;
  const ACCEPTABLE_MIN = 1.10;
  const ACCEPTABLE_MAX = 1.40;

  // Estimate clipping losses if not provided
  let clippingLoss_kWh = 0;
  let clippingLoss_pct = 0;

  if (ratio > 1.0) {
    // Estimate annual clipping based on ratio
    // Simplified model: clipping increases quadratically above 1.0
    const excessRatio = Math.max(0, ratio - 1.0);

    // Typical solar system produces at rated capacity for ~15-20% of the year
    // Clipping occurs during peak hours
    const estimatedAnnualProduction = annualSolarProduction_kWh || (solarCapacity_kW * peakSunHours * 365 * 0.75);
    const peakProductionHours = 365 * 5; // ~5 hours per day at or near peak

    // Clipping formula: Excess power × Peak hours × Clipping factor
    // Clipping factor increases with ratio: 0% @ 1.0, ~2% @ 1.2, ~5% @ 1.3, ~10% @ 1.4
    const clippingFactor = Math.pow(excessRatio, 1.5) * 0.25; // Empirical curve fit
    clippingLoss_kWh = (solarCapacity_kW - inverterCapacity_kW) * peakProductionHours * clippingFactor;
    clippingLoss_pct = (clippingLoss_kWh / estimatedAnnualProduction) * 100;
  }

  // Determine status
  let status: DCACAnalysis['status'];
  let colorCode: DCACAnalysis['colorCode'];
  let message: string;
  const recommendations: string[] = [];

  if (ratio >= OPTIMAL_MIN && ratio <= OPTIMAL_MAX) {
    // ✅ OPTIMAL: 1.20 - 1.30
    status = 'optimal';
    colorCode = 'green';
    message = `Excellent DC:AC ratio of ${ratio.toFixed(2)}:1. Your system is optimally configured for maximum energy capture with minimal clipping (~${clippingLoss_pct.toFixed(1)}% annual clipping is acceptable).`;
    recommendations.push(
      '✓ Your system is optimally configured',
      '✓ Captures maximum energy during shoulder hours',
      '✓ Minimal clipping losses during peak solar hours'
    );
  } else if (ratio >= ACCEPTABLE_MIN && ratio < OPTIMAL_MIN) {
    // ⚠️ ACCEPTABLE BUT LOW: 1.10 - 1.20
    status = 'acceptable';
    colorCode = 'yellow';
    message = `DC:AC ratio of ${ratio.toFixed(2)}:1 is acceptable but conservative. You're leaving ~${((OPTIMAL_MIN - ratio) * 15).toFixed(0)}% of potential energy capture on the table.`;
    recommendations.push(
      `Your inverter is oversized for your solar array`,
      `Consider downsizing inverter to ${(solarCapacity_kW / 1.25).toFixed(1)} kW for better economics`,
      `Or add ${Math.ceil((solarCapacity_kW * (OPTIMAL_MIN / ratio - 1)) / 0.55)} more panels (${((solarCapacity_kW * (OPTIMAL_MIN / ratio - 1))).toFixed(1)} kW) to reach optimal ratio`
    );
  } else if (ratio > OPTIMAL_MAX && ratio <= ACCEPTABLE_MAX) {
    // ⚠️ ACCEPTABLE BUT HIGH: 1.30 - 1.40
    status = 'acceptable';
    colorCode = 'yellow';
    message = `DC:AC ratio of ${ratio.toFixed(2)}:1 is acceptable but will experience ${clippingLoss_pct.toFixed(1)}% annual clipping losses (~${clippingLoss_kWh.toFixed(0)} kWh/year wasted).`;
    recommendations.push(
      `Your solar array is slightly oversized for your inverter`,
      `Expected clipping losses: ${clippingLoss_pct.toFixed(1)}% annually`,
      `Consider upgrading inverter to ${(solarCapacity_kW / 1.25).toFixed(1)} kW to eliminate clipping`,
      `Or accept small clipping as trade-off for better shoulder-hour production`
    );
  } else if (ratio < ACCEPTABLE_MIN) {
    // ❌ TOO LOW: < 1.10
    status = 'too_low';
    colorCode = 'red';
    message = `DC:AC ratio of ${ratio.toFixed(2)}:1 is too low. Your inverter is significantly oversized, wasting ~${((1.25 - ratio) * 20).toFixed(0)}% of potential energy capture during low-light hours.`;
    recommendations.push(
      `⚠️ Your inverter (${inverterCapacity_kW} kW) is too large for your solar array (${solarCapacity_kW.toFixed(1)} kW)`,
      `RECOMMENDED: Downsize inverter to ${(solarCapacity_kW / 1.25).toFixed(1)} kW`,
      `This will improve system efficiency and reduce upfront cost by ~${((1 - (solarCapacity_kW / 1.25) / inverterCapacity_kW) * 100).toFixed(0)}%`,
      `Alternative: Expand solar array to ${(inverterCapacity_kW * 1.25).toFixed(1)} kW (add ${Math.ceil((inverterCapacity_kW * 1.25 - solarCapacity_kW) / 0.55)} × 550W panels)`
    );
  } else {
    // ❌ TOO HIGH: > 1.40
    status = 'too_high';
    colorCode = 'red';
    message = `DC:AC ratio of ${ratio.toFixed(2)}:1 is too high. Excessive clipping will waste ${clippingLoss_pct.toFixed(1)}% of solar production (~${clippingLoss_kWh.toFixed(0)} kWh/year).`;
    recommendations.push(
      `⚠️ Your solar array (${solarCapacity_kW.toFixed(1)} kW) is too large for your inverter (${inverterCapacity_kW} kW)`,
      `Expected annual waste: ${clippingLoss_kWh.toFixed(0)} kWh (${clippingLoss_pct.toFixed(1)}% of production)`,
      `RECOMMENDED: Upgrade inverter to ${(solarCapacity_kW / 1.25).toFixed(1)} kW`,
      `This will capture ~${clippingLoss_kWh.toFixed(0)} kWh/year more energy`,
      `Alternative: Remove ${Math.floor((solarCapacity_kW - inverterCapacity_kW * 1.30) / 0.55)} panels to reduce to 1.3:1 ratio (but loses potential production)`
    );
  }

  // Calculate optimal configurations
  const optimalInverter_kW = Math.round((solarCapacity_kW / 1.25) * 2) / 2; // Round to 0.5 kW
  const optimalSolar_kW = inverterCapacity_kW * 1.25;

  return {
    ratio,
    solarCapacity_kW,
    inverterCapacity_kW,
    annualClippingLoss_kWh: clippingLoss_kWh,
    clippingLoss_pct,
    status,
    colorCode,
    message,
    recommendations,
    optimalInverter_kW,
    optimalSolar_kW,
  };
}

/**
 * Calculate optimal inverter size for a given solar array
 */
export function calculateOptimalInverter(solarCapacity_kW: number): number {
  const OPTIMAL_RATIO = 1.25;
  const inverter_kW = solarCapacity_kW / OPTIMAL_RATIO;
  // Round to practical inverter sizes (0.5 kW increments)
  return Math.round(inverter_kW * 2) / 2;
}

/**
 * Calculate optimal solar array size for a given inverter
 */
export function calculateOptimalSolar(inverterCapacity_kW: number): number {
  const OPTIMAL_RATIO = 1.25;
  return inverterCapacity_kW * OPTIMAL_RATIO;
}

/**
 * Get quick status badge info for UI
 */
export function getDCACBadge(ratio: number): {
  text: string;
  color: 'green' | 'yellow' | 'red';
  emoji: string;
} {
  if (ratio >= 1.20 && ratio <= 1.30) {
    return { text: 'Optimal', color: 'green', emoji: '✓' };
  } else if (ratio >= 1.10 && ratio <= 1.40) {
    return { text: 'Acceptable', color: 'yellow', emoji: '⚠' };
  } else {
    return { text: 'Suboptimal', color: 'red', emoji: '✗' };
  }
}
