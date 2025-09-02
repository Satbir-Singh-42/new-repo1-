import { EnergyReading, EnergyTrade, Household } from '../shared/schema';

// ML-based energy prediction and optimization engine
// Type definitions for grid management
interface GridBalancing {
  supplyDemandRatio: number;
  gridLoadFactor: number;
  loadSheddingRequired: boolean;
  loadSheddingCandidates: number[];
  gridSupportProviders: number[];
  recommendedLoadReduction: number;
}

interface LoadShiftingStrategy {
  shiftableLoad: number;
  optimalShiftTime: number;
  potentialSavings: number;
}

interface LoadManagement {
  priorityLoads: { [householdId: number]: string[] };
  defferrableLoads: { [householdId: number]: string[] };
  loadShiftingOpportunities: { [householdId: number]: LoadShiftingStrategy };
  peakDemandReduction: number;
}

interface RedistributionAction {
  fromHouseholdId: number;
  toHouseholdId: number;
  energyAmount: number;
  transferType: 'immediate' | 'scheduled';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface RedistributionPlan {
  actions: RedistributionAction[];
  totalRedistributed: number;
  beneficiaryCount: number;
}

interface EquitableAccess {
  averageEnergySecurity: number;
  vulnerableHouseholds: number[];
  redistributionPlan: RedistributionPlan;
  equityScore: number;
  emergencySupport: boolean;
}

export class MLEnergyEngine {
  private weatherPatterns: Map<string, number> = new Map();
  private demandPatterns: Map<string, number[]> = new Map();
  private priceModel: PriceOptimizer = new PriceOptimizer();

  // Predict energy generation based on weather and historical data
  predictEnergyGeneration(household: Household, weather: WeatherCondition, timeOfDay: number): number {
    const baseGeneration = household.solarCapacity || 0;
    const weatherMultiplier = this.getWeatherMultiplier(weather);
    const timeMultiplier = this.getTimeMultiplier(timeOfDay);
    const seasonalMultiplier = this.getSeasonalMultiplier();

    return baseGeneration * weatherMultiplier * timeMultiplier * seasonalMultiplier;
  }

  // Predict energy demand using ML patterns with realistic consumption data
  predictEnergyDemand(household: Household, timeOfDay: number, dayOfWeek: number): number {
    // Dynamic demand based on household type and size
    const baseDemand = this.getBaseDemand(household); 
    const timePattern = this.getRealisticTimePattern(timeOfDay);
    const dayPattern = this.getRealisticDayPattern(dayOfWeek);
    const householdPattern = this.getRealisticHouseholdPattern(household);
    const seasonalPattern = this.getSeasonalDemandPattern();
    
    // Add variability for more dynamic trading
    const randomVariance = 0.8 + (Math.random() * 0.4); // ±20% variance

    return baseDemand * timePattern * dayPattern * householdPattern * seasonalPattern * randomVariance;
  }

  // Calculate base demand based on household type and characteristics
  private getBaseDemand(household: Household): number {
    // Extract household type from name for dynamic demand calculation
    const name = household.name.toLowerCase();
    
    if (name.includes('commercial') || name.includes('center') || name.includes('innovation')) {
      return 3.5; // Commercial buildings: higher baseline demand
    } else if (name.includes('apartments') || name.includes('complex')) {
      return 2.0; // Multi-family residential: medium demand
    } else if (name.includes('smart home') || name.includes('tech')) {
      return 1.8; // Tech-savvy homes: higher demand due to devices
    } else {
      return 1.25; // Standard residential: average US household consumption (30 kWh/day = 1.25 kWh/hour)
    }
  }

  // Optimize energy distribution across the network
  optimizeEnergyDistribution(households: Household[], currentWeather: WeatherCondition): OptimizationResult {
    const networkState = this.analyzeNetworkState(households, currentWeather);
    const tradingPairs = this.identifyTradingPairs(networkState);
    const prices = this.calculateOptimalPrices(tradingPairs, networkState);
    const batteryStrategy = this.optimizeBatteryStrategy(networkState);
    const gridBalancing = this.calculateGridBalancing(networkState);
    const loadManagement = this.optimizeLoadManagement(networkState);

    return {
      tradingPairs,
      prices,
      batteryStrategy,
      gridStability: this.calculateGridStability(networkState),
      recommendations: this.generateRecommendations(networkState),
      gridBalancing,
      loadManagement,
      equitableAccess: this.ensureEquitableAccess(networkState)
    };
  }

