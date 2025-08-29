import { MLEnergyEngine, WeatherCondition, OutageResponse } from './ml-engine';
import { Household, EnergyReading, EnergyTrade } from '../shared/schema';
import { IStorage } from './storage';

// Separate simulation data context - isolated from real operational data
class SimulationDataContext {
  private households: Household[] = [];
  private energyReadings: EnergyReading[] = [];
  private energyTrades: EnergyTrade[] = [];
  private nextHouseholdId = 1000; // Start simulation IDs at 1000 to avoid conflicts
  private nextReadingId = 10000;
  private nextTradeId = 10000;

  // Initialize with demo households for simulation only
  initializeDemoHouseholds(): void {
    this.households = [
      {
        id: this.nextHouseholdId++,
        name: 'Solar Pioneers (Demo)',
        address: 'Simulation District A',
        solarCapacity: 8500,
        batteryCapacity: 15,
        currentBatteryLevel: 80,
        isOnline: true,
        userId: 999 // Mark as simulation data with special user ID
      },
      {
        id: this.nextHouseholdId++,
        name: 'Green Energy Hub (Demo)',
        address: 'Simulation District B',
        solarCapacity: 12000,
        batteryCapacity: 20,
        currentBatteryLevel: 80,
        isOnline: true,
        userId: 999
      },
      {
        id: this.nextHouseholdId++,
        name: 'Community Center (Demo)',
        address: 'Simulation Commercial Zone',
        solarCapacity: 25000,
        batteryCapacity: 40,
        currentBatteryLevel: 75,
        isOnline: true,
        userId: 999
      },
      {
        id: this.nextHouseholdId++,
        name: 'Eco Apartments (Demo)',
        address: 'Simulation District C',
        solarCapacity: 6000,
        batteryCapacity: 10,
        currentBatteryLevel: 70,
        isOnline: true,
        userId: 999
      },
      {
        id: this.nextHouseholdId++,
        name: 'Smart Home Alpha (Demo)',
        address: 'Simulation District A',
        solarCapacity: 10000,
        batteryCapacity: 18,
        currentBatteryLevel: 78,
        isOnline: true,
        userId: 999
      }
    ];
  }

  getHouseholds(): Household[] {
    return this.households;
  }

  updateHousehold(id: number, updates: Partial<Household>): void {
    const household = this.households.find(h => h.id === id);
    if (household) {
      Object.assign(household, updates);
    }
  }

  addEnergyReading(reading: Omit<EnergyReading, 'id' | 'timestamp'>): void {
    this.energyReadings.push({
      id: this.nextReadingId++,
      ...reading,
      timestamp: new Date()
    });
    
    // Keep only recent readings to prevent memory bloat
    if (this.energyReadings.length > 1000) {
      this.energyReadings = this.energyReadings.slice(-500);
    }
  }

  addEnergyTrade(trade: Omit<EnergyTrade, 'id' | 'createdAt' | 'status' | 'completedAt'>): void {
    this.energyTrades.push({
      id: this.nextTradeId++,
      ...trade,
      createdAt: new Date(),
      status: 'completed',
      completedAt: new Date()
    });
    
    // Keep only recent trades to prevent memory bloat
    if (this.energyTrades.length > 500) {
      this.energyTrades = this.energyTrades.slice(-250);
    }
  }

  getRecentTrades(limit: number = 50): EnergyTrade[] {
    return this.energyTrades.slice(-limit);
  }

  getRecentReadings(limit: number = 100): EnergyReading[] {
    return this.energyReadings.slice(-limit);
  }

  clearAll(): void {
    this.households = [];
    this.energyReadings = [];
    this.energyTrades = [];
  }
}

