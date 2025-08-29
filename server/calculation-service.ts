// Market Standards and Calculation Service
// This service handles all mathematical calculations using real market data

export interface MarketStandards {
  panelWidth: number;      // feet
  panelHeight: number;     // feet
  panelArea: number;       // square feet
  panelPower: number;      // watts
  panelPowerKW: number;    // kilowatts
}

export interface EfficiencyFactors {
  orientation: { [key: string]: number };
  pitch: { [key: string]: number };
  shading: { [key: string]: number };
  weatherConditions: { [key: string]: number };
}

export interface InstallationCalculations {
  totalPanels: number;
  panelArea: number;
  usableRoofArea: number;
  coveragePercentage: number;
  powerOutputKW: number;
  efficiencyScore: number;
  annualSavings: number;
  installationCost: number;
  paybackPeriod: number;
}

// Real market standards for solar panels
export const MARKET_STANDARDS: MarketStandards = {
  panelWidth: 6.5,           // Standard residential panel width (feet)
  panelHeight: 3.25,         // Standard residential panel height (feet) 
  panelArea: 21.125,         // Standard panel area (6.5 × 3.25 = 21.125 sq ft)
  panelPower: 400,           // Standard panel power output (watts)
  panelPowerKW: 0.4          // Standard panel power output (kilowatts)
};

// Real efficiency factors based on market research
export const EFFICIENCY_FACTORS: EfficiencyFactors = {
  orientation: {
    'south': 0.95,           // Optimal orientation
    'southeast': 0.90,       // Very good
    'southwest': 0.90,       // Very good
    'east': 0.85,            // Good
    'west': 0.85,            // Good
    'northeast': 0.75,       // Fair
    'northwest': 0.75,       // Fair
    'north': 0.65            // Poor but sometimes viable
  },
  pitch: {
    'flat': 0.85,            // 0-10 degrees
    'low': 0.90,             // 10-20 degrees
    'optimal': 0.95,         // 20-40 degrees (ideal range)
    'steep': 0.88,           // 40-50 degrees
    'very_steep': 0.80       // 50+ degrees
  },
  shading: {
    'none': 1.0,             // No shading
    'minimal': 0.95,         // <5% shading
    'light': 0.90,           // 5-15% shading
    'moderate': 0.80,        // 15-30% shading
    'heavy': 0.65,           // 30-50% shading
    'severe': 0.40           // 50%+ shading
  },
  weatherConditions: {
    'excellent': 1.0,        // Clear skies, minimal weather issues
    'good': 0.95,            // Occasional clouds
    'fair': 0.90,            // Regular cloud cover
    'poor': 0.85             // Frequent weather challenges
  }
};

// Market rates for cost calculations (Indian market)
export const MARKET_RATES = {
  costPerWatt: 45,           // ₹45 per watt (Indian market rate)
  electricityRate: 6.5,     // ₹6.5 per kWh (average residential rate)
  sunHoursPerDay: 5.5,      // Average sun hours in India
  systemLifeYears: 25,      // Expected system life
  maintenanceRate: 0.01     // 1% annual maintenance cost
};

/**
 * Calculate total panel area based on panel count
 */
export function calculatePanelArea(panelCount: number): number {
  return panelCount * MARKET_STANDARDS.panelArea;
}

/**
 * Calculate coverage percentage based on panels and roof area
 */
export function calculateCoverage(panelCount: number, roofArea: number): number {
  const panelArea = calculatePanelArea(panelCount);
  return (panelArea / roofArea) * 100;
}

/**
 * Calculate power output in kilowatts
 */
export function calculatePowerOutput(panelCount: number): number {
  return Math.round(panelCount * MARKET_STANDARDS.panelPowerKW);
}

/**
 * Calculate efficiency score based on multiple factors
 */
export function calculateEfficiencyScore(
  orientation: string,
  pitch: string,
  shading: string,
  weatherConditions: string = 'good'
): number {
  const orientationFactor = EFFICIENCY_FACTORS.orientation[orientation.toLowerCase()] || 0.85;
  const pitchFactor = EFFICIENCY_FACTORS.pitch[pitch.toLowerCase()] || 0.90;
  const shadingFactor = EFFICIENCY_FACTORS.shading[shading.toLowerCase()] || 0.90;
  const weatherFactor = EFFICIENCY_FACTORS.weatherConditions[weatherConditions.toLowerCase()] || 0.95;
  
  return Math.round(orientationFactor * pitchFactor * shadingFactor * weatherFactor * 100);
}