  // Simulate outage response and recovery
  simulateOutageResponse(affectedHouseholds: number[], totalHouseholds: Household[]): OutageResponse {
    const survivingCapacity = this.calculateSurvivingCapacity(affectedHouseholds, totalHouseholds);
    const emergencyRouting = this.calculateEmergencyRouting(affectedHouseholds, survivingCapacity);
    const recoveryPlan = this.generateRecoveryPlan(affectedHouseholds, totalHouseholds);

    return {
      survivingCapacity,
      emergencyRouting,
      estimatedRecoveryTime: recoveryPlan.estimatedTime,
      priorityAllocation: recoveryPlan.priorityHouseholds,
      communityResilience: this.calculateResilienceScore(totalHouseholds, affectedHouseholds.length)
    };
  }

  // Realistic weather adaptation algorithms based on solar irradiance data
  private getWeatherMultiplier(weather: WeatherCondition): number {
    const baseMultipliers = {
      'sunny': 1.0,          // Clear sky irradiance ~1000 W/m²
      'partly-cloudy': 0.82, // ~820 W/m² typical
      'cloudy': 0.45,        // ~450 W/m² heavy clouds
      'overcast': 0.25,      // ~250 W/m² thick overcast
      'rainy': 0.15,         // ~150 W/m² during rain
      'stormy': 0.08         // ~80 W/m² storm conditions
    };
    
    const cloudCoverImpact = Math.max(0.1, 1 - (weather.cloudCover / 100) * 0.7);
    const temperatureImpact = this.getTemperatureImpact(weather.temperature);
    
    return (baseMultipliers[weather.condition] || 0.6) * cloudCoverImpact * temperatureImpact;
  }

  // Solar panels lose efficiency in extreme heat
  private getTemperatureImpact(temperature: number): number {
    // Optimal temperature for solar panels: 25°C (77°F)
    // -0.4% efficiency per degree above 25°C
    if (temperature <= 25) return 1.0;
    const tempLoss = (temperature - 25) * 0.004;
    return Math.max(0.7, 1 - tempLoss); // Min 70% efficiency
  }