// Real-time simulation engine for live demonstrations
export class SimulationEngine {
  private mlEngine: MLEnergyEngine;
  private storage: IStorage;
  private simulationData: SimulationDataContext;
  private simulationInterval: NodeJS.Timeout | null = null;
  private weatherSimulator: WeatherSimulator;
  private outageSimulator: OutageSimulator;
  private isRunning: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.simulationData = new SimulationDataContext();
    this.mlEngine = new MLEnergyEngine();
    this.weatherSimulator = new WeatherSimulator();
    this.outageSimulator = new OutageSimulator();
  }

  // Start live simulation
  async startSimulation(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting SolarSense live simulation...');
    
    // Initialize demo households in isolated simulation context
    this.simulationData.initializeDemoHouseholds();
    
    // Start main simulation loop
    this.simulationInterval = setInterval(async () => {
      await this.runSimulationCycle();
    }, 10000); // Update every 10 seconds for live demo
    
    console.log('✅ Live simulation started - updating every 10 seconds');
    console.log(`📊 Simulation running with ${this.simulationData.getHouseholds().length} demo households (isolated from real data)`);
  }

  // Stop simulation
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Simulation stopped');
  }

  // Get simulation status
  getStatus(): SimulationStatus {
    return {
      isRunning: this.isRunning,
      currentWeather: this.weatherSimulator.getCurrentWeather(),
      activeOutages: this.outageSimulator.getActiveOutages(),
      networkStats: this.getNetworkStats()
    };
  }

  // Trigger weather change for demonstration
  async triggerWeatherChange(condition: WeatherCondition['condition']): Promise<WeatherCondition> {
    const newWeather = this.weatherSimulator.setWeather(condition);
    console.log(`🌤️ Simulation weather changed to: ${condition} (isolated from real-time dashboard)`);
    
    // Immediately run optimization with new weather in simulation context
    await this.runSimulationCycle();
    
    return newWeather;
  }

  // Trigger power outage simulation
  async triggerOutage(householdIds: number[] = []): Promise<OutageResponse> {
    if (householdIds.length === 0) {
      // Random outage affecting 20-30% of simulation network
      const allHouseholds = this.simulationData.getHouseholds();
      const outageCount = Math.floor(allHouseholds.length * 0.2) + Math.floor(Math.random() * allHouseholds.length * 0.1);
      householdIds = this.selectRandomHouseholds(allHouseholds, outageCount);
    }

    const response = await this.outageSimulator.simulateOutage(householdIds, this.simulationData.getHouseholds());
    
    console.log(`⚡ Simulation outage: ${householdIds.length} demo households affected (isolated from real data)`);
    console.log(`🔋 Community resilience score: ${response.communityResilience.toFixed(2)}`);
    
    // Update household statuses in simulation context only
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, { 
        isOnline: false
      });
    }

    return response;
  }

  // Restore power after outage
  async restorePower(householdIds: number[]): Promise<void> {
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, { 
        isOnline: true 
      });
    }
    
    this.outageSimulator.clearOutage(householdIds);
    console.log(`🔌 Simulation power restored to ${householdIds.length} demo households`);
  }

  // Main simulation cycle
  private async runSimulationCycle(): Promise<void> {
    try {
      const households = this.simulationData.getHouseholds();
      const currentWeather = this.weatherSimulator.getCurrentWeather();
      
      // Run ML optimization on simulation households
      const optimization = this.mlEngine.optimizeEnergyDistribution(households, currentWeather);
      
      // Generate energy readings for simulation households
      this.generateEnergyReadings(households, currentWeather);
      
      // Execute optimal trades in simulation context
      this.executeTrades(optimization.tradingPairs, optimization.prices);
      
      // Update battery levels based on strategy in simulation context
      this.updateBatteryLevels(households, optimization.batteryStrategy);
      
      // Log key metrics
      this.logSimulationMetrics(optimization, currentWeather);
      
    } catch (error) {
      console.error('❌ Simulation cycle error:', error);
    }
  }

  private generateEnergyReadings(households: Household[], weather: WeatherCondition): void {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    
    for (const household of households) {
      if (!household.isOnline) continue; // Skip households affected by outage
      
      const generation = this.mlEngine.predictEnergyGeneration(household, weather, hour);
      const consumption = this.mlEngine.predictEnergyDemand(household, hour, currentTime.getDay());
      
      // Add some realistic variance
      const generationVariance = generation * 0.1 * (Math.random() - 0.5);
      const consumptionVariance = consumption * 0.1 * (Math.random() - 0.5);
      
      const reading = {
        householdId: household.id,
        solarGeneration: Math.max(0, Math.round((generation + generationVariance) * 1000)), // Convert to watts
        energyConsumption: Math.max(0, Math.round((consumption + consumptionVariance) * 1000)), // Convert to watts
        batteryLevel: household.currentBatteryLevel || 0,
        weatherCondition: weather.condition,
        temperature: Math.round(weather.temperature)
      };
      
      // Add to simulation context instead of real database
      this.simulationData.addEnergyReading(reading);
    }
  }

  private executeTrades(tradingPairs: any[], prices: Map<number, number>): void {
    for (const pair of tradingPairs) {
      const price = prices.get(pair.supplierId) || 0.12;
      const totalCost = pair.energyAmount * price;
      
      const trade = {
        sellerHouseholdId: pair.supplierId,
        buyerHouseholdId: pair.demanderId,
        energyAmount: Math.round(pair.energyAmount * 1000), // Convert to Wh
        pricePerKwh: Math.round(price * 100), // Convert to cents
        tradeType: 'surplus_sale' as const,
        createdAt: new Date(),
        completedAt: new Date()
      };
      
      // Add to simulation context instead of real database
      this.simulationData.addEnergyTrade(trade);
    }
  }

  private updateBatteryLevels(households: Household[], batteryStrategy: any): void {
    for (const household of households) {
      const strategy = batteryStrategy.strategies[household.id];
      let newBatteryLevel = household.currentBatteryLevel || 0;
      const maxCapacity = household.batteryCapacity || 0;
      
      if (!household.isOnline || maxCapacity === 0) continue;
      
      switch (strategy) {
        case 'charge':
          newBatteryLevel = Math.min(maxCapacity, newBatteryLevel + 2); // 2kWh charge rate
          break;
        case 'discharge':
          newBatteryLevel = Math.max(0, newBatteryLevel - 1.5); // 1.5kWh discharge rate
          break;
        case 'sell':
        case 'buy':
          // Battery level remains stable during active trading
          break;
      }
      
      if (newBatteryLevel !== household.currentBatteryLevel) {
        // Update in simulation context instead of real database
        this.simulationData.updateHousehold(household.id, { 
          currentBatteryLevel: newBatteryLevel 
        });
      }
    }
  }

  // Get simulation-specific data (not mixed with real operational data)
  getSimulationData(): {
    households: Household[];
    recentTrades: EnergyTrade[];
    recentReadings: EnergyReading[];
    weather: WeatherCondition;
  } {
    return {
      households: this.simulationData.getHouseholds(),
      recentTrades: this.simulationData.getRecentTrades(20),
      recentReadings: this.simulationData.getRecentReadings(50),
      weather: this.weatherSimulator.getCurrentWeather()
    };
  }

  private selectRandomHouseholds(households: Household[], count: number): number[] {
    const shuffled = [...households].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(h => h.id);
  }

  private getNetworkStats(): NetworkStats {
    // This would be populated with real-time data in a production system
    return {
      totalHouseholds: 5,
      activeConnections: 5,
      totalGeneration: 61.5,
      totalConsumption: 41.8,
      batteryStorageTotal: 103.0,
      tradingVelocity: 12.5,
      carbonReduction: 28.2
    };
  }

  private logSimulationMetrics(optimization: any, weather: WeatherCondition): void {
    console.log(`📊 Simulation Update - Weather: ${weather.condition}`);
    console.log(`⚡ Grid Stability: ${(optimization.gridStability * 100).toFixed(1)}%`);
    console.log(`🔄 Active Trades: ${optimization.tradingPairs.length}`);
    console.log(`💡 Recommendations: ${optimization.recommendations.length}`);
    
    if (optimization.recommendations.length > 0) {
      console.log(`🎯 Key Recommendation: ${optimization.recommendations[0]}`);
    }
  }
}

