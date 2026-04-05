/**
 * SafariCharge Intelligence Layer
 *
 * Central export point for all decision engine modules.
 * This transforms SafariCharge from a simulation tool to a decision platform.
 */

// Auto-Sizing Wizard - "Tell us your needs, we'll design your system"
export {
  autoSizeSystem,
  type SizingWizardInput,
  type SizingRecommendation,
} from './auto-sizing-wizard';

// DC:AC Ratio Optimizer - "Optimal inverter-to-panel ratio for max energy capture"
export {
  analyzeDCACRatio,
  calculateOptimalInverter,
  calculateOptimalSolar,
  getDCACBadge,
  type DCACAnalysis,
} from './dc-ac-optimizer';

// Load Validator - "Can your system actually handle your loads?"
export {
  validateSystemForLoads,
  getValidationBadge,
  type LoadValidationResult,
} from './load-validator';

// Battery Economics - "What battery size makes financial sense?"
export {
  optimizeBatterySize,
  type BatteryEconomicAnalysis,
  type BatteryOptimizationResult,
} from './battery-economics';
