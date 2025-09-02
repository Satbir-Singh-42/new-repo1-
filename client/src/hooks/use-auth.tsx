import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User, loginSchema, signupSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Simple health check function to replace the deleted module
type HealthStatus = {
  status: 'healthy' | 'unhealthy';
  message: string;
};

const checkServerHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      return { status: 'healthy', message: 'Server is running' };
    } else {
      return { status: 'unhealthy', message: 'Server returned error' };
    }
  } catch (error) {
    return { status: 'unhealthy', message: 'Cannot connect to server' };
  }
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, z.infer<typeof signupSchema>>;
  healthStatus: HealthStatus | null;
  checkHealth: () => Promise<HealthStatus | void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  // Check server health on component mount
  const checkHealth = async () => {
    const status = await checkServerHealth();
    setHealthStatus(status);
    return status;
  };

  useEffect(() => {
    checkHealth();
    
    // Check server health every 2 minutes (reduced from 30 seconds)
    const healthCheckInterval = setInterval(() => {
      checkHealth();
    }, 120000);

    return () => clearInterval(healthCheckInterval);
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Add session ID header if available (consistent with apiRequest)
        const headers: Record<string, string> = {};
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          headers['x-session-id'] = sessionId;
        }

        const response = await fetch("/api/user", {
          headers,
          credentials: "include",
        });
        if (response.status === 401) {
          return null;
        }
        const data = await response.json();
        return data;
      } catch (error) {
        // Silently return null for authentication failures
        // No server health checks or toast notifications
        return null;
      }
    },
    retry: false,
    staleTime: 30000, // Cache auth status for 30 seconds
    gcTime: 60000, // Keep cached data for 1 minute
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      // Store session ID in localStorage for header-based requests
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      // Remove success toast to prevent duplicate notifications
      // Success handling is done in the component
    },
    onError: (error: Error) => {
      // Remove toast notification to prevent duplicate validation
      // Error handling is now done in the component ValidationCard
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof signupSchema>) => {
      const response = await apiRequest("POST", "/api/register", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      // Store session ID in localStorage for header-based requests
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      // Remove success toast to prevent duplicate notifications
      // Success handling is done in the component
    },
    onError: (error: Error) => {
      // Remove toast notification to prevent duplicate validation
      // Error handling is now done in the component ValidationCard
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear all authentication data
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all cached queries to force fresh data on next login
      queryClient.clear();
      
      // Clear any stored user data from localStorage/sessionStorage
      localStorage.removeItem("authToken");
      localStorage.removeItem("sessionId");
      sessionStorage.clear();
      
      // Show logout success message in localStorage before redirect
      localStorage.setItem("logoutSuccess", "true");
      
      // Redirect to dashboard instead of reloading
      window.location.href = "/";
    },
    onError: (error: Error) => {
      // Show validation card for logout errors
      toast({
        title: "Logout failed",
        description: "Server is down. Please try again later.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        healthStatus,
        checkHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}