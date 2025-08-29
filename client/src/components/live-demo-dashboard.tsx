import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Zap, 
  ZapOff, 
  Battery, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface WeatherCondition {
  condition: string;
  temperature: number;
  cloudCover: number;
  windSpeed: number;
}

interface SimulationStatus {
  isRunning: boolean;
  currentWeather: WeatherCondition;
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
  success: boolean;
  optimization: {
    gridStability: string;
    recommendations: string[];
    gridBalancing?: {
      supplyDemandRatio: number;
      gridLoadFactor: number;
      loadSheddingRequired: boolean;
    };
    equitableAccess?: {
      averageEnergySecurity: number;
      vulnerableHouseholds: number[];
      equityScore: number;
    };
  };
  networkHealth?: string;
}

export function LiveDemoDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeather, setSelectedWeather] = useState<string>("");

  // Query simulation status
  const { data: simulationStatus } = useQuery<SimulationStatus>({
    queryKey: ["/api/simulation/status"],
    refetchInterval: 3000, // Refresh every 3 seconds for live demo
  });

  // Query ML optimization
  const { data: optimization } = useQuery<OptimizationResult>({
    queryKey: ["/api/ml/optimization"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Query network analytics
  const { data: networkAnalytics } = useQuery({
    queryKey: ["/api/analytics/network"],
    refetchInterval: 4000,
  });

  // Start simulation mutation
  const startSimulationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/simulation/start", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start simulation");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Live Demonstration Started",
        description: "Automatic energy flow management system is now running",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
    },
  });

  // Stop simulation mutation
  const stopSimulationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/simulation/stop", { method: "POST" });
      if (!response.ok) throw new Error("Failed to stop simulation");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Simulation Stopped",
        description: "Live demonstration has been stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
    },
  });

  // Weather change mutation
  const changeWeatherMutation = useMutation({
    mutationFn: async (condition: string) => {
      const response = await fetch("/api/simulation/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition }),
      });
      if (!response.ok) throw new Error("Failed to change weather");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Weather Changed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ml/optimization"] });
    },
  });

  // Outage simulation mutation
  const triggerOutageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/simulation/outage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdIds: [] }), // Random outage
      });
      if (!response.ok) throw new Error("Failed to trigger outage");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Power Outage Simulation",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/status"] });
    },
  });

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny": return <Sun className="h-6 w-6 text-yellow-500" />;
      case "cloudy": 
      case "overcast": return <Cloud className="h-6 w-6 text-gray-500" />;
      case "rainy": 
      case "stormy": return <CloudRain className="h-6 w-6 text-blue-500" />;
      default: return <Sun className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getGridStabilityColor = (stability: string) => {
    const value = parseFloat(stability);
    if (value > 90) return "text-green-600";
    if (value > 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6" data-testid="live-demo-dashboard">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
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
              onClick={() => startSimulationMutation.mutate()}
              disabled={simulationStatus?.isRunning || startSimulationMutation.isPending}
              size="sm"
              data-testid="button-start-simulation"
            >
              {startSimulationMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Live Demo
            </Button>

            <Button
              onClick={() => stopSimulationMutation.mutate()}
              disabled={!simulationStatus?.isRunning || stopSimulationMutation.isPending}
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
                <div className="flex gap-2">
                  <Select
                    value={selectedWeather}
                    onValueChange={setSelectedWeather}
                    data-testid="select-weather-condition"
                  >
                    <SelectTrigger className="flex-1">
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
                    onClick={() => selectedWeather && changeWeatherMutation.mutate(selectedWeather)}
                    disabled={!selectedWeather || changeWeatherMutation.isPending}
                    size="sm"
                    data-testid="button-change-weather"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Outage Simulation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Power Outage Response</label>
                <Button
                  onClick={() => triggerOutageMutation.mutate()}
                  disabled={triggerOutageMutation.isPending}
                  variant="outline"
                  size="sm"
                  data-testid="button-trigger-outage"
                >
                  {triggerOutageMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ZapOff className="h-4 w-4 mr-2" />
                  )}
                  Simulate Outage
                </Button>
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
                      {(networkAnalytics as any)?.network?.totalHouseholds || 0}
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
                      {(networkAnalytics as any)?.network?.activeHouseholds || 0}
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
                    <p className={`text-2xl font-bold ${getGridStabilityColor(optimization?.optimization?.gridStability || "0%")}`} data-testid="text-grid-stability">
                      {optimization?.optimization?.gridStability || "N/A"}
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
                      {(networkAnalytics as any)?.network?.totalStorageCapacity || "0 kWh"}
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
                  {optimization?.optimization?.recommendations?.slice(0, 3).map((recommendation, index) => (
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
                    <span>Supply/Demand Ratio:</span>
                    <span className="font-mono" data-testid="text-supply-demand-ratio">
                      {optimization?.optimization?.gridBalancing?.supplyDemandRatio?.toFixed(2) || "1.00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Load Factor:</span>
                    <span className="font-mono" data-testid="text-grid-load-factor">
                      {((optimization?.optimization?.gridBalancing?.gridLoadFactor || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Shedding:</span>
                    <Badge variant={optimization?.optimization?.gridBalancing?.loadSheddingRequired ? "destructive" : "default"} data-testid="badge-load-shedding">
                      {optimization?.optimization?.gridBalancing?.loadSheddingRequired ? "Required" : "Not Required"}
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
                    <span>Average Energy Security:</span>
                    <span className="font-mono" data-testid="text-avg-energy-security">
                      {((optimization?.optimization?.equitableAccess?.averageEnergySecurity || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vulnerable Households:</span>
                    <span className="font-mono" data-testid="text-vulnerable-households">
                      {optimization?.optimization?.equitableAccess?.vulnerableHouseholds?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equity Score:</span>
                    <span className="font-mono" data-testid="text-equity-score">
                      {((optimization?.optimization?.equitableAccess?.equityScore || 0) * 100).toFixed(1)}%
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
                      value={((optimization?.optimization?.equitableAccess?.equityScore || 0) * 100)} 
                      className="w-full" 
                      data-testid="progress-equity-score"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Equity Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Message */}
      {optimization?.networkHealth && (
        <Card data-testid="card-network-health">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium" data-testid="text-network-health">
                {optimization.networkHealth}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}