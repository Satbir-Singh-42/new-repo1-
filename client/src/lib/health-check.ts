export interface HealthStatus {
  database: boolean;
  server: boolean;
  ai: boolean;
  message?: string;
}

export async function checkServerHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      return {
        database: false,
        server: false,
        ai: false,
        message: "Server is currently unavailable. Our technical team is working on it. You can use the application without login/signup."
      };
    }
    
    const data = await response.json();
    
    // Parse the actual health response structure
    const dbConnected = data.database?.status === 'connected';
    const aiOnline = data.ai?.status === 'online';
    // Server is healthy if response is OK and database is connected
    // "degraded" status is only due to AI quota issues, not server problems
    const serverHealthy = response.ok && dbConnected;
    
    return {
      database: dbConnected,
      server: serverHealthy,
      ai: aiOnline,
      message: !dbConnected
        ? "Database is temporarily unavailable. Our technical team is working on it. You can use the application without login/signup."
        : undefined
    };
  } catch (error) {
    return {
      database: false,
      server: false,
      ai: false,
      message: "Server is currently unavailable. Our technical team is working on it. You can use the application without login/signup."
    };
  }
}