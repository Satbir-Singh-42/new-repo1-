import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { CloudSun, Mail, Lock, UserCircle, Eye, EyeOff } from "lucide-react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import ValidationCard from "@/components/validation-card";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showValidationCard, setShowValidationCard] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationType, setValidationType] = useState<"error" | "success">("error");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Handle login errors including server issues
  useEffect(() => {
    if (loginMutation.isError) {
      const errorMessage = loginMutation.error?.message || "";
      
      // Handle server errors
      if (errorMessage.includes("Server is currently unavailable") || errorMessage.includes("Failed to fetch")) {
        setValidationMessage("Server is down. Please try again later.");
        setValidationType("error");
        setShowValidationCard(true);
        setTimeout(() => {
          setShowValidationCard(false);
        }, 5000);
      } else {
        // Handle authentication errors
        setValidationMessage("Invalid email or password. Please check your credentials and try again.");
        setValidationType("error");
        setShowValidationCard(true);
        setTimeout(() => {
          setShowValidationCard(false);
        }, 5000);
      }
    }
  }, [loginMutation.isError, loginMutation.error]);

  // Handle successful login - show success card then redirect to dashboard
  useEffect(() => {
    if (loginMutation.isSuccess) {
      setValidationMessage("You have logged in successfully!");
      setValidationType("success");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
        setLocation("/");
      }, 2500);
    }
  }, [loginMutation.isSuccess, setLocation]);

  // If user is already authenticated, redirect to dashboard (but not during login process)
  useEffect(() => {
    if (user && !loginMutation.isPending && !loginMutation.isError && !loginMutation.isSuccess) {
      setLocation("/");
    }
  }, [user, setLocation, loginMutation.isPending, loginMutation.isError, loginMutation.isSuccess]);

  const onSubmit = (data: LoginForm) => {
    setShowValidationCard(false); // Hide any existing validation card
    loginMutation.mutate(data);
  };



  return (
    <>
      
      {/* Validation Card - Positioned lower below navbar */}
      {showValidationCard && (
        <div className="fixed top-20 sm:top-24 md:top-28 right-2 sm:right-4 md:right-6 z-[10000] w-full max-w-xs sm:max-w-sm md:max-w-md px-2 sm:px-0">
          <ValidationCard
            type={validationType}
            title={validationType === "success" ? "Login Successful" : "Login Failed"}
            description={validationMessage}
            onClose={() => setShowValidationCard(false)}
          />
        </div>
      )}
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-3 sm:p-4 md:p-6 pt-20">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center">


        {/* Login Form */}
        <div className="flex justify-center md:justify-end order-2 md:order-1">
          <Card className="w-full max-w-sm sm:max-w-md bg-white/80 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader className="space-y-1 text-center px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                  <CloudSun className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-800">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-600">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-10 sm:h-11 text-sm sm:text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-10 sm:h-11 text-sm sm:text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/signup">
                      <span className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors duration-200">
                        Sign up here
                      </span>
                    </Link>
                  </p>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Benefits Section */}
        <div className="hidden md:flex flex-col justify-center space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 order-1 md:order-2">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Join SolarSense
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed">
              Connect to the intelligent energy trading network and optimize your solar energy usage.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full mt-1">
                <CloudSun className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Energy Trading Dashboard</h3>
                <p className="text-xs sm:text-sm text-gray-600">Monitor real-time energy trades, track your household's generation and consumption</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-1.5 sm:p-2 bg-cyan-100 rounded-full mt-1">
                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">AI-Powered Optimization</h3>
                <p className="text-xs sm:text-sm text-gray-600">Get intelligent recommendations for energy trading and battery management</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full mt-1">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Network Analytics</h3>
                <p className="text-xs sm:text-sm text-gray-600">Access detailed insights on grid stability, trading volumes, and carbon savings</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-1.5 sm:p-2 bg-cyan-100 rounded-full mt-1">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Energy Trading History</h3>
                <p className="text-xs sm:text-sm text-gray-600">Track your trading performance and energy optimization over time</p>
              </div>
            </div>
          </div>
          

        </div>
      </div>
      </div>
    </>
  );
}