import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Shield, Users, ArrowLeft, Menu, Zap, Home, Search, Bot, MessageCircle, HelpCircle, CloudSun, User, LogOut, Battery, TrendingUp, Network, Lock, Eye, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AIChatWidget from "@/components/mobile-ai-chat-widget";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";

export default function About() {
  const { user, logoutMutation } = useAuth();
  const headerRef = useRef(null);
  const whatWeDoRef = useRef(null);
  const keyFeaturesRef = useRef(null);
  const techStackRef = useRef(null);
  const useCasesRef = useRef(null);
  const backButtonRef = useRef(null);
  const serviceCard1Ref = useRef(null);
  const serviceCard2Ref = useRef(null);
  const serviceCard3Ref = useRef(null);

  const headerInView = useInView(headerRef, { once: true, margin: "-100px" });
  const whatWeDoInView = useInView(whatWeDoRef, { once: true, margin: "-100px" });
  const keyFeaturesInView = useInView(keyFeaturesRef, { once: true, margin: "-100px" });
  const techStackInView = useInView(techStackRef, { once: true, margin: "-100px" });
  const useCasesInView = useInView(useCasesRef, { once: true, margin: "-100px" });
  const backButtonInView = useInView(backButtonRef, { once: true, margin: "-100px" });
  const serviceCard1InView = useInView(serviceCard1Ref, { once: true, margin: "-50px" });
  const serviceCard2InView = useInView(serviceCard2Ref, { once: true, margin: "-50px" });
  const serviceCard3InView = useInView(serviceCard3Ref, { once: true, margin: "-50px" });

  return (
    <div className="min-h-screen bg-surface">
      <Navbar currentPage="about" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12 pt-20 sm:pt-24 md:pt-28 lg:pt-32">
        {/* Page Header */}
        <motion.div 
          ref={headerRef}
          className="text-center mb-6 sm:mb-8 lg:mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-3 sm:mb-4">About SolarSense</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4 lg:px-0 leading-relaxed">
            Intelligent Energy Solutions for a Sustainable Future. A decentralized, resilient, and equitable energy trading platform powered by AI.
          </p>
        </motion.div>

        {/* What We Do */}
        <motion.div
          ref={whatWeDoRef}
          initial={{ opacity: 0, x: -100 }}
          animate={whatWeDoInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Card className="mb-4 sm:mb-6 lg:mb-8 shadow-sm border-gray-200">
          <CardHeader className="pb-3 sm:pb-4 md:pb-6 px-4 sm:px-6">
            <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl">
              <Zap className="mr-2 text-primary" size={20} />
              What We Do
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
              SolarSense connects households with solar panels into a decentralized energy trading network. Our AI-powered platform 
              intelligently manages energy flow, prevents grid overload, and ensures fair distribution—keeping the lights on even 
              during challenging conditions. Using advanced machine learning algorithms, we predict energy generation, forecast demand, 
              and facilitate automated trading between energy producers and consumers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <motion.div 
                ref={serviceCard1Ref}
                className="relative"
                initial={{ opacity: 0, y: 50 }}
                animate={serviceCard1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <h4 className="font-semibold text-gray-900">Predictive Energy Generation</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    ML algorithms predict solar output based on weather patterns, time of day, and seasonal variations, 
                    enabling optimal energy planning and trading decisions.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-blue-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                      <span>Weather Analysis</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                      <span>Solar Forecasting</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                      <span>Demand Prediction</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                ref={serviceCard2Ref}
                className="relative"
                initial={{ opacity: 0, y: 50 }}
                animate={serviceCard2InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border border-green-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <h4 className="font-semibold text-gray-900">Intelligent Trading Network</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Automated matching of energy suppliers and consumers based on proximity, capacity, and pricing, 
                    creating a fair and efficient decentralized marketplace.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-green-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      <span>Smart Matching</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <span>Fair Pricing</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                      <span>Local Trading</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                ref={serviceCard3Ref}
                className="relative"
                initial={{ opacity: 0, y: 50 }}
                animate={serviceCard3InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 sm:p-6 border border-purple-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <h4 className="font-semibold text-gray-900">Battery Optimization</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    ML-driven charge and discharge strategies for maximum grid stability, ensuring optimal energy storage 
                    utilization across the network during peak and off-peak hours.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-purple-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
                      <span>Smart Charging</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                      <span>Grid Stability</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-1"></div>
                      <span>Peak Management</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Key Features */}
        <motion.div
          ref={keyFeaturesRef}
          initial={{ opacity: 0, x: 100 }}
          animate={keyFeaturesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
        <Card className="mb-4 sm:mb-6 lg:mb-8 shadow-sm border-gray-200">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center text-base sm:text-lg lg:text-xl">
              <Shield className="mr-2 text-primary" size={18} />
              Platform Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg transform rotate-3"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">AI</span>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Google Gemini AI</h4>
                <p className="text-sm text-gray-600">
                  Powered by Google's Gemini AI for intelligent energy optimization and real-time market insights
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-lg transform -rotate-3"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-green-200">
                    <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 rounded flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Real-time Analytics</h4>
                <p className="text-sm text-gray-600">
                  Live market data, energy flow monitoring, and performance metrics updated every 10 seconds
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg transform rotate-1"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-purple-100 rounded flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">AI Chat Assistant</h4>
                <p className="text-sm text-gray-600">
                  Interactive AI assistant providing energy optimization advice and trading strategies
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg transform -rotate-2"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100 rounded flex items-center justify-center">
                      <Network className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Grid Simulation</h4>
                <p className="text-sm text-gray-600">
                  Live demonstration platform with weather adaptation and outage response testing
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg transform rotate-2"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-amber-200">
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 rounded flex items-center justify-center">
                      <Sun className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Weather Integration</h4>
                <p className="text-sm text-gray-600">
                  Real-time weather data integration for accurate solar generation forecasting
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg transform -rotate-1"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-teal-200">
                    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 rounded flex items-center justify-center">
                      <Battery className="h-6 w-6 text-teal-600" />
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Battery Management</h4>
                <p className="text-sm text-gray-600">
                  Intelligent battery optimization with charge/discharge scheduling for maximum efficiency
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Technology Architecture */}
        <motion.div
          ref={techStackRef}
          initial={{ opacity: 0, y: 100 }}
          animate={techStackInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
        <Card className="mb-4 sm:mb-6 lg:mb-8 shadow-sm border-gray-200">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center text-base sm:text-lg lg:text-xl">
              <CloudSun className="mr-2 text-primary" size={18} />
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            
            {/* Architecture Flow Diagram */}
            <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 sm:p-6 border border-gray-200">
              
              {/* Frontend Layer */}
              <div className="flex flex-col items-center mb-6 sm:mb-8">
                <div className="text-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Frontend Layer</h3>
                  <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded mx-auto"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-blue-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-blue-500 rounded-full mr-1.5 sm:mr-2 animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium">React 18</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-blue-300 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-blue-600 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">TypeScript</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-cyan-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-cyan-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Tailwind CSS</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-indigo-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-indigo-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">shadcn/ui</span>
                  </div>
                </div>
              </div>

              {/* Connection Arrow */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-blue-400 to-green-400"></div>
                  <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-green-400 to-green-600"></div>
                </div>
              </div>

              {/* Backend Layer */}
              <div className="flex flex-col items-center mb-6 sm:mb-8">
                <div className="text-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Backend Layer</h3>
                  <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded mx-auto"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-green-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-green-500 rounded-full mr-1.5 sm:mr-2 animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium">Node.js</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-gray-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-gray-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Express.js</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-blue-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-blue-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">PostgreSQL</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-orange-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-orange-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Drizzle ORM</span>
                  </div>
                </div>
              </div>

              {/* Connection Arrow */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-green-400 to-purple-400"></div>
                  <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-purple-400 to-purple-600"></div>
                </div>
              </div>

              {/* AI & Services Layer */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">AI & Services</h3>
                  <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded mx-auto"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-purple-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-purple-500 rounded-full mr-1.5 sm:mr-2 animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium">Google Gemini AI</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-amber-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-amber-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Weather API</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-teal-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-teal-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">ML Algorithms</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Security Features */}
        <motion.div
          className="mb-4 sm:mb-6 lg:mb-8"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg lg:text-xl">
                <Shield className="mr-2 text-primary" size={18} />
                Enhanced Security Features
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 sm:p-6 border border-red-200 mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                  <h4 className="font-semibold text-gray-900">Latest Security Enhancements</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Recent critical security improvements ensure maximum protection for user data and platform integrity 
                  with industry-standard encryption and validation protocols.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-6 border border-green-200">
                  <div className="flex items-center mb-3">
                    <Lock className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">bcrypt Password Hashing</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Military-grade password protection with 12 salt rounds, replacing previous plain text storage for maximum security.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">12 Salt Rounds</Badge>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Secure Storage</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-blue-200">
                  <div className="flex items-center mb-3">
                    <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Input Validation & Sanitization</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Comprehensive backend validation using Zod schemas with input sanitization to prevent malicious data injection.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Zod Validation</Badge>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Data Sanitization</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 sm:p-6 border border-purple-200">
                  <div className="flex items-center mb-3">
                    <Eye className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Secure Session Management</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Cryptographically secure session IDs generated using crypto.randomBytes for enhanced authentication security.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Crypto.randomBytes</Badge>
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">Secure Sessions</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6 border border-amber-200">
                  <div className="flex items-center mb-3">
                    <Users className="h-5 w-5 text-amber-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Duplicate Protection</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Advanced username and email duplicate checking with specific error messages to prevent account conflicts.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Username Check</Badge>
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Email Validation</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 sm:p-6 border border-teal-200">
                  <div className="flex items-center mb-3">
                    <Shield className="h-5 w-5 text-teal-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Email Security</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Temporary email domain blocking and comprehensive email validation to ensure authentic user registration.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700">Domain Blocking</Badge>
                    <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700">Format Validation</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <Lock className="h-5 w-5 text-gray-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Authentication Protection</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete authentication security with secure cookie handling, session persistence, and proper logout functionality.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Secure Cookies</Badge>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">Session Security</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          ref={useCasesRef}
          initial={{ opacity: 0, y: 100 }}
          animate={useCasesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Card className="mb-6 sm:mb-8 lg:mb-12 shadow-sm border-gray-200">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg lg:text-xl">
                <Users className="mr-2 text-primary" size={18} />
                Real-World Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-6 border border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Residential Solar Communities</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Homeowners with solar panels can automatically trade excess energy with neighbors, 
                    creating local energy markets that reduce dependence on traditional grids.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Local Trading</Badge>
                    <Badge variant="secondary" className="text-xs">Grid Independence</Badge>
                    <Badge variant="secondary" className="text-xs">Cost Savings</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Commercial Energy Management</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Businesses can optimize energy costs by participating in intelligent trading networks, 
                    selling surplus during low-demand periods and buying during peak production times.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Cost Optimization</Badge>
                    <Badge variant="secondary" className="text-xs">Peak Management</Badge>
                    <Badge variant="secondary" className="text-xs">Smart Trading</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 sm:p-6 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Grid Resilience & Emergency Response</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    During power outages or extreme weather events, the network automatically redistributes 
                    available energy to critical facilities and essential services.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Emergency Response</Badge>
                    <Badge variant="secondary" className="text-xs">Auto Redistribution</Badge>
                    <Badge variant="secondary" className="text-xs">Grid Stability</Badge>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6 border border-amber-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Sustainable Energy Planning</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    City planners and energy providers can use the platform's analytics to design more 
                    efficient and sustainable energy infrastructure for future developments.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Urban Planning</Badge>
                    <Badge variant="secondary" className="text-xs">Analytics</Badge>
                    <Badge variant="secondary" className="text-xs">Sustainability</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Back to Dashboard Button */}
        <motion.div
          ref={backButtonRef}
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={backButtonInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Button 
            asChild 
            size="lg" 
            className="bg-primary px-6 sm:px-8 py-2 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Energy Dashboard
            </Link>
          </Button>
        </motion.div>

      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}