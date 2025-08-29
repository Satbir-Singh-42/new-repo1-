import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  Zap, 
  Cloud, 
  CloudRain, 
  Sun, 
  CloudSnow, 
  AlertTriangle,
  Battery,
  TrendingUp,
  Activity,
  BarChart3,
  Gauge,
  ArrowRightLeft,
  DollarSign,
  Leaf,
  Users,
  Network,
  Workflow,
  RefreshCw,
  ZapOff,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimulationStatus {
  isRunning: boolean;
  currentWeather: {
    condition: string;
    temperature: number;
    cloudCover: number;
    windSpeed: number;
  };
  activeOutages: number[];
  networkStats: {
    totalHouseholds: number;
    activeConnections: number;
    totalGeneration: number;
    totalConsumption: number;
    batteryStorageTotal: number;
    tradingVelocity: number;
    carbonReduction: number;
  };
}

interface OptimizationResult {
  tradingPairs: any[];
  prices: { [key: number]: number };
  gridStability: string;
  recommendations: string[];
  batteryStrategy: { strategies: { [key: number]: string } };
}

interface NetworkAnalytics {
  network: {
    totalHouseholds: number;
    activeHouseholds: number;
    totalGenerationCapacity: string;
    totalStorageCapacity: string;
    currentStorageLevel: string;
    storageUtilization: string;
  };
  trading: {
    totalTrades: number;
    totalEnergyTraded: string;
    averagePrice: string;
    carbonSaved: string;
  };
  efficiency: {
    averageDistance: string;
    networkEfficiency: string;
  };
}

