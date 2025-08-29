import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Zap, AlertTriangle, CheckCircle, Loader2, LogIn, FileDown, Download, FileText, Eye, ExternalLink, User, Database } from "lucide-react";
import { format } from "date-fns";
import { InstallationResult, FaultResult, Analysis } from "@/shared/schema";
import { generateInstallationPDF, generateFaultDetectionPDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";

export default function StoragePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'installation' | 'fault-detection'>('installation');
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const { toast } = useToast();

  // State for cached data
  const [cachedAnalyses, setCachedAnalyses] = useState<Analysis[]>([]);
  const [dataSource, setDataSource] = useState<'database' | 'session' | 'none'>('none');

  // Load cached data from sessionStorage on mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const installationData = sessionStorage.getItem('installationAnalysis');
        const faultData = sessionStorage.getItem('faultAnalysis');
        const cached: Analysis[] = [];

        if (installationData) {
          const parsedInstallation = JSON.parse(installationData);
          cached.push({
            id: Date.now(),
            userId: user?.id || null,
            sessionId: null,
            userSequenceNumber: 1,
            type: 'installation',
            imagePath: '',
            results: parsedInstallation,
            originalImageUrl: parsedInstallation.originalImageUrl || '',
            analysisImageUrl: parsedInstallation.analysisImageUrl || '',
            createdAt: new Date(),
          });
        }

        if (faultData) {
          const parsedFault = JSON.parse(faultData);
          cached.push({
            id: Date.now() + 1,
            userId: user?.id || null,
            sessionId: null,
            userSequenceNumber: 1,
            type: 'fault-detection',
            imagePath: '',
            results: parsedFault,
            originalImageUrl: parsedFault.originalImageUrl || '',
            analysisImageUrl: parsedFault.analysisImageUrl || '',
            createdAt: new Date(),
          });
        }

        setCachedAnalyses(cached);
        setDataSource(cached.length > 0 ? 'session' : 'none');
      } catch (error) {
        console.error('Error loading cached data:', error);
        setDataSource('none');
      }
    };

    loadCachedData();
  }, [user]);

  // Fetch user's analyses from database (authenticated users only)
  const { data: dbAnalyses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/analyses'],
    enabled: !!user, // Only fetch if user is authenticated
    retry: 1, // Reduce retries for faster fallback
    retryDelay: 1000,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
  });

  // Update data source when database query completes
  useEffect(() => {
    if (user && !isLoading) {
      if (error) {
        // Fallback to session data on database error
        setDataSource(cachedAnalyses.length > 0 ? 'session' : 'none');
      } else if (dbAnalyses && dbAnalyses.length > 0) {
        setDataSource('database');
      } else {
        // No database data, use session data if available
        setDataSource(cachedAnalyses.length > 0 ? 'session' : 'none');
      }
    }
  }, [dbAnalyses, isLoading, error, user, cachedAnalyses.length]);

  // Use database data if available, otherwise use cached session data
  const analyses = dataSource === 'database' && dbAnalyses.length > 0 ? dbAnalyses : cachedAnalyses;

  // Sort and filter analyses
  const sortedAnalyses = analyses.sort((a: Analysis, b: Analysis) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const installationAnalyses = sortedAnalyses
    .filter((analysis: Analysis) => analysis.type === 'installation')
    .slice(0, 10); // Last 10 records

  const faultAnalyses = sortedAnalyses
    .filter((analysis: Analysis) => analysis.type === 'fault-detection')
    .slice(0, 10); // Last 10 records

  // User info display
  const userInfo = user ? {
    username: user.username,
    email: user.email,
    totalAnalyses: analyses.length,
    installationCount: installationAnalyses.length,
    faultDetectionCount: faultAnalyses.length,
    joinDate: user.createdAt ? new Date(user.createdAt) : new Date()
  } : null;

  // PDF export handlers
  const exportInstallationPDF = async (analysis: Analysis, type: 'complete' | 'summary' = 'complete') => {
    try {
      const data = analysis.results as InstallationResult;
      
      // Create canvas with actual image if available
      let canvas = null;
      if (analysis.originalImageUrl) {
        canvas = document.createElement('canvas');
        const img = new Image();
        img.onload = () => {
          canvas!.width = img.width;
          canvas!.height = img.height;
          const ctx = canvas!.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
        };
        img.src = analysis.originalImageUrl;
      }
      
      await generateInstallationPDF(
        data,
        analysis.originalImageUrl || '',
        canvas ? { current: canvas } : null
      );
      
      toast({
        title: "PDF Generated",
        description: `Installation analysis #${analysis.userSequenceNumber} ${type} report downloaded successfully.`,
        variant: "success",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportFaultDetectionPDF = async (analysis: Analysis, type: 'complete' | 'summary' = 'complete') => {
    try {
      const data = analysis.results as FaultResult;
      
      // Create canvas with actual image if available
      let canvas = null;
      if (analysis.originalImageUrl) {
        canvas = document.createElement('canvas');
        const img = new Image();
        img.onload = () => {
          canvas!.width = img.width;
          canvas!.height = img.height;
          const ctx = canvas!.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
        };
        img.src = analysis.originalImageUrl;
      }
      
      await generateFaultDetectionPDF(
        data,
        analysis.originalImageUrl || '',
        canvas ? { current: canvas } : null
      );
      
      toast({
        title: "PDF Generated", 
        description: `Fault detection analysis #${analysis.userSequenceNumber} ${type} report downloaded successfully.`,
        variant: "success",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="storage" />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">
            <LogIn className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Login Required</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Please login to view your stored analyses.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-block text-sm sm:text-base font-medium transition-colors"
              >
                Login to Continue
              </a>
              <a 
                href="/signup" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg inline-block text-sm sm:text-base font-medium transition-colors"
              >
                Create Account
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data (only if database is loading and no cached data)
  if (authLoading || (isLoading && dataSource !== 'session')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="storage" />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading your analyses...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed and no cached data available
  if (error && dataSource === 'none') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="storage" />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">
            <Database className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Analyses</h1>
            <p className="text-gray-600 mb-4">There was an issue connecting to the database.</p>
            <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="storage" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 max-w-7xl">
        
        {/* User Info Header */}
        {userInfo && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Welcome back, {userInfo.username}!</CardTitle>
                    <p className="text-sm text-gray-600">{userInfo.email}</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <div className="flex justify-center sm:justify-end space-x-4 sm:space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-base text-blue-600">{userInfo.totalAnalyses}</div>
                      <div className="text-gray-500 text-xs sm:text-sm">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-base text-green-600">{userInfo.installationCount}</div>
                      <div className="text-gray-500 text-xs sm:text-sm">Installation</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg sm:text-base text-red-600">{userInfo.faultDetectionCount}</div>
                      <div className="text-gray-500 text-xs sm:text-sm">Fault Detection</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Analysis History</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your installation and fault detection analyses with comprehensive details</p>
            </div>
            
            {/* Data Source Indicator */}
            <div className="flex items-center gap-2">
              <Badge variant={dataSource === 'database' ? 'default' : dataSource === 'session' ? 'secondary' : 'destructive'} 
                     className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {dataSource === 'database' ? 'Database Connected' : 
                 dataSource === 'session' ? 'Session Data' : 'No Data'}
              </Badge>
              {error && dataSource === 'session' && (
                <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50">
                  Using Cached Data
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'installation' | 'fault-detection')}>
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="installation" className="flex-1 text-xs sm:text-sm p-2 sm:p-3">
              <Zap className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Installation Analysis</span>
              <span className="sm:hidden">Installation</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {installationAnalyses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="fault-detection" className="flex-1 text-xs sm:text-sm p-2 sm:p-3">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Fault Detection</span>
              <span className="sm:hidden">Fault Detection</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                {faultAnalyses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installation" className="mt-6">
            {installationAnalyses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Installation Analyses</h3>
                  <p className="text-gray-600">Complete an installation analysis to see your results here.</p>
                  <Button asChild className="mt-4">
                    <a href="/dashboard">Start Analysis</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Installation Analyses ({installationAnalyses.length})</CardTitle>
                  <p className="text-sm text-gray-600">Your solar panel installation analysis history</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 sm:w-16 px-1 sm:px-3">#</TableHead>
                          <TableHead className="px-1 sm:px-3">Date & Time</TableHead>
                          <TableHead className="hidden sm:table-cell px-1 sm:px-3">Analysis Type</TableHead>
                          <TableHead className="text-right px-1 sm:px-3">PDF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installationAnalyses.map((analysis: Analysis) => {
                          return (
                            <TableRow key={analysis.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium px-1 sm:px-3">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                  {analysis.userSequenceNumber || analysis.id}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-1 sm:px-3">
                                <div className="flex items-center text-xs sm:text-sm">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-400" />
                                  <div>
                                    <div className="font-medium sm:font-normal">{format(new Date(analysis.createdAt), 'MMM dd, yyyy')}</div>
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(analysis.createdAt), 'HH:mm')}
                                    </div>
                                    {/* Show analysis type on mobile */}
                                    <div className="sm:hidden text-xs text-blue-600 flex items-center mt-1">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Installation
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell px-1 sm:px-3">
                                <div className="flex items-center">
                                  <Zap className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="font-medium">Installation Analysis</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-1 sm:px-3">
                                <Button 
                                  size="sm"
                                  onClick={() => exportInstallationPDF(analysis, 'complete')}
                                  className="h-7 sm:h-8 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                                >
                                  <Download className="h-3 w-3 mr-0 sm:mr-1" />
                                  <span className="hidden sm:inline">PDF</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fault-detection" className="mt-6">
            {faultAnalyses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fault Detection Analyses</h3>
                  <p className="text-gray-600">Complete a fault detection analysis to see your results here.</p>
                  <Button asChild className="mt-4">
                    <a href="/dashboard">Start Analysis</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Fault Detection Analyses ({faultAnalyses.length})</CardTitle>
                  <p className="text-sm text-gray-600">Your solar panel fault detection analysis history</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 sm:w-16 px-1 sm:px-3">#</TableHead>
                          <TableHead className="px-1 sm:px-3">Date & Time</TableHead>
                          <TableHead className="hidden sm:table-cell px-1 sm:px-3">Analysis Type</TableHead>
                          <TableHead className="text-right px-1 sm:px-3">PDF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faultAnalyses.map((analysis: Analysis) => {
                          return (
                            <TableRow key={analysis.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium px-1 sm:px-3">
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                                  {analysis.userSequenceNumber || analysis.id}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-1 sm:px-3">
                                <div className="flex items-center text-xs sm:text-sm">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-400" />
                                  <div>
                                    <div className="font-medium sm:font-normal">{format(new Date(analysis.createdAt), 'MMM dd, yyyy')}</div>
                                    <div className="text-xs text-gray-500">
                                      {format(new Date(analysis.createdAt), 'HH:mm')}
                                    </div>
                                    {/* Show analysis type on mobile */}
                                    <div className="sm:hidden text-xs text-red-600 flex items-center mt-1">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Fault Detection
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell px-1 sm:px-3">
                                <div className="flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                                  <span className="font-medium">Fault Detection</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-1 sm:px-3">
                                <Button 
                                  size="sm"
                                  onClick={() => exportFaultDetectionPDF(analysis, 'complete')}
                                  className="h-7 sm:h-8 px-2 sm:px-3 bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
                                >
                                  <Download className="h-3 w-3 mr-0 sm:mr-1" />
                                  <span className="hidden sm:inline">PDF</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}