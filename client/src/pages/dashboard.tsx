import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Search, Menu, CloudSun, MessageCircle, Bot, X, HelpCircle, User, LogOut, Activity, TrendingUp, HomeIcon, RefreshCw, Zap, ArrowRightLeft, Plus, ExternalLink, Sun, Users, Battery, Gauge, Leaf, MapPin, Edit, ShoppingCart } from "lucide-react";
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
  const [showEditTradeDialog, setShowEditTradeDialog] = useState(false);
  const [editingTrade, setEditingTrade] = useState<EnergyTrade | null>(null);
  const [showLocationRequest, setShowLocationRequest] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionChecked, setLocationPermissionChecked] = useState(false);
  const { user, logoutMutation, healthStatus } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for location permission intelligently - only show dialog when needed
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (!locationService.isGeolocationSupported() || !user) {
        setLocationPermissionChecked(true);
        return;
      }

      try {
        // Check if we should show the location dialog
        const shouldShow = await locationService.shouldShowLocationDialog();
        
        if (shouldShow) {
          console.log('🗺️ Location permission needed, showing dialog');
          setShowLocationRequest(true);
        } else {
          // Try to get cached location if available
          const cachedLocation = locationService.getCachedLocation();
          if (cachedLocation) {
            console.log('📍 Using cached location:', cachedLocation);
            setUserLocation(cachedLocation);
          } else {
            console.log('🚫 Location permission handled, no dialog needed');
          }
        }
      } catch (error) {
        console.warn('Error checking location permission:', error);
      } finally {
        setLocationPermissionChecked(true);
      }
    };

    checkLocationPermission();
  }, [user]);

  const handleLocationGranted = (location: UserLocation) => {
    console.log('Location granted:', location);
    setUserLocation(location);
    setShowLocationRequest(false);
    
    // Force refresh market data with new location
    queryClient.invalidateQueries({ queryKey: ['/api/market/realtime'] });
    
    toast({
      title: "Location Access Granted",
      description: "Weather data will now be customized for your location to improve solar efficiency calculations.",
    });
  };

  const handleLocationDenied = () => {
    setShowLocationRequest(false);
    toast({
      title: "Location Access Declined",
      description: "Using general weather data. You can enable location access later in your browser settings.",
      variant: "destructive",
    });
  };

  // Fetch ONLY real user energy trades - no synthetic/fake data
  const { data: energyTrades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['/api/energy-trades'],
    refetchInterval: user ? 20000 : false, // Reduced from 10s to 20s to optimize performance
    enabled: !!user, // Only run query if user is authenticated
  });

  // Fetch ONLY real market data - this endpoint requires location for authentic weather
  const { data: marketData, error: marketError, isLoading: marketLoading } = useQuery<{
    supply: number;
    demand: number;
    gridStability: number;
    weather: {
      condition: string;
      temperature: number;
      efficiency: number;
    };
    aiInsight?: {
      insight: string;
      trend: string;
      optimal_time: string;
    };
  }>({
    queryKey: ['/api/market/realtime', userLocation?.latitude, userLocation?.longitude],
    refetchInterval: false, // Disable automatic polling - only fetch when user interacts
    retry: 3,
    enabled: !!user && !!userLocation, // Only fetch when user is logged in and location is available
    queryFn: async () => {
      if (!userLocation) {
        throw new Error('Location required for weather data');
      }
      
      // Send location as query parameters (what the server expects)
      const params = new URLSearchParams({
        latitude: userLocation.latitude.toString(),
        longitude: userLocation.longitude.toString()
      });
      
      // Add session ID header if available  
      const headers: Record<string, string> = {};
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        headers['x-session-id'] = sessionId;
      }

      const response = await fetch(`/api/market/realtime?${params}`, { 
        credentials: 'include',
        headers
      });
      
      // If location is required but not provided, skip showing dialog again if already shown
      if (response.status === 400 && !userLocation) {
        throw new Error('Location required for weather data');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch market data');
      }
      
      const data = await response.json();
      console.log('✅ Market data received:', data);
      return data;
    },
  });

  // Debug market data state
  console.log('🔍 Market query debug:', {
    marketData,
    marketError: marketError?.message,
    marketLoading,
    userLocation,
    locationPermissionChecked,
    user: !!user
  });

  // Fetch ONLY real user households - no demo/synthetic data
  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    refetchInterval: user ? 60000 : false, // Reduced to 1 minute - household data changes infrequently
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
    refetchInterval: user ? 60000 : false, // Analytics don't need frequent updates - changed to 1 minute
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

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/energy-trades/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      setShowEditTradeDialog(false);
      toast({
        title: "Trade Updated",
        description: "Your energy trade has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trade.",
        variant: "destructive",
      });
    },
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/energy-trades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      toast({
        title: "Trade Deleted",
        description: "Your energy trade has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trade.",
        variant: "destructive",
      });
    },
  });

  // Helper function to get household name from trade data
  const getHouseholdName = (trade: any, type: 'seller' | 'buyer'): string => {
    if (type === 'seller') {
      return trade.sellerHouseholdName || (trade.sellerHouseholdId ? `Household #${trade.sellerHouseholdId}` : 'Unknown Household');
    } else {
      return trade.buyerHouseholdName || (trade.buyerHouseholdId ? `Household #${trade.buyerHouseholdId}` : 'Unknown Household');
    }
  };

  // Check if user can accept a trade (not their own trade)
  const canAcceptTrade = (trade: EnergyTrade) => {
    if (!userHouseholdId) return false;
    
    // For sell trades, user can buy if they're not the seller
    if (trade.tradeType === 'sell') {
      return trade.sellerHouseholdId !== userHouseholdId;
    }
    
    // For buy trades, user can sell if they're not the buyer
    if (trade.tradeType === 'buy') {
      return trade.buyerHouseholdId !== userHouseholdId;
    }
    
    return false;
  };

  // Handle accepting a trade
  const handleAcceptTrade = (trade: EnergyTrade) => {
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }
    
    setAcceptingTrade(trade);
    setShowAcceptTradeDialog(true);
  };

  // Trade acceptance mutation
  const acceptTradeMutation = useMutation({
    mutationFn: async (tradeData: { tradeId: number; acceptorHouseholdId: number }) => {
      const response = await apiRequest('POST', '/api/trade-acceptances', {
        tradeId: tradeData.tradeId,
        acceptorHouseholdId: tradeData.acceptorHouseholdId,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Accepted!",
        description: data.message || "You have successfully accepted this trade offer. Contact information will be shared.",
      });
      setShowAcceptTradeDialog(false);
      setAcceptingTrade(null);
      
      // Refresh trades to show updated status
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept trade offer.",
        variant: "destructive",
      });
    },
  });

  // Confirm trade acceptance
  const confirmAcceptTrade = () => {
    if (!acceptingTrade || !userHouseholdId) return;
    
    acceptTradeMutation.mutate({
      tradeId: acceptingTrade.id,
      acceptorHouseholdId: userHouseholdId,
    });
  };

  // Helper function to check if a trade belongs to the current user
  const isOwnTrade = (trade: EnergyTrade): boolean => {
    const userHouseholdIds = userHouseholds.map(h => h.id);
    
    // For sell trades, check if sellerHouseholdId belongs to user
    if (trade.tradeType === 'sell' || trade.tradeType === 'surplus_sale') {
      return trade.sellerHouseholdId ? userHouseholdIds.includes(trade.sellerHouseholdId) : false;
    }
    
    // For buy trades, check if buyerHouseholdId belongs to user  
    if (trade.tradeType === 'buy' || trade.tradeType === 'emergency_request') {
      return trade.buyerHouseholdId ? userHouseholdIds.includes(trade.buyerHouseholdId) : false;
    }
    
    return false;
  };

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

  // Edit trade form
  const editForm = useForm({
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

    // Set household IDs based on trade type (backend handles price conversion)
    const tradeData = {
      ...data,
      pricePerKwh: data.pricePerKwh, // Backend will convert to cents
      sellerHouseholdId: data.tradeType === 'sell' ? userHouseholdId : undefined,
      buyerHouseholdId: data.tradeType === 'buy' ? userHouseholdId : undefined,
    };
    createTradeMutation.mutate(tradeData);
  };

  const onEditSubmit = (data: any) => {
    if (!editingTrade) return;
    
    const userHouseholdId = userHouseholds[0]?.id;
    if (!userHouseholdId) {
      toast({
        title: "Error",
        description: "No household found. Please set up your household first.",
        variant: "destructive",
      });
      return;
    }

    // Set household IDs based on trade type (backend handles price conversion)
    const updateData = {
      ...data,
      pricePerKwh: data.pricePerKwh, // Backend will convert to cents
      sellerHouseholdId: data.tradeType === 'sell' ? userHouseholdId : undefined,
      buyerHouseholdId: data.tradeType === 'buy' ? userHouseholdId : undefined,
    };
    updateTradeMutation.mutate({ id: editingTrade.id, data: updateData });
  };

  // Handle edit trade
  const handleEditTrade = (trade: EnergyTrade) => {
    setEditingTrade(trade);
    // Pre-populate the edit form with existing trade data
    editForm.reset({
      energyAmount: trade.energyAmount,
      pricePerKwh: trade.pricePerKwh / 100, // Convert from cents to rupees
      tradeType: trade.tradeType,
    });
    setShowEditTradeDialog(true);
  };

  // Handle delete trade
  const handleDeleteTrade = (trade: EnergyTrade) => {
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to delete this ${trade.tradeType} trade for ${trade.energyAmount} kWh?`)) {
      deleteTradeMutation.mutate(trade.id);
    }
  };

  // Filter states
  const [offerFilter, setOfferFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [requestFilter, setRequestFilter] = useState<'all' | 'cheapest' | 'biggest'>('all');
  const [selectedTradeForDetails, setSelectedTradeForDetails] = useState<EnergyTrade | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showAcceptTradeDialog, setShowAcceptTradeDialog] = useState(false);
  const [acceptingTrade, setAcceptingTrade] = useState<EnergyTrade | null>(null);

  // Get user's household ID to filter out own trades from marketplace
  const userHouseholdId = userHouseholds?.[0]?.id;
  
  // Separate offers and requests - exclude user's own trades from marketplace
  let energyOffers = (energyTrades as EnergyTrade[]).filter((trade: EnergyTrade) => 
    (trade.tradeType === 'surplus_sale' || trade.tradeType === 'sell') && 
    trade.status === 'pending' &&
    trade.sellerHouseholdId !== userHouseholdId
  );
  let energyRequests = (energyTrades as EnergyTrade[]).filter((trade: EnergyTrade) => 
    (trade.tradeType === 'emergency_request' || trade.tradeType === 'buy') && 
    trade.status === 'pending' &&
    trade.buyerHouseholdId !== userHouseholdId
  );

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
    if (healthStatus && user && healthStatus.status === 'unhealthy' && healthStatus.message) {
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
      <section className="bg-gradient-to-br from-primary to-blue-600 text-white pb-6 sm:pb-8 md:pb-10 lg:pb-12 xl:pb-16 pt-20">
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
              <span>Market</span>
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
              <span>Trading</span>
              <span className="hidden sm:inline"> Center</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <h2 className="text-xl sm:text-2xl font-bold">Real-time Energy Market</h2>
              <Button onClick={handleRefresh} disabled={refreshing} size="sm" variant="outline" data-testid="button-refresh" className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
                <span className="sm:hidden">{refreshing ? 'Update' : 'Refresh'}</span>
              </Button>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-green-700 mb-1 truncate">Network Generation</h3>
                    <p className="text-lg sm:text-2xl font-bold text-green-800 truncate" data-testid="text-total-generation">
                      {networkAnalytics?.network?.totalGenerationCapacity || "0 kW"}
                    </p>
                    <p className="text-xs text-green-600 truncate">Solar capacity online</p>
                  </div>
                  <div className="bg-green-200 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2">
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-700 mb-1 truncate">Energy Trades</h3>
                    <p className="text-lg sm:text-2xl font-bold text-blue-800 truncate" data-testid="text-active-trades">
                      {networkAnalytics?.trading?.totalTrades || (energyTrades as EnergyTrade[]).length || 0}
                    </p>
                    <p className="text-xs text-blue-600 truncate">Active exchanges</p>
                  </div>
                  <div className="bg-blue-200 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2">
                    <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-purple-700 mb-1 truncate">Average Price</h3>
                    <p className="text-lg sm:text-2xl font-bold text-purple-800 truncate" data-testid="text-average-price">
                      ₹{networkAnalytics?.trading?.averagePrice || "0.00"}/kWh
                    </p>
                    <p className="text-xs text-purple-600 truncate">Current market rate</p>
                  </div>
                  <div className="bg-purple-200 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-orange-700 mb-1 truncate">Carbon Saved</h3>
                    <p className="text-lg sm:text-2xl font-bold text-orange-800 truncate" data-testid="text-carbon-saved">
                      {networkAnalytics?.trading?.carbonSaved || "0 kg"}
                    </p>
                    <p className="text-xs text-orange-600 truncate">CO₂ avoided today</p>
                  </div>
                  <div className="bg-orange-200 p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-2">
                    <Leaf className="h-4 w-4 sm:h-5 sm:w-5 text-orange-700" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Live Market Data */}
            {marketLoading ? (
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 text-center">
                  Loading Market Data...
                </h3>
                <div className="animate-pulse space-y-3">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ) : marketData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="hidden sm:inline">Live Market Activity</span>
                    <span className="sm:hidden">Market Activity</span>
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-green-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-green-800 text-sm sm:text-base">Current Supply</p>
                        <p className="text-xs sm:text-sm text-green-600 truncate">Available for trading</p>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-green-800 ml-2" data-testid="text-current-supply">
                        {marketData?.supply ?? "No data"} {marketData?.supply ? "kWh" : ""}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-blue-800 text-sm sm:text-base">Current Demand</p>
                        <p className="text-xs sm:text-sm text-blue-600 truncate">Energy needed now</p>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-blue-800 ml-2" data-testid="text-current-demand">
                        {marketData?.demand ?? "No data"} {marketData?.demand ? "kWh" : ""}
                      </p>
                    </div>
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-purple-800 text-sm sm:text-base">Grid Stability</p>
                        <p className="text-xs sm:text-sm text-purple-600 truncate">Network balance score</p>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-purple-800 ml-2" data-testid="text-grid-stability">
                        {marketData?.gridStability ?? "No data"}{marketData?.gridStability ? "%" : ""}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <CloudSun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      <span className="hidden sm:inline">Weather Impact</span>
                      <span className="sm:hidden">Weather</span>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium self-start">
                      Live Weather API
                    </span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm sm:text-base">Current Conditions</span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-right sm:text-left">
                        <span className="font-medium text-sm sm:text-base" data-testid="text-weather-condition">
                          {marketData?.weather?.condition || "No data"}
                        </span>
                        {userLocation && (
                          <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
                            {userLocation.city}, {userLocation.state}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm sm:text-base">Temperature</span>
                      <span className="font-medium text-sm sm:text-base" data-testid="text-temperature">
                        {marketData?.weather?.temperature ? `${marketData.weather.temperature}°C` : "No data"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm sm:text-base">Solar Efficiency</span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-right sm:text-left">
                        <span className={`font-medium text-sm sm:text-base ${(marketData?.weather?.efficiency || 0) <= 0 ? 'text-gray-500' : 'text-green-600'}`} data-testid="text-solar-efficiency">
                          {marketData?.weather?.efficiency !== undefined ? `${Math.round(marketData.weather.efficiency)}%` : "No data"}
                        </span>
                        {(marketData?.weather?.efficiency || 0) <= 0 && (
                          <>
                            <span className="text-xs text-gray-500 hidden sm:inline">(Night - No Solar)</span>
                            <span className="text-xs text-gray-500 sm:hidden">(Night)</span>
                          </>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Connected Households</span>
                  <span className="sm:hidden">Households</span>
                </h3>
                <p className="text-2xl sm:text-3xl font-bold text-primary" data-testid="text-total-households">
                  {networkAnalytics?.network?.totalHouseholds || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {networkAnalytics?.network?.activeHouseholds || 0} currently active
                </p>
              </Card>
              
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
                  <Battery className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Battery Storage</span>
                  <span className="sm:hidden">Storage</span>
                </h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-600" data-testid="text-battery-capacity">
                  {networkAnalytics?.network?.totalStorageCapacity || "0 kWh"}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {networkAnalytics?.network?.storageUtilization || "0%"} utilization
                </p>
              </Card>
              
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
                  <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Network Efficiency</span>
                  <span className="sm:hidden">Efficiency</span>
                </h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600" data-testid="text-network-efficiency">
                  {networkAnalytics?.efficiency?.networkEfficiency || "0%"}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  Avg. distance: {networkAnalytics?.efficiency?.averageDistance || "0 km"}
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
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-3 sm:p-4 lg:p-6 border border-blue-100">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Energy Trading Marketplace</h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Connect directly with neighbors to trade renewable energy. Smart matching, instant transfers, fair pricing.</p>
                  
                  {/* Market Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mt-3 sm:mt-4">
                    <div className="text-center p-2 sm:p-0">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{energyOffers.length}</p>
                      <p className="text-xs text-gray-500">Active Offers</p>
                    </div>
                    <div className="text-center p-2 sm:p-0">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{energyRequests.length}</p>
                      <p className="text-xs text-gray-500">Energy Requests</p>
                    </div>
                    <div className="text-center p-2 sm:p-0">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">₹{networkAnalytics?.trading?.averagePrice || "0.00"}</p>
                      <p className="text-xs text-gray-500">Avg Price/kWh</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:flex-col">
                  <Button onClick={() => setShowCreateTradeDialog(true)} data-testid="button-create-trade" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium shadow-lg text-xs sm:text-sm px-3 py-2">
                    <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Create Trade</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} size="sm" data-testid="button-refresh-trades" className="text-xs sm:text-sm px-3 py-2">
                    <RefreshCw className={`mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">Refresh</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowLocationRequest(true)}
                    data-testid="button-update-location"
                    className="text-xs sm:text-sm px-3 py-2"
                  >
                    <MapPin className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{userLocation ? 'Update Location' : 'Enable Location'}</span>
                    <span className="sm:hidden">Location</span>
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-full">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <span className="text-sm sm:text-base">Energy Available</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
                      {energyOffers.length}
                    </span>
                  </h3>
                  <Select value={offerFilter} onValueChange={(value) => setOfferFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
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
                      <div key={offer.id} className="p-3 sm:p-4 border-2 border-green-200 rounded-xl hover:border-green-400 transition-all duration-200 hover:shadow-md bg-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <p className="font-bold text-green-700 text-base sm:text-lg">{offer.energyAmount} kWh</p>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Available Now</span>
                              {(offer as any).acceptanceCount !== undefined && (offer as any).acceptanceCount > 0 && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                  {(offer as any).acceptanceCount} applied
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-1">
                              <HomeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="truncate">{getHouseholdName(offer, 'seller')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="hidden sm:inline">Ludhiana, Punjab • Location based matching</span>
                                <span className="sm:hidden">Ludhiana</span>
                              </div>
                              <span className="hidden sm:inline">•</span>
                              <span>{new Date(offer.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto sm:text-right">
                            <div className="bg-green-50 p-2 sm:p-3 rounded-lg mb-3">
                              <p className="text-xs sm:text-sm text-gray-600">Price per kWh</p>
                              <p className="font-bold text-xl sm:text-2xl text-green-700">₹{(offer.pricePerKwh / 100).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Total: ₹{(offer.energyAmount * (offer.pricePerKwh / 100)).toFixed(2)}</p>
                            </div>
                            {isOwnTrade(offer) ? (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditTrade(offer)}
                                  className="w-full border-orange-300 text-orange-700"
                                  data-testid={`button-edit-offer-${offer.id}`}
                                >
                                  ✏️ Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteTrade(offer)}
                                  disabled={deleteTradeMutation.isPending}
                                  className="w-full border-red-300 text-red-700"
                                  data-testid={`button-delete-offer-${offer.id}`}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            ) : canAcceptTrade(offer) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleAcceptTrade(offer)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                data-testid="button-accept-offer"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Accept Offer
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedTradeForDetails(offer);
                                  setShowContactDialog(true);
                                }}
                                className="w-full bg-gray-100 text-gray-600"
                                variant="outline"
                              >
                                View Details
                              </Button>
                            )}
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
              
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                      <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <span className="text-sm sm:text-base">Energy Needed</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
                      {energyRequests.length}
                    </span>
                  </h3>
                  <Select value={requestFilter} onValueChange={(value) => setRequestFilter(value as 'all' | 'cheapest' | 'biggest')}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm">
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
                      <div key={request.id} className="p-3 sm:p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all duration-200 hover:shadow-md bg-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                          <div className="flex-1 w-full sm:w-auto">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                              <p className="font-bold text-blue-700 text-base sm:text-lg">{request.energyAmount} kWh</p>
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Needed Now</span>
                              {(request as any).acceptanceCount !== undefined && (request as any).acceptanceCount > 0 && (
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                                  {(request as any).acceptanceCount} applied
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-1">
                              <HomeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="truncate">{getHouseholdName(request, 'buyer')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="hidden sm:inline">Ludhiana, Punjab • Location based matching</span>
                                <span className="sm:hidden">Ludhiana</span>
                              </div>
                              <span className="hidden sm:inline">•</span>
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto sm:text-right">
                            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg mb-3">
                              <p className="text-xs sm:text-sm text-gray-600">Willing to pay</p>
                              <p className="font-bold text-xl sm:text-2xl text-blue-700">₹{(request.pricePerKwh / 100).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">Total: ₹{(request.energyAmount * (request.pricePerKwh / 100)).toFixed(2)}</p>
                            </div>
                            {isOwnTrade(request) ? (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditTrade(request)}
                                  className="w-full border-orange-300 text-orange-700"
                                  data-testid={`button-edit-request-${request.id}`}
                                >
                                  ✏️ Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteTrade(request)}
                                  disabled={deleteTradeMutation.isPending}
                                  className="w-full border-red-300 text-red-700"
                                  data-testid={`button-delete-request-${request.id}`}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            ) : canAcceptTrade(request) ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleAcceptTrade(request)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="button-fulfill-request"
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Fulfill Request
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedTradeForDetails(request);
                                  setShowContactDialog(true);
                                }}
                                className="w-full bg-gray-100 text-gray-600"
                                variant="outline"
                              >
                                View Details
                              </Button>
                            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  Market Insights
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Peak Trading Hours</span>
                    <span className="text-sm text-gray-600">6PM - 10PM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Current Market Rate</span>
                    <span className="text-sm text-gray-600">₹{networkAnalytics?.trading?.averagePrice || "0.00"}/kWh</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium">Grid Stability</span>
                    <span className={`text-sm ${(marketData?.gridStability || 0) > 70 ? 'text-green-600' : (marketData?.gridStability || 0) > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {marketData?.gridStability || 0}%
                    </span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-3 sm:p-4 lg:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <span className="text-sm sm:text-base">How Trading Works</span>
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs sm:text-sm flex-shrink-0">1</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Create Your Offer</h4>
                      <p className="text-xs text-gray-600">Set your energy amount and price</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm flex-shrink-0">2</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Smart Matching</h4>
                      <p className="text-xs text-gray-600">AI finds the best local matches</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs sm:text-sm flex-shrink-0">3</div>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm">Instant Transfer</h4>
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

      {/* Trade Acceptance Dialog */}
      <Dialog open={showAcceptTradeDialog} onOpenChange={setShowAcceptTradeDialog}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto my-4 max-h-[95vh] overflow-y-auto z-50 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-800">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              Accept Energy Trade
            </DialogTitle>
          </DialogHeader>
          
          {acceptingTrade && (
            <div className="space-y-4 sm:space-y-6 pt-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 sm:p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">
                  {acceptingTrade.tradeType === 'sell' ? '🌟 Accept Energy Offer' : '⚡ Fulfill Energy Request'}
                </h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Energy Amount:</span>
                    <span className="font-semibold">{acceptingTrade.energyAmount} kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price per kWh:</span>
                    <span className="font-semibold">₹{(acceptingTrade.pricePerKwh / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-gray-700 font-medium">Total Cost:</span>
                    <span className="font-bold text-base sm:text-lg text-green-600">
                      ₹{(acceptingTrade.energyAmount * (acceptingTrade.pricePerKwh / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 flex-shrink-0">
                      {acceptingTrade.tradeType === 'sell' ? 'Seller:' : 'Buyer:'}
                    </span>
                    <span className="font-medium text-right ml-2 break-words">
                      {acceptingTrade.tradeType === 'sell' ? getHouseholdName(acceptingTrade, 'seller') : getHouseholdName(acceptingTrade, 'buyer')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Activity className="h-4 w-4" />
                  What happens next?
                </h5>
                <div className="space-y-2 text-xs sm:text-sm text-blue-700">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Your contact information will be shared with the other party</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>You'll receive their contact details for energy transfer coordination</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>SolarSense facilitates secure peer-to-peer energy exchange</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Trade completion is tracked for network transparency</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowAcceptTradeDialog(false)}
                  variant="outline"
                  className="w-full sm:flex-1 order-2 sm:order-1"
                  data-testid="button-cancel-accept"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAcceptTrade}
                  disabled={acceptTradeMutation.isPending}
                  className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
                  data-testid="button-confirm-accept"
                >
                  {acceptTradeMutation.isPending ? 'Processing...' : 
                    acceptingTrade.tradeType === 'sell' ? 'Accept Offer' : 'Fulfill Request'
                  }
                </Button>
              </div>
            </div>
          )}
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
                <p><strong>Price:</strong> ₹{(selectedTradeForDetails.pricePerKwh / 100).toFixed(2)}/kWh</p>
                <p><strong>Total Value:</strong> ₹{(selectedTradeForDetails.energyAmount * (selectedTradeForDetails.pricePerKwh / 100)).toFixed(2)}</p>
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
                  <strong>Area:</strong> Ludhiana, Punjab<br/>
                  <strong>Household:</strong> {selectedTradeForDetails.tradeType === 'sell' ? getHouseholdName(selectedTradeForDetails, 'seller') : getHouseholdName(selectedTradeForDetails, 'buyer')}<br/>
                  <strong>Contact:</strong> Details shared upon mutual interest<br/>
                  <strong>Safety:</strong> All trades are verified through SolarSense platform
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Trade Dialog */}
      <Dialog open={showEditTradeDialog} onOpenChange={setShowEditTradeDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-auto my-8 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Edit className="h-6 w-6" />
              Edit Energy Trade
            </DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 pt-4">
              
              {/* Smart Price Recommendation */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  💡 Current Market Rate
                </h4>
                <p className="text-sm text-blue-700">
                  Market rate: <strong>₹4.5/kWh</strong> • Weather impact: <strong>Stormy conditions reducing solar</strong>
                </p>
              </div>

              <FormField
                control={editForm.control}
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
                        data-testid="edit-option-have-energy"
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
                        data-testid="edit-option-need-energy"
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
                control={editForm.control}
                name="energyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editForm.watch("tradeType") === "sell" 
                        ? "How much energy do you have? (kWh)" 
                        : editForm.watch("tradeType") === "buy"
                        ? "How much energy do you need? (kWh)"
                        : "Energy Amount (kWh)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        placeholder={editForm.watch("tradeType") === "sell" 
                          ? "e.g., 5 (surplus to sell)" 
                          : editForm.watch("tradeType") === "buy"
                          ? "e.g., 3 (power needed)"
                          : "e.g., 5"}
                        data-testid="edit-input-energy-amount"
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
                control={editForm.control}
                name="pricePerKwh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {editForm.watch("tradeType") === "sell" 
                        ? "💰 Your Selling Price" 
                        : editForm.watch("tradeType") === "buy"
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
                              placeholder={editForm.watch("tradeType") === "sell" 
                                ? "e.g., 4.5" 
                                : editForm.watch("tradeType") === "buy"
                                ? "e.g., 5.0"
                                : "e.g., 4.5"}
                              data-testid="edit-input-price-per-kwh"
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
                          💰 Total Value: ₹{((editForm.watch("energyAmount") || 0) * field.value).toFixed(2)}
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
                  onClick={() => setShowEditTradeDialog(false)}
                  className="flex-1 w-full"
                  data-testid="button-cancel-edit-trade"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTradeMutation.isPending}
                  className="flex-1 w-full"
                  data-testid="button-update-trade"
                >
                  {updateTradeMutation.isPending 
                    ? "Updating..." 
                    : editForm.watch("tradeType") === "sell"
                    ? "Update Energy Offer"
                    : editForm.watch("tradeType") === "buy"
                    ? "Update Energy Request"
                    : "Update Trade"}
                </Button>
              </div>
            </form>
          </Form>
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