/**
 * Calculate annual savings in Indian Rupees
 */
export function calculateAnnualSavings(powerOutputKW: number, efficiencyScore: number): number {
  const actualPowerKW = powerOutputKW * (efficiencyScore / 100);
  const dailyGeneration = actualPowerKW * MARKET_RATES.sunHoursPerDay;
  const annualGeneration = dailyGeneration * 365;
  return Math.round(annualGeneration * MARKET_RATES.electricityRate);
}

/**
 * Calculate installation cost in Indian Rupees
 */
export function calculateInstallationCost(panelCount: number): number {
  const totalWatts = panelCount * MARKET_STANDARDS.panelPower;
  return totalWatts * MARKET_RATES.costPerWatt;
}

/**
 * Calculate payback period in years
 */
export function calculatePaybackPeriod(installationCost: number, annualSavings: number): number {
  if (annualSavings <= 0) return 0;
  return Math.round((installationCost / annualSavings) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate optimal panel count based on roof area and constraints
 */
export function calculateOptimalPanelCount(
  roofArea: number,
  maxCoveragePercent: number = 35,
  userPanelCount?: number
): number {
  if (userPanelCount && userPanelCount > 0) {
    return userPanelCount;
  }
  
  const maxPanelArea = roofArea * (maxCoveragePercent / 100);
  const maxPanels = Math.floor(maxPanelArea / MARKET_STANDARDS.panelArea);
  
  // Ensure minimum viable installation (at least 4 panels)
  return Math.max(4, maxPanels);
}

/**
 * Perform complete installation calculations
 */
export function performInstallationCalculations(
  panelCount: number,
  roofArea: number,
  orientation: string,
  pitch: string,
  shading: string,
  weatherConditions: string = 'good'
): InstallationCalculations {
  const panelArea = calculatePanelArea(panelCount);
  const coveragePercentage = calculateCoverage(panelCount, roofArea);
  const powerOutputKW = calculatePowerOutput(panelCount);
  const efficiencyScore = calculateEfficiencyScore(orientation, pitch, shading, weatherConditions);
  const annualSavings = calculateAnnualSavings(powerOutputKW, efficiencyScore);
  const installationCost = calculateInstallationCost(panelCount);
  const paybackPeriod = calculatePaybackPeriod(installationCost, annualSavings);
  
  return {
    totalPanels: panelCount,
    panelArea,
    usableRoofArea: roofArea,
    coveragePercentage: Math.round(coveragePercentage * 100) / 100, // Round to 2 decimals
    powerOutputKW: Math.round(powerOutputKW * 100) / 100, // Round to 2 decimals
    efficiencyScore,
    annualSavings,
    installationCost,
    paybackPeriod
  };
}

/**
 * Validate calculation inputs
 */
export function validateCalculationInputs(
  panelCount: number,
  roofArea: number,
  orientation: string,
  pitch: string,
  shading: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (panelCount < 1) {
    errors.push('Panel count must be at least 1');
  }
  
  if (roofArea < 100) {
    errors.push('Roof area must be at least 100 square feet');
  }
  
  if (!EFFICIENCY_FACTORS.orientation[orientation.toLowerCase()]) {
    errors.push('Invalid orientation value');
  }
  
  if (!EFFICIENCY_FACTORS.pitch[pitch.toLowerCase()]) {
    errors.push('Invalid pitch value');
  }
  
  if (!EFFICIENCY_FACTORS.shading[shading.toLowerCase()]) {
    errors.push('Invalid shading value');
  }
  
  const coverage = calculateCoverage(panelCount, roofArea);
  if (coverage > 50) {
    errors.push('Panel coverage exceeds 50% of roof area - not recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get market standards summary for display
 */
export function getMarketStandardsSummary(): string {
  return `
Market Standards Used:
- Panel Size: ${MARKET_STANDARDS.panelWidth}ft × ${MARKET_STANDARDS.panelHeight}ft (${MARKET_STANDARDS.panelArea} sq ft)
- Panel Power: ${MARKET_STANDARDS.panelPower}W (${MARKET_STANDARDS.panelPowerKW}kW)
- Installation Cost: ₹${MARKET_RATES.costPerWatt}/watt
- Electricity Rate: ₹${MARKET_RATES.electricityRate}/kWh
- Sun Hours: ${MARKET_RATES.sunHoursPerDay} hours/day
- System Life: ${MARKET_RATES.systemLifeYears} years
  `.trim();
}