  // Calculate grid balancing to prevent overload during peak demand
  private calculateGridBalancing(networkState: NetworkState): GridBalancing {
    const totalGeneration = networkState.households.reduce((sum, h) => sum + h.predictedGeneration, 0);
    const totalDemand = networkState.households.reduce((sum, h) => sum + h.predictedDemand, 0);
    const totalBatteryCapacity = networkState.households.reduce((sum, h) => sum + (h.batteryCapacity || 0), 0);
    const totalStoredEnergy = networkState.households.reduce((sum, h) => sum + ((h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100), 0);
    
    const supplyDemandRatio = totalDemand > 0 ? totalGeneration / totalDemand : 1;
    const gridLoadFactor = Math.min(1.0, totalDemand / (totalGeneration + totalStoredEnergy));
    
    // Identify households that need load shedding or can provide grid support
    const loadSheddingCandidates: number[] = [];
    const gridSupportProviders: number[] = [];
    
    networkState.households.forEach(h => {
      const surplus = h.predictedGeneration - h.predictedDemand;
      if (surplus < -2) { // High demand, low generation
        loadSheddingCandidates.push(h.id);
      } else if (surplus > 2) { // High generation, low demand
        gridSupportProviders.push(h.id);
      }
    });
    
    return {
      supplyDemandRatio,
      gridLoadFactor,
      loadSheddingRequired: gridLoadFactor > 0.9,
      loadSheddingCandidates,
      gridSupportProviders,
      recommendedLoadReduction: gridLoadFactor > 0.9 ? (gridLoadFactor - 0.85) * totalDemand : 0
    };
  }

  // Optimize load management to prevent grid overload
  private optimizeLoadManagement(networkState: NetworkState): LoadManagement {
    const currentHour = new Date().getHours();
    const isPeakHour = currentHour >= 17 && currentHour <= 21; // 5-9 PM peak demand
    
    const priorityLoads: { [householdId: number]: string[] } = {};
    const defferrableLoads: { [householdId: number]: string[] } = {};
    const loadShiftingOpportunities: { [householdId: number]: LoadShiftingStrategy } = {};
    
    networkState.households.forEach(h => {
      const deficit = h.predictedDemand - h.predictedGeneration - ((h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100);
      
      if (deficit > 1) { // Household needs significant grid support
        priorityLoads[h.id] = ['refrigeration', 'medical_equipment', 'lighting'];
        defferrableLoads[h.id] = ['water_heating', 'air_conditioning', 'electric_vehicle'];
        
        loadShiftingOpportunities[h.id] = {
          shiftableLoad: Math.min(deficit * 0.3, 2), // Max 2kW shift
          optimalShiftTime: isPeakHour ? currentHour + 4 : currentHour + 1,
          potentialSavings: deficit * 0.15 // 15% load reduction through shifting
        };
      }
    });
    
    return {
      priorityLoads,
      defferrableLoads,
      loadShiftingOpportunities,
      peakDemandReduction: Object.values(loadShiftingOpportunities)
        .reduce((sum, strategy) => sum + strategy.potentialSavings, 0)
    };
  }

  // Ensure equitable access to power across all households
  private ensureEquitableAccess(networkState: NetworkState): EquitableAccess {
    const householdEnergySecurity = networkState.households.map(h => {
      const totalAvailable = h.predictedGeneration + ((h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100);
      const securityRatio = h.predictedDemand > 0 ? totalAvailable / h.predictedDemand : 1;
      
      return {
        householdId: h.id,
        energySecurity: Math.min(1, securityRatio),
        isVulnerable: securityRatio < 0.7, // Less than 70% energy security
        priorityLevel: this.calculatePriorityLevel(h, securityRatio)
      };
    });
    
    const vulnerableHouseholds = householdEnergySecurity.filter(h => h.isVulnerable);
    const averageEnergySecurity = householdEnergySecurity.reduce((sum, h) => sum + h.energySecurity, 0) / householdEnergySecurity.length;
    
    // Calculate redistribution recommendations
    const redistributionPlan = this.calculateRedistributionPlan(networkState, vulnerableHouseholds);
    
    return {
      averageEnergySecurity,
      vulnerableHouseholds: vulnerableHouseholds.map(h => h.householdId),
      redistributionPlan,
      equityScore: 1 - (vulnerableHouseholds.length / householdEnergySecurity.length),
      emergencySupport: vulnerableHouseholds.length > networkState.households.length * 0.2
    };
  }

  private calculatePriorityLevel(household: Household, securityRatio: number): 'critical' | 'high' | 'medium' | 'low' {
    // Consider factors like medical equipment, vulnerable population, etc.
    if (securityRatio < 0.3) return 'critical';
    if (securityRatio < 0.5) return 'high'; 
    if (securityRatio < 0.7) return 'medium';
    return 'low';
  }

  private calculateRedistributionPlan(networkState: NetworkState, vulnerableHouseholds: any[]): RedistributionPlan {
    const surplusHouseholds = networkState.households.filter(h => 
      (h.predictedGeneration + ((h.currentBatteryLevel || 0) * (h.batteryCapacity || 0) / 100)) > h.predictedDemand * 1.2
    );
    
    const redistributionActions: RedistributionAction[] = [];
    
    vulnerableHouseholds.forEach(vulnerable => {
      const needsKwh = networkState.households.find(h => h.id === vulnerable.householdId)?.predictedDemand || 0;
      const availableKwh = networkState.households.find(h => h.id === vulnerable.householdId);
      const shortfall = needsKwh - (availableKwh?.predictedGeneration || 0) - ((availableKwh?.currentBatteryLevel || 0) * (availableKwh?.batteryCapacity || 0) / 100);
      
      if (shortfall > 0 && surplusHouseholds.length > 0) {
        const donor = surplusHouseholds[0]; // Simple first-available allocation
        const transferAmount = Math.min(shortfall, 
          (donor.predictedGeneration + ((donor.currentBatteryLevel || 0) * (donor.batteryCapacity || 0) / 100)) - donor.predictedDemand);
        
        if (transferAmount > 0.1) { // Minimum 0.1 kWh transfer
          redistributionActions.push({
            fromHouseholdId: donor.id,
            toHouseholdId: vulnerable.householdId,
            energyAmount: transferAmount,
            transferType: transferAmount < 1 ? 'immediate' : 'scheduled',
            priority: vulnerable.priorityLevel || 'medium'
          });
        }
      }
    });
    
    return {
      actions: redistributionActions,
      totalRedistributed: redistributionActions.reduce((sum, action) => sum + action.energyAmount, 0),
      beneficiaryCount: new Set(redistributionActions.map(a => a.toHouseholdId)).size
    };
  }

  private getTimeMultiplier(hour: number): number {
    // Realistic solar generation curve based on sun angle and atmospheric conditions
    if (hour < 5 || hour > 20) return 0;
    
    // Peak Solar Hours (PSH) curve - bell-shaped distribution
    const solarCurve = [
      0, 0, 0, 0, 0,      // 0-4 AM
      0.02, 0.15, 0.35,   // 5-7 AM: sunrise
      0.58, 0.78, 0.92,   // 8-10 AM: morning climb
      0.98, 1.0, 0.98,    // 11 AM-1 PM: peak hours
      0.92, 0.78, 0.58,   // 2-4 PM: afternoon decline
      0.35, 0.15, 0.02,   // 5-7 PM: evening
      0, 0, 0, 0         // 8-11 PM
    ];
    
    return solarCurve[hour] || 0;
  }

  private getSeasonalMultiplier(): number {
    const month = new Date().getMonth();
    const seasonalFactors = [0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 0.95, 0.85, 0.75, 0.65, 0.55];
    return seasonalFactors[month];
  }

  private analyzeNetworkState(households: Household[], weather: WeatherCondition): NetworkState {
    const currentHour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    const householdsWithPredictions = households.map(household => {
      const predictedGeneration = this.predictEnergyGeneration(household, weather, currentHour);
      const predictedDemand = this.predictEnergyDemand(household, currentHour, dayOfWeek);
      const batteryLevel = (household.currentBatteryLevel || 0) * (household.batteryCapacity || 0) / 100; // Convert % to kWh
      const batteryCapacity = household.batteryCapacity || 0;
      
      return {
        ...household,
        predictedGeneration,
        predictedDemand,
        netBalance: predictedGeneration - predictedDemand,
        batteryLevel,
        batteryCapacity,
        canSupport: predictedGeneration > predictedDemand * 1.1 || batteryLevel > 0.8 * batteryCapacity,
        needsSupport: predictedGeneration < predictedDemand * 0.9 || batteryLevel < 0.3 * batteryCapacity
      };
    });

    return {
      households: householdsWithPredictions,
      totalGeneration: householdsWithPredictions.reduce((sum, h) => sum + h.predictedGeneration, 0),
      totalDemand: householdsWithPredictions.reduce((sum, h) => sum + h.predictedDemand, 0),
      weather,
      timestamp: new Date()
    };
  }

  private identifyTradingPairs(networkState: NetworkState): TradingPair[] {
    // More aggressive trading pair identification for better simulation
    const suppliers = networkState.households.filter(h => 
      h.predictedGeneration > h.predictedDemand * 0.8 || 
      h.batteryLevel > h.batteryCapacity * 0.6
    );
    const demanders = networkState.households.filter(h => 
      h.predictedGeneration < h.predictedDemand * 1.2 || 
      h.batteryLevel < h.batteryCapacity * 0.4
    );
    const pairs: TradingPair[] = [];

    // Smart matching algorithm considering distance and capacity
    demanders.forEach(demander => {
      const bestSupplier = suppliers
        .filter(s => s.netBalance > 0)
        .sort((a, b) => {
          const distanceA = this.calculateDistance(a.address || '', demander.address || '');
          const distanceB = this.calculateDistance(b.address || '', demander.address || '');
          return distanceA - distanceB; // Prefer closer suppliers
        })[0];

      if (bestSupplier) {
        const energyAmount = Math.min(
          Math.abs(demander.netBalance),
          bestSupplier.netBalance,
          2.0 // Max 2kWh per trade for stability
        );

        const priority = this.determinePriority(demander);
        pairs.push({
          supplierId: bestSupplier.id,
          demanderId: demander.id,
          energyAmount,
          distance: this.calculateDistance(bestSupplier.address || '', demander.address || ''),
          priority
        });

        // Update balances for next iterations
        bestSupplier.netBalance -= energyAmount;
        demander.netBalance += energyAmount;
      }
    });

    return pairs;
  }

  private calculateOptimalPrices(pairs: TradingPair[], networkState: NetworkState): Map<number, number> {
    return this.priceModel.calculateOptimalPrices(pairs, networkState);
  }

  private optimizeBatteryStrategy(networkState: NetworkState): BatteryStrategy {
    const strategies: { [householdId: number]: string } = {};
    
    networkState.households.forEach(household => {
      const batteryLevel = (household.currentBatteryLevel || 0) * (household.batteryCapacity || 0) / 100;
      const batteryRatio = batteryLevel / Math.max(household.batteryCapacity, 1);
      
      if (household.netBalance > 0) {
        // Surplus energy - charge battery or sell
        if (batteryRatio < 0.8) {
          strategies[household.id] = 'charge';
        } else {
          strategies[household.id] = 'sell';
        }
      } else {
        // Energy deficit - use battery or buy
        if (batteryRatio > 0.3) {
          strategies[household.id] = 'discharge';
        } else {
          strategies[household.id] = 'buy';
        }
      }
    });

    return { strategies };
  }

  private calculateGridStability(networkState: NetworkState): number {
    const totalBalance = networkState.totalGeneration - networkState.totalDemand;
    
    // Prevent division by zero
    if (networkState.totalDemand === 0) {
      return networkState.totalGeneration > 0 ? 1.0 : 0.5; // Perfect if generating, neutral if no activity
    }
    
    const balanceRatio = Math.abs(totalBalance) / networkState.totalDemand;
    
    // Stability score (0-1, higher is better)
    return Math.max(0, 1 - balanceRatio);
  }

  private generateRecommendations(networkState: NetworkState): string[] {
    const recommendations: string[] = [];
    const stabilityScore = this.calculateGridStability(networkState);

    if (stabilityScore < 0.7) {
      recommendations.push("Grid stability low - recommend immediate battery deployment");
    }

    if (networkState.totalGeneration < networkState.totalDemand * 0.8) {
      recommendations.push("Energy deficit detected - activate demand response programs");
    }

    const highDemandHouseholds = networkState.households.filter(h => h.needsSupport).length;
    if (highDemandHouseholds > networkState.households.length * 0.4) {
      recommendations.push("High network demand - consider temporary load shedding");
    }

    return recommendations;
  }

  private calculateDistance(loc1: string, loc2: string): number {
    // Deterministic distance calculation based on address strings
    const hash1 = loc1.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const hash2 = loc2.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    // Use modulo for consistent, repeatable distance calculation
    return (Math.abs(hash1 - hash2) % 15) + 1; // 1-15 km realistic neighborhood distances
  }

  private calculateSurvivingCapacity(affected: number[], total: Household[]): number {
    const surviving = total.filter(h => !affected.includes(h.id));
    return surviving.reduce((sum, h) => sum + (h.solarCapacity || 0), 0);
  }

  private calculateEmergencyRouting(affected: number[], survivingCapacity: number): EmergencyRouting {
    return {
      criticalLoadsFirst: true,
      maxDistanceKm: 10,
      emergencyReserveRatio: 0.2,
      availableCapacity: survivingCapacity * 0.8 // Reserve 20% for stability
    };
  }

  private generateRecoveryPlan(affected: number[], total: Household[]): RecoveryPlan {
    const criticalHouseholds = total.filter(h => 
      affected.includes(h.id) && (h.currentBatteryLevel || 0) < 20
    );
    
    return {
      estimatedTime: affected.length * 0.5, // 30 min per household
      priorityHouseholds: criticalHouseholds.map(h => h.id),
      phaseApproach: 'critical-first'
    };
  }

  private calculateResilienceScore(allHouseholds: Household[], affectedCount: number): number {
    const networkSize = allHouseholds.length;
    
    // Handle empty network case
    if (networkSize === 0) {
      return 0.5; // Neutral score for empty network
    }
    
    const distributedGeneration = allHouseholds.filter(h => (h.solarCapacity || 0) > 0).length;
    const batteryBackup = allHouseholds.filter(h => (h.batteryCapacity || 0) > 0).length;
    
    const diversityScore = (distributedGeneration / networkSize) * 0.4;
    const backupScore = (batteryBackup / networkSize) * 0.3;
    const impactScore = (1 - (affectedCount / networkSize)) * 0.3;
    
    return diversityScore + backupScore + impactScore;
  }

  // Realistic demand patterns based on actual residential usage data
  private getRealisticTimePattern(hour: number): number {
    // Based on residential load curve data - peak at 6-9 PM
    const demandCurve = [
      0.45, 0.42, 0.40, 0.38, 0.40,  // 12-4 AM: night minimum
      0.45, 0.55, 0.75, 0.85, 0.72,  // 5-9 AM: morning rise
      0.65, 0.68, 0.70, 0.72, 0.75,  // 10 AM-2 PM: daytime steady
      0.78, 0.85, 0.95, 1.0, 0.92,   // 3-7 PM: evening peak
      0.80, 0.70, 0.58, 0.52         // 8-11 PM: night decline
    ];
    return demandCurve[hour] || 0.6;
  }

  private getRealisticDayPattern(dayOfWeek: number): number {
    // Monday=1, Sunday=0 - Weekends have different patterns
    const weekPattern = [
      0.95, // Sunday - moderate usage
      1.0,  // Monday - peak work-from-home 
      1.0,  // Tuesday 
      1.0,  // Wednesday
      1.0,  // Thursday
      0.98, // Friday - slightly lower
      0.92  // Saturday - weekend pattern
    ];
    return weekPattern[dayOfWeek] || 1.0;
  }

  private getRealisticHouseholdPattern(household: Household): number {
    let pattern = 1.0;
    
    // Battery management affects consumption patterns
    const batteryLevel = household.currentBatteryLevel || 50;
    if (batteryLevel < 20) pattern *= 1.15; // Low battery increases grid dependency
    if (batteryLevel > 80) pattern *= 0.92; // High battery allows load shifting
    
    // Solar capacity affects consumption behavior
    const solarCapacity = household.solarCapacity || 0;
    if (solarCapacity > 8000) pattern *= 0.88; // Large solar systems encourage higher usage
    if (solarCapacity === 0) pattern *= 1.05;   // No solar = higher grid usage
    
    // Battery capacity affects optimization behavior
    const batteryCapacity = household.batteryCapacity || 0;
    if (batteryCapacity > 13000) pattern *= 0.85; // Large batteries enable optimization
    
    return Math.max(0.7, Math.min(1.3, pattern)); // Reasonable bounds
  }

  private getSeasonalDemandPattern(): number {
    const month = new Date().getMonth();
    // Seasonal demand variations (HVAC usage)
    const seasonalDemand = [
      1.2,  // Jan - winter heating
      1.15, // Feb
      1.0,  // Mar - mild weather
      0.9,  // Apr
      1.0,  // May 
      1.3,  // Jun - AC season starts
      1.4,  // Jul - peak summer AC
      1.4,  // Aug - peak summer AC
      1.2,  // Sep - AC still high
      0.95, // Oct - mild weather
      1.05, // Nov - heating starts
      1.2   // Dec - winter heating
    ];
    return seasonalDemand[month];
  }

  private determinePriority(household: any): 'normal' | 'high' | 'emergency' {
    const batteryLevel = household.currentBatteryLevel || 50;
    const netBalance = household.netBalance || 0;
    
    if (batteryLevel < 10 && netBalance < -2) return 'emergency';
    if (batteryLevel < 20 || netBalance < -1.5) return 'high';
    return 'normal';
  }
}

class PriceOptimizer {
  calculateOptimalPrices(pairs: TradingPair[], networkState: NetworkState): Map<number, number> {
    const prices = new Map<number, number>();
    
    // Dynamic base price based on time of day (Time-of-Use pricing)
    const hour = new Date().getHours();
    const basePrice = this.getTimeOfUsePrice(hour);
    
    pairs.forEach(pair => {
      let price = basePrice;
      
      // Transmission loss compensation (increases with distance) in ₹/kWh
      const transmissionLoss = Math.min(0.50, (pair.distance / 100) * 0.30);
      price += transmissionLoss;
      
      // Grid congestion pricing
      const congestionMultiplier = this.getGridCongestion(networkState);
      price *= congestionMultiplier;
      
      // Priority-based pricing
      if (pair.priority === 'high') {
        price *= 1.25; // Critical loads pay premium
      } else if (pair.priority === 'emergency') {
        price *= 1.5; // Emergency loads pay highest premium
      }
      
      // Real-time supply/demand elasticity
      const supplyDemandRatio = networkState.totalGeneration / Math.max(networkState.totalDemand, 0.1);
      const elasticity = this.calculateElasticity(supplyDemandRatio);
      price *= elasticity;
      
      // Carbon pricing incentive for renewable energy (₹0.20/kWh discount)
      const carbonDiscount = 0.20; 
      price -= carbonDiscount;
      
      // Indian market clearing price bounds (₹2.50 - ₹12.00/kWh)
      const finalPrice = Math.max(2.50, Math.min(12.00, price));
      prices.set(pair.supplierId, Math.round(finalPrice * 100) / 100); // Round to 2 decimals
    });
    
    return prices;
  }

  private getTimeOfUsePrice(hour: number): number {
    // Indian electricity Time-of-Use rates in ₹/kWh
    // Based on Indian state electricity board rates (Punjab/Haryana region)
    if (hour >= 18 && hour <= 22) return 7.50; // Peak hours (6-10 PM) - ₹7.50/kWh
    if (hour >= 6 && hour <= 9) return 6.20;   // Morning peak (6-9 AM) - ₹6.20/kWh  
    if (hour >= 10 && hour <= 17) return 4.80; // Day hours (10 AM-5 PM) - ₹4.80/kWh
    return 3.20; // Off-peak/night (10 PM-6 AM) - ₹3.20/kWh
  }

  private getGridCongestion(networkState: NetworkState): number {
    const utilizationRatio = networkState.totalDemand / Math.max(networkState.totalGeneration, 0.1);
    
    if (utilizationRatio > 0.95) return 1.4; // High congestion
    if (utilizationRatio > 0.85) return 1.2; // Moderate congestion
    if (utilizationRatio < 0.6) return 0.9;  // Low utilization discount
    return 1.0; // Normal conditions
  }

  private calculateElasticity(supplyDemandRatio: number): number {
    // Price elasticity based on supply/demand balance
    if (supplyDemandRatio < 0.8) return 1.5;   // Severe shortage
    if (supplyDemandRatio < 0.95) return 1.25; // Moderate shortage
    if (supplyDemandRatio > 1.2) return 0.75;  // Significant surplus
    if (supplyDemandRatio > 1.05) return 0.9;  // Moderate surplus
    return 1.0; // Balanced market
  }
}

// Type definitions
export interface WeatherCondition {
  condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'rainy' | 'stormy';
  temperature: number;
  cloudCover: number;
  windSpeed: number;
}

export interface OptimizationResult {
  tradingPairs: TradingPair[];
  prices: Map<number, number>;
  batteryStrategy: BatteryStrategy;
  gridStability: number;
  recommendations: string[];
  gridBalancing: any;
  loadManagement: any;
  equitableAccess: any;
}

export interface TradingPair {
  supplierId: number;
  demanderId: number;
  energyAmount: number;
  distance: number;
  priority: 'high' | 'normal' | 'emergency';
}

export interface NetworkState {
  households: (Household & {
    predictedGeneration: number;
    predictedDemand: number;
    netBalance: number;
    canSupport: boolean;
    needsSupport: boolean;
  })[];
  totalGeneration: number;
  totalDemand: number;
  weather: WeatherCondition;
  timestamp: Date;
}

export interface BatteryStrategy {
  strategies: { [householdId: number]: string };
}

export interface OutageResponse {
  survivingCapacity: number;
  emergencyRouting: EmergencyRouting;
  estimatedRecoveryTime: number;
  priorityAllocation: number[];
  communityResilience: number;
}

export interface EmergencyRouting {
  criticalLoadsFirst: boolean;
  maxDistanceKm: number;
  emergencyReserveRatio: number;
  availableCapacity: number;
}

export interface RecoveryPlan {
  estimatedTime: number;
  priorityHouseholds: number[];
  phaseApproach: string;
}