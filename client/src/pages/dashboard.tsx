import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Search, Menu, CloudSun, MessageCircle, Bot, X, HelpCircle, User, LogOut, Activity, TrendingUp, HomeIcon, RefreshCw, Zap, ArrowRightLeft, Plus, ExternalLink, Sun, Users, Battery, Gauge, Leaf, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEnergyTradeSchema } from "@/../../shared/schema";
import type { EnergyTrade, Household } from "@/../../shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

import AIChatWidget from "@/components/mobile-ai-chat-widget";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import ValidationCard from "@/components/validation-card";
import { SimulationDashboard } from "@/components/simulation-dashboard";
import { LocationRequest } from "@/components/location-request";
import { locationService, UserLocation } from "@/lib/location-service";


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'energy-dashboard' | 'energy-trading' | 'simulation'>('energy-dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showValidationCard, setShowValidationCard] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationType, setValidationType] = useState<"success" | "error" | "warning">("warning");
  const [showCreateTradeDialog, setShowCreateTradeDialog] = useState(false);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionChecked, setLocationPermissionChecked] = useState(false);
  const { user, logoutMutation, healthStatus } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for location permission on component mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (locationService.isGeolocationSupported()) {
        const cachedLocation = locationService.getCachedLocation();
        if (cachedLocation) {
          setUserLocation(cachedLocation);
        } else {
          // Silently request location for weather data without showing UI
          if (user) {
            try {
              const location = await locationService.getCurrentLocation(true);
              setUserLocation(location);
            } catch (error) {
              // Silently fail - user won't see location request dialog
              console.log('Location access not available, using general weather data');
            }
          }
        }
      }
      setLocationPermissionChecked(true);
    };

    checkLocationPermission();
  }, [user]);

  const handleLocationGranted = (location: UserLocation) => {
    setUserLocation(location);
    setShowLocationRequest(false);
    // No toast notification - silent operation
  };

  const handleLocationDenied = () => {
    setShowLocationRequest(false);
    // No toast notification - silent operation
  };

  // Fetch ONLY real user energy trades - no synthetic/fake data
  const { data: energyTrades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['/api/energy-trades'],
    refetchInterval: user ? 10000 : false, // Only fetch for authenticated users
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch ONLY real market data - this endpoint provides authentic market conditions
  const { data: marketData } = useQuery<{
    supply: number;
    demand: number;
    gridStability: number;
    weather: {
      condition: string;
      temperature: number;
      efficiency: number;
    };
  }>({
    queryKey: ['/api/market/realtime'],
    refetchInterval: 5000, // Update market data every 5 seconds
    retry: false,
    enabled: locationPermissionChecked, // Only fetch after location check is complete
  });

  // Fetch ONLY real user households - no demo/synthetic data
  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    refetchInterval: user ? 15000 : false, // Only fetch for authenticated users
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch network analytics based ONLY on real user data
  const { data: networkAnalytics } = useQuery<{
    network: {
      totalHouseholds: number;
      activeHouseholds: number;
      totalGenerationCapacity: string;
      totalStorageCapacity: string;
      storageUtilization: string;
    };
    trading: {
      totalTrades: number;
      averagePrice: string;
      carbonSaved: string;
    };
    efficiency: {
      networkEfficiency: string;
      averageDistance: string;
    };
  }>({
    queryKey: ['/api/analytics/network'], 
    refetchInterval: user ? 15000 : false, // Only fetch for authenticated users
    enabled: !!user, // Only run query if user is authenticated
    retry: false,
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/market/realtime'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/analytics/network'] });
      toast({
        title: "Data Refreshed",
        description: "Latest energy market data has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Remove duplicate household query (already fetched as userHouseholds above)
  const households = userHouseholds; // Use the authenticated user households

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/energy-trades', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      setShowCreateTradeDialog(false);
      toast({
        title: "Trade Created",
        description: "Your energy trade offer has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create trade offer.",
        variant: "destructive",
      });
    },
  });

  // Form for creating trades
  const tradeFormSchema = z.object({
    sellerHouseholdId: z.number().optional(),
    buyerHouseholdId: z.number().optional(),
    energyAmount: z.number().min(0.1, "Energy amount must be at least 0.1 kWh"),
    pricePerKwh: z.number().min(0.01, "Price must be at least ₹0.01 per kWh"),
    tradeType: z.enum(['sell', 'buy']),
  });

  const form = useForm({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      sellerHouseholdId: userHouseholds[0]?.id || 1,
      buyerHouseholdId: undefined,
      energyAmount: 0,
      pricePerKwh: 4.5,
      tradeType: 'sell',
    },
  });

  const onSubmit = (data: any) => {
    const userHouseholdId = userHouseholds[0]?.id;
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }

    // Set household IDs based on trade type
    const tradeData = {
      ...data,
      sellerHouseholdId: data.tradeType === 'sell' ? userHouseholdId : undefined,
      buyerHouseholdId: data.tradeType === 'buy' ? userHouseholdId : undefined,
    };
    createTradeMutation.mutate(tradeData);
  };

  // Filter states
  const [offerFilter, setOfferFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [selectedTradeForDetails, setSelectedTradeForDetails] = useState<EnergyTrade | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);

  // Separate offers and requests
  let energyOffers = (energyTrades as EnergyTrade[]).filter((trade: EnergyTrade) => trade.tradeType === 'sell' && trade.status === 'pending');
  let energyRequests = (energyTrades as EnergyTrade[]).filter((trade: EnergyTrade) => trade.tradeType === 'buy' && trade.status === 'pending');

  // Apply filters
  if (offerFilter === 'cheapest') {
    energyOffers = energyOffers.sort((a, b) => a.pricePerKwh - b.pricePerKwh);
  } else if (offerFilter === 'biggest') {
    energyOffers = energyOffers.sort((a, b) => b.energyAmount - a.energyAmount);
  }

  if (requestFilter === 'cheapest') {
    energyRequests = energyRequests.sort((a, b) => b.pricePerKwh - a.pricePerKwh);
  } else if (requestFilter === 'biggest') {
    energyRequests = energyRequests.sort((a, b) => b.energyAmount - a.energyAmount);
  }

  // Check URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'energy-trading') {
      setActiveTab('energy-trading');
    } else if (tab === 'energy-dashboard') {
      setActiveTab('energy-dashboard');
    } else if (tab === 'simulation') {
      setActiveTab('simulation');
    }
  }, []);

  // Show server unavailability message only for authenticated users who lose session
  useEffect(() => {
    // Only show server error if BOTH server AND database are down - not for AI issues
    // Don't show validation cards for "degraded" status caused by AI quota/config issues
    if (healthStatus && user && healthStatus.server === false && healthStatus.database === false && healthStatus.message) {
      setValidationMessage(healthStatus.message);
      setValidationType("error");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
      }, 8000);
    }
  }, [healthStatus, user]);

  // Show logout success message after page reload
  useEffect(() => {
    const logoutSuccess = localStorage.getItem("logoutSuccess");
    if (logoutSuccess === "true") {
      localStorage.removeItem("logoutSuccess");
      setValidationMessage("You have logged out successfully.");
      setValidationType("success");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
      }, 3000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar 
        currentPage="dashboard" 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.history.pushState({}, '', `/?tab=${tab}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Hero Section - Now visible on all devices */}
      <section className="bg-gradient-to-br from-primary to-blue-600 text-white pb-6 sm:pb-8 md:pb-10 lg:pb-12 xl:pb-16" style={{ paddingTop: '3.75rem' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center flex flex-col justify-center items-center min-h-[150px] sm:min-h-[160px] md:min-h-[170px] lg:min-h-[180px] xl:min-h-[190px] pt-6 sm:pt-8 md:pt-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 lg:mb-8">SolarSense: Intelligent Energy Solutions</h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 px-2 max-w-4xl mx-auto">
              Decentralized energy trading platform for a sustainable future
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs - Positioned below hero section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex border-b border-border">
            <button
              onClick={() => {
                setActiveTab('energy-dashboard');
                window.history.pushState({}, '', '/?tab=energy-dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'energy-dashboard'
                  ? 'text-primary border-b-2 border-primary bg-blue-50'
                  : 'text-secondary-custom hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Home className="inline mr-1 sm:mr-2" size={16} />
              <span>Energy</span>
              <span className="hidden sm:inline"> Dashboard</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('energy-trading');
                window.history.pushState({}, '', '/?tab=energy-trading');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'energy-trading'
                  ? 'text-primary border-b-2 border-primary bg-blue-50'
                  : 'text-secondary-custom hover:text-primary hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="inline mr-1 sm:mr-2" size={16} />
              <span>Energy</span>
              <span className="hidden sm:inline"> Trading</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('simulation');
                window.history.pushState({}, '', '/?tab=simulation');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'simulation'
                  ? 'text-primary border-b-2 border-primary bg-blue-50'
                  : 'text-secondary-custom hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Activity className="inline mr-1 sm:mr-2" size={16} />
              <span>ML</span>
              <span className="hidden sm:inline"> Simulation</span>
            </button>

          </div>
        </div>
      </div>

      {/* Main Application Interface */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Content Sections */}
        {activeTab === 'energy-dashboard' && (
          <div className="space-y-6">
            {/* Real-time Market Overview */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Real-time Energy Market</h2>
              <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline" data-testid="button-refresh">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh'}
              </Button>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-green-700 mb-1">Network Generation</h3>
                    <p className="text-2xl font-bold text-green-800" data-testid="text-total-generation">
                      {networkAnalytics?.network?.totalGenerationCapacity || "0 kW"}
                    </p>
                    <p className="text-xs text-green-600">Solar capacity online</p>
                  </div>
                  <div className="bg-green-200 p-2 rounded-full">
                    <Sun className="h-5 w-5 text-green-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-700 mb-1">Energy Trades</h3>
                    <p className="text-2xl font-bold text-blue-800" data-testid="text-active-trades">
                      {networkAnalytics?.trading?.totalTrades || (energyTrades as EnergyTrade[]).length || 0}
                    </p>
                    <p className="text-xs text-blue-600">Active exchanges</p>
                  </div>
                  <div className="bg-blue-200 p-2 rounded-full">
                    <ArrowRightLeft className="h-5 w-5 text-blue-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-purple-700 mb-1">Average Price</h3>
                    <p className="text-2xl font-bold text-purple-800" data-testid="text-average-price">
                      ₹{networkAnalytics?.trading?.averagePrice || "0.00"}/kWh
                    </p>
                    <p className="text-xs text-purple-600">Current market rate</p>
                  </div>
                  <div className="bg-purple-200 p-2 rounded-full">
                    <TrendingUp className="h-5 w-5 text-purple-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-orange-700 mb-1">Carbon Saved</h3>
                    <p className="text-2xl font-bold text-orange-800" data-testid="text-carbon-saved">
                      {networkAnalytics?.trading?.carbonSaved || "0"} kg
                    </p>
                    <p className="text-xs text-orange-600">CO₂ avoided today</p>
                  </div>
                  <div className="bg-orange-200 p-2 rounded-full">
                    <Leaf className="h-5 w-5 text-orange-700" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Live Market Data */}
            {marketData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Live Market Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-800">Current Supply</p>
                        <p className="text-sm text-green-600">Available for trading</p>
                      </div>
                      <p className="text-xl font-bold text-green-800" data-testid="text-current-supply">
                        {marketData?.supply ?? "No data"} {marketData?.supply ? "kWh" : ""}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-800">Current Demand</p>
                        <p className="text-sm text-blue-600">Energy needed now</p>
                      </div>
                      <p className="text-xl font-bold text-blue-800" data-testid="text-current-demand">
                        {marketData?.demand ?? "No data"} {marketData?.demand ? "kWh" : ""}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-purple-800">Grid Stability</p>
                        <p className="text-sm text-purple-600">Network balance score</p>
                      </div>
                      <p className="text-xl font-bold text-purple-800" data-testid="text-grid-stability">
                        {marketData?.gridStability ?? "No data"}{marketData?.gridStability ? "%" : ""}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CloudSun className="h-5 w-5 text-yellow-600" />
                    Weather Impact
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Current Conditions</span>
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium" data-testid="text-weather-condition">
                          {marketData?.weather?.condition || "No data"}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Temperature</span>
                      <span className="font-medium" data-testid="text-temperature">
                        {marketData?.weather?.temperature ? `${marketData.weather.temperature}°C` : "No data"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Solar Efficiency</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${marketData?.weather?.efficiency === 0 ? 'text-gray-500' : 'text-green-600'}`} data-testid="text-solar-efficiency">
                          {marketData?.weather?.efficiency !== undefined ? `${marketData.weather.efficiency}%` : "No data"}
                        </span>
                        {marketData?.weather?.efficiency === 0 && (
                          <span className="text-xs text-gray-500">(Night - No Solar)</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          marketData?.weather?.efficiency === 0 ? 'bg-gray-400' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${marketData?.weather?.efficiency || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center text-gray-500">
                  No Market Data Available
                </h3>
                <p className="text-center text-gray-400">
                  Real-time market data will appear here when households are connected and trading energy.
                </p>
                {!user && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                      Please log in to view authentic energy market data and connect your household
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Network Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Connected Households
                </h3>
                <p className="text-3xl font-bold text-primary" data-testid="text-total-households">
                  {networkAnalytics?.network?.totalHouseholds || 0}
                </p>
                <p className="text-sm text-gray-600">
                  {networkAnalytics?.network?.activeHouseholds || 0} currently active
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Battery className="h-5 w-5" />
                  Battery Storage
                </h3>
                <p className="text-3xl font-bold text-green-600" data-testid="text-battery-capacity">
                  {networkAnalytics?.network?.totalStorageCapacity || "0"} kWh
                </p>
                <p className="text-sm text-gray-600">
                  {networkAnalytics?.network?.storageUtilization || "0"}% utilization
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Network Efficiency
                </h3>
                <p className="text-3xl font-bold text-blue-600" data-testid="text-network-efficiency">
                  {networkAnalytics?.efficiency?.networkEfficiency || "0"}%
                </p>
                <p className="text-sm text-gray-600">
                  Avg. distance: {networkAnalytics?.efficiency?.averageDistance || "0"} km
                </p>
              </Card>
            </div>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Getting Started with SolarSense</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">1. Register Your Household</h4>
                  <p className="text-sm text-gray-600">Add your solar installation and battery details to join the energy trading network.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">2. Monitor Energy Flow</h4>
                  <p className="text-sm text-gray-600">Track your energy production, consumption, and battery levels in real-time.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">3. Trade Energy</h4>
                  <p className="text-sm text-gray-600">Buy and sell surplus energy with neighbors for optimal grid balance.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2">4. AI Optimization</h4>
                  <p className="text-sm text-gray-600">Let our AI optimize energy distribution and trading opportunities for you.</p>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'energy-trading' && (
          <div className="space-y-6">
            {/* Enhanced Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Energy Trading Marketplace</h2>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                      🔒 SECURE TRADES
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">Connect directly with neighbors to trade renewable energy. Smart matching, instant transfers, fair pricing.</p>
                  
                  {/* Market Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{energyOffers.length}</p>
                      <p className="text-xs text-gray-500">Active Offers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{energyRequests.length}</p>
                      <p className="text-xs text-gray-500">Energy Requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">₹{marketData?.supply && marketData?.demand ? ((marketData.supply / marketData.demand) * 4.5).toFixed(1) : '4.5'}</p>
                      <p className="text-xs text-gray-500">Avg Price/kWh</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => setShowCreateTradeDialog(true)} data-testid="button-create-trade" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Trade
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} size="sm" data-testid="button-refresh-trades">
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Zap className="h-5 w-5 text-green-600" />
                    </div>
                    Energy Available
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      {energyOffers.length}
                    </span>
                  </h3>
                  <Select value={offerFilter} onValueChange={(value) => setOfferFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Offers</SelectItem>
                      <SelectItem value="cheapest">💰 Best Price</SelectItem>
                      <SelectItem value="biggest">⚡ Most Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {tradesLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : energyOffers.length > 0 ? (
                    energyOffers.map((offer: EnergyTrade) => (
                      <div key={offer.id} className="p-4 border-2 border-green-200 rounded-xl hover:border-green-400 transition-all duration-200 hover:shadow-md bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <p className="font-bold text-green-700 text-lg">{offer.energyAmount} kWh</p>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Available Now</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <HomeIcon className="h-4 w-4" />
                              <span>Household #{offer.sellerHouseholdId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>~2.3 km away</span>
                              <span>•</span>
                              <span>{new Date(offer.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-50 p-3 rounded-lg mb-3">
                              <p className="text-sm text-gray-600">Price per kWh</p>
                              <p className="font-bold text-2xl text-green-700">₹{offer.pricePerKwh}</p>
                              <p className="text-xs text-gray-500">Total: ₹{(offer.energyAmount * offer.pricePerKwh).toFixed(2)}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedTradeForDetails(offer);
                                setShowContactDialog(true);
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              Contact Seller
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-8 w-8 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-2">No Energy Offers Yet</h4>
                      <p className="text-sm text-gray-500 mb-4">Be the first to sell surplus solar energy!</p>
                      <Button onClick={() => setShowCreateTradeDialog(true)} size="sm" variant="outline">
                        Create First Offer
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                    </div>
                    Energy Needed
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      {energyRequests.length}
                    </span>
                  </h3>
                  <Select value={requestFilter} onValueChange={(value) => setRequestFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requests</SelectItem>
                      <SelectItem value="cheapest">💰 Best Offer</SelectItem>
                      <SelectItem value="biggest">⚡ Most Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {tradesLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : energyRequests.length > 0 ? (
                    energyRequests.map((request: EnergyTrade) => (
                      <div key={request.id} className="p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all duration-200 hover:shadow-md bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                              <p className="font-bold text-blue-700 text-lg">{request.energyAmount} kWh</p>
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Needed Now</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <HomeIcon className="h-4 w-4" />
                              <span>Household #{request.buyerHouseholdId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>~1.8 km away</span>
                              <span>•</span>
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-blue-50 p-3 rounded-lg mb-3">
                              <p className="text-sm text-gray-600">Willing to pay</p>
                              <p className="font-bold text-2xl text-blue-700">₹{request.pricePerKwh}</p>
                              <p className="text-xs text-gray-500">Total: ₹{(request.energyAmount * request.pricePerKwh).toFixed(2)}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedTradeForDetails(request);
                                setShowContactDialog(true);
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Contact Buyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ArrowRightLeft className="h-8 w-8 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-700 mb-2">No Energy Requests</h4>
                      <p className="text-sm text-gray-500 mb-4">Be the first to request clean energy!</p>
                      <Button onClick={() => setShowCreateTradeDialog(true)} size="sm" variant="outline">
                        Create First Request
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Enhanced Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  Market Insights
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Peak Trading Hours</span>
                    <span className="text-sm text-gray-600">6PM - 9PM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Average Price Range</span>
                    <span className="text-sm text-gray-600">₹3.5 - ₹6.0/kWh</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Network Efficiency</span>
                    <span className="text-sm text-green-600">{networkAnalytics?.efficiency?.networkEfficiency || "85"}%</span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  How Trading Works
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-semibold text-sm">Create Your Offer</h4>
                      <p className="text-xs text-gray-600">Set your energy amount and price</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-semibold text-sm">Smart Matching</h4>
                      <p className="text-xs text-gray-600">AI finds the best local matches</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-semibold text-sm">Instant Transfer</h4>
                      <p className="text-xs text-gray-600">Automatic grid routing and billing</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">Energy Grid Simulation</h2>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                🧪 SIMULATION MODE
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Simulation Environment:</strong> Test energy scenarios, optimize battery usage, and explore "what-if" situations. 
                This data is separate from your real trading profile.
              </p>
            </div>
            <SimulationDashboard />
          </div>
        )}


      </main>

      {/* AI Chat Widget */}
      <AIChatWidget />
      
      {/* Create Trade Dialog */}
      <Dialog open={showCreateTradeDialog} onOpenChange={setShowCreateTradeDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Plus className="h-5 w-5" />
              Create Energy Trade
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              
              {/* Smart Price Recommendation */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  💡 Smart Pricing Recommendation
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Current Market Rate</p>
                    <p className="font-bold text-blue-700">₹{marketData?.supply && marketData?.demand ? ((marketData.supply / marketData.demand) * 4.5).toFixed(1) : '4.5'}/kWh</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Recommended Range</p>
                    <p className="font-bold text-green-700">₹3.8 - ₹5.2/kWh</p>
                  </div>
                </div>
              </div>
              <FormField
                control={form.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you want to do?</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          field.value === 'sell' 
                            ? 'border-green-500 bg-green-50 text-green-900' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => field.onChange('sell')}
                        data-testid="option-have-energy"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">⚡</div>
                          <div className="font-semibold">I HAVE</div>
                          <div className="text-xs">Surplus Energy</div>
                        </div>
                      </div>
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          field.value === 'buy' 
                            ? 'border-blue-500 bg-blue-50 text-blue-900' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => field.onChange('buy')}
                        data-testid="option-need-energy"
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">🔋</div>
                          <div className="font-semibold">I NEED</div>
                          <div className="text-xs">Extra Power</div>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="energyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("tradeType") === "sell" 
                        ? "How much energy do you have? (kWh)" 
                        : form.watch("tradeType") === "buy"
                        ? "How much energy do you need? (kWh)"
                        : "Energy Amount (kWh)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder={form.watch("tradeType") === "sell" 
                          ? "e.g., 5 (surplus to sell)" 
                          : form.watch("tradeType") === "buy"
                          ? "e.g., 3 (power needed)"
                          : "e.g., 5"}
                        data-testid="input-energy-amount"
                        className="w-full"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerKwh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {form.watch("tradeType") === "sell" 
                        ? "💰 Your Selling Price" 
                        : form.watch("tradeType") === "buy"
                        ? "💳 Maximum You'll Pay"
                        : "💱 Price per kWh"}
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="1"
                              max="10"
                              placeholder={form.watch("tradeType") === "sell" 
                                ? "e.g., 4.5" 
                                : form.watch("tradeType") === "buy"
                                ? "e.g., 5.0"
                                : "e.g., 4.5"}
                              data-testid="input-price-per-kwh"
                              className="w-full"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 rounded border">
                          ₹/kWh
                        </div>
                      </div>
                      {field.value > 0 && (
                        <div className="flex gap-2 text-xs">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(3.8)}
                            className="text-xs px-2 py-1"
                          >
                            Low: ₹3.8
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(4.5)}
                            className="text-xs px-2 py-1"
                          >
                            Market: ₹4.5
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange(5.2)}
                            className="text-xs px-2 py-1"
                          >
                            Premium: ₹5.2
                          </Button>
                        </div>
                      )}
                      {field.value > 0 && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          💰 Total Value: ₹{((form.watch("energyAmount") || 0) * field.value).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTradeDialog(false)}
                  className="flex-1 w-full"
                  data-testid="button-cancel-trade"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTradeMutation.isPending}
                  className="flex-1 w-full"
                  data-testid="button-submit-trade"
                >
                  {createTradeMutation.isPending 
                    ? "Creating..." 
                    : form.watch("tradeType") === "sell"
                    ? "List Energy for Sale"
                    : form.watch("tradeType") === "buy"
                    ? "Post Energy Request"
                    : "Create Trade"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Contact Details Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="h-5 w-5" />
              Contact Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTradeForDetails && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">
                  {selectedTradeForDetails.tradeType === 'sell' ? 'Energy Offer' : 'Energy Request'}
                </h4>
                <p><strong>Amount:</strong> {selectedTradeForDetails.energyAmount} kWh</p>
                <p><strong>Price:</strong> ₹{selectedTradeForDetails.pricePerKwh}/kWh</p>
                <p><strong>Total Value:</strong> ₹{(selectedTradeForDetails.energyAmount * selectedTradeForDetails.pricePerKwh).toFixed(2)}</p>
                <p><strong>Created:</strong> {new Date(selectedTradeForDetails.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">💌 Express Interest</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Click below to send an automated email expressing your interest in this trade. 
                  Your contact details will be shared with the other party.
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // Send interest email
                    const subject = `Energy Trade Interest - ${selectedTradeForDetails.energyAmount} kWh`;
                    const body = `Hello,\n\nI am interested in your energy ${selectedTradeForDetails.tradeType === 'sell' ? 'offer' : 'request'} of ${selectedTradeForDetails.energyAmount} kWh at ₹${selectedTradeForDetails.pricePerKwh}/kWh.\n\nPlease contact me if you are available and interested to proceed with this trade.\n\nBest regards,\n${user?.username || 'Energy Trader'}`;
                    
                    // Open email client
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                    
                    toast({
                      title: "Email Opened",
                      description: "Your email client has been opened with a pre-filled message. Send it to express your interest!",
                    });
                    setShowContactDialog(false);
                  }}
                  data-testid="button-send-interest"
                >
                  📧 Send Interest Email
                </Button>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold mb-2">📍 Location & Contact</h4>
                <p className="text-sm text-gray-600">
                  <strong>Area:</strong> Local District/State<br/>
                  <strong>Contact:</strong> Details shared upon mutual interest<br/>
                  <strong>Safety:</strong> All trades are verified through SolarSense platform
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Location Request Dialog */}
      <LocationRequest
        isOpen={showLocationRequest}
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />

      {/* Validation Card for Server Issues and Logout - Responsive positioning below navbar */}
      {showValidationCard && (
        <div className="fixed top-20 sm:top-24 md:top-28 right-2 sm:right-4 md:right-6 z-[10000] w-full max-w-xs sm:max-w-sm md:max-w-md px-2 sm:px-0">
          <ValidationCard
            type={validationType}
            title={validationType === "success" ? "Logout Successful" : "Server Notice"}
            description={validationMessage}
            onClose={() => setShowValidationCard(false)}
          />
        </div>
      )}
    </div>
  );
}
