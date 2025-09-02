import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse error as JSON for better error messages
    try {
      const errorData = JSON.parse(text);
      const actualError = errorData.error || errorData.message || text;
      
      // Check for specific validation errors and provide clearer messages
      if (actualError.includes('does not show solar panels') || actualError.includes('solar panels or photovoltaic equipment')) {
        throw new Error('Please upload a solar panel image for fault detection. Rooftop images should be used for installation analysis instead.');
      }
      
      if (actualError.includes('does not show a rooftop') || actualError.includes('rooftop suitable for solar panel installation')) {
        throw new Error('Please upload a rooftop or building image for installation analysis. Solar panel images should be used for fault detection instead.');
      }
      
      throw new Error(actualError);
    } catch (parseError) {
      // If JSON parsing fails, throw the original error
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

// Health check function to verify backend connectivity
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      credentials: 'include',
    });
    return res.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let headers: Record<string, string> = {};
  let body: any = undefined;

  // Add session ID header if available
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  if (data) {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, let browser set it with boundary
      body = data;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Let the original error pass through without showing backend connection messages
    // since the server is running fine and the issue is likely elsewhere
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add session ID header if available
    const headers: Record<string, string> = {};
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      gcTime: 10 * 60 * 1000, // 10 minutes cache (renamed from cacheTime in v5)
      retry: 1, // Allow 1 retry for better reliability
    },
    mutations: {
      retry: 1, // Allow 1 retry for mutations
    },
  },
});
