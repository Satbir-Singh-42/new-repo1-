import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/navbar";
import { Calendar, Zap, AlertTriangle, CheckCircle, Loader2, LogIn, User, Database, TrendingUp, TrendingDown, ShoppingCart, Store, RefreshCw, Edit2, Trash2, Handshake, Plus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EnergyTrade, Household } from "@/../../shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ExtendedEnergyTrade extends EnergyTrade {
  sellerHousehold?: { name: string; user: { username: string } };
  buyerHousehold?: { name: string; user: { username: string } };
  acceptanceCount?: number;
}

const tradeFormSchema = z.object({
  energyAmount: z.coerce.number().min(1, "Energy amount must be at least 1 kWh"),
  pricePerKwh: z.coerce.number().min(0.01, "Price must be at least ₹0.01 per kWh"),
  tradeType: z.enum(["sell", "buy"], { required_error: "Trade type is required" }),
});

export default function StoragePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-listings' | 'my-requests' | 'request-results' | 'applications'>('my-listings');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTrade, setEditingTrade] = useState<ExtendedEnergyTrade | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAcceptance, setSelectedAcceptance] = useState<any>(null);
  const [isCoordinationDialogOpen, setIsCoordinationDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [tradeRating, setTradeRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  // Fetch energy trades
  const { data: energyTrades = [], isLoading, error, refetch } = useQuery<ExtendedEnergyTrade[]>({
    queryKey: ['/api/energy-trades'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
  });

  // Fetch user's households
  const { data: userHouseholds = [] } = useQuery<Household[]>({
    queryKey: ['/api/households'],
    enabled: !!user,
  });

  // Fetch user's trade acceptances
  const { data: tradeAcceptances = [], isLoading: acceptancesLoading } = useQuery<any[]>({
    queryKey: ['/api/trade-acceptances'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
  });

  // Fetch applications TO user's trades (people who want to accept their trades)
  const { data: tradeApplications = [], isLoading: applicationsLoading, error: applicationsError } = useQuery<any[]>({
    queryKey: ['/api/my-trade-applications'],
    enabled: !!user,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
  });

  // Get user's household IDs
  const userHouseholdIds = userHouseholds.map(h => h.id);

  // Sort trades by date (newest first)
  const sortedTrades = energyTrades.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Helper function to check if trade belongs to user
  const isOwnTrade = (trade: ExtendedEnergyTrade) => {
    return (
      (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
      (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId))
    );
  };

  // Helper function to check if user can accept a trade
  const canAcceptTrade = (trade: ExtendedEnergyTrade) => {
    return trade.status === 'pending' && !isOwnTrade(trade);
  };

  // Categorize trades
  const myListings = sortedTrades.filter(trade => 
    trade.tradeType === 'sell' && trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)
  );

  const myRequests = sortedTrades.filter(trade => 
    trade.tradeType === 'buy' && trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId)
  );

  // All my trades (both sell and buy) for results section
  const myAllTrades = sortedTrades.filter(trade => isOwnTrade(trade));

  // Available offers (other users' trades)
  const availableOffers = sortedTrades.filter(trade => 
    trade.status === 'pending' && !isOwnTrade(trade)
  );

  // User info display
  const userInfo = user ? {
    username: user.username,
    email: user.email,
    totalTrades: sortedTrades.filter(isOwnTrade).length,
    activeSellListings: myListings.filter(t => t.status === 'pending').length,
    activeBuyRequests: myRequests.filter(t => t.status === 'pending').length,
    completedTrades: sortedTrades.filter(t => t.status === 'completed' && isOwnTrade(t)).length,
    joinDate: user.createdAt ? new Date(user.createdAt) : new Date(),
    availableOffers: availableOffers.length
  } : null;

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tradeFormSchema>) => {
      return apiRequest('POST', '/api/energy-trades', {
        energyAmount: Math.round(data.energyAmount), // Store actual kWh value
        pricePerKwh: Math.round(data.pricePerKwh * 100), // Convert to cents for price
        tradeType: data.tradeType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Trade Created",
        description: "Your energy trade has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update trade mutation
  const updateTradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof tradeFormSchema> }) => {
      return apiRequest('PUT', `/api/energy-trades/${id}`, {
        energyAmount: Math.round(data.energyAmount), // Store actual kWh value
        pricePerKwh: Math.round(data.pricePerKwh * 100), // Convert to cents for price
        tradeType: data.tradeType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      toast({
        title: "Trade Updated",
        description: "Your energy trade has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/energy-trades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      toast({
        title: "Trade Deleted",
        description: "Your energy trade has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Accept trade mutation
  const acceptTradeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      return apiRequest('POST', '/api/trade-acceptances', { tradeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
      toast({
        title: "Trade Accepted",
        description: "You have successfully accepted this trade offer.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Share contact information mutation
  const shareContactMutation = useMutation({
    mutationFn: async (acceptanceId: number) => {
      return apiRequest('POST', `/api/trade-acceptances/${acceptanceId}/share-contact`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'] });
      toast({
        title: "Contact Shared",
        description: "Contact information has been shared for energy delivery coordination.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share contact information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete trade mutation
  const completeTradeCompletionMutation = useMutation({
    mutationFn: async ({ acceptanceId, status }: { acceptanceId: number; status: string }) => {
      return apiRequest('PATCH', `/api/trade-acceptances/${acceptanceId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-acceptances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-trade-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/energy-trades'] });
      toast({
        title: "Trade Updated",
        description: "Trade status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trade status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShareContact = (acceptance: any) => {
    setSelectedAcceptance(acceptance);
    setIsCoordinationDialogOpen(true);
  };

  const handleConfirmTransfer = (acceptance: any) => {
    completeTradeCompletionMutation.mutate({ acceptanceId: acceptance.id, status: 'completed' });
  };

  const handleRateTrade = (acceptance: any) => {
    setSelectedAcceptance(acceptance);
    setIsRatingDialogOpen(true);
  };

  const submitRating = () => {
    // Here you would typically send the rating to backend
    // For now, we'll just show a success message
    toast({
      title: "Rating Submitted",
      description: `Thank you for rating this trade experience ${tradeRating}/5 stars!`,
    });
    setIsRatingDialogOpen(false);
    setTradeRating(0);
    setRatingComment('');
  };

  const createForm = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      energyAmount: 0,
      pricePerKwh: 0,
      tradeType: "sell",
    },
  });

  const editForm = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      energyAmount: 0,
      pricePerKwh: 0,
      tradeType: "sell",
    },
  });

  const handleEditTrade = (trade: ExtendedEnergyTrade) => {
    setEditingTrade(trade);
    editForm.reset({
      energyAmount: trade.energyAmount, // Use actual kWh value
      pricePerKwh: trade.pricePerKwh / 100, // Convert from cents for price
      tradeType: trade.tradeType as "sell" | "buy",
    });
    setIsEditDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Please log in to view your energy trading history and manage your listings.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-login"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Calendar className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatEnergy = (amount: number) => amount.toFixed(2);
  const formatPrice = (price: number) => `₹${(price / 100).toFixed(2)}`;
  const formatTotal = (amount: number, price: number) => `₹${((amount * price) / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Navbar currentPage="storage" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Energy Trading Hub</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Manage your energy listings, requests, and trading history
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Trade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Energy Trade</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit((data) => createTradeMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="tradeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trade type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sell">Sell Energy</SelectItem>
                              <SelectItem value="buy">Buy Energy</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="energyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Amount (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="pricePerKwh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per kWh (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTradeMutation.isPending}>
                        {createTradeMutation.isPending ? 'Creating...' : 'Create Trade'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* User Stats Cards */}
        {userInfo && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-600" />
                  My Sell Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{userInfo.activeSellListings}</div>
                <p className="text-xs text-gray-500">Energy for sale</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-green-600" />
                  My Buy Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{userInfo.activeBuyRequests}</div>
                <p className="text-xs text-gray-500">Energy needed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-orange-600" />
                  Available Offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{userInfo.availableOffers}</div>
                <p className="text-xs text-gray-500">To accept</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  Completed Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{userInfo.completedTrades}</div>
                <p className="text-xs text-gray-500">Successful</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  Total Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{userInfo.totalTrades}</div>
                <p className="text-xs text-gray-500">All time</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Source Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <span className="font-medium">Data Status:</span>
                {!isLoading && !error && myAllTrades.length > 0 && (
                  <Badge variant="default">Connected - {myAllTrades.length} personal trades found</Badge>
                )}
                {!isLoading && myAllTrades.length === 0 && (
                  <Badge variant="outline">No personal trades yet</Badge>
                )}
                {error && (
                  <Badge variant="destructive">Connection Error</Badge>
                )}
                {isLoading && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <Badge variant="secondary">Loading...</Badge>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {format(new Date(), 'HH:mm:ss')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Trading Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="my-listings" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-listings">
              <Store className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">My Sell Listings</span>
              <span className="sm:hidden">Sell</span>
              ({myListings.length})
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-requests">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">My Buy Requests</span>
              <span className="sm:hidden">Buy</span>
              ({myRequests.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-applications">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
              ({tradeApplications.length})
            </TabsTrigger>
            <TabsTrigger value="request-results" className="flex items-center justify-center gap-2 text-xs sm:text-sm" data-testid="tab-request-results">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Your Results</span>
              <span className="sm:hidden">Results</span>
              ({myAllTrades.length})
            </TabsTrigger>
          </TabsList>

          {/* My Sell Listings */}
          <TabsContent value="my-listings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" />
                  Energy You're Selling
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Energy listings you've posted for others to buy
                </p>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-listings">
                    <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No sell listings yet</p>
                    <p className="text-sm text-gray-400">Create energy listings to start selling surplus power</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myListings.map((trade) => (
                      <Card key={trade.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-lg">{formatEnergy(trade.energyAmount)} kWh</div>
                            <div className="text-sm text-gray-500">
                              Listed: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {trade.acceptanceCount !== undefined && trade.acceptanceCount > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {trade.acceptanceCount} applied
                              </Badge>
                            )}
                            <Badge variant={getStatusBadgeVariant(trade.status)} className="flex items-center gap-1">
                              {getStatusIcon(trade.status)}
                              {trade.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600">Price/kWh:</span>
                            <div className="font-medium">{formatPrice(trade.pricePerKwh)}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Total Value:</span>
                            <div className="font-semibold text-green-600">{formatTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                          </div>
                        </div>
                        {trade.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTrade(trade)}
                              className="flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="flex items-center gap-1">
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this trade? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTradeMutation.mutate(trade.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Buy Requests */}
          <TabsContent value="my-requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  Energy You're Requesting
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Active and manageable buy requests (edit or delete here)
                </p>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-requests">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No buy requests yet</p>
                    <p className="text-sm text-gray-400">Create requests to purchase energy from other users</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((trade) => (
                      <Card key={trade.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-lg">{formatEnergy(trade.energyAmount)} kWh</div>
                            <div className="text-sm text-gray-500">
                              Requested: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {trade.acceptanceCount !== undefined && trade.acceptanceCount > 0 && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {trade.acceptanceCount} applied
                              </Badge>
                            )}
                            <Badge variant={getStatusBadgeVariant(trade.status)} className="flex items-center gap-1">
                              {getStatusIcon(trade.status)}
                              {trade.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600">Willing to Pay:</span>
                            <div className="font-medium">{formatPrice(trade.pricePerKwh)}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Total Budget:</span>
                            <div className="font-semibold text-blue-600">{formatTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                          </div>
                        </div>
                        {trade.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTrade(trade)}
                              className="flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="flex items-center gap-1">
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this trade? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTradeMutation.mutate(trade.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications to Your Trades */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  Applications to Your Trades
                </CardTitle>
                <p className="text-sm text-gray-600">
                  People who want to accept your energy listings and requests
                </p>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading applications...</p>
                  </div>
                ) : applicationsError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-500">Error loading applications</p>
                    <p className="text-sm text-gray-400">Please try refreshing the page</p>
                  </div>
                ) : tradeApplications.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-applications">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No applications yet</p>
                    <p className="text-sm text-gray-400">When people accept your trades, they'll appear here for coordination</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tradeApplications.map((application) => (
                      <Card key={application.acceptance.id} className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-lg">
                              {application.trade.tradeType === 'sell' ? '🔋 Energy Sale' : '⚡ Energy Purchase'}: {formatEnergy(application.trade.energyAmount)} kWh
                            </div>
                            <div className="text-sm text-gray-500">
                              Applied: {format(new Date(application.acceptance.acceptedAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                          <Badge variant="default" className="bg-blue-600">
                            New Application
                          </Badge>
                        </div>
                        
                        {/* Applicant Details */}
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                          <h4 className="font-medium mb-2 text-blue-900">👤 Applicant Details</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700 font-medium">Name:</span>
                              <div>{application.applicant?.username || 'Anonymous'}</div>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Household:</span>
                              <div>{application.applicantHousehold?.name || 'Not specified'}</div>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Location:</span>
                              <div>{application.applicant?.district}, {application.applicant?.state}</div>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Contact:</span>
                              <div>{application.applicant?.email || 'Not available'}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Trade Details */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600">Price per kWh:</span>
                            <div className="font-medium">{formatPrice(application.trade.pricePerKwh)}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Total Value:</span>
                            <div className="font-medium">{formatTotal(application.trade.energyAmount, application.trade.pricePerKwh)}</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Status:</span>
                            <div className="font-medium text-blue-600">{application.acceptance.status}</div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => completeTradeCompletionMutation.mutate({ acceptanceId: application.acceptance.id, status: 'rejected' })}
                            disabled={completeTradeCompletionMutation.isPending}
                            data-testid="button-reject-application"
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleShareContact(application.acceptance)}
                            disabled={shareContactMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid="button-approve-application"
                          >
                            {shareContactMutation.isPending ? 'Approving...' : 'Approve & Share Contact'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Your Request Results */}
          <TabsContent value="request-results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  Your Trade Results & Status
                </CardTitle>
                <p className="text-sm text-gray-600">
                  All your trades (sell/buy) and their acceptance status
                </p>
              </CardHeader>
              <CardContent>
                {myAllTrades.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-request-results">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No trades yet</p>
                    <p className="text-sm text-gray-400">Create trades to see results and acceptance status here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myAllTrades.map((trade) => {
                      // Find if this request has been accepted by someone
                      const acceptance = tradeAcceptances.find(acc => acc.tradeId === trade.id);
                      const isAccepted = acceptance !== undefined;
                      const isPending = trade.status === 'pending' && !isAccepted;
                      
                      return (
                        <Card key={trade.id} className={`p-4 ${isAccepted ? 'border-green-200 bg-green-50' : isPending ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-medium text-lg">
                                {trade.tradeType === 'sell' ? 'SELLING' : 'REQUESTING'}: {formatEnergy(trade.energyAmount)} kWh
                              </div>
                              <div className="text-sm text-gray-500">
                                Posted: {format(new Date(trade.createdAt), 'MMM dd, yyyy HH:mm')}
                                {acceptance && (
                                  <span className="ml-2 text-green-600">
                                    • Accepted: {format(new Date(acceptance.acceptedAt), 'MMM dd, HH:mm')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAccepted ? (
                                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Accepted
                                </Badge>
                              ) : isPending ? (
                                <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500 text-white">
                                  <Calendar className="h-3 w-3" />
                                  Pending
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {trade.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <span className="text-sm text-gray-600">Offered Price:</span>
                              <div className="font-medium">{formatPrice(trade.pricePerKwh)}/kWh</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Total Value:</span>
                              <div className="font-medium">{formatTotal(trade.energyAmount, trade.pricePerKwh)}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Status:</span>
                              <div className={`font-medium ${isAccepted ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-gray-600'}`}>
                                {isAccepted ? 'Request Fulfilled' : isPending ? 'Awaiting Supplier' : trade.status}
                              </div>
                            </div>
                          </div>
                          
                          {isAccepted && acceptance && (
                            <div className="mt-4 space-y-3">
                              <div className="text-green-700 bg-green-100 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="font-medium">Trade Accepted!</span>
                                </div>
                                <p className="text-sm">
                                  Someone has accepted your {trade.tradeType === 'sell' ? 'energy listing' : 'energy request'}.
                                </p>
                              </div>
                              
                              {/* Trade Workflow Steps */}
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-medium mb-3 text-gray-900">Next Steps:</h4>
                                <div className="space-y-2">
                                  {/* Step 1: Share Contact */}
                                  {acceptance.status === 'accepted' && (
                                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</div>
                                        <span className="text-sm">Share contact information for coordination</span>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleShareContact(acceptance)}
                                        disabled={shareContactMutation.isPending}
                                        data-testid="button-share-contact"
                                      >
                                        {shareContactMutation.isPending ? 'Sharing...' : 'Share Contact'}
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {/* Step 2: Coordinate */}
                                  {(acceptance.status === 'contacted' || acceptance.status === 'in_progress') && (
                                    <>
                                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700">Contact information shared</span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">2</div>
                                          <span className="text-sm">Coordinate delivery/pickup with the other party</span>
                                        </div>
                                        <Badge variant="secondary">In Progress</Badge>
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Step 3: Confirm Transfer */}
                                  {acceptance.status === 'in_progress' && (
                                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">3</div>
                                        <span className="text-sm">Confirm energy transfer completed</span>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleConfirmTransfer(acceptance)}
                                        disabled={completeTradeCompletionMutation.isPending}
                                        data-testid="button-confirm-transfer"
                                      >
                                        {completeTradeCompletionMutation.isPending ? 'Confirming...' : 'Confirm Transfer'}
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {/* Step 4: Rate Experience */}
                                  {acceptance.status === 'completed' && (
                                    <>
                                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700">Energy transfer completed</span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm">4</div>
                                          <span className="text-sm">Rate your trading experience</span>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          onClick={() => handleRateTrade(acceptance)}
                                          data-testid="button-rate-trade"
                                        >
                                          Rate Trade
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {isPending && (
                            <div className="text-yellow-700 bg-yellow-100 p-3 rounded-lg mt-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Waiting for Acceptance</span>
                              </div>
                              <p className="text-sm mt-1">
                                Your {trade.tradeType === 'sell' ? 'energy listing' : 'energy request'} is active and visible to others.
                              </p>
                            </div>
                          )}
                          
                          {!isAccepted && !isPending && (
                            <div className="text-gray-600 bg-gray-100 p-3 rounded-lg mt-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Trade Inactive</span>
                              </div>
                              <p className="text-sm mt-1">
                                This {trade.tradeType === 'sell' ? 'listing' : 'request'} is no longer active. Status: {trade.status}
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Edit Trade Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Energy Trade</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => editingTrade && updateTradeMutation.mutate({ id: editingTrade.id, data }))} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="tradeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sell">Sell Energy</SelectItem>
                          <SelectItem value="buy">Buy Energy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="energyAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Energy Amount (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                      <FormLabel>Price per kWh (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTradeMutation.isPending}>
                    {updateTradeMutation.isPending ? 'Updating...' : 'Update Trade'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Coordination Dialog */}
        <Dialog open={isCoordinationDialogOpen} onOpenChange={setIsCoordinationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Contact Information</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                This will share your contact information with the other party for energy delivery coordination.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Information to be shared:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Your name: {user?.username}</li>
                  <li>• Your email: {user?.email}</li>
                  <li>• Your phone: {user?.phone || 'Not provided'}</li>
                  <li>• Your location: {user?.district}, {user?.state}</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCoordinationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedAcceptance) {
                      shareContactMutation.mutate(selectedAcceptance.id);
                    }
                    setIsCoordinationDialogOpen(false);
                  }}
                  disabled={shareContactMutation.isPending}
                  data-testid="button-confirm-share-contact"
                >
                  {shareContactMutation.isPending ? 'Sharing...' : 'Share Contact Info'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rating Dialog */}
        <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate Your Trading Experience</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                How was your energy trading experience? Your feedback helps improve our platform.
              </p>
              
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTradeRating(star)}
                      className={`text-2xl ${star <= tradeRating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-400`}
                      data-testid={`star-${star}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Comment */}
              <div>
                <label className="block text-sm font-medium mb-2">Comments (Optional)</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none h-20"
                  placeholder="Share your thoughts about this trade..."
                  data-testid="textarea-rating-comment"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsRatingDialogOpen(false);
                  setTradeRating(0);
                  setRatingComment('');
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={submitRating}
                  disabled={tradeRating === 0}
                  data-testid="button-submit-rating"
                >
                  Submit Rating
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}