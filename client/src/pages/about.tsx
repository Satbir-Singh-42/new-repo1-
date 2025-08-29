import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Shield, Users, ArrowLeft, Menu, Zap, Home, Search, Bot, MessageCircle, HelpCircle, CloudSun, User, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-surface" style={{ paddingTop: '3.75rem' }}>
      <Navbar currentPage="about" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
        {/* Page Header */}
        <motion.div 
          ref={headerRef}
          className="text-center mb-6 sm:mb-8 lg:mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-3 sm:mb-4">About SolarSense AI</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-2 sm:px-4 lg:px-0 leading-relaxed">
            Advanced AI-powered energy trading platform with intelligent optimization for decentralized energy distribution, battery management, and sustainable power networks
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
              SolarSense AI leverages Google Gemini AI and advanced optimization algorithms to provide dynamic, 
              household-specific energy trading recommendations. Our platform uses intelligent energy flow detection and adaptive 
              algorithms to optimize each household's energy generation, storage, and trading individually, ensuring efficient 
              energy distribution based on real-time demand and supply patterns. Combined with comprehensive battery management 
              and an expert AI chat assistant, we deliver professional-grade decentralized energy solutions.
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
                    <h4 className="font-semibold text-gray-900">Energy Optimization</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    AI-powered energy flow optimization that maximizes household efficiency, battery storage management, 
                    and smart trading recommendations for decentralized energy distribution.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-blue-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                      <span>Energy Flow</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                      <span>Battery Management</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                      <span>Smart Trading</span>
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
                    <h4 className="font-semibold text-gray-900">Decentralized Trading</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Peer-to-peer energy marketplace enabling households to trade surplus solar power, 
                    creating resilient and equitable energy networks across communities.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-green-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      <span>P2P Trading</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <span>Fair Pricing</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                      <span>Grid Resilience</span>
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
                    <h4 className="font-semibold text-gray-900">AI Chat Assistant</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Interactive AI-powered chat assistant providing expert guidance on energy trading, 
                    battery optimization, demand forecasting, and sustainable energy management.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-purple-700">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
                      <span>Trading Strategy</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                      <span>Voice Input</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-1"></div>
                      <span>Energy Insights</span>
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
              Key Features
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
                  Powered by Google's latest Gemini AI model for accurate image analysis and recommendations
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-lg transform -rotate-3"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-green-200">
                    <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 rounded flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-6 bg-green-400 rounded animate-pulse"></div>
                        <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1 h-5 bg-green-600 rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Real-time Analysis</h4>
                <p className="text-sm text-gray-600">
                  Instant processing of uploaded images with detailed analysis results and visualizations
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg transform rotate-1"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-purple-100 rounded flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-sm"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">PDF Reports</h4>
                <p className="text-sm text-gray-600">
                  Professional PDF reports with visual analysis, technical specifications, and actionable recommendations
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg transform -rotate-2"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100 rounded flex items-center justify-center">
                      <div className="relative">
                        <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-300 rounded-full animate-ping"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">AI Chat Assistant</h4>
                <p className="text-sm text-gray-600">
                  Interactive AI-powered chat with voice input support for instant expert guidance and consultation
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg transform rotate-2"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-amber-200">
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 rounded flex items-center justify-center">
                      <div className="text-amber-600 font-bold text-sm">CV</div>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Computer Vision</h4>
                <p className="text-sm text-gray-600">
                  Advanced image recognition and analysis capabilities for accurate solar panel assessment
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg transform -rotate-1"></div>
                  <div className="relative bg-white rounded-lg p-3 shadow-sm border border-teal-200">
                    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 rounded flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-sm"></div>
                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-sm"></div>
                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-sm"></div>
                        <div className="w-1.5 h-1.5 bg-teal-600 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold mb-2">Dynamic Analysis</h4>
                <p className="text-sm text-gray-600">
                  Adaptive algorithms that analyze each roof individually without fixed coordinates for accurate results
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Technology Architecture Diagram */}
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
              Technology Architecture
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
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-pink-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-pink-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Computer Vision</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-teal-200 transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-teal-500 rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Natural Language</span>
                  </div>
                  <div className="flex items-center bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md border border-black transform hover:scale-105 transition-transform">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-black rounded-full mr-1.5 sm:mr-2 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span className="text-xs sm:text-sm font-medium">Render</span>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          ref={useCasesRef}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={useCasesInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center text-base sm:text-lg lg:text-xl">
              <Users className="mr-2 text-primary" size={18} />
              Who Can Use SolarScope AI
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">SI</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Solar Installers</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Dynamic roof analysis with intelligent boundary detection for accurate panel placement and realistic capacity planning
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">MT</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Maintenance Teams</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    AI-powered fault detection with severity-based maintenance recommendations and professional PDF reports
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">PO</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Property Owners</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Single-image rooftop analysis with adaptive panel sizing and comprehensive installation planning reports
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-500">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">EC</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Energy Consultants</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Professional AI chat assistant with expert solar knowledge and dynamic analysis capabilities for client consultation
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Back to Main */}
        <motion.div 
          ref={backButtonRef}
          className="text-center mt-6 sm:mt-8 lg:mt-12"
          initial={{ opacity: 0, y: 50 }}
          animate={backButtonInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Link href="/">
            <Button className="bg-primary hover:bg-blue-700 text-white w-full sm:w-auto px-6 py-2 sm:px-8 sm:py-3 transform transition-transform hover:scale-105">
              <ArrowLeft className="mr-2" size={16} />
              Back to Analysis
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4 sm:py-6">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">Made by CodeTyrans</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
                <a 
                  href="mailto:satbirsinghubhi@gmail.com" 
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  satbirsinghubhi@gmail.com
                </a>
                <a 
                  href="https://github.com/Satbir-Singh-42" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  github.com/Satbir-Singh-42
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}