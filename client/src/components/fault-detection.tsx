import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Eye, Download, Calendar, Share, FileText, X, Trash2, FileDown } from "lucide-react";

import ImageUpload, { ImageUploadRef } from "./image-upload";
import AnalysisOverlay from "./analysis-overlay";
import { LazyLoading, LazyLoadingOverlay } from "./ui/lazy-loading";
import { apiRequest, checkBackendHealth } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateFaultDetectionPDF } from "@/lib/pdf-generator";
import { compressImage, safeStoreImage, cleanupOldImages } from "@/lib/image-utils";

import type { FaultResult } from "@shared/schema";

export default function FaultDetection() {
  const [analysisResults, setAnalysisResults] = useState<FaultResult[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageUploadRef = useRef<ImageUploadRef | null>(null);

  // Load data from sessionStorage on component mount (persists during navigation, clears on refresh)
  useEffect(() => {
    // Clean up old images first to free space
    cleanupOldImages();
    
    const savedResults = sessionStorage.getItem('faultDetectionResults');
    
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);
        setAnalysisResults(parsedResults);
        
        // Extract image URLs from results if they exist
        const extractedUrls = parsedResults
          .filter((result: any) => result.originalImageUrl)
          .map((result: any) => result.originalImageUrl);
        
        if (extractedUrls.length > 0) {
          setImageUrls(extractedUrls);
        }
      } catch (error) {
        console.error('Error parsing saved fault detection results:', error);
      }
    }
  }, []);

  // Save data to sessionStorage whenever it changes with safe storage
  useEffect(() => {
    if (analysisResults.length > 0) {
      try {
        const dataString = JSON.stringify(analysisResults);
        sessionStorage.setItem('faultDetectionResults', dataString);
      } catch (error) {
        console.error('Error saving fault detection results to storage:', error);
        // If storage fails, clean up and try again
        cleanupOldImages();
        try {
          sessionStorage.setItem('faultDetectionResults', JSON.stringify(analysisResults));
        } catch (retryError) {
          console.warn('Failed to save fault detection results even after cleanup:', retryError);
        }
      }
    }
  }, [analysisResults]);

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Starting fault detection for file:', file.name, file.size);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', '1');
      
      console.log('FormData created, sending request...');
      
      const response = await apiRequest('POST', '/api/analyze/fault-detection', formData);
      const data = await response.json();
      console.log('Fault detection successful:', data);
      return data;
    },
    onSuccess: async (data, variables) => {
      console.log('Fault detection complete, setting results:', data);
      
      // Only add results when analysis succeeds
      if (currentImageFile) {
        try {
          // Compress image for storage efficiency
          const compressedDataUrl = await compressImage(currentImageFile, 1200, 0.8);
          
          // Create enhanced result with compressed image data
          const enhancedResult = {
            ...data.results,
            originalImageUrl: compressedDataUrl,
            timestamp: new Date().toISOString()
          };
          
          setAnalysisResults(prev => [...prev, enhancedResult]);
          setImageUrls(prev => [...prev, compressedDataUrl]);
        } catch (error) {
          console.error('Error compressing fault detection image:', error);
          // Fallback to standard file reading
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const enhancedResult = {
              ...data.results,
              originalImageUrl: dataUrl,
              timestamp: new Date().toISOString()
            };
            setAnalysisResults(prev => [...prev, enhancedResult]);
            setImageUrls(prev => [...prev, dataUrl]);
          };
          reader.readAsDataURL(currentImageFile);
        }
        setCurrentImageFile(null);
      }
      
      // Reset the image uploader to refresh the UI
      if (imageUploadRef.current) {
        imageUploadRef.current.reset();
      }
      
      // Smooth scroll to results after a brief delay, accounting for navbar height
      setTimeout(() => {
        if (resultsRef.current) {
          const navbarHeight = 80; // Account for navbar height (pt-20 = 80px)
          const elementTop = resultsRef.current.offsetTop - navbarHeight;
          window.scrollTo({
            top: elementTop,
            behavior: 'smooth'
          });
        }
      }, 300);
      
      toast({
        title: "Fault Detection Complete",
        description: "Your solar panel analysis has been completed successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error('Fault detection error:', error);
      
      // Clear the current image file when analysis fails
      setCurrentImageFile(null);
      
      // Extract error message and provide specific validation warnings
      let errorMessage = "Failed to analyze the image. Please try again.";
      let errorTitle = "Analysis Failed";
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('not solar panel') || errorText.includes('no solar') || errorText.includes('rooftop')) {
          errorTitle = "Invalid Image for Fault Detection";
          errorMessage = "Please upload a solar panel image. This feature analyzes existing solar panel installations for defects and performance issues, not rooftops.";
        } else if (errorText.includes('indoor') || errorText.includes('interior')) {
          errorTitle = "Indoor Image Detected";
          errorMessage = "Please upload an outdoor solar panel image. Indoor or interior photos cannot be used for fault detection analysis.";
        } else if (errorText.includes('invalid') || errorText.includes('not valid')) {
          errorTitle = "Image Validation Failed";
          errorMessage = "Please upload a clear image showing solar panels or photovoltaic equipment for fault detection analysis.";
        } else if (errorText.includes('overloaded') || errorText.includes('503') || errorText.includes('unavailable')) {
          errorTitle = "AI Service Temporarily Unavailable";
          errorMessage = "The AI analysis service is currently overloaded. Please wait a few minutes and try again. If the issue persists, try a different image or contact support.";
          
          // Use warning variant for service unavailability
          toast({
            title: errorTitle,
            description: errorMessage,
            variant: "warning",
          });
          return;
        } else if (errorText.includes('network') || errorText.includes('timeout')) {
          errorTitle = "Connection Error";
          errorMessage = "Network connection failed. Please check your internet connection and try again.";
        } else if (errorText.includes('backend not connected') || errorText.includes('server not available')) {
          errorTitle = "Backend Connection Error";
          errorMessage = "The backend server is not connected properly. Please check the server status and try again.";
        } else if (errorText.includes('fetch') || errorText.includes('cors') || errorText.includes('refused')) {
          errorTitle = "Backend Connection Error";
          errorMessage = "Cannot connect to the backend server. Please ensure the server is running and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      // Always show the toast notification
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (file: File) => {
    // Store the file for later use when analysis succeeds
    setCurrentImageFile(file);
  };

  const handleAnalyze = async (file: File) => {
    // Check backend health before analysis
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      toast({
        title: "Backend Connection Error",
        description: "Cannot connect to the backend server. Please ensure the server is running and try again.",
        variant: "warning",
      });
      return;
    }
    
    setCurrentImageFile(file);
    analysisMutation.mutate(file);
  };

  const removeResult = (indexToRemove: number) => {
    setAnalysisResults(prev => prev.filter((_, index) => index !== indexToRemove));
    setImageUrls(prev => {
      // Clean up the object URL to prevent memory leaks
      const urlToRemove = prev[indexToRemove];
      if (urlToRemove) {
        URL.revokeObjectURL(urlToRemove);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });
    
    toast({
      title: "Result Removed",
      description: "Fault detection result has been removed successfully.",
      variant: "success",
    });
  };

  const clearAllResults = () => {
    // Clean up all object URLs to prevent memory leaks
    imageUrls.forEach(url => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    
    // Clear all analysis results and images
    setAnalysisResults([]);
    setImageUrls([]);
    setCurrentImageFile(null);
    
    // Clear session storage
    sessionStorage.removeItem('faultDetectionResults');
    sessionStorage.removeItem('faultDetectionImageUrls');
    
    toast({
      title: "All Data Cleared",
      description: "All fault detection results and uploaded images have been cleared.",
      variant: "success",
    });
  };

  const exportToPDF = async () => {
    if (analysisResults.length === 0 || imageUrls.length === 0) return;
    
    try {
      const firstResult = analysisResults[0];
      await generateFaultDetectionPDF(firstResult, imageUrls[0], analysisCanvasRef);
      
      toast({
        title: "Individual PDF Generated",
        description: "First fault detection report has been downloaded as a PDF.",
        variant: "success",
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate individual PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportSummaryPDF = async () => {
    if (analysisResults.length === 0 || imageUrls.length === 0) return;
    
    try {
      // Create comprehensive summary report with all results
      const summaryResult = {
        panelId: `Summary-${analysisResults.length}-Panels`,
        faults: analysisResults.flatMap(r => r.faults),
        overallHealth: analysisResults.some(r => r.faults.some(f => f.severity === 'Critical')) ? 'Critical Issues Found' : 
                       analysisResults.some(r => r.faults.some(f => f.severity === 'High')) ? 'High Risk Issues' : 
                       analysisResults.some(r => r.faults.length > 0) ? 'Minor Issues Detected' : 'Good Condition',
        recommendations: [...new Set(analysisResults.flatMap(r => r.recommendations))]
      };
      
      await generateFaultDetectionPDF(summaryResult, imageUrls[0], analysisCanvasRef);
      
      toast({
        title: "Collective Report Generated",
        description: "Complete fault detection summary with all issues has been downloaded as a PDF.",
        variant: "success",
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate collective summary PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportShortSummaryPDF = async () => {
    if (analysisResults.length === 0 || imageUrls.length === 0) return;
    
    try {
      // Create short summary with key findings only
      const criticalFaults = analysisResults.flatMap(r => r.faults.filter(f => f.severity === 'Critical'));
      const highFaults = analysisResults.flatMap(r => r.faults.filter(f => f.severity === 'High'));
      const totalFaults = analysisResults.reduce((sum, r) => sum + r.faults.length, 0);
      
      const shortSummaryResult = {
        panelId: `Executive-Summary-${analysisResults.length}-Panels`,
        faults: [...criticalFaults, ...highFaults].slice(0, 3), // Only top 3 critical/high issues
        overallHealth: criticalFaults.length > 0 ? 'Critical Issues Found' : 
                       highFaults.length > 0 ? 'High Priority Issues' : 'Good Condition',
        recommendations: [...new Set(analysisResults.flatMap(r => r.recommendations))].slice(0, 3) // Only top 3 recommendations
      };
      
      await generateFaultDetectionPDF(shortSummaryResult, imageUrls[0], analysisCanvasRef);
      
      toast({
        title: "Executive Summary Generated",
        description: "Short summary PDF with key findings has been downloaded.",
        variant: "success",
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate executive summary PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-50 text-red-700';
      case 'high': return 'bg-red-50 text-red-600';
      case 'medium': return 'bg-yellow-50 text-yellow-700';
      case 'low': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="text-red-500" size={16} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      default:
        return <CheckCircle className="text-green-500" size={16} />;
    }
  };

  const getTotalIssues = () => {
    return analysisResults.reduce((total, result) => total + result.faults.length, 0);
  };

  const getIssuesByType = (type: string) => {
    return analysisResults.reduce((total, result) => {
      return total + result.faults.filter(fault => fault.severity.toLowerCase() === type).length;
    }, 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-0">
      <ImageUpload
        ref={imageUploadRef}
        onUpload={handleImageUpload}
        onAnalyze={handleAnalyze}
        uploading={analysisMutation.isPending}
        title="Upload Solar Panel Image"
        description="Upload images showing solar panels or photovoltaic equipment. After uploading, click 'Start AI Analysis' to detect defects, cracks, and performance issues using Google Gemini AI."
        validationType="fault-detection"
      />

      {(analysisResults.length > 0 || analysisMutation.isPending) && (
        <>
          {/* Fault Analysis Results */}
          <div 
            ref={resultsRef}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
          >
            {analysisResults.map((result, index) => (
              <Card key={index} className="shadow-material">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="relative mb-3 sm:mb-4">
                    <AnalysisOverlay
                      imageUrl={imageUrls[index] || (currentImageFile ? URL.createObjectURL(currentImageFile) : '')}
                      faults={result.faults}
                      type="fault-detection"
                      ref={index === 0 ? analysisCanvasRef : undefined}
                    />
                    <Badge 
                      className={`absolute top-1 right-1 sm:top-2 sm:right-2 ${
                        result.faults.length > 0 ? 'bg-red-500' : 'bg-green-500'
                      } text-white text-xs`}
                    >
                      {result.faults.length > 0 ? (
                        <>
                          <AlertTriangle className="mr-1" size={10} />
                          <span className="text-xs">{result.faults.length} Issues</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-1" size={10} />
                          <span className="text-xs">No Issues</span>
                        </>
                      )}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeResult(index)}
                      className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white/90 hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 p-1 h-6 w-6 rounded-full"
                      title="Remove this result"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 sm:mb-2 gap-1 sm:gap-2">
                        <h5 className="font-semibold text-sm sm:text-base lg:text-lg text-primary-custom">Panel {result.panelId}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
                          result.overallHealth === 'Excellent' ? 'bg-green-100 text-green-800' :
                          result.overallHealth === 'Good' ? 'bg-blue-100 text-blue-800' :
                          result.overallHealth === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          result.overallHealth === 'Poor' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.overallHealth}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Analysis completed on {new Date().toLocaleDateString()}</p>
                    </div>
                    
                    {result.faults.map((fault, faultIndex) => (
                      <div key={faultIndex} className={`p-2 sm:p-3 lg:p-4 rounded-lg border-l-4 ${
                        fault.severity === 'Critical' ? 'border-red-500 bg-red-50' :
                        fault.severity === 'High' ? 'border-orange-500 bg-orange-50' :
                        fault.severity === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 sm:mb-1.5 gap-1">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {getSeverityIcon(fault.severity)}
                            <span className="text-xs sm:text-sm font-medium">{fault.type}</span>
                          </div>
                          <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded self-start ${
                            fault.severity === 'Critical' ? 'bg-red-200 text-red-800' :
                            fault.severity === 'High' ? 'bg-orange-200 text-orange-800' :
                            fault.severity === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {fault.severity}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">{fault.description}</p>

                      </div>
                    ))}
                    
                    {/* Performance Impact Section */}
                    {result.faults.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                        <h6 className="font-semibold text-sm mb-2 text-gray-800">Performance Impact Analysis</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          <div className={`bg-white rounded p-2 border-l-4 ${
                            result.faults.some(f => f.severity === 'Critical') ? 'border-red-500' :
                            result.faults.some(f => f.severity === 'High') ? 'border-orange-500' :
                            'border-yellow-500'
                          }`}>
                            <div className="font-medium text-gray-800 text-xs">Expected Loss</div>
                            <div className={`text-xs font-semibold ${
                              result.faults.some(f => f.severity === 'Critical') ? 'text-red-600' :
                              result.faults.some(f => f.severity === 'High') ? 'text-orange-600' :
                              'text-yellow-600'
                            }`}>
                              {result.faults.some(f => f.severity === 'Critical') ? '25-40%' :
                               result.faults.some(f => f.severity === 'High') ? '10-25%' :
                               '5-10%'}
                            </div>
                          </div>
                          <div className={`bg-white rounded p-2 border-l-4 ${
                            result.faults.some(f => f.severity === 'Critical') ? 'border-red-500' :
                            result.faults.some(f => f.severity === 'High') ? 'border-orange-500' :
                            'border-yellow-500'
                          }`}>
                            <div className="font-medium text-gray-800 text-xs">Action Priority</div>
                            <div className={`text-xs font-semibold ${
                              result.faults.some(f => f.severity === 'Critical') ? 'text-red-600' :
                              result.faults.some(f => f.severity === 'High') ? 'text-orange-600' :
                              'text-yellow-600'
                            }`}>
                              {result.faults.some(f => f.severity === 'Critical') ? 'Urgent' :
                               result.faults.some(f => f.severity === 'High') ? 'High' :
                               'Medium'}
                            </div>
                          </div>
                          <div className={`bg-white rounded p-2 border-l-4 ${
                            result.faults.some(f => f.severity === 'Critical') ? 'border-red-500' :
                            result.faults.some(f => f.severity === 'High') ? 'border-orange-500' :
                            'border-yellow-500'
                          }`}>
                            <div className="font-medium text-gray-800 text-xs">Timeline</div>
                            <div className={`text-xs font-semibold ${
                              result.faults.some(f => f.severity === 'Critical') ? 'text-red-600' :
                              result.faults.some(f => f.severity === 'High') ? 'text-orange-600' :
                              'text-yellow-600'
                            }`}>
                              {result.faults.some(f => f.severity === 'Critical') ? '24-48 hrs' :
                               result.faults.some(f => f.severity === 'High') ? '1-2 weeks' :
                               '1-3 months'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {result.faults.length === 0 && (
                      <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="text-white" size={12} />
                          </div>
                          <div>
                            <h6 className="font-semibold text-green-800 text-xs sm:text-sm lg:text-base">No Issues Detected</h6>
                            <p className="text-xs text-green-600">Panel is operating in excellent condition</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          <div className="bg-white/70 rounded p-2 border-l-4 border-green-500">
                            <div className="font-medium text-green-800 text-xs">Performance</div>
                            <div className="text-green-600 text-xs font-semibold">100%</div>
                            <div className="text-green-500 text-xs">Excellent</div>
                          </div>
                          <div className="bg-white/70 rounded p-2 border-l-4 border-green-500">
                            <div className="font-medium text-green-800 text-xs">Power Output</div>
                            <div className="text-green-600 text-xs font-semibold">Normal</div>
                            <div className="text-green-500 text-xs">No degradation</div>
                          </div>
                          <div className="bg-white/70 rounded p-2 border-l-4 border-green-500">
                            <div className="font-medium text-green-800 text-xs">Next Check</div>
                            <div className="text-green-600 text-xs font-semibold">6 months</div>
                            <div className="text-green-500 text-xs">Routine only</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 sm:mt-4 lg:mt-6 flex flex-col sm:flex-row gap-2">
                    <Button 
                      className="flex-1 bg-primary hover:bg-blue-700 text-white text-xs sm:text-sm h-8 sm:h-10"
                      onClick={() => {
                        const detailsModal = document.createElement('div');
                        detailsModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10005] p-4';
                        
                        // Add click outside to close functionality
                        detailsModal.addEventListener('click', (e) => {
                          if (e.target === detailsModal) {
                            detailsModal.remove();
                          }
                        });
                        
                        detailsModal.innerHTML = `
                          <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div class="p-6">
                              <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-primary-custom">Detailed Analysis: Panel ${result.panelId}</h3>
                                <button class="text-gray-500 hover:text-gray-700 text-2xl" onclick="this.closest('.fixed').remove()">&times;</button>
                              </div>
                              
                              <div class="space-y-6">
                                <div class="bg-gray-50 rounded-lg p-4">
                                  <h4 class="font-semibold mb-2">Panel Information</h4>
                                  <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div><span class="font-medium">Panel ID:</span> ${result.panelId}</div>
                                    <div><span class="font-medium">Analysis Date:</span> ${new Date().toLocaleDateString()}</div>
                                    <div><span class="font-medium">Overall Health:</span> 
                                      <span class="px-2 py-1 rounded text-xs ml-2 ${
                                        result.overallHealth === 'Excellent' ? 'bg-green-100 text-green-800' :
                                        result.overallHealth === 'Good' ? 'bg-blue-100 text-blue-800' :
                                        result.overallHealth === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                                        result.overallHealth === 'Poor' ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'
                                      }">${result.overallHealth}</span>
                                    </div>
                                    <div><span class="font-medium">Issues Found:</span> ${result.faults.length}</div>
                                  </div>
                                </div>
                                
                                ${result.faults.length > 0 ? `
                                <div>
                                  <h4 class="font-semibold mb-3">Detected Issues</h4>
                                  <div class="space-y-3">
                                    ${result.faults.map((fault, i) => `
                                      <div class="border rounded-lg p-4 ${
                                        fault.severity === 'Critical' ? 'border-red-300 bg-red-50' :
                                        fault.severity === 'High' ? 'border-orange-300 bg-orange-50' :
                                        fault.severity === 'Medium' ? 'border-yellow-300 bg-yellow-50' :
                                        'border-green-300 bg-green-50'
                                      }">
                                        <div class="flex justify-between items-start mb-2">
                                          <h5 class="font-medium">${fault.type}</h5>
                                          <span class="text-xs px-2 py-1 rounded ${
                                            fault.severity === 'Critical' ? 'bg-red-200 text-red-800' :
                                            fault.severity === 'High' ? 'bg-orange-200 text-orange-800' :
                                            fault.severity === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                                            'bg-green-200 text-green-800'
                                          }">${fault.severity}</span>
                                        </div>
                                        <p class="text-sm text-gray-600 mb-2">${fault.description}</p>

                                      </div>
                                    `).join('')}
                                  </div>
                                </div>
                                ` : `
                                <div class="bg-green-50 rounded-lg p-6 text-center">
                                  <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </div>
                                  <h4 class="font-semibold text-green-800 mb-2">Panel in Excellent Condition</h4>
                                  <p class="text-green-600">No defects, cracks, or performance issues detected. This panel is operating optimally.</p>
                                </div>
                                `}
                                
                                <div>
                                  <h4 class="font-semibold mb-3">Maintenance Recommendations</h4>
                                  <div class="bg-blue-50 rounded-lg p-4">
                                    <ul class="space-y-2">
                                      ${result.recommendations.map(rec => `
                                        <li class="flex items-start space-x-2">
                                          <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                          <span class="text-sm">${rec.replace(/[\*\*\•]/g, '').trim()}</span>
                                        </li>
                                      `).join('')}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                              
                              <div class="mt-6 pt-4 border-t">
                                <button class="w-full bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded" onclick="this.closest('.fixed').remove()">
                                  Close Details
                                </button>
                              </div>
                            </div>
                          </div>
                        `;
                        document.body.appendChild(detailsModal);
                      }}
                    >
                      <Eye className="mr-1 sm:mr-2" size={14} />
                      <span className="hidden sm:inline">View </span>Details
                    </Button>
                    {result.faults.length > 0 && (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs sm:text-sm h-8 sm:h-10"
                        onClick={async () => {
                          try {
                            await generateFaultDetectionPDF(result, imageUrls[index], analysisCanvasRef);
                            toast({
                              title: "PDF Generated Successfully",
                              description: `Professional fault detection report for ${result.panelId} has been downloaded.`,
                              variant: "default",
                            });
                          } catch (error) {
                            console.error('PDF generation error:', error);
                            toast({
                              title: "PDF Generation Failed",
                              description: "Could not generate PDF report. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <FileDown className="mr-1" size={12} />
                        <span className="hidden sm:inline">Export PDF</span><span className="sm:hidden">Export PDF</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Show loading card if analysis is pending */}
            {analysisMutation.isPending && (
              <Card className="shadow-material">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="bg-gray-100 rounded-lg flex items-center justify-center h-32 sm:h-40 lg:h-48 mb-3 sm:mb-4">
                    <div className="text-center px-3">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                      <p className="text-secondary-custom text-xs sm:text-sm mb-3 sm:mb-4">Analyzing solar panel...</p>
                      <div className="w-24 sm:w-32 lg:w-48 h-1 sm:h-1.5 lg:h-2 bg-gray-200 rounded-full mx-auto mb-2">
                        <div className="h-1 sm:h-1.5 lg:h-2 bg-primary rounded-full progress-animate"></div>
                      </div>
                      <p className="text-xs text-gray-500">AI fault detection in progress</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-gray-100 animate-pulse rounded h-2 sm:h-3 lg:h-4"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Diagnostic Summary */}
          {analysisResults.length > 0 && (
            <Card className="shadow-material">
              <CardContent className="p-3 sm:p-4 lg:p-6 xl:p-8">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 lg:mb-6 text-primary-custom">Diagnostic Summary</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500 mb-1 sm:mb-2">{getIssuesByType('critical')}</div>
                    <div className="text-xs sm:text-sm text-secondary-custom">Critical Issues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-500 mb-1 sm:mb-2">{getIssuesByType('high')}</div>
                    <div className="text-xs sm:text-sm text-secondary-custom">High Priority Issues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600 mb-1 sm:mb-2">{getIssuesByType('medium') + getIssuesByType('low')}</div>
                    <div className="text-xs sm:text-sm text-secondary-custom">Medium & Low Issues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-500 mb-1 sm:mb-2">
                      {analysisResults.filter(r => r.faults.length === 0).length}
                    </div>
                    <div className="text-xs sm:text-sm text-secondary-custom">Healthy Panels</div>
                  </div>
                </div>

                {/* Enhanced Maintenance Recommendations */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-blue-900">Professional Maintenance Plan</h4>
                  </div>
                  
                  {/* Fault-Specific Maintenance Plans */}
                  <div className="space-y-4">
                    {/* Generate specific maintenance plans for each unique fault type */}
                    {(() => {
                      // Get all unique fault types across all results
                      const uniqueFaultTypes = [...new Set(
                        analysisResults.flatMap(r => r.faults.map(f => f.type))
                      )];
                      
                      return uniqueFaultTypes.map(faultType => {
                        // Get all faults of this type with their severities
                        const faultsOfType = analysisResults.flatMap(r => 
                          r.faults.filter(f => f.type === faultType)
                        );
                        
                        // Get highest severity for this fault type
                        const severities = faultsOfType.map(f => f.severity);
                        const highestSeverity = severities.includes('Critical') ? 'Critical' :
                                               severities.includes('High') ? 'High' :
                                               severities.includes('Medium') ? 'Medium' : 'Low';
                        
                        // Get all AI recommendations for this fault type
                        const relevantRecommendations = analysisResults
                          .filter(r => r.faults.some(f => f.type === faultType))
                          .flatMap(r => r.recommendations)
                          .filter((rec, index, self) => self.indexOf(rec) === index) // Remove duplicates
                          .slice(0, 3); // Limit to 3 recommendations
                        
                        const severityColors = {
                          Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconBg: 'bg-red-500', icon: '!' },
                          High: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', iconBg: 'bg-orange-500', icon: '⚠' },
                          Medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', iconBg: 'bg-yellow-500', icon: '◐' },
                          Low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconBg: 'bg-green-500', icon: '◯' }
                        };
                        
                        const colors = severityColors[highestSeverity as keyof typeof severityColors];
                        
                        return (
                          <div key={faultType} className={`${colors.bg} border ${colors.border} rounded-lg p-3`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-6 h-6 ${colors.iconBg} rounded-full flex items-center justify-center`}>
                                <span className="text-white text-xs font-bold">{colors.icon}</span>
                              </div>
                              <h5 className={`font-semibold ${colors.text} text-sm`}>
                                {faultType} Issues ({faultsOfType.length} detected - {highestSeverity} Priority)
                              </h5>
                            </div>
                            
                            {/* Specific maintenance plan for this fault type */}
                            <div className="space-y-2">
                              <div className={`text-xs sm:text-sm ${colors.text} font-medium mb-1`}>
                                Maintenance Plan:
                              </div>
                              <ul className={`space-y-1 text-xs sm:text-sm ${colors.text.replace('800', '700')}`}>
                                {relevantRecommendations.length > 0 ? (
                                  relevantRecommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className={`${colors.text.replace('800', '500')} font-bold mt-0.5`}>•</span>
                                      <span className="flex-1">{rec.replace(/[\*\*\•\-]/g, '').trim()}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="flex items-start space-x-2">
                                    <span className={`${colors.text.replace('800', '500')} font-bold mt-0.5`}>•</span>
                                    <span className="flex-1">AI analysis in progress - specific recommendations will be generated based on fault severity and type</span>
                                  </li>
                                )}
                              </ul>
                              
                              {/* Timeline and Priority Info */}
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex justify-between items-center text-xs">
                                  <span className={`font-medium ${colors.text}`}>
                                    Timeline: {
                                      highestSeverity === 'Critical' ? '24-48 hours' :
                                      highestSeverity === 'High' ? '1-2 weeks' :
                                      highestSeverity === 'Medium' ? '1-3 months' : '3-6 months'
                                    }
                                  </span>
                                  <span className={`font-medium ${colors.text}`}>
                                    Panels Affected: {faultsOfType.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* General Maintenance Notes */}
                    {analysisResults.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">ℹ</span>
                          </div>
                          <h5 className="font-semibold text-blue-800 text-sm">General Maintenance Guidelines</h5>
                        </div>
                        <ul className="space-y-1 text-xs sm:text-sm text-blue-700">
                          <li className="flex items-start space-x-2">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span className="flex-1">Schedule professional inspection every 6 months for optimal performance</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span className="flex-1">Document all maintenance activities and track performance metrics</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span className="flex-1">Contact certified solar technicians for all electrical work and critical repairs</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