export function SimulationDashboard() {
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'overview' | 'weather' | 'grid' | 'equity'>('overview');
  const { toast } = useToast();

  // Auto-refresh data when simulation is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (simulationStatus?.isRunning) {
      interval = setInterval(() => {
        fetchSimulationStatus();
        fetchOptimization();
        fetchAnalytics();
      }, 5000); // Update every 5 seconds during simulation
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulationStatus?.isRunning]);

  // Initial data fetch
  useEffect(() => {
    fetchSimulationStatus();
    fetchOptimization();
    fetchAnalytics();
  }, []);

  const fetchSimulationStatus = async () => {
    try {
      const response = await fetch('/api/simulation/status');
      if (response.ok) {
        const data = await response.json();
        setSimulationStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch simulation status:', error);
    }
  };

  const fetchOptimization = async () => {
    try {
      const response = await fetch('/api/ml/optimization');
      if (response.ok) {
        const data = await response.json();
        setOptimization(data.optimization);
      }
    } catch (error) {
      console.error('Failed to fetch optimization:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch simulation analytics instead of real network analytics
      const response = await fetch('/api/simulation/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // Fallback to network analytics if simulation specific doesn't exist
        const fallbackResponse = await fetch('/api/analytics/network');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setAnalytics(fallbackData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulation/start', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Simulation Started",
          description: data.message,
        });
        fetchSimulationStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to start simulation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const stopSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulation/stop', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Simulation Stopped",
          description: data.message,
        });
        fetchSimulationStatus();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to stop simulation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const changeWeather = async (condition: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulation/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Weather Changed",
          description: `${data.message}. ${data.impact}`,
        });
        fetchSimulationStatus();
        fetchOptimization();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to change weather",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerOutage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulation/outage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Outage Simulation Triggered",
          description: `${data.message}. ${data.resilienceScore}`,
        });
        fetchSimulationStatus();
        fetchOptimization();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to trigger outage",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'partly-cloudy': return <Cloud className="h-5 w-5 text-gray-400" />;
      case 'cloudy': return <Cloud className="h-5 w-5 text-gray-600" />;
      case 'overcast': return <Cloud className="h-5 w-5 text-gray-700" />;
      case 'rainy': return <CloudRain className="h-5 w-5 text-blue-500" />;
      case 'stormy': return <CloudSnow className="h-5 w-5 text-purple-500" />;
      default: return <Cloud className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          ML Energy Trading Simulation
        </h2>
        <p className="text-lg text-gray-600 max-w-4xl mx-auto">
          Experience real-time automatic energy flow management, weather adaptation, 
          and power outage response in our decentralized energy network
        </p>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Live Demonstration Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge 
                variant={simulationStatus?.isRunning ? "default" : "secondary"}
                data-testid="simulation-status-badge"
              >
                {simulationStatus?.isRunning ? (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Running
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" />
                    Stopped
                  </>
                )}
              </Badge>
            </div>

            <Button
              onClick={startSimulation}
              disabled={simulationStatus?.isRunning || loading}
              size="sm"
              data-testid="button-start-simulation"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Live Demo
            </Button>

            <Button
              onClick={stopSimulation}
              disabled={!simulationStatus?.isRunning || loading}
              variant="outline"
              size="sm"
              data-testid="button-stop-simulation"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Demo
            </Button>
          </div>

          {simulationStatus?.isRunning && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weather Control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Weather Adaptation</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={selectedWeather}
                    onValueChange={setSelectedWeather}
                    data-testid="select-weather-condition"
                  >
                    <SelectTrigger className="w-full sm:flex-1">
                      <SelectValue placeholder="Select weather condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunny">☀️ Sunny</SelectItem>
                      <SelectItem value="partly-cloudy">⛅ Partly Cloudy</SelectItem>
                      <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                      <SelectItem value="overcast">☁️ Overcast</SelectItem>
                      <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                      <SelectItem value="stormy">⛈️ Stormy</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedWeather && changeWeather(selectedWeather)}
                    disabled={!selectedWeather || loading}
                    size="sm"
                    className="w-full sm:w-auto"
                    data-testid="button-change-weather"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Outage Simulation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Power Outage Response</label>
                <div className="flex">
                  <Button
                    onClick={triggerOutage}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    data-testid="button-trigger-outage"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ZapOff className="h-4 w-4 mr-2" />
                    )}
                    Simulate Outage
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Status Display */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weather">Weather Impact</TabsTrigger>
          <TabsTrigger value="grid">Grid Management</TabsTrigger>
          <TabsTrigger value="equity">Equitable Access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-households">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Households</p>
                    <p className="text-2xl font-bold" data-testid="text-total-households">
                      {analytics?.network?.totalHouseholds || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-connections">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Connections</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-active-connections">
                      {analytics?.network?.activeHouseholds || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-grid-stability">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Grid Stability</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-grid-stability">
                      {optimization?.gridStability || "N/A"}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-storage-capacity">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Capacity</p>
                    <p className="text-2xl font-bold" data-testid="text-storage-capacity">
                      {analytics?.network?.totalStorageCapacity || "0 kWh"}
                    </p>
                  </div>
                  <Battery className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="card-current-weather">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getWeatherIcon(simulationStatus?.currentWeather?.condition || "sunny")}
                  Current Weather Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Condition:</span>
                    <Badge data-testid="badge-weather-condition">
                      {simulationStatus?.currentWeather?.condition || "sunny"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Temperature:</span>
                    <span data-testid="text-temperature">{simulationStatus?.currentWeather?.temperature || 25}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cloud Cover:</span>
                    <span data-testid="text-cloud-cover">{simulationStatus?.currentWeather?.cloudCover || 20}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Solar Generation Impact</label>
                  <Progress 
                    value={simulationStatus?.currentWeather?.condition === 'sunny' ? 100 : 
                           simulationStatus?.currentWeather?.condition === 'partly-cloudy' ? 82 :
                           simulationStatus?.currentWeather?.condition === 'cloudy' ? 45 :
                           simulationStatus?.currentWeather?.condition === 'rainy' ? 15 : 60} 
                    className="w-full" 
                    data-testid="progress-solar-impact"
                  />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-weather-adaptation">
              <CardHeader>
                <CardTitle>Weather Adaptation Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimization?.recommendations?.slice(0, 3).map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2" data-testid={`recommendation-${index}`}>
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">Loading weather adaptation strategies...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="card-load-balancing">
              <CardHeader>
                <CardTitle>Automatic Load Balancing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Network Efficiency:</span>
                    <span className="font-mono" data-testid="text-network-efficiency">
                      {analytics?.efficiency?.networkEfficiency || "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Distance:</span>
                    <span className="font-mono" data-testid="text-avg-distance">
                      {analytics?.efficiency?.averageDistance || "0 km"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Load Status:</span>
                    <Badge variant="default" data-testid="badge-grid-status">
                      Optimized
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-outage-response">
              <CardHeader>
                <CardTitle>Outage Response System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {simulationStatus?.activeOutages && simulationStatus.activeOutages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium" data-testid="text-active-outages">
                        {simulationStatus.activeOutages.length} households affected
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatic energy redistribution in progress...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium" data-testid="text-no-outages">All systems operational</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Network resilience system standing by
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="card-energy-security">
              <CardHeader>
                <CardTitle>Energy Security Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Energy Traded:</span>
                    <span className="font-mono" data-testid="text-total-traded">
                      {analytics?.trading?.totalEnergyTraded || "0 kWh"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbon Saved:</span>
                    <span className="font-mono text-green-600" data-testid="text-carbon-saved">
                      {analytics?.trading?.carbonSaved || "0"} kg CO₂
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Price:</span>
                    <span className="font-mono" data-testid="text-avg-price">
                      ₹{analytics?.trading?.averagePrice || "0.00"}/kWh
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-redistribution">
              <CardHeader>
                <CardTitle>Energy Redistribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Automatic Fair Distribution Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    System ensures equitable access to power across all households
                  </p>
                  <div className="mt-4">
                    <Progress 
                      value={85} 
                      className="w-full" 
                      data-testid="progress-equity-score"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Fair Distribution Score: 85%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Message */}
      {simulationStatus?.isRunning && (
        <Card data-testid="card-network-health">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium" data-testid="text-network-health">
                Network automatically managing energy flow and preventing grid overload
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}