class WeatherSimulator {
  private currentWeather: WeatherCondition;
  private weatherCycle: WeatherCondition[] = [];
  private cycleIndex: number = 0;

  constructor() {
    this.initializeWeatherCycle();
    this.currentWeather = this.weatherCycle[0];
  }

  getCurrentWeather(): WeatherCondition {
    return this.currentWeather;
  }

  setWeather(condition: WeatherCondition['condition']): WeatherCondition {
    this.currentWeather = {
      condition,
      temperature: this.getTemperatureForCondition(condition),
      cloudCover: this.getCloudCoverForCondition(condition),
      windSpeed: Math.random() * 15 + 5
    };
    return this.currentWeather;
  }

  private initializeWeatherCycle(): void {
    this.weatherCycle = [
      { condition: 'sunny', temperature: 28, cloudCover: 10, windSpeed: 8 },
      { condition: 'partly-cloudy', temperature: 25, cloudCover: 40, windSpeed: 12 },
      { condition: 'cloudy', temperature: 22, cloudCover: 80, windSpeed: 15 },
      { condition: 'overcast', temperature: 20, cloudCover: 95, windSpeed: 18 },
      { condition: 'rainy', temperature: 18, cloudCover: 100, windSpeed: 22 }
    ];
  }

  private getTemperatureForCondition(condition: WeatherCondition['condition']): number {
    const temps = {
      'sunny': 28,
      'partly-cloudy': 25,
      'cloudy': 22,
      'overcast': 20,
      'rainy': 18,
      'stormy': 16
    };
    return temps[condition] + (Math.random() * 6 - 3); // ±3°C variance
  }

  private getCloudCoverForCondition(condition: WeatherCondition['condition']): number {
    const covers = {
      'sunny': 10,
      'partly-cloudy': 40,
      'cloudy': 80,
      'overcast': 95,
      'rainy': 100,
      'stormy': 100
    };
    return covers[condition];
  }
}

class OutageSimulator {
  private activeOutages: Set<number> = new Set();

  async simulateOutage(householdIds: number[], allHouseholds: Household[]): Promise<OutageResponse> {
    // Add to active outages
    householdIds.forEach(id => this.activeOutages.add(id));

    // Use ML engine to calculate outage response
    const mlEngine = new MLEnergyEngine();
    return mlEngine.simulateOutageResponse(householdIds, allHouseholds);
  }

  getActiveOutages(): number[] {
    return Array.from(this.activeOutages);
  }

  clearOutage(householdIds: number[]): void {
    householdIds.forEach(id => this.activeOutages.delete(id));
  }
}

// Type definitions
export interface SimulationStatus {
  isRunning: boolean;
  currentWeather: WeatherCondition;
  activeOutages: number[];
  networkStats: NetworkStats;
}

export interface NetworkStats {
  totalHouseholds: number;
  activeConnections: number;
  totalGeneration: number;
  totalConsumption: number;
  batteryStorageTotal: number;
  tradingVelocity: number;
  carbonReduction: number;